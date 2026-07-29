'use strict';

/* ══════════════════════════════════════════════════════════════
   Property 2: Preservation — comportamiento observable equivalente
   fuera de la condición del bug.

   **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

   Metodología: observación primero. Cada aserción de este archivo
   codifica una línea base MEDIDA sobre el código SIN corregir, no
   un comportamiento imaginado. Por eso estos tests PASAN antes de
   la corrección; volver a ejecutarlos después (tarea 3.8) es lo que
   detecta regresiones.

   Cómo se obtiene la línea base con el bucle vivo (tarea 1):

   · Adapter — el harness aborta el observer de `#navMobilePanel` al
     superar el presupuesto (50 invocaciones) y lo desconecta. El
     estado de atributos que queda tras el aborto es la línea base.
     Consecuencia práctica medida: una vez abortado, las mutaciones
     posteriores sobre el panel ya no se sincronizan. Por eso las
     transiciones del menú móvil se provocan en el MISMO turno
     síncrono que la carga del adapter, antes de que el bucle de
     microtareas consuma el presupuesto (ver caso 3).
   · `js/lecto-demo.js` — es autónomo: se carga solo, sin el adapter,
     para medir la línea base del demo, la barra sticky y
     `#date-picker` sin interferencia del bucle.

   Aserciones diferidas, por ser cambio intencional que fallaría
   sobre el código sin corregir:
   · `selectMode` una sola vez por pulsación de flecha (línea base: 2).
     Añadida en la tarea 3.6 — caso 7 de este archivo.
   · `syncMobileMenu` una vez por transición (línea base: > 50).
     Se añade en la tarea 3.7, en test/lecto-freeze.bug.test.js.
   ══════════════════════════════════════════════════════════════ */

/* booking.min.js deriva `#date-picker.min` con
   `new Date().setDate(getDate() + 1)` + `toISOString()`, cuyo
   resultado depende del huso del host: con desplazamientos ≠ 0 el
   día UTC puede no coincidir con el día local. Se fija UTC para que
   «mañana en ISO local» sea determinista en cualquier máquina y en
   cualquier hora del día. Debe ejecutarse antes de cualquier Date.
   node --test aísla cada archivo en su propio proceso. */
process.env.TZ = 'UTC';

var test = require('node:test');
var assert = require('node:assert/strict');

var fixtures = require('./helpers/lecto-fixtures');
var harnessModule = require('./helpers/observer-harness');

var buildLectoDocument = fixtures.buildLectoDocument;
var createHarness = harnessModule.createHarness;

/* ─────────────────────────────────────────────
   Utilidades locales
   ───────────────────────────────────────────── */

function isoLocal(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

/** Copia fiel de initBookingSystem() de booking.min.js: fija
 *  `min` = mañana y resetea el valor. Es el último escritor real de
 *  `#date-picker`, porque corre en DOMContentLoaded, después de los
 *  scripts deferidos. */
function initBookingSystemStub(document) {
    var datePicker = document.getElementById('date-picker');

    if (!datePicker) return null;

    var tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    var tomorrowStr = tomorrow.toISOString().split('T')[0];

    datePicker.min = tomorrowStr;
    datePicker.value = '';

    return tomorrowStr;
}

/** Stubs de goToStep1/2/3 equivalentes a booking.min.js: alternan
 *  `style.display` entre los pasos. */
function installBookingStepStubs(window) {
    var document = window.document;

    function step(n) {
        return document.getElementById('booking-step-' + n);
    }

    window.goToStep2 = function () {
        step(1).style.display = 'none';
        step(2).style.display = 'block';
    };

    window.goToStep1 = function () {
        step(2).style.display = 'none';
        step(1).style.display = 'block';
    };

    window.goToStep3 = function () {
        step(2).style.display = 'none';
        step(3).style.display = 'block';
    };
}

/** updateStickyBar() se aplaza con requestAnimationFrame; esperar
 *  fotogramas reales es determinista, a diferencia de un temporizador. */
function nextFrame(window) {
    return new Promise(function (resolve) {
        window.requestAnimationFrame(function () {
            resolve();
        });
    });
}

function keydown(window, element, key) {
    element.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: key,
        bubbles: true,
        cancelable: true
    }));
}

function tabState(document) {
    return ['tab-silabeo', 'tab-fluida'].map(function (id) {
        var tab = document.getElementById(id);

        return {
            id: id,
            ariaSelected: tab.getAttribute('aria-selected'),
            tabindex: tab.getAttribute('tabindex'),
            isActive: tab.classList.contains('is-active')
        };
    });
}

