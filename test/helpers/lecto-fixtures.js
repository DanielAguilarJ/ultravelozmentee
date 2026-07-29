'use strict';

/* ══════════════════════════════════════════════════════════════
   Fixtures de /lectoescritura
   Markup mínimo — NO es una copia de lectoescritura.html. Solo
   contiene los elementos que js/lectoescritura-adapter.js y
   js/lecto-demo.js buscan por id, clase o selector.
   ══════════════════════════════════════════════════════════════ */

/* Variantes de horario que produce loadTimeSlots() de booking.min.js:
   libre (clicable), seleccionado (.selected) y ocupado
   (disabled + .booked + title). */
var SLOT_VARIANTS = ['libre', 'seleccionado', 'ocupado'];

var SLOT_COMBINATIONS = {
    /* Todos libres: el caso más común al abrir una fecha nueva. */
    libres: function () {
        return 'libre';
    },
    /* El visitante ya eligió el primer horario. */
    'uno-seleccionado': function (index) {
        return index === 0 ? 'seleccionado' : 'libre';
    },
    /* Horarios alternos ya reservados. */
    'con-ocupados': function (index) {
        return index % 2 === 1 ? 'ocupado' : 'libre';
    },
    /* libre / seleccionado / ocupado en rotación. Con count = 3
       da exactamente uno de cada. */
    mixto: function (index) {
        return SLOT_VARIANTS[index % SLOT_VARIANTS.length];
    }
};

function bookingStepAttributes(step, visibleStep) {
    if (step === visibleStep) {
        return 'aria-hidden="false"';
    }

    return 'style="display:none" aria-hidden="true" inert';
}

/**
 * Devuelve el HTML del fixture.
 *
 * @param {object} [options]
 * @param {boolean} [options.mobileMenuOpen] panel móvil abierto
 *        (`.active` + `aria-hidden="false"` sin `inert`, tal como
 *        lo deja openMobileMenu() de navbar.min.js).
 * @param {number} [options.visibleStep] paso del formulario visible (1..3).
 * @param {boolean} [options.lightMode] `light-mode` en <html>.
 */
