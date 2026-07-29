'use strict';

/* ══════════════════════════════════════════════════════════════
   Property 1: Bug Condition — los callbacks de MutationObserver
   del adapter alcanzan un punto fijo.

   isBugCondition(observerSpec):
       options.attributes = true AND (writes ∩ attributeFilter) ≠ ∅
   expectedBehavior(observerSpec):
       invocationCount ≤ MAX_SETTLE_INVOCATIONS (5)

   **Validates: Requirements 1.1, 1.2**

   Sobre el código SIN corregir estos tests FALLAN: el fallo es la
   confirmación del bug. Sobre el código corregido pasan (tarea 3.7).

   El último test del archivo es la aserción DIFERIDA de la tarea 2,
   añadida en la tarea 3.7: `syncMobileMenu` se invoca una vez por
   transición abrir/cerrar. No podía escribirse antes porque su línea
   base sobre el código sin corregir no era un número comparable, sino
   un bucle abortado por el presupuesto.
   ══════════════════════════════════════════════════════════════ */

var test = require('node:test');
var assert = require('node:assert/strict');

var fixtures = require('./helpers/lecto-fixtures');
var harnessModule = require('./helpers/observer-harness');

var buildLectoDocument = fixtures.buildLectoDocument;
var makeSlots = fixtures.makeSlots;
var SLOT_COMBINATION_KEYS = fixtures.SLOT_COMBINATION_KEYS;

var createHarness = harnessModule.createHarness;
var formatViolation = harnessModule.formatViolation;
var MAX_SETTLE_INVOCATIONS = harnessModule.MAX_SETTLE_INVOCATIONS;
var ABORT_INVOCATION_BUDGET = harnessModule.ABORT_INVOCATION_BUDGET;

function context(harness) {
    var lines = [];
    var report = harness.report();

    if (report) {
        lines.push('Violaciones registradas:', report);
    }

    if (harness.errors.length) {
        lines.push('Errores de jsdom: ' + harness.errors.join(' | '));
    }

    return lines.length ? '\n\n' + lines.join('\n') : '';
}

function describeObserver(observer) {
    var filter = observer.attributeFilter === null
        ? 'TODOS'
        : '[' + observer.attributeFilter.join(', ') + ']';

    return observer.callbackName + '() sobre ' + observer.targetLabel +
        ' · attributeFilter: ' + filter +
        ' · invocaciones: ' + observer.invocations +
        ' · escribe: [' + observer.writes.join(', ') + ']' +
        ' · intersección: ' + (observer.intersection.length
            ? '{' + observer.intersection.join(', ') + '}'
            : '∅');
}

/* ─────────────────────────────────────────────
   Caso A · Bug determinista: se dispara al cargar
   ───────────────────────────────────────────── */

test('Caso A · #navMobilePanel: syncMobileMenu alcanza un punto fijo al cargar la página', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ mobileMenuOpen: false })
    });

    t.after(function () {
        harness.close();
    });

    harness.loadAdapter();
    await harness.flush();

    var panel = harness.observerFor('navMobilePanel');

    assert.ok(
        panel,
        'el adapter debe registrar un MutationObserver sobre #navMobilePanel'
    );

    assert.deepEqual(
        panel.intersection,
        [],
        'isBugCondition(#navMobilePanel → ' + panel.callbackName + ') es verdadera: ' +
        'el callback escribe atributos de su propio attributeFilter.' +
        context(harness)
    );

    assert.ok(
        panel.invocations <= MAX_SETTLE_INVOCATIONS,
        panel.callbackName + ' se invocó ' + panel.invocations + ' veces al cargar ' +
        '(máximo admitido ' + MAX_SETTLE_INVOCATIONS + ', presupuesto de aborto ' +
        ABORT_INVOCATION_BUDGET + '). La página nunca devuelve el control al navegador.' +
        context(harness)
    );
});

/* ─────────────────────────────────────────────
   Caso B · Bug latente: se dispara al inyectar horarios
   ───────────────────────────────────────────── */