/* El harness confirmó que jsdom NO refleja la propiedad IDL `inert`
   (antes de que el adapter la escriba vale `undefined`). Las
   aserciones van sobre el atributo. */
function inertState(element) {
    return element.hasAttribute('inert');
}

function panelState(document) {
    var panel = document.getElementById('navMobilePanel');

    return {
        active: panel.classList.contains('active'),
        ariaHidden: panel.getAttribute('aria-hidden'),
        inert: inertState(panel),
        /* navbar.min.js es el dueño del tabindex de los enlaces del
           panel; el adapter no debe tocarlo. */
        linkTabindex: Array.prototype.map.call(
            panel.querySelectorAll('a, button'),
            function (element) {
                return element.getAttribute('tabindex');
            }
        )
    };
}

function stepState(document) {
    return [1, 2, 3].map(function (n) {
        var step = document.getElementById('booking-step-' + n);

        return {
            id: step.id,
            ariaHidden: step.getAttribute('aria-hidden'),
            inert: inertState(step)
        };
    });
}

function stickyState(document) {
    var bar = document.getElementById('lectoMobileBar');

    return {
        hidden: bar.hidden,
        show: bar.classList.contains('show'),
        ariaHidden: bar.getAttribute('aria-hidden'),
        inert: inertState(bar)
    };
}

/* ─────────────────────────────────────────────
   Caso 1 · #date-picker.min = mañana (3.4)
   ───────────────────────────────────────────── */

test('Preservación 1 · #date-picker.min efectivo es mañana en el orden de carga real', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ visibleStep: 2 })
    });

    t.after(function () {
        harness.close();
    });

    var document = harness.document;
    var datePicker = document.getElementById('date-picker');
    var today = isoLocal(new Date());
    var tomorrow = isoLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));

    assert.equal(
        datePicker.getAttribute('min'),
        null,
        'el fixture no trae min: lo escriben los scripts'
    );

    /* Fase de scripts deferidos.

       AJUSTE DE LA TAREA 3.6 — la línea base intermedia medida en la
       tarea 2 era `min` = HOY: js/lecto-demo.js lo escribía «como
       refuerzo». Ese escritor intermedio se eliminó A PROPÓSITO
       (problema C.4 del diseño: doble dueño de `#date-picker`), así
       que la aserción intermedia dejó de ser cierta por diseño y se
       reescribe al comportamiento correcto: nadie escribe `min` en
       esta fase. Lo que hay que preservar —y se preserva más abajo—
       es el VALOR EFECTIVO, que es lo que exige el requisito 3.4. */
    harness.loadDemo();
    await harness.flush();

    assert.equal(
        datePicker.getAttribute('min'),
        null,
        'js/lecto-demo.js ya no escribe min: el único dueño es ' +
        'initBookingSystem() de booking.min.js. Antes de la tarea 3.6 ' +
        'este script dejaba min = hoy (' + today + '), inconsistente con ' +
        'la validación de loadTimeSlots()'
    );

    /* Fase DOMContentLoaded: initBookingSystem() es el último escritor. */
    var written = initBookingSystemStub(document);

    await harness.flush();

    assert.equal(
        written,
        tomorrow,
        'el stub de initBookingSystem() debe escribir mañana en ISO local'
    );

    assert.equal(
        datePicker.getAttribute('min'),
        tomorrow,
        'valor EFECTIVO de min: mañana (' + tomorrow + '). Es el mismo de la ' +
        'línea base, ahora por diseño y no por el orden de ejecución'
    );

    assert.notEqual(
        datePicker.getAttribute('min'),
        today,
        'min no puede quedar en hoy: loadTimeSlots() rechaza con alert() ' +
        'cualquier fecha ≤ hoy'
    );
});

/* ─────────────────────────────────────────────
   Caso 2 · Pestañas del demo (3.1)
   Se cargan los DOS scripts en el orden real de
   lectoescritura.html: lecto-demo.js gestiona
   aria-selected/is-active/texto y el adapter
   gestiona tabindex y #demo-stage[aria-labelledby].

   Tras la tarea 3.6 el teclado tiene un único dueño:
   el adapter atiende las flechas y llega a selectMode
   a través de `tabs[i].click()`. El resultado observable
   —atributos, texto y foco— es el mismo que la línea
   base, así que estas aserciones no cambian; lo que
   cambia es el número de ejecuciones, y eso lo mide el
   caso 7.
   ───────────────────────────────────────────── */