function buildLectoDocument(options) {
    var settings = options || {};
    var mobileMenuOpen = settings.mobileMenuOpen === true;
    var visibleStep = settings.visibleStep || 1;
    var rootClass = settings.lightMode === true ? ' class="light-mode"' : '';

    var panelClass = mobileMenuOpen
        ? 'nav-mobile-panel active'
        : 'nav-mobile-panel';

    var panelState = mobileMenuOpen
        ? 'aria-hidden="false"'
        : 'aria-hidden="true" inert';

    /* navbar.min.js saca del orden de tabulación los enlaces del
       panel cerrado; con el panel abierto les quita el tabindex. */
    var panelLinkTabindex = mobileMenuOpen ? '' : ' tabindex="-1"';

    return [
        '<!DOCTYPE html>',
        '<html lang="es"' + rootClass + '>',
        '<head><meta charset="utf-8"><title>Lectoescritura · fixture</title></head>',
        '<body>',

        /* ── Navegación ── */
        '<nav class="nav-pill" role="navigation" aria-label="Navegación principal">',
        '  <div class="nav-pill-links">',
        '    <div class="nav-dropdown">',
        '      <button class="nav-pill-link" aria-expanded="false" aria-haspopup="true">Cursos</button>',
        '      <div class="nav-dropdown-menu" role="menu">',
        '        <a href="/fastkids" role="menuitem">FastKids</a>',
        '        <a href="/mathekids" role="menuitem">MatheKids</a>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <button class="nav-pill-theme" id="navThemeToggle" type="button"',
        '          aria-label="Cambiar tema claro/oscuro" title="Cambiar tema"></button>',
        '  <button class="nav-pill-hamburger" id="navHamburger" type="button"',
        '          aria-label="Abrir menú" aria-expanded="false" aria-controls="navMobilePanel"></button>',
        '</nav>',
        '<div class="nav-mobile-overlay" id="navMobileOverlay"></div>',
        '<div class="' + panelClass + '" id="navMobilePanel" ' + panelState + '>',
        '  <button class="nav-pill-link mobile-dropdown-toggle" id="mobileDropdownBtn"',
        '          type="button" aria-expanded="false"' + panelLinkTabindex + '>Cursos</button>',
        '  <div class="mobile-dropdown-content" id="mobileDropdownContent">',
        '    <a href="/fastkids"' + panelLinkTabindex + '>FastKids</a>',
        '    <a href="/mathekids"' + panelLinkTabindex + '>MatheKids</a>',
        '  </div>',
        '</div>',

        /* ── Demo de lectura ── */
        '<main id="main-content">',
        '<div class="lecto-demo-card reveal" id="lecto-demo" role="region"',
        '     aria-labelledby="demo-title" aria-describedby="demo-help">',
        '  <h2 class="demo-title" id="demo-title">Así se siente leer</h2>',
        '  <div class="demo-tabs" role="tablist" aria-label="Modos de lectura">',
        '    <button class="demo-tab is-active" id="tab-silabeo" type="button" role="tab"',
        '            tabindex="0" aria-selected="true" aria-controls="demo-stage"',
        '            data-mode="silabeo">Lectura silabeada</button>',
        '    <button class="demo-tab" id="tab-fluida" type="button" role="tab"',
        '            tabindex="-1" aria-selected="false" aria-controls="demo-stage"',
        '            data-mode="fluida">Lectura fluida</button>',
        '  </div>',
        '  <div class="demo-stage" id="demo-stage" role="tabpanel" tabindex="0"',
        '       aria-labelledby="tab-silabeo">',
        '    <p class="demo-text" id="demo-text"></p>',
        '    <div class="demo-progress" aria-hidden="true">',
        '      <div class="demo-progress-bar" id="demo-progress"></div>',
        '    </div>',
        '  </div>',
        '  <p class="demo-status" id="demo-status" role="status" aria-live="polite">',
        '    Elige un modo y presiona «Leer».</p>',
        '  <div class="demo-actions">',
        '    <button class="btn-demo-play" id="demo-play" type="button"',
        '            aria-controls="demo-stage demo-status"><span>Leer</span></button>',
        '    <div class="demo-compare is-hidden" id="demo-compare" role="status" aria-live="polite">',
        '      <span class="compare-value" id="compare-silabeo">—</span>',
        '      <span class="compare-value" id="compare-fluida">—</span>',
        '    </div>',
        '  </div>',
        '  <p class="demo-footnote" id="demo-help">Descifrar no es leer.</p>',
        '</div>',

        /* ── Formulario de reserva ── */
        '<section class="lecto-section lecto-offer reveal" id="inscripcion"',
        '         aria-labelledby="oferta-title">',
        '  <h2 id="oferta-title">Agenda la clase muestra</h2>',
        '<div class="booking-widget course-booking-card" id="booking-widget"',
        '     aria-label="Formulario para agendar una clase gratuita">',
        '  <div id="booking-step-1" class="booking-step" ' +
            bookingStepAttributes(1, visibleStep) + '>',
        '    <h3 tabindex="-1">1 · Tus datos</h3>',
        '    <form id="contact-form">',
        '      <input type="text" id="client-name" name="child-name" required minlength="2">',
        '      <input type="tel" id="client-phone" name="phone" required minlength="10">',
        '      <button type="submit" id="booking-next">Siguiente: elegir horario</button>',
        '    </form>',
        '  </div>',
        '  <div id="booking-step-2" class="booking-step" ' +
            bookingStepAttributes(2, visibleStep) + '>',
        '    <div class="booking-step2-head">',
        '      <h3 tabindex="-1">2 · Selecciona horario</h3>',
        '      <button class="booking-back" id="booking-back" type="button">← Volver</button>',
        '    </div>',
        '    <label for="date-picker">Fecha</label>',
        '    <input type="date" id="date-picker" name="booking-date" required>',
        '    <div id="slots-container" class="lecto-slots" role="group"',
        '         aria-label="Horarios disponibles" aria-live="polite">',
        '      <p class="slots-placeholder">Selecciona una fecha para ver horarios disponibles.</p>',
        '    </div>',
        '  </div>',
        '  <div id="booking-step-3" class="booking-step" ' +
            bookingStepAttributes(3, visibleStep) + '>',
        '    <h3 tabindex="-1">¡Cita confirmada!</h3>',
        '    <a id="gcal-btn" href="#" target="_blank">Guardar en Google Calendar</a>',
        '  </div>',
        '</div>',
        '</section>',
        '</main>',

        /* ── Barra de conversión móvil ── */
        '<div class="lecto-sticky-cta" id="lectoMobileBar" aria-hidden="true" inert hidden>',
        '  <a href="#inscripcion" class="btn-lecto-primary btn-sm">Agendar</a>',
        '</div>',

        /* ── Enlace externo (rel="noopener noreferrer" del adapter) ── */
        '<a href="https://example.com/terminos" target="_blank">Términos</a>',

        '</body>',
        '</html>'
    ].join('\n');
}

/**
 * Inyecta `count` botones de horario en `#slots-container`,
 * imitando loadTimeSlots() de booking.min.js: vacía el contenedor
 * y añade un <button type="button" class="course-time-slot"> por hora.
 *
 * @param {Document} doc documento del fixture
 * @param {number} count número de horarios (0..10 en el uso real)
 * @param {string} [combination] clave de SLOT_COMBINATIONS
 * @returns {Array} botones creados
 */
function makeSlots(doc, count, combination) {
    var key = combination || 'mixto';
    var variantFor = SLOT_COMBINATIONS[key];

    if (!variantFor) {
        throw new Error('Combinación de horarios desconocida: ' + key);
    }

    var container = doc.getElementById('slots-container');

    if (!container) {
        throw new Error('El fixture no tiene #slots-container');
    }

    /* loadTimeSlots() limpia el placeholder antes de insertar. */
    container.innerHTML = '';

    var created = [];
    var index;

    for (index = 0; index < count; index += 1) {
        var variant = variantFor(index);
        var button = doc.createElement('button');

        button.type = 'button';
        button.className = 'course-time-slot';
        button.textContent = 9 + index + ':00';

        if (variant === 'ocupado') {
            button.disabled = true;
            button.classList.add('booked');
            button.title = 'Horario Ocupado';
        }

        if (variant === 'seleccionado') {
            button.classList.add('selected');
        }

        container.appendChild(button);
        created.push(button);
    }

    return created;
}

module.exports = {
    buildLectoDocument: buildLectoDocument,
    makeSlots: makeSlots,
    SLOT_COMBINATIONS: SLOT_COMBINATIONS,
    SLOT_COMBINATION_KEYS: Object.keys(SLOT_COMBINATIONS)
};
