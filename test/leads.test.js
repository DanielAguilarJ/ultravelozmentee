'use strict';

/* ══════════════════════════════════════════════════════════════════
   Captura y aviso de leads agendados.

   Por qué existe esta suite: antes de este cambio, agendar una cita
   no avisaba a nadie y el lead se perdía. Es la ruta del dinero del
   sitio, así que las reglas que la sostienen quedan fijadas aquí:

     · un lead válido se persiste antes de intentar notificar
     · un lead inválido se rechaza y no contamina el archivo
     · la caída de un canal de aviso no tumba a los demás
     · el JSONL sobrevive a líneas corruptas
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const leads = require('../js/leads');

function tmpFile() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-leads-'));
    return path.join(dir, 'nested', 'bookings.jsonl');
}

const VALID = {
    stage: 'confirmado',
    name: 'Santiago Pérez',
    phone: '55 7810 7837',
    course: 'Regularizacion - Secundaria',
    date: '2026-08-14',
    time: '16:00',
    page: '/regularizacion-express'
};

/* ── Saneamiento ─────────────────────────────────────────────── */

test('cleanText elimina saltos de línea que romperían el JSONL', () => {
    const dirty = 'Ana\nMaría\r\nLópez';
    const clean = leads.cleanText(dirty, 80);

    assert.equal(clean, 'Ana María López');
    assert.ok(!clean.includes('\n'), 'una línea = un lead');
});

test('cleanText recorta a la longitud máxima', () => {
    assert.equal(leads.cleanText('x'.repeat(200), 80).length, 80);
});

test('cleanText tolera valores que no son texto', () => {
    [null, undefined, 42, {}, []].forEach(value => {
        assert.equal(leads.cleanText(value, 20), '');
    });
});

test('normalizePhone deja solo dígitos y conserva el + inicial', () => {
    assert.equal(leads.normalizePhone('55 7810 7837'), '5578107837');
    assert.equal(leads.normalizePhone('(55) 5868-6784'), '5558686784');
    assert.equal(leads.normalizePhone('+52 55 7810 7837'), '+525578107837');
    assert.equal(leads.normalizePhone('sin números'), '');
});

test('isValidDate rechaza fechas imposibles que el regex sí acepta', () => {
    assert.equal(leads.isValidDate('2026-08-14'), true);
    assert.equal(leads.isValidDate('2026-02-31'), false, '31 de febrero no existe');
    assert.equal(leads.isValidDate('2026-13-01'), false);
    assert.equal(leads.isValidDate('14/08/2026'), false);
    assert.equal(leads.isValidDate(''), false);
});

test('isValidTime valida horas y minutos en rango', () => {
    assert.equal(leads.isValidTime('9:00'), true);
    assert.equal(leads.isValidTime('18:30'), true);
    assert.equal(leads.isValidTime('24:00'), false);
    assert.equal(leads.isValidTime('10:75'), false);
    assert.equal(leads.isValidTime('mediodía'), false);
});

/* ── Validación ──────────────────────────────────────────────── */

test('validateLead acepta un lead completo y lo normaliza', () => {
    const result = leads.validateLead(VALID, new Date('2026-07-29T10:00:00Z'));

    assert.equal(result.ok, true);
    assert.equal(result.value.name, 'Santiago Pérez');
    assert.equal(result.value.phone, '5578107837', 'el teléfono queda normalizado');
    assert.equal(result.value.stage, 'confirmado');
    assert.equal(result.value.receivedAt, '2026-07-29T10:00:00.000Z');
});

test('validateLead exige nombre y un teléfono de 10 dígitos', () => {
    const sinNombre = leads.validateLead({ ...VALID, name: 'A' });
    assert.equal(sinNombre.ok, false);
    assert.ok(sinNombre.errors.includes('name'));

    const telCorto = leads.validateLead({ ...VALID, phone: '5578' });
    assert.equal(telCorto.ok, false);
    assert.ok(telCorto.errors.includes('phone'));
});

test('validateLead no confía en el cliente aunque el formulario valide', () => {
    /* El navegador ya exige minlength, pero la API es pública. */
    const result = leads.validateLead({});

    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('name'));
    assert.ok(result.errors.includes('phone'));
});

test('una cita "confirmado" sin fecha u hora se rechaza', () => {
    const sinFecha = leads.validateLead({ ...VALID, date: '' });

    assert.equal(sinFecha.ok, false);
    assert.ok(sinFecha.errors.includes('cita incompleta'),
        'una cita confirmada sin fecha no sirve para llamar a nadie');
});