test('Preservación 2 · click y ArrowLeft/ArrowRight dejan el mismo estado de pestañas', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument()
    });

    t.after(function () {
        harness.close();
    });

    var window = harness.window;
    var document = harness.document;

    harness.loadDemo();
    harness.loadAdapter();
    await harness.flush();

    var silabeo = document.getElementById('tab-silabeo');
    var fluida = document.getElementById('tab-fluida');
    var stage = document.getElementById('demo-stage');
    var text = document.getElementById('demo-text');

    var SILABEO_STATE = [
        { id: 'tab-silabeo', ariaSelected: 'true', tabindex: '0', isActive: true },
        { id: 'tab-fluida', ariaSelected: 'false', tabindex: '-1', isActive: false }
    ];

    var FLUIDA_STATE = [
        { id: 'tab-silabeo', ariaSelected: 'false', tabindex: '-1', isActive: false },
        { id: 'tab-fluida', ariaSelected: 'true', tabindex: '0', isActive: true }
    ];

    assert.deepEqual(
        tabState(document),
        SILABEO_STATE,
        'línea base tras la carga: silabeo seleccionado, tabindex 0/-1'
    );

    assert.equal(stage.getAttribute('aria-labelledby'), 'tab-silabeo');

    /* Texto de referencia de cada modo, medido y no inventado. */
    var silabeoText = text.textContent;

    assert.ok(silabeoText.length > 0, 'el demo renderiza el texto silabeado al cargar');
    assert.ok(
        silabeoText.indexOf('\u2011') !== -1,
        'el modo silabeado separa las sílabas con guion no separable'
    );

    /* ── click ── */
    fluida.click();
    await harness.flush();

    var fluidaText = text.textContent;

    assert.deepEqual(
        tabState(document),
        FLUIDA_STATE,
        'click en #tab-fluida: aria-selected y tabindex conmutados'
    );

    assert.equal(stage.getAttribute('aria-labelledby'), 'tab-fluida');
    assert.notEqual(fluidaText, silabeoText, 'cada modo renderiza su propio texto');
    assert.ok(fluidaText.indexOf('El perro corre') !== -1, 'el modo fluido agrupa palabras');

    /* ── ArrowLeft: vuelve a silabeo y deja el foco en la pestaña nueva ── */
    fluida.focus();
    keydown(window, fluida, 'ArrowLeft');
    await harness.flush();

    assert.deepEqual(
        tabState(document),
        SILABEO_STATE,
        'ArrowLeft desde #tab-fluida deja el mismo estado que el click en silabeo'
    );

    assert.equal(stage.getAttribute('aria-labelledby'), 'tab-silabeo');
    assert.equal(text.textContent, silabeoText, 'mismo texto renderizado que la línea base');
    assert.equal(document.activeElement.id, 'tab-silabeo', 'el foco pasa a la pestaña nueva');

    /* ── ArrowRight: simétrico ── */
    keydown(window, silabeo, 'ArrowRight');
    await harness.flush();

    assert.deepEqual(
        tabState(document),
        FLUIDA_STATE,
        'ArrowRight desde #tab-silabeo deja el mismo estado que el click en fluida'
    );

    assert.equal(stage.getAttribute('aria-labelledby'), 'tab-fluida');
    assert.equal(text.textContent, fluidaText, 'mismo texto renderizado que la línea base');
    assert.equal(document.activeElement.id, 'tab-fluida', 'el foco pasa a la pestaña nueva');

    /* Nota: `element.click()` no mueve el foco en jsdom, así que el foco
       solo se comprueba en la navegación por teclado, que es la que llama
       explícitamente a focus(). */
});

/* ─────────────────────────────────────────────
   Caso 3 · Menú móvil (3.2)
   La transición se provoca en el mismo turno
   síncrono que loadAdapter(): después del primer
   drenado de microtareas el bucle ya agotó el
   presupuesto y el harness desconectó el observer,
   con lo que ninguna mutación posterior del panel
   se sincroniza.
   ───────────────────────────────────────────── */

