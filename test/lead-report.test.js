'use strict';

/* ══════════════════════════════════════════════════════════════════
   LEAD-REPORT · el aviso de las páginas con agendado propio

   Bug que originó estas pruebas: una auditoría cruzó "¿la página
   agenda citas?" contra "¿llama a /api/bookings?" y encontró dos
   páginas con flujo de agendado completo que no avisaban a nadie.
   grandes-lideres.html tenía datos, fecha, horario y pantalla de
   confirmación; robotics.html reservaba clase de prueba. En ambas el
   visitante veía su cita confirmada, se le abría WhatsApp, y el lead
   nunca llegaba al equipo.

   La causa: el reporte a /api/bookings vive dentro de booking.min.js,
   y esas dos páginas implementan el agendado inline sin cargarlo.

   Aquí se comprueba el contrato completo: que el cliente construya un
   payload que el servidor ACEPTE. Un aviso que devuelve 400 es tan
   inútil como no tenerlo, y eso no se ve en el navegador porque el
   fallo es silencioso a propósito.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const leads = require('../js/leads.js');

const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');

/**
 * Carga js/lead-report.js en un entorno aislado y captura lo que
 * enviaría por la red.
 */
function montarReportador(opciones) {
    const cfg = opciones || {};
    const enviados = [];

    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'https://worldbrain.mx' + (cfg.ruta || '/robotics.html')
    });

    const w = dom.window;

    if (cfg.sinFetch) {
        delete w.fetch;
        w.navigator.sendBeacon = function (url, blob) {
            enviados.push({ via: 'beacon', url, blob });
            return true;
        };
    } else {
        w.fetch = function (url, init) {
            enviados.push({ via: 'fetch', url, init });
            return cfg.fallaRed
                ? Promise.reject(new Error('sin red'))
                : Promise.resolve({ ok: true });
        };
    }

    vm.createContext(w);
    vm.runInContext(leer('js/lead-report.js'), w, { filename: 'lead-report.js' });

    return { w, enviados };
}

/** Cuerpo JSON de la última petición. */
function cuerpo(enviados) {
    const ultimo = enviados[enviados.length - 1];
    return JSON.parse(ultimo.init.body);
}

/* ── El módulo se expone ──────────────────────────────────────── */

test('lead-report expone window.reportLead', () => {
    const { w } = montarReportador();
    assert.equal(typeof w.reportLead, 'function');
});

/* ── Contrato con el servidor ─────────────────────────────────── */

test('el payload de contacto lo acepta el validador del servidor', () => {
    const { w, enviados } = montarReportador({ ruta: '/grandes-lideres.html' });

    w.reportLead({
        stage: 'contacto',
        name: 'Ana Ruiz (9 años) · contacto: Carlos Ruiz',
        phone: '5512345678',
        course: 'Grandes Líderes'
    });

    assert.equal(enviados.length, 1, 'debe enviar exactamente una petición');
    assert.equal(enviados[0].url, '/api/bookings');
    assert.equal(enviados[0].init.method, 'POST');

    const resultado = leads.validateLead(cuerpo(enviados));

    assert.ok(
        resultado.ok,
        'el servidor rechazaría el aviso: ' + JSON.stringify(resultado.errors)
    );
    assert.equal(resultado.value.stage, 'contacto');
    assert.equal(resultado.value.course, 'Grandes Líderes');
});

test('el payload de cita confirmada lo acepta el validador', () => {
    const { w, enviados } = montarReportador({ ruta: '/robotics.html' });

    w.reportLead({
        stage: 'confirmado',
        name: 'Carlos Ruiz · hijo/a de 10 años',
        phone: '55 1234 5678',
        course: 'Robotics Code',
        date: '2026-09-12',
        time: '10:00'
    });

    const resultado = leads.validateLead(cuerpo(enviados));

    assert.ok(
        resultado.ok,
        'el servidor rechazaría la confirmación: ' + JSON.stringify(resultado.errors)
    );
    assert.equal(resultado.value.stage, 'confirmado');
    assert.equal(resultado.value.date, '2026-09-12');
    assert.equal(resultado.value.time, '10:00');
});