test('Caso B · #slots-container: syncSlots alcanza un punto fijo al inyectar horarios', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ visibleStep: 2 })
    });

    t.after(function () {
        harness.close();
    });

    harness.loadAdapter();
    await harness.flush();

    /* El Bug A ya quedó documentado en el caso anterior. Se ponen los
       contadores a cero para aislar el Bug B. */
    harness.resetCounters();

    /* Uno libre, uno .selected y uno disabled.booked, como loadTimeSlots(). */
    var slots = makeSlots(harness.document, 3, 'mixto');

    assert.equal(slots.length, 3, 'el fixture debe inyectar 3 horarios');
    assert.equal(slots[1].classList.contains('selected'), true);
    assert.equal(slots[2].disabled, true);
    assert.equal(slots[2].classList.contains('booked'), true);

    await harness.flush();

    var container = harness.observerFor('slots-container');

    assert.ok(
        container,
        'el adapter debe registrar un MutationObserver sobre #slots-container'
    );

    assert.deepEqual(
        container.intersection,
        [],
        'isBugCondition(#slots-container → ' + container.callbackName + ') es verdadera: ' +
        'el callback escribe atributos de su propio attributeFilter.' +
        context(harness)
    );

    assert.ok(
        container.invocations <= MAX_SETTLE_INVOCATIONS,
        container.callbackName + ' se invocó ' + container.invocations + ' veces al ' +
        'inyectar 3 horarios (máximo admitido ' + MAX_SETTLE_INVOCATIONS +
        ', presupuesto de aborto ' + ABORT_INVOCATION_BUDGET + '). ' +
        'El visitante se queda colgado en el paso 2 del formulario.' +
        context(harness)
    );
});

/* ─────────────────────────────────────────────
   Invariante sobre el dominio completo
   Espacio pequeño: enumeración exhaustiva, sin
   generación aleatoria.
   ───────────────────────────────────────────── */