test('un lead "contacto" sí puede venir sin fecha ni hora', () => {
    const parcial = leads.validateLead({
        stage: 'contacto',
        name: 'Laura M.',
        phone: '5558686784',
        course: 'Regularizacion - Preparatoria',
        page: '/regularizacion-express'
    });

    assert.equal(parcial.ok, true, 'es el lead de quien abandona en el paso 2');
    assert.equal(parcial.value.date, '');
    assert.equal(parcial.value.time, '');
});

test('un stage desconocido cae a "contacto" en lugar de fallar', () => {
    const result = leads.validateLead({
        stage: 'inventado',
        name: 'Ana',
        phone: '5578107837'
    });

    assert.equal(result.ok, true);
    assert.equal(result.value.stage, 'contacto');
});

test('el curso ausente no bloquea el lead', () => {
    const result = leads.validateLead({ name: 'Ana', phone: '5578107837' });

    assert.equal(result.ok, true);
    assert.equal(result.value.course, 'No especificado');
});

/* ── Persistencia ────────────────────────────────────────────── */

test('appendLead crea el directorio y escribe una línea por lead', () => {
    const file = tmpFile();

    const a = leads.validateLead(VALID).value;
    const b = leads.validateLead({ ...VALID, name: 'Diego R.' }).value;

    leads.appendLead(a, file);
    leads.appendLead(b, file);

    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');

    assert.equal(lines.length, 2, 'append, no sobreescritura');
    assert.equal(JSON.parse(lines[0]).name, 'Santiago Pérez');
    assert.equal(JSON.parse(lines[1]).name, 'Diego R.');
});

test('readLeads devuelve los más recientes primero y respeta el límite', () => {
    const file = tmpFile();

    for (let i = 1; i <= 5; i++) {
        leads.appendLead(
            leads.validateLead({ ...VALID, name: 'Alumno ' + i }).value,
            file
        );
    }

    const todos = leads.readLeads(file);
    assert.equal(todos.length, 5);
    assert.equal(todos[0].name, 'Alumno 5', 'el más nuevo primero');

    const dos = leads.readLeads(file, 2);
    assert.equal(dos.length, 2);
    assert.equal(dos[0].name, 'Alumno 5');
    assert.equal(dos[1].name, 'Alumno 4');
});

test('readLeads ignora líneas corruptas sin perder el resto', () => {
    const file = tmpFile();

    leads.appendLead(leads.validateLead(VALID).value, file);
    fs.appendFileSync(file, '{esto no es json\n');
    leads.appendLead(
        leads.validateLead({ ...VALID, name: 'Patricia G.' }).value,
        file
    );

    const items = leads.readLeads(file);

    assert.equal(items.length, 2, 'una escritura a medias no tira la consulta');
    assert.equal(items[0].name, 'Patricia G.');
});

test('readLeads sobre un archivo inexistente devuelve lista vacía', () => {
    assert.deepEqual(leads.readLeads(tmpFile()), []);
});

test('resolveFile no usa data/, que deploy.sh borraría', () => {
    const resuelto = leads.resolveFile({}, '/app');

    assert.equal(resuelto, path.join('/app', 'var/bookings.jsonl'));
    assert.ok(!resuelto.includes(path.sep + 'data' + path.sep),
        'deploy.sh hace rsync --delete incluyendo data/***');
});

test('resolveFile respeta una ruta absoluta configurada', () => {
    assert.equal(
        leads.resolveFile({ BOOKINGS_FILE: '/srv/leads.jsonl' }, '/app'),
        '/srv/leads.jsonl'
    );
});

/* ── Mensaje ─────────────────────────────────────────────────── */

test('waLink antepone el 52 a los números locales de 10 dígitos', () => {
    assert.equal(leads.waLink('5578107837'), 'https://wa.me/525578107837');
    assert.equal(leads.waLink('+525578107837'), 'https://wa.me/525578107837');
    assert.equal(leads.waLink(''), '');
});

test('el aviso incluye lo necesario para llamar sin abrir nada más', () => {
    const record = leads.validateLead(VALID).value;
    const msg = leads.formatMessage(record);

    assert.match(msg, /CITA CONFIRMADA/);
    assert.match(msg, /Santiago Pérez/);
    assert.match(msg, /5578107837/);
    assert.match(msg, /2026-08-14 a las 16:00/);
    assert.match(msg, /regularizacion-express/);
    assert.match(msg, /https:\/\/wa\.me\/525578107837/,
        'enlace directo para contestar desde la notificación');
});