test('Preservación 3 · abrir el panel deja aria-hidden="false" sin inert', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ mobileMenuOpen: false })
    });

    t.after(function () {
        harness.close();
    });

    var document = harness.document;
    var panel = document.getElementById('navMobilePanel');

    assert.deepEqual(
        panelState(document),
        {
            active: false,
            ariaHidden: 'true',
            inert: true,
            linkTabindex: ['-1', '-1', '-1']
        },
        'estado del fixture cerrado, tal como lo deja navbar.min.js'
    );

    harness.loadAdapter();

    /* openMobileMenu() de navbar.min.js marca el estado con .active. */
    panel.classList.add('active');

    await harness.flush();

    assert.deepEqual(
        panelState(document),
        {
            active: true,
            ariaHidden: 'false',
            inert: false,
            linkTabindex: ['-1', '-1', '-1']
        },
        'línea base de apertura: aria-hidden="false", sin atributo inert y ' +
        'sin tocar el tabindex de los enlaces (dueño: navbar.min.js)'
    );
});

test('Preservación 3 · cerrar el panel deja aria-hidden="true" con inert', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ mobileMenuOpen: true })
    });

    t.after(function () {
        harness.close();
    });

    var document = harness.document;
    var panel = document.getElementById('navMobilePanel');

    assert.deepEqual(
        panelState(document),
        {
            active: true,
            ariaHidden: 'false',
            inert: false,
            linkTabindex: [null, null, null]
        },
        'estado del fixture abierto, tal como lo deja navbar.min.js'
    );

    harness.loadAdapter();

    /* closeMobileMenu() de navbar.min.js quita .active. */
    panel.classList.remove('active');

    await harness.flush();

    assert.deepEqual(
        panelState(document),
        {
            active: false,
            ariaHidden: 'true',
            inert: true,
            linkTabindex: [null, null, null]
        },
        'línea base de cierre: el panel queda fuera del orden de tabulación ' +
        'con aria-hidden="true" e inert'
    );
});

/* ─────────────────────────────────────────────
   Caso 4 · Pasos del formulario (3.3)
   ───────────────────────────────────────────── */

test('Preservación 4 · pasos 1 → 2 → 1 → 2 → 3 con aria-hidden/inert y foco en el encabezado', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ visibleStep: 1 })
    });

    t.after(function () {
        harness.close();
    });

    var window = harness.window;
    var document = harness.document;

    installBookingStepStubs(window);

    harness.loadAdapter();
    await harness.flush();

    function expectVisible(n) {
        return [1, 2, 3].map(function (index) {
            var visible = index === n;

            return {
                id: 'booking-step-' + index,
                ariaHidden: String(!visible),
                inert: !visible
            };
        });
    }

    function headingOf(n) {
        return document
            .getElementById('booking-step-' + n)
            .querySelector('h3');
    }

    assert.deepEqual(
        stepState(document),
        expectVisible(1),
        'línea base tras la carga: solo el paso 1 es visible y accesible'
    );

    /* ── 1 → 2 · submit del formulario de contacto ── */
    document.getElementById('client-name').value = 'Ana';
    document.getElementById('client-phone').value = '5512345678';

    document.getElementById('contact-form').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true })
    );

    await harness.flush();

    assert.deepEqual(stepState(document), expectVisible(2), 'paso 1 → paso 2');
    assert.equal(document.activeElement, headingOf(2), 'el foco va al encabezado del paso 2');
    assert.equal(headingOf(2).getAttribute('tabindex'), '-1');

    /* ── 2 → 1 · botón «Volver» ── */
    document.getElementById('booking-back').click();
    await harness.flush();

    assert.deepEqual(stepState(document), expectVisible(1), '«Volver» regresa al paso 1');
    assert.equal(document.activeElement, headingOf(1), 'el foco va al encabezado del paso 1');

    /* ── 1 → 2 de nuevo ── */
    document.getElementById('contact-form').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true })
    );

    await harness.flush();

    assert.deepEqual(stepState(document), expectVisible(2), 'paso 1 → paso 2 (segunda vez)');

    /* ── 2 → 3 · lo dispara booking.min.js al confirmar la reserva ── */
    window.goToStep3();
    await harness.flush();

    assert.deepEqual(stepState(document), expectVisible(3), 'paso 2 → paso 3');
    assert.equal(document.activeElement, headingOf(3), 'el foco va al encabezado del paso 3');

    /* El enlace de Google Calendar del paso 3 queda accesible y con rel seguro. */
    var gcal = document.getElementById('gcal-btn');

    assert.equal(gcal.getAttribute('target'), '_blank');
    assert.equal(gcal.getAttribute('rel'), 'noopener noreferrer');
});