test('Invariante · ningún observer del adapter escribe atributos que él mismo observa', async function (t) {
    var failures = [];
    var failingStates = new Set();
    var stateCount = 0;

    var phaseCount = 0;

    function collect(stateLabel, snapshot) {
        var reasons = [];

        phaseCount += 1;

        snapshot.violations.forEach(function (violation) {
            reasons.push(formatViolation(violation));
        });

        snapshot.observers.forEach(function (observer) {
            if (observer.invocations > MAX_SETTLE_INVOCATIONS) {
                reasons.push(
                    'invocaciones por encima de MAX_SETTLE_INVOCATIONS · ' +
                    describeObserver(observer)
                );
            }
        });

        if (reasons.length) {
            failingStates.add(stateLabel);
            failures.push({
                state: stateLabel,
                phase: snapshot.phase,
                reasons: reasons
            });
        }
    }

    var panelStates = [false, true];
    var slotCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    /* Tamaño del dominio, derivado de los parámetros de la enumeración
       y no escrito a mano: panel abierto/cerrado × (el estado sin
       horarios, donde todas las combinaciones colapsan en una, +
       10 recuentos × 4 combinaciones) = 2 × (1 + 40) = 82. */
    var expectedStateCount = panelStates.length *
        (1 + (slotCounts.length - 1) * SLOT_COMBINATION_KEYS.length);

    /* Cada estado con horarios se observa en dos fases (carga del
       adapter e inyección de horarios); el estado sin horarios, en una. */
    var expectedPhaseCount = expectedStateCount +
        panelStates.length * (slotCounts.length - 1) * SLOT_COMBINATION_KEYS.length;

    for (var p = 0; p < panelStates.length; p += 1) {
        for (var c = 0; c < slotCounts.length; c += 1) {
            var mobileMenuOpen = panelStates[p];
            var count = slotCounts[c];

            /* Con 0 horarios todas las combinaciones son el mismo estado. */
            var combinations = count === 0 ? ['libres'] : SLOT_COMBINATION_KEYS;

            for (var k = 0; k < combinations.length; k += 1) {
                var combination = combinations[k];

                var stateLabel = 'panel=' + (mobileMenuOpen ? 'abierto' : 'cerrado') +
                    ' horarios=' + count +
                    ' combinación=' + combination;

                stateCount += 1;

                var harness = createHarness({
                    html: buildLectoDocument({
                        mobileMenuOpen: mobileMenuOpen,
                        visibleStep: count > 0 ? 2 : 1
                    })
                });

                try {
                    harness.loadAdapter();
                    await harness.flush();
                    collect(stateLabel, harness.snapshot('carga del adapter'));

                    if (count > 0) {
                        harness.resetCounters();
                        makeSlots(harness.document, count, combination);
                        await harness.flush();
                        collect(stateLabel, harness.snapshot('inyección de horarios'));
                    }
                } finally {
                    harness.close();
                }
            }
        }
    }

    var shown = failures.slice(0, 4).map(function (failure) {
        return '  · ' + failure.state + ' [fase: ' + failure.phase + ']\n      ' +
            failure.reasons.join('\n      ');
    }).join('\n');

    assert.equal(
        failures.length,
        0,
        failingStates.size + ' de ' + stateCount + ' estados enumerados violan la ' +
        'invariante (punto fijo de los callbacks), en ' + failures.length +
        ' de las ' + phaseCount + ' fases observadas. Primeros contraejemplos:\n' + shown
    );

    /* El recorrido cubre el dominio completo: si alguien recorta la
       enumeración, el test deja de ser exhaustivo en silencio. El número
       queda además en la salida del runner, para no tener que deducirlo. */
    t.diagnostic(
        'dominio enumerado: ' + stateCount + ' estados, ' +
        phaseCount + ' fases observadas'
    );

    assert.equal(
        stateCount,
        expectedStateCount,
        'la enumeración debe cubrir los ' + expectedStateCount + ' estados del ' +
        'dominio: 2 (panel abierto/cerrado) × (1 estado sin horarios + 10 ' +
        'recuentos × ' + SLOT_COMBINATION_KEYS.length + ' combinaciones)'
    );

    assert.equal(
        phaseCount,
        expectedPhaseCount,
        'cada estado con horarios debe observarse en sus dos fases (carga del ' +
        'adapter e inyección de horarios)'
    );
});

/* ─────────────────────────────────────────────
   Aserción DIFERIDA de la tarea 2, añadida en la 3.7

   `syncMobileMenu` se invoca UNA vez por transición
   abrir/cerrar. No podía escribirse en la tarea 1 ni
   en la 2 porque sobre el código sin corregir no había
   un número comparable que preservar:

   · línea base medida sobre el código sin corregir —
     51 invocaciones ya durante la carga del adapter
     (`attributeFilter: ['class', 'aria-hidden']` y el
     callback escribiendo `aria-hidden`), es decir el
     bucle abortado por el presupuesto de 50. Tras el
     aborto el harness desconecta el observer, así que
     la transición posterior medía 0 invocaciones y el
     panel se quedaba en `aria-hidden="true"` + `inert`
     con `.active` puesto: el menú ni se sincronizaba.
   · comportamiento corregido — 0 invocaciones en la
     carga (las guardas de idempotencia no encolan
     mutación: el panel ya llega con `aria-hidden="true"`
     e `inert`) y exactamente 1 por transición.

   La transición se provoca añadiendo y quitando
   `.active` en `#navMobilePanel`, que es la señal con
   la que `navbar.min.js` marca el estado en
   openMobileMenu() / closeMobileMenu().
   ───────────────────────────────────────────── */