test('registra la página de origen para saber de dónde vino el lead', () => {
    const { w, enviados } = montarReportador({ ruta: '/grandes-lideres.html' });

    w.reportLead({ name: 'Ana Ruiz', phone: '5512345678', course: 'X' });

    assert.equal(cuerpo(enviados).page, '/grandes-lideres.html');
});

/* ── Normalización ───────────────────────────────────────────── */

test('normaliza la hora a HH:MM, que es lo único que el servidor acepta', () => {
    const { w, enviados } = montarReportador();

    /* Los flujos inline producen '9:00' sin cero inicial. El validador
       lo acepta, pero se normaliza para que el aviso sea consistente. */
    w.reportLead({
        stage: 'confirmado',
        name: 'Ana Ruiz',
        phone: '5512345678',
        course: 'X',
        date: '2026-09-12',
        time: '9:00'
    });

    assert.equal(cuerpo(enviados).time, '09:00');
});

test('descarta fecha y hora con formato inservible', () => {
    const { w, enviados } = montarReportador();

    w.reportLead({
        stage: 'confirmado',
        name: 'Ana Ruiz',
        phone: '5512345678',
        course: 'X',
        date: '12/09/2026',
        time: '99:99'
    });

    const body = cuerpo(enviados);

    assert.equal(body.date, '');
    assert.equal(body.time, '');

    /* Sin fecha ni hora no es una cita: se degrada a contacto en lugar
       de que el servidor devuelva 400 y se pierda el lead entero. */
    assert.equal(body.stage, 'contacto');

    assert.ok(leads.validateLead(body).ok, 'degradado a contacto debe ser válido');
});

/* ── No estorbar nunca ───────────────────────────────────────── */

test('no lanza si la red falla', () => {
    const { w } = montarReportador({ fallaRed: true });

    assert.doesNotThrow(() => {
        w.reportLead({ name: 'Ana Ruiz', phone: '5512345678', course: 'X' });
    });
});

test('no lanza con datos ausentes ni con basura', () => {
    const { w } = montarReportador();

    [undefined, null, {}, { name: 'A' }, { phone: 5512345678 }, 'texto', 0].forEach(v => {
        assert.doesNotThrow(() => w.reportLead(v), 'reventó con ' + JSON.stringify(v));
    });
});

test('no envía nada si falta el nombre o el teléfono', () => {
    /* Evita ruido de 400 en el servidor por formularios a medias. */
    const { w, enviados } = montarReportador();

    w.reportLead({ name: 'A', phone: '5512345678', course: 'X' });
    w.reportLead({ name: 'Ana Ruiz', phone: '551234', course: 'X' });
    w.reportLead({ name: '', phone: '', course: 'X' });

    assert.equal(enviados.length, 0);
});

test('usa keepalive para sobrevivir a la apertura de WhatsApp', () => {
    /* Al confirmar, ambas páginas abren wa.me en otra pestaña y en
       móvil eso puede descargar el documento. Sin keepalive el aviso
       se cancelaría justo en la conversión. */
    const { w, enviados } = montarReportador();

    w.reportLead({ name: 'Ana Ruiz', phone: '5512345678', course: 'X' });

    assert.equal(enviados[0].init.keepalive, true);
});

test('recurre a sendBeacon si no hay fetch', () => {
    const { w, enviados } = montarReportador({ sinFetch: true });

    w.reportLead({ name: 'Ana Ruiz', phone: '5512345678', course: 'X' });

    assert.equal(enviados.length, 1);
    assert.equal(enviados[0].via, 'beacon');
    assert.equal(enviados[0].url, '/api/bookings');
});

/* ── Las páginas afectadas quedan cableadas ──────────────────── */