/* ─────────────────────────────────────────────
   Caso 5 · Barra sticky (2.3 / 3.5)
   Se asserta la VISIBILIDAD EFECTIVA (`hidden`),
   que es la que hoy gana por
   `.lecto-sticky-cta[hidden] { display:none !important }`.
   El estado de `class`/`aria-hidden` en escritorio
   no se fija aquí: el diseño lo declara cambio
   intencional al dejar un único dueño.
   ───────────────────────────────────────────── */

test('Preservación 5 · visibilidad efectiva de #lectoMobileBar por viewport y scroll', async function (t) {
    var harnesses = [];

    t.after(function () {
        harnesses.forEach(function (harness) {
            harness.close();
        });
    });

    async function measure(options) {
        var harness = createHarness({
            html: buildLectoDocument(),
            mobileViewport: options.mobile
        });

        harnesses.push(harness);

        /* jsdom no hace layout: getBoundingClientRect siempre da ceros y
           el formulario parecería estar siempre a la vista. */
        harness.setRect(harness.document.getElementById('inscripcion'), {
            top: options.formInView ? 100 : 5000
        });

        harness.loadDemo();
        harness.loadAdapter();
        await harness.flush();

        harness.setScroll(options.scrollY);

        /* updateStickyBar() corre dentro de requestAnimationFrame. */
        await nextFrame(harness.window);
        await nextFrame(harness.window);
        await harness.flush();

        return stickyState(harness.document);
    }

    var mobileVisible = await measure({ mobile: true, scrollY: 900, formInView: false });

    assert.deepEqual(
        mobileVisible,
        { hidden: false, show: true, ariaHidden: 'false', inert: false },
        'línea base en móvil con scrollY=900 y el formulario fuera de vista: ' +
        'la barra es visible y accesible'
    );

    var desktop = await measure({ mobile: false, scrollY: 900, formInView: false });

    assert.equal(
        desktop.hidden,
        true,
        'en escritorio la barra queda oculta (visibilidad efectiva vía [hidden])'
    );

    var nearForm = await measure({ mobile: true, scrollY: 900, formInView: true });

    assert.equal(
        nearForm.hidden,
        true,
        'en móvil con el formulario a la vista la barra se oculta (umbral sin cambios)'
    );

    var shallowScroll = await measure({ mobile: true, scrollY: 100, formInView: false });

    assert.equal(
        shallowScroll.hidden,
        true,
        'en móvil por debajo de 600 px de scroll la barra sigue oculta ' +
        '(umbral sin cambios)'
    );
});

/* ─────────────────────────────────────────────
   Caso 6 · Resto del adapter (3.5)
   ───────────────────────────────────────────── */