test('el aviso distingue un contacto parcial de una cita cerrada', () => {
    const parcial = leads.validateLead({
        stage: 'contacto',
        name: 'Laura M.',
        phone: '5558686784'
    }).value;

    const msg = leads.formatMessage(parcial);

    assert.match(msg, /no eligió horario/);
    assert.ok(!/CITA CONFIRMADA/.test(msg));
});

/* ── Notificación ────────────────────────────────────────────── */

function fakeFetch(behaviour) {
    const calls = [];

    const impl = async (url, options) => {
        calls.push({ url, options });
        return behaviour(url);
    };

    return { impl, calls };
}

test('sin canales configurados no se intenta ninguna llamada', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: true }));

    const out = await leads.notifyLead(record, {}, { fetch: fake.impl });

    assert.equal(fake.calls.length, 0);
    assert.equal(out[0].channel, 'none');
    assert.equal(out[0].ok, false);
});

test('Telegram recibe el chat_id y el texto del aviso', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: true }));

    const out = await leads.notifyLead(record, {
        TELEGRAM_BOT_TOKEN: 'T0KEN',
        TELEGRAM_CHAT_ID: '-1001234'
    }, { fetch: fake.impl });

    assert.equal(fake.calls.length, 1);
    assert.match(fake.calls[0].url, /api\.telegram\.org\/botT0KEN\/sendMessage/);

    const body = JSON.parse(fake.calls[0].options.body);
    assert.equal(body.chat_id, '-1001234');
    assert.match(body.text, /Santiago Pérez/);

    assert.deepEqual(out, [{ channel: 'telegram', ok: true }]);
});

test('el webhook manda text y content para servir a Slack y Discord', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: true }));

    await leads.notifyLead(record, {
        BOOKING_WEBHOOK_URL: 'https://hook.make.com/abc'
    }, { fetch: fake.impl });

    const body = JSON.parse(fake.calls[0].options.body);

    assert.ok(body.text, 'Slack lee "text"');
    assert.ok(body.content, 'Discord lee "content"');
    assert.equal(body.lead.phone, '5578107837', 'y el lead crudo para automatizar');
});

test('el correo acepta varios destinatarios separados por coma', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: true }));

    await leads.notifyLead(record, {
        RESEND_API_KEY: 'rk_test',
        BOOKING_EMAIL_TO: 'uno@wb.com, dos@wb.com'
    }, { fetch: fake.impl });

    const body = JSON.parse(fake.calls[0].options.body);

    assert.deepEqual(body.to, ['uno@wb.com', 'dos@wb.com']);
    assert.match(body.subject, /Cita confirmada: Santiago Pérez/);
    assert.match(
        fake.calls[0].options.headers.Authorization,
        /^Bearer rk_test$/
    );
});

test('un canal caído no impide que los demás entreguen', async () => {
    const record = leads.validateLead(VALID).value;

    const fake = fakeFetch(url => {
        if (url.includes('telegram')) {
            throw new Error('ETIMEDOUT');
        }
        return { ok: true };
    });

    const out = await leads.notifyLead(record, {
        TELEGRAM_BOT_TOKEN: 'T',
        TELEGRAM_CHAT_ID: '1',
        BOOKING_WEBHOOK_URL: 'https://hook.make.com/abc'
    }, { fetch: fake.impl });

    const telegram = out.find(o => o.channel === 'telegram');
    const webhook = out.find(o => o.channel === 'webhook');

    assert.equal(telegram.ok, false);
    assert.match(telegram.error, /ETIMEDOUT/);
    assert.equal(webhook.ok, true, 'el webhook sí entregó');
});

test('una respuesta HTTP de error se reporta como fallo del canal', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: false, status: 401 }));

    const out = await leads.notifyLead(record, {
        TELEGRAM_BOT_TOKEN: 'malo',
        TELEGRAM_CHAT_ID: '1'
    }, { fetch: fake.impl });

    assert.equal(out[0].ok, false);
    assert.match(out[0].error, /HTTP 401/);
});

test('los tres canales se disparan a la vez cuando están configurados', async () => {
    const record = leads.validateLead(VALID).value;
    const fake = fakeFetch(() => ({ ok: true }));

    const out = await leads.notifyLead(record, {
        TELEGRAM_BOT_TOKEN: 'T',
        TELEGRAM_CHAT_ID: '1',
        BOOKING_WEBHOOK_URL: 'https://hook.make.com/abc',
        RESEND_API_KEY: 'rk',
        BOOKING_EMAIL_TO: 'a@wb.com'
    }, { fetch: fake.impl });

    assert.equal(fake.calls.length, 3);
    assert.equal(out.filter(o => o.ok).length, 3);
});