test('toda página que agenda reporta el lead', () => {
    /* Guarda de regresión de la auditoría: si alguien añade un flujo
       de agendado nuevo y olvida el aviso, esta prueba lo detiene. */
    const paginas = fs.readdirSync(raiz)
        .filter(f => f.endsWith('.html') && !/^googleb/.test(f));

    const sinAviso = [];

    paginas.forEach(pag => {
        const html = leer(pag);
        const dom = new JSDOM(html);
        const d = dom.window.document;

        /* ¿Agenda citas? Señal fuerte: pide fecha y arma un evento de
           calendario o muestra pasos de reserva. */
        const agenda =
            /calendar\.google\.com\/calendar\/render/.test(html) &&
            d.querySelector('input[type="date"], [id*="date-picker"], [id*="visit-date"]');

        if (!agenda) return;

        /* JS efectivo: inline más los archivos locales que carga. */
        let js = Array.from(d.querySelectorAll('script:not([src])'))
            .map(s => s.textContent).join('\n');

        Array.from(d.querySelectorAll('script[src]')).forEach(s => {
            const src = s.getAttribute('src');
            if (/^(https?:)?\/\//.test(src)) return;
            try {
                js += '\n' + leer(src.split('?')[0].replace(/^\//, ''));
            } catch (e) { /* referencia rota: lo cubre otra prueba */ }
        });

        if (!/\/api\/bookings/.test(js)) sinAviso.push(pag);
    });

    assert.deepEqual(
        sinAviso,
        [],
        'estas páginas agendan sin avisar a nadie, el lead se pierde: ' +
        sinAviso.join(', ')
    );
});

test('las dos páginas con flujo propio cargan el reportador', () => {
    ['grandes-lideres.html', 'robotics.html'].forEach(pag => {
        assert.match(
            leer(pag),
            /<script[^>]+src="js\/lead-report\.js"/,
            pag + ' debe cargar js/lead-report.js'
        );
    });
});

/**
 * JS efectivo de una página: el inline más los archivos locales que
 * carga, en orden de aparición.
 *
 * Existe porque el aviso no tiene por qué vivir dentro del HTML.
 * grandes-lideres.html movió su flujo a js/grandes-lideres-2026.js y
 * estas pruebas empezaron a fallar sin que nada se hubiera roto: lo
 * que hay que garantizar es que el aviso EXISTA en el código que la
 * página ejecuta, no en qué archivo está escrito.
 */
function jsEfectivo(pag) {
    const dom = new JSDOM(leer(pag));
    const d = dom.window.document;
    const partes = [];

    Array.from(d.querySelectorAll('script')).forEach(s => {
        const src = s.getAttribute('src');

        if (!src) {
            partes.push(s.textContent);
            return;
        }

        if (/^(https?:)?\/\//.test(src)) return;

        try {
            partes.push(leer(src.split('?')[0].replace(/^\//, '')));
        } catch (e) { /* referencia rota: lo cubre otra prueba */ }
    });

    return partes.join('\n');
}

test('el agendado propio avisa en las dos etapas', () => {
    /* Dos etapas: quien deja sus datos y abandona antes de elegir
       horario también es un lead que hay que perseguir. */
    ['grandes-lideres.html', 'robotics.html'].forEach(pag => {
        const js = jsEfectivo(pag);

        assert.match(js, /reportLead\(\{[\s\S]{0,80}stage: 'contacto'/, pag);
        assert.match(js, /reportLead\(\{[\s\S]{0,80}stage: 'confirmado'/, pag);
    });
});

test('el aviso de confirmación va antes de abrir WhatsApp', () => {
    /* Si se enviara después, la pestaña de WhatsApp podría descargar
       la página y cancelar la petición en el momento de la conversión. */
    ['grandes-lideres.html', 'robotics.html'].forEach(pag => {
        const js = jsEfectivo(pag);

        const iAviso = js.indexOf("stage: 'confirmado'");
        assert.ok(iAviso > 0, pag + ': no se encontró el aviso de confirmación');

        /* Se busca la apertura de WhatsApp DESPUÉS del aviso, sea con
           plantilla o con concatenación. */
        const mWa = /window\.open\(\s*[`'"a-zA-Z_$]/.exec(js.slice(iAviso));

        assert.ok(
            mWa,
            pag + ': el aviso de confirmación debe preceder a la apertura de WhatsApp'
        );

        /* Y que de verdad sea WhatsApp lo que se abre. */
        assert.match(
            js.slice(iAviso),
            /wa\.me/,
            pag + ': tras el aviso debe traspasarse a WhatsApp'
        );
    });
});