test('Preservación 6 · tema, dropdown de escritorio, rel="noopener" y reveal on scroll', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument()
    });

    t.after(function () {
        harness.close();
    });

    var document = harness.document;

    harness.loadDemo();
    harness.loadAdapter();
    await harness.flush();

    /* ── Selector de tema ── */
    var themeButton = document.getElementById('navThemeToggle');

    assert.deepEqual(
        {
            pressed: themeButton.getAttribute('aria-pressed'),
            label: themeButton.getAttribute('aria-label'),
            title: themeButton.title
        },
        {
            pressed: 'false',
            label: 'Activar tema claro',
            title: 'Activar tema claro'
        },
        'línea base en tema oscuro'
    );

    document.documentElement.classList.add('light-mode');
    await harness.flush();

    assert.deepEqual(
        {
            pressed: themeButton.getAttribute('aria-pressed'),
            label: themeButton.getAttribute('aria-label'),
            title: themeButton.title
        },
        {
            pressed: 'true',
            label: 'Activar tema oscuro',
            title: 'Activar tema oscuro'
        },
        'al activar light-mode el botón queda pulsado y ofrece volver a oscuro'
    );

    document.documentElement.classList.remove('light-mode');
    await harness.flush();

    assert.equal(
        themeButton.getAttribute('aria-pressed'),
        'false',
        'volver a oscuro restaura aria-pressed'
    );

    /* ── Dropdown de escritorio: es navegación, no un menú de aplicación ── */
    var dropdownButton = document.querySelector('.nav-dropdown > .nav-pill-link');
    var dropdownMenu = document.querySelector('.nav-dropdown-menu');

    assert.equal(dropdownMenu.id, 'desktopCourseMenu', 'el adapter le da id al menú');
    assert.equal(dropdownMenu.getAttribute('role'), null, 'se elimina role="menu"');
    assert.equal(
        dropdownMenu.querySelectorAll('[role="menuitem"]').length,
        0,
        'se eliminan todos los role="menuitem"'
    );
    assert.equal(
        dropdownButton.getAttribute('aria-controls'),
        'desktopCourseMenu',
        'el botón apunta al menú por aria-controls'
    );

    /* ── rel="noopener noreferrer" en enlaces target="_blank" ── */
    var externalLinks = Array.prototype.slice.call(
        document.querySelectorAll('a[target="_blank"]')
    );

    assert.ok(externalLinks.length >= 2, 'el fixture trae enlaces target="_blank"');

    externalLinks.forEach(function (link) {
        assert.equal(
            link.getAttribute('rel'),
            'noopener noreferrer',
            'todo enlace target="_blank" queda con rel="noopener noreferrer"'
        );
    });

    /* ── Reveal on scroll ──
       jsdom no implementa IntersectionObserver, así que este caso
       ejercita la rama de fallback de lecto-demo.js, que marca todas
       las secciones .reveal como visibles de una vez. Consecuencia
       colateral, también verificada: el adapter no añade
       'lecto-enhanced' cuando falta IntersectionObserver. */
    assert.equal(
        harness.hasIntersectionObserver,
        false,
        'el entorno de prueba no trae IntersectionObserver: se ejercita el fallback'
    );

    var reveals = document.querySelectorAll('.reveal');

    assert.ok(reveals.length >= 2, 'el fixture trae secciones .reveal');

    reveals.forEach(function (element) {
        assert.ok(
            element.classList.contains('is-visible'),
            'el fallback revela todas las secciones .reveal'
        );
    });

    assert.equal(
        document.documentElement.classList.contains('lecto-enhanced'),
        false,
        'sin IntersectionObserver el adapter no activa las mejoras de scroll'
    );
});

/* ─────────────────────────────────────────────
   Caso 7 · Un único dueño por elemento (2.3)

   Aserciones DIFERIDAS de la tarea 3.6. No podían ir
   en la tarea 2 porque son cambio intencional y
   fallaban sobre el código sin corregir: son la
   resolución del doble dueño (problemas C.1, C.2 y C.4
   del diseño), no una línea base.
   ───────────────────────────────────────────── */

/** Cuenta las invocaciones de `selectMode()` de js/lecto-demo.js.
 *
 *  `selectMode` escribe `aria-selected` en TODAS las pestañas y sin
 *  guarda, así que el número de escrituras dividido por el número de
 *  pestañas es su número de invocaciones. Es un contador fiable
 *  porque es su único escritor: `syncTabs()` del adapter escribe
 *  `tabindex` y `aria-labelledby`, nunca `aria-selected`.
 *
 *  Debe instalarse ANTES de cargar los scripts. Envuelve el
 *  `setAttribute` que ya instrumentó el harness, así que la captura
 *  de escrituras del harness sigue intacta. */
function countSelectModeCalls(window) {
    var proto = window.Element.prototype;
    var nativeSetAttribute = proto.setAttribute;

    var counter = {
        writes: 0,
        reset: function () {
            counter.writes = 0;
        }
    };

    proto.setAttribute = function (name, value) {
        if (
            String(name).toLowerCase() === 'aria-selected' &&
            this.classList &&
            this.classList.contains('demo-tab')
        ) {
            counter.writes += 1;
        }

        return nativeSetAttribute.call(this, name, value);
    };

    return counter;
}

