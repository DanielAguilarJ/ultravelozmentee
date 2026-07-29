'use strict';

/* ══════════════════════════════════════════════════════════════════
   LEADS · Captura y notificación de citas agendadas

   Problema que resuelve: booking.js construía un enlace de Google
   Calendar que agrega el evento al calendario DEL VISITANTE, y
   guardaba la reserva en un objeto en memoria que muere al recargar.
   Nadie del equipo se enteraba. El lead se perdía.

   Aquí el lead se persiste primero en disco y después se notifica.
   Ese orden es deliberado: si Telegram, el webhook o el correo
   fallan, el lead ya está guardado y se puede recuperar.

   ── Dónde se guarda ──
   NO en data/. `deploy.sh` sincroniza con `rsync --delete` e incluye
   `data/***`, así que cualquier archivo que el servidor escribiera
   ahí se borraría en el siguiente deploy. La ruta por defecto es
   `var/bookings.jsonl`, que no está en la lista de includes de rsync
   y por tanto sobrevive a los deploys.

   Formato JSONL (una línea = un lead): resistente a escrituras
   concurrentes con append y legible con `tail -f`.
   ══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'var/bookings.jsonl';

const LIMITS = {
    name: 80,
    phone: 25,
    course: 60,
    page: 120,
    stage: 12
};

const STAGES = new Set(['contacto', 'confirmado']);

/* ── Saneamiento ─────────────────────────────────────────────── */

/**
 * Quita caracteres de control (incluido \n, que rompería el JSONL),
 * colapsa espacios y recorta a la longitud máxima.
 */
function cleanText(value, max) {
    if (typeof value !== 'string') return '';

    return value
        /* eslint-disable-next-line no-control-regex */
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

/**
 * Deja solo dígitos y un + inicial. Sirve para comparar y para
 * armar el enlace de WhatsApp sin sorpresas de formato.
 */
function normalizePhone(value) {
    const raw = cleanText(value, LIMITS.phone);
    const plus = raw.trim().startsWith('+');
    const digits = raw.replace(/\D/g, '');

    if (!digits) return '';

    return (plus ? '+' : '') + digits;
}

function isValidDate(value) {
    if (typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    /* Rechaza fechas imposibles como 2026-02-31, que pasarían el regex */
    return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
    );
}

function isValidTime(value) {
    if (typeof value !== 'string') return false;

    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) return false;

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/* ── Validación ──────────────────────────────────────────────── */

/**
 * Valida el cuerpo de POST /api/bookings.
 * Devuelve { ok, value } o { ok:false, errors }.
 */
function validateLead(body, now) {
    const errors = [];
    const input = body && typeof body === 'object' ? body : {};

    const stage = STAGES.has(input.stage) ? input.stage : 'contacto';

    const name = cleanText(input.name, LIMITS.name);
    const phone = normalizePhone(input.phone);
    const course = cleanText(input.course, LIMITS.course) || 'No especificado';
    const page = cleanText(input.page, LIMITS.page) || '/';

    if (name.length < 2) {
        errors.push('name');
    }

    /* 10 dígitos es el mínimo de un número mexicano; el formulario
       ya lo exige, pero la API no puede confiar en el cliente. */
    if (phone.replace(/\D/g, '').length < 10) {
        errors.push('phone');
    }

    const date = typeof input.date === 'string' ? input.date.trim() : '';
    const time = typeof input.time === 'string' ? input.time.trim() : '';

    if (date && !isValidDate(date)) errors.push('date');
    if (time && !isValidTime(time)) errors.push('time');

    /* Una cita confirmada sin fecha u hora no sirve para nada. */
    if (stage === 'confirmado' && (!date || !time)) {
        errors.push('cita incompleta');
    }

    if (errors.length) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            receivedAt: (now || new Date()).toISOString(),
            stage,
            name,
            phone,
            course,
            date,
            time,
            page
        }
    };
}

/* ── Persistencia ────────────────────────────────────────────── */

function resolveFile(env, root) {
    const configured = (env && env.BOOKINGS_FILE) || DEFAULT_FILE;

    return path.isAbsolute(configured)
        ? configured
        : path.join(root || process.cwd(), configured);
}

/**
 * Añade el lead al JSONL. Crea el directorio si falta.
 * Lanza si no se puede escribir: quien llama decide qué hacer.
 */
function appendLead(record, file) {
    const dir = path.dirname(file);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');

    return record;
}

/**
 * Lee los leads más recientes primero. Tolera líneas corruptas en
 * lugar de reventar: un archivo a medio escribir no debe tirar el
 * panel de consulta.
 */
