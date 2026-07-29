'use strict';

/* ══════════════════════════════════════════════════════════════════
   Resiliencia del agendado.

   Origen: el usuario reportó "le doy en Siguiente y me regresa al
   inicio de la página". Causa principal: todos los .js daban 404 (ver
   test/static-serving.test.js). Al investigarlo salió un segundo
   defecto latente:

     goToStep2() llamaba a window.trackMetaEvent() sin try/catch, y
     trackMetaEvent usa fetch, fbq y gtag. Si un bloqueador de anuncios
     o un fallo de red hacía que lanzara, la excepción abortaba
     goToStep2 ANTES de mostrar el paso 2. El usuario pulsaba
     "Siguiente" y no pasaba nada.

     En finalizeBooking era peor: la excepción caía en el catch general
     y el usuario veía "Hubo un error al procesar tu reserva" aunque la
     cita estuviera bien.

   Invariante que fija esta suite: la analítica NUNCA puede impedir que
   una cita se agende. Perder una métrica es barato; perder un lead no.

   Se prueba sobre booking.min.js, que es el archivo que las páginas
   cargan en producción.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

const MARKUP = `<!DOCTYPE html><body>
  <div class="course-booking-card">
    <div id="booking-step-1"><form id="contact-form" onsubmit="return false;">
      <input id="client-name"><input id="client-phone">
      <select id="course-select"><option value="Regularizacion" selected>R</option></select>
    </form></div>
    <div id="booking-step-2" style="display:none">
      <input type="date" id="date-picker"><div id="slots-container"></div>
    </div>
    <div id="booking-step-3" style="display:none"><a id="gcal-btn" href="#"></a></div>
  </div></body>`;

/**
 * Monta el flujo con booking.min.js y permite inyectar un
 * trackMetaEvent que falle, para simular un bloqueador de anuncios.
 */
function mount(options) {
    const opts = options || {};
    const dom = new JSDOM(MARKUP, {
        url: 'https://ultravelozmente.com/regularizacion-express',
        runScripts: 'outside-only'
    });

    const { window } = dom;
    const enviados = [];
    const alertas = [];
    const avisos = [];

    window.fetch = (url, cfg) => {
        enviados.push({ url, body: JSON.parse(cfg.body) });
        return Promise.resolve({ ok: true });
    };
    window.alert = msg => alertas.push(msg);
    window.confirm = () => true;
    window.console.warn = (...a) => avisos.push(a.join(' '));

    if (opts.trackingLanza) {
        window.trackMetaEvent = () => {
            throw new TypeError('fbq bloqueado por el navegador');
        };
    } else if (opts.trackingOk) {
        window.trackMetaEvent = () => { /* silencioso */ };
    }

    window.eval(fs.readFileSync(path.join(ROOT, 'js/booking.min.js'), 'utf8'));
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

    const d = window.document;
    d.getElementById('client-name').value = 'Santiago Pérez';
    d.getElementById('client-phone').value = '5578107837';

    return { window, document: d, enviados, alertas, avisos };
}

const paso = (d, n) => d.getElementById('booking-step-' + n).style.display;

/* ── goToStep2 ───────────────────────────────────────────────── */

test('avanza al paso 2 aunque el tracking lance una excepción', () => {
    const ctx = mount({ trackingLanza: true });

    ctx.window.goToStep2();

    assert.equal(paso(ctx.document, 1), 'none', 'el paso 1 se oculta');
    assert.equal(paso(ctx.document, 2), 'block',
        'el paso 2 debe mostrarse: un pixel bloqueado no puede frenar la cita');
    assert.equal(ctx.alertas.length, 0, 'y sin alertas de error al usuario');
});

test('deja rastro en consola cuando el tracking falla', () => {
    const ctx = mount({ trackingLanza: true });

    ctx.window.goToStep2();

    assert.ok(
        ctx.avisos.some(m => /Analytics no disponible/.test(m)),
        'el fallo se registra: silencioso para el usuario, visible al depurar'
    );
});

test('el lead se envía aunque el tracking falle', () => {
    const ctx = mount({ trackingLanza: true });

    ctx.window.goToStep2();

    const contacto = ctx.enviados.find(e => e.body.stage === 'contacto');

    assert.ok(contacto, 'el aviso del lead no depende de la analítica');
    assert.equal(contacto.url, '/api/bookings');
    assert.equal(contacto.body.name, 'Santiago Pérez');
});

test('con tracking sano el comportamiento es el mismo', () => {
    const ctx = mount({ trackingOk: true });

    ctx.window.goToStep2();

    assert.equal(paso(ctx.document, 2), 'block');
    assert.equal(ctx.avisos.length, 0, 'sin ruido cuando todo funciona');
});

test('sin trackMetaEvent definido tampoco falla', () => {
    const ctx = mount({});

    ctx.window.goToStep2();

    assert.equal(paso(ctx.document, 2), 'block');
});

test('sigue validando: sin nombre no avanza', () => {
    const ctx = mount({ trackingOk: true });

    ctx.document.getElementById('client-name').value = '';
    ctx.window.goToStep2();

    assert.equal(paso(ctx.document, 2), 'none', 'la validación no se relajó');
    assert.equal(ctx.alertas.length, 1);
});

/* ── finalizeBooking ─────────────────────────────────────────── */

test('la cita se confirma aunque el tracking lance', async () => {
    const ctx = mount({ trackingLanza: true });

    ctx.window.goToStep2();

    const fecha = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    const picker = ctx.document.getElementById('date-picker');
    picker.value = fecha;
    picker.dispatchEvent(new ctx.window.Event('change'));

    const slots = ctx.document.querySelectorAll('#slots-container .course-time-slot');
    assert.equal(slots.length, 10, 'se generan los horarios');

    slots[0].onclick();
    await new Promise(r => setTimeout(r, 250));

    assert.equal(paso(ctx.document, 3), 'block',
        'el paso 3 debe mostrarse: antes el fallo de analítica lo abortaba');
    assert.equal(
        ctx.alertas.filter(m => /error al procesar/i.test(m)).length,
        0,
        'y el usuario NO debe ver "Hubo un error al procesar tu reserva"'
    );

    const confirmado = ctx.enviados.find(e => e.body.stage === 'confirmado');
    assert.ok(confirmado, 'el aviso de cita confirmada sí se envía');
    assert.equal(confirmado.body.date, fecha);

    assert.match(
        ctx.document.getElementById('gcal-btn').href,
        /calendar\.google\.com/,
        'y el enlace de calendario del visitante se arma igual'
    );
});

/* ── Guardia sin JS en el markup ─────────────────────────────── */

test('las páginas con type=submit llevan la guardia onsubmit', () => {
    /* Red de seguridad independiente de JS: si un script vuelve a
       fallar, el formulario no navega y el usuario conserva lo que
       escribió junto al enlace de WhatsApp como salida. */
    ['regularizacion-express.html', 'lectoescritura.html'].forEach(archivo => {
        const html = fs.readFileSync(path.join(ROOT, archivo), 'utf8');

        assert.match(
            html,
            /<form id="contact-form"[^>]*onsubmit="return false;"/,
            archivo + ' necesita la guardia: usa un botón type="submit"'
        );
    });
});