test('Preservación 7 · selectMode se ejecuta una sola vez por pulsación de flecha', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument()
    });

    t.after(function () {
        harness.close();
    });

    var window = harness.window;
    var document = harness.document;

    /* Antes de cargar cualquier script. */
    var counter = countSelectModeCalls(window);

    harness.loadDemo();
    harness.loadAdapter();
    await harness.flush();

    var tabCount = document.querySelectorAll('.demo-tab').length;

    assert.equal(tabCount, 2, 'el fixture trae dos pestañas');

    var silabeo = document.getElementById('tab-silabeo');
    var fluida = document.getElementById('tab-fluida');

    function selectModeCalls() {
        assert.equal(
            counter.writes % tabCount,
            0,
            'selectMode escribe aria-selected en todas las pestañas: el ' +
            'total debe ser múltiplo de ' + tabCount
        );

        return counter.writes / tabCount;
    }

    /* La carga inicial llama a renderText(), no a selectMode(). */
    counter.reset();

    /* ── ArrowRight: silabeo → fluida ── */
    silabeo.focus();
    keydown(window, silabeo, 'ArrowRight');
    await harness.flush();

    assert.equal(
        selectModeCalls(),
        1,
        'ArrowRight ejecuta selectMode una sola vez. LÍNEA BASE PREVIA: 2 — ' +
        'js/lecto-demo.js y el adapter atendían los dos la misma pulsación, ' +
        'con doble render de #demo-text y doble reescritura de #demo-status. ' +
        'La tarea 3.6 eliminó el keydown de lecto-demo.js y dejó el teclado ' +
        'al adapter, que llega a selectMode vía tabs[i].click()'
    );

    /* El resultado visible es el de la línea base (caso 2): el conteo
       de 1 no se debe a que la pulsación se haya quedado sin efecto. */
    assert.deepEqual(
        tabState(document),
        [
            { id: 'tab-silabeo', ariaSelected: 'false', tabindex: '-1', isActive: false },
            { id: 'tab-fluida', ariaSelected: 'true', tabindex: '0', isActive: true }
        ],
        'ArrowRight sí cambia de pestaña: una ejecución basta'
    );

    assert.equal(document.activeElement.id, 'tab-fluida', 'el foco pasa a la pestaña nueva');

    /* ── ArrowLeft: simétrico, fluida → silabeo ── */
    counter.reset();
    keydown(window, fluida, 'ArrowLeft');
    await harness.flush();

    assert.equal(
        selectModeCalls(),
        1,
        'ArrowLeft ejecuta selectMode una sola vez (línea base previa: 2)'
    );

    assert.deepEqual(
        tabState(document),
        [
            { id: 'tab-silabeo', ariaSelected: 'true', tabindex: '0', isActive: true },
            { id: 'tab-fluida', ariaSelected: 'false', tabindex: '-1', isActive: false }
        ],
        'ArrowLeft sí cambia de pestaña: una ejecución basta'
    );

    assert.equal(document.activeElement.id, 'tab-silabeo', 'el foco pasa a la pestaña nueva');

    /* El clic directo sigue siendo del demo, y también una sola vez. */
    counter.reset();
    fluida.click();
    await harness.flush();

    assert.equal(
        selectModeCalls(),
        1,
        'el click conserva su único manejador en js/lecto-demo.js'
    );
});

test('Preservación 7 · js/lecto-demo.js ya no escribe #lectoMobileBar ni #date-picker', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ visibleStep: 2 }),
        mobileViewport: true
    });

    t.after(function () {
        harness.close();
    });

    var window = harness.window;
    var document = harness.document;

    /* Condiciones en las que el bloque eliminado SÍ mostraba la barra:
       scroll > 600 px y el formulario fuera de vista. jsdom no hace
       layout, de ahí el rect explícito. */
    harness.setRect(document.getElementById('inscripcion'), { top: 5000 });

    /* SOLO el demo: el adapter no se carga, así que cualquier escritura
       sobre estos dos elementos vendría de js/lecto-demo.js. */
    harness.loadDemo();
    await harness.flush();

    harness.setScroll(900);

    /* El bloque eliminado aplazaba su trabajo con requestAnimationFrame:
       se esperan fotogramas reales para no medir antes de tiempo. */
    await nextFrame(window);
    await nextFrame(window);
    await harness.flush();

    assert.deepEqual(
        stickyState(document),
        { hidden: true, show: false, ariaHidden: 'true', inert: true },
        '#lectoMobileBar queda exactamente como lo dejó el markup: sin ' +
        'clase `show` y sin `aria-hidden` nuevo. LÍNEA BASE PREVIA: ' +
        '{ show: true, ariaHidden: "false" } sobre un elemento que el ' +
        'adapter mantenía `hidden` e `inert`, y sin comprobar el viewport ' +
        '(problema C.1). Único dueño: updateStickyBar() del adapter'
    );

    assert.equal(
        document.getElementById('date-picker').getAttribute('min'),
        null,
        '#date-picker no recibe ningún `min` de este script (problema C.4). ' +
        'Único dueño: initBookingSystem() de booking.min.js'
    );
});