function readLeads(file, limit) {
    if (!fs.existsSync(file)) return [];

    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const out = [];

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
            out.push(JSON.parse(line));
        } catch (err) {
            /* línea ilegible: se ignora, no se pierde el resto */
        }

        if (limit && out.length >= limit) break;
    }

    return out;
}

/* ── Formato del aviso ───────────────────────────────────────── */

function waLink(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    /* Números locales de 10 dígitos: se les antepone el 52 de México */
    const full = digits.length === 10 ? '52' + digits : digits;

    return 'https://wa.me/' + full;
}

/**
 * Texto plano del aviso. Se usa igual en Telegram y en correo:
 * legible en la notificación del teléfono sin abrir nada.
 */
function formatMessage(record) {
    const isFull = record.stage === 'confirmado';

    const lines = [
        isFull
            ? '🟢 CITA CONFIRMADA'
            : '🟡 Nuevo contacto (no eligió horario aún)',
        '',
        'Alumno: ' + record.name,
        'WhatsApp: ' + record.phone,
        'Curso: ' + record.course
    ];

    if (record.date || record.time) {
        lines.push('Cita: ' + [record.date, record.time].filter(Boolean).join(' a las '));
    }

    lines.push('Página: ' + record.page);

    const link = waLink(record.phone);
    if (link) {
        lines.push('', 'Contestar: ' + link);
    }

    return lines.join('\n');
}

/* ── Canales de notificación ─────────────────────────────────── */

/**
 * Cada canal es opcional e independiente: se activa solo si sus
 * variables de entorno existen. Un canal caído no afecta a los otros
 * ni a la respuesta al visitante.
 */
async function notifyLead(record, env, deps) {
    const cfg = env || {};
    const doFetch = (deps && deps.fetch) || globalThis.fetch;
    const results = [];

    if (typeof doFetch !== 'function') {
        return [{ channel: 'none', ok: false, error: 'fetch no disponible' }];
    }

    const message = formatMessage(record);
    const jobs = [];

    /* 1 · Telegram: gratis, llega como notificación push al teléfono */
    if (cfg.TELEGRAM_BOT_TOKEN && cfg.TELEGRAM_CHAT_ID) {
        jobs.push({
            channel: 'telegram',
            run: () => doFetch(
                'https://api.telegram.org/bot' +
                cfg.TELEGRAM_BOT_TOKEN + '/sendMessage',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: cfg.TELEGRAM_CHAT_ID,
                        text: message,
                        disable_web_page_preview: true
                    })
                }
            )
        });
    }

    /* 2 · Webhook genérico: Make.com (ya se usa para el blog),
           Zapier, n8n, Google Sheets, Slack o Discord */
    if (cfg.BOOKING_WEBHOOK_URL) {
        jobs.push({
            channel: 'webhook',
            run: () => doFetch(cfg.BOOKING_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: message,
                    content: message,
                    lead: record
                })
            })
        });
    }

    /* 3 · Correo vía Resend (HTTP, sin dependencias nuevas) */
    if (cfg.RESEND_API_KEY && cfg.BOOKING_EMAIL_TO) {
        jobs.push({
            channel: 'email',
            run: () => doFetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + cfg.RESEND_API_KEY
                },
                body: JSON.stringify({
                    from: cfg.BOOKING_EMAIL_FROM ||
                        'WorldBrain <onboarding@resend.dev>',
                    to: String(cfg.BOOKING_EMAIL_TO).split(',').map(s => s.trim()),
                    subject: record.stage === 'confirmado'
                        ? 'Cita confirmada: ' + record.name + ' (' + record.course + ')'
                        : 'Nuevo contacto: ' + record.name + ' (' + record.course + ')',
                    text: message
                })
            })
        });
    }

    if (!jobs.length) {
        return [{ channel: 'none', ok: false, error: 'sin canales configurados' }];
    }

    const settled = await Promise.allSettled(
        jobs.map(job => job.run())
    );

    settled.forEach((result, i) => {
        const channel = jobs[i].channel;

        if (result.status === 'rejected') {
            results.push({
                channel,
                ok: false,
                error: result.reason && result.reason.message
                    ? result.reason.message
                    : 'error de red'
            });
            return;
        }

        const response = result.value;
        const ok = !response || response.ok !== false;

        results.push(
            ok
                ? { channel, ok: true }
                : {
                    channel,
                    ok: false,
                    error: 'HTTP ' + (response.status || '?')
                }
        );
    });

    return results;
}

module.exports = {
    DEFAULT_FILE,
    cleanText,
    normalizePhone,
    isValidDate,
    isValidTime,
    validateLead,
    resolveFile,
    appendLead,
    readLeads,
    waLink,
    formatMessage,
    notifyLead
};