test('Punto fijo · syncMobileMenu se invoca una vez por transición abrir/cerrar', async function (t) {
    var harness = createHarness({
        html: buildLectoDocument({ mobileMenuOpen: false })
    });

    t.after(function () {
        harness.close();
    });

    var document = harness.document;
    var panel = document.getElementById('navMobilePanel');

    harness.loadAdapter();
    await harness.flush();

    var observer = harness.observerFor('navMobilePanel');

    assert.ok(observer, 'el adapter debe observar #navMobilePanel');
    assert.equal(observer.callbackName, 'syncMobileMenu');

    assert.equal(
        observer.invocations,
        0,
        'la carga no dispara el callback: el panel ya llega con ' +
        'aria-hidden="true" e inert, y las escrituras guardadas no encolan ' +
        'mutación. LÍNEA BASE PREVIA: 51 invocaciones (bucle abortado por el ' +
        'presupuesto de ' + ABORT_INVOCATION_BUDGET + ')' + context(harness)
    );

    /* ── Abrir · openMobileMenu() de navbar.min.js pone .active ── */
    harness.resetCounters();
    panel.classList.add('active');
    await harness.flush();

    observer = harness.observerFor('navMobilePanel');

    assert.equal(
        observer.invocations,
        1,
        'abrir el panel invoca syncMobileMenu UNA vez. LÍNEA BASE PREVIA: ' +
        'no medible — el observer ya estaba desconectado tras agotar el ' +
        'presupuesto durante la carga, así que la transición registraba 0 ' +
        'invocaciones y el panel no se sincronizaba' + context(harness)
    );

    /* Una invocación basta: el efecto observable es el de la línea base
       del caso 3 de test/lecto-preservation.test.js. */
    assert.deepEqual(
        {
            ariaHidden: panel.getAttribute('aria-hidden'),
            inert: panel.hasAttribute('inert')
        },
        { ariaHidden: 'false', inert: false },
        'el panel abierto queda accesible y dentro del orden de tabulación'
    );

    assert.deepEqual(
        observer.writeNames,
        ['aria-hidden', 'inert'],
        'el callback escribe aria-hidden e inert, ninguno de ellos en su ' +
        'attributeFilter: [' + observer.watchedAttributes.join(', ') + ']'
    );

    /* Array.from: `watchedAttributes` nace del attributeFilter que pasa el
       script bajo prueba, así que su prototipo es el del realm de jsdom y
       deepStrictEqual lo rechazaría por prototipo, no por contenido. */
    assert.deepEqual(
        Array.from(observer.watchedAttributes),
        ['class'],
        'el filtro del observer se quedó en `class`, la señal que usa ' +
        'navbar.min.js (la tarea 3.2 sacó aria-hidden del filtro)'
    );

    assert.deepEqual(observer.intersection, [], 'writes ∩ attributeFilter = ∅');

    /* ── Cerrar · closeMobileMenu() quita .active ── */
    harness.resetCounters();
    panel.classList.remove('active');
    await harness.flush();

    observer = harness.observerFor('navMobilePanel');

    assert.equal(
        observer.invocations,
        1,
        'cerrar el panel invoca syncMobileMenu UNA vez' + context(harness)
    );

    assert.deepEqual(
        {
            ariaHidden: panel.getAttribute('aria-hidden'),
            inert: panel.hasAttribute('inert')
        },
        { ariaHidden: 'true', inert: true },
        'el panel cerrado vuelve a quedar fuera del orden de tabulación'
    );

    /* ── Varias transiciones seguidas: el coste es lineal, no en cascada ── */
    harness.resetCounters();

    var transitions = 4;

    for (var i = 0; i < transitions; i += 1) {
        panel.classList.toggle('active');
        await harness.flush();
    }

    observer = harness.observerFor('navMobilePanel');

    assert.equal(
        observer.invocations,
        transitions,
        transitions + ' transiciones seguidas producen ' + transitions +
        ' invocaciones: una por transición, sin cascada con navbar.min.js' +
        context(harness)
    );

    assert.ok(
        observer.invocations <= MAX_SETTLE_INVOCATIONS,
        'y el total sigue dentro de MAX_SETTLE_INVOCATIONS (' +
        MAX_SETTLE_INVOCATIONS + ')' + context(harness)
    );

    assert.equal(harness.violations.length, 0, 'ninguna violación registrada');
});
