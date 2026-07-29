(function () {
    'use strict';

    var root = document.documentElement;
    var reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    if (!reducedMotion && 'IntersectionObserver' in window) {
        root.classList.add('lecto-enhanced');
    }

    /* ─────────────────────────────────────────────
       Escrituras idempotentes

       `setAttribute` encola un registro de mutación
       siempre, incluso cuando el valor nuevo es igual
       al actual. Si el callback de un MutationObserver
       reescribe un atributo de su propio
       `attributeFilter`, se re-dispara a sí mismo en
       microtareas y el hilo principal nunca cede el
       control al navegador. Leer antes de escribir
       apaga ese motor: sin cambio real no hay mutación
       que encolar.
       ───────────────────────────────────────────── */

    function setAttr(element, name, value) {
        if (!element) return;

        if (element.getAttribute(name) === value) return;

        element.setAttribute(name, value);
    }

    function setInert(element, state) {
        if (!element) return;

        /* La propiedad IDL `inert` no existe en todos los entornos
           (en jsdom vale `undefined` hasta la primera escritura), así
           que la comparación estricta deja pasar esa primera vez y
           bloquea las repeticiones. Donde sí está implementada, el
           propio setter refleja el atributo. */
        if (element.inert !== state) {
            element.inert = state;
        }

        /* El atributo es la fuente de verdad para decidir si hay que
           escribirlo: funciona igual en navegador y en jsdom. */
        if (element.hasAttribute('inert') === state) return;

        if (state) {
            element.setAttribute('inert', '');
        } else {
            element.removeAttribute('inert');
        }
    }

    /* Misma guarda para atributos booleanos reflejados (`hidden` y
       similares): primero la propiedad, después la presencia del
       atributo. */
    function setBool(element, name, on) {
        if (!element) return;

        if (element[name] !== on) {
            element[name] = on;
        }

        if (element.hasAttribute(name) === on) return;

        if (on) {
            element.setAttribute(name, '');
        } else {
            element.removeAttribute(name);
        }
    }

    /* ─────────────────────────────────────────────
       Navegación
       ───────────────────────────────────────────── */

    var desktopDropdownButton = document.querySelector(
        '.nav-dropdown > .nav-pill-link'
    );

    var desktopDropdown = document.querySelector(
        '.nav-dropdown-menu'
    );

    if (desktopDropdownButton && desktopDropdown) {
        desktopDropdown.id = desktopDropdown.id || 'desktopCourseMenu';

        desktopDropdownButton.setAttribute(
            'aria-controls',
            desktopDropdown.id
        );

        /* Es un menú de navegación, no un menú de aplicación. */
        desktopDropdown.removeAttribute('role');

        desktopDropdown
            .querySelectorAll('[role="menuitem"]')
            .forEach(function (link) {
                link.removeAttribute('role');
            });
    }

    var mobilePanel = document.getElementById('navMobilePanel');
    var mobileButton = document.getElementById('navHamburger');
    var mobileWasOpen = false;

    function syncMobileMenu() {
        if (!mobilePanel || !mobileButton) return;

        var open = mobilePanel.classList.contains('active');

        setAttr(mobilePanel, 'aria-hidden', String(!open));
        setInert(mobilePanel, !open);

        if (open && !mobileWasOpen) {
            window.setTimeout(function () {
                var first = mobilePanel.querySelector(
                    'button:not([disabled]), a[href]'
                );

                if (first) first.focus();
            }, 0);
        }

        if (!open && mobileWasOpen) {
            mobileButton.focus();
        }

        mobileWasOpen = open;
    }

    if (mobilePanel && mobileButton) {
        /* `class` es la única señal que hace falta: navbar.min.js
           marca el estado del panel con `.active`. `aria-hidden` sale
           del filtro porque lo escribe este mismo callback. */
        new MutationObserver(syncMobileMenu).observe(mobilePanel, {
            attributes: true,
            attributeFilter: ['class']
        });

        document.addEventListener('keydown', function (event) {
            if (
                event.key !== 'Tab' ||
                !mobilePanel.classList.contains('active')
            ) {
                return;
            }

            var focusable = [
                mobileButton
            ].concat(
                Array.from(
                    mobilePanel.querySelectorAll(
                        'button:not([disabled]), a[href], ' +
                        'input:not([disabled]), select:not([disabled]), ' +
                        '[tabindex]:not([tabindex="-1"])'
                    )
                )
            );

            if (!focusable.length) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        });

        syncMobileMenu();
    }

    /* ─────────────────────────────────────────────
       Selector de tema
       ───────────────────────────────────────────── */

    var themeButton = document.getElementById('navThemeToggle');

    function syncThemeButton() {
        if (!themeButton) return;

        var light = root.classList.contains('light-mode');

        themeButton.setAttribute('aria-pressed', String(light));
        themeButton.setAttribute(
            'aria-label',
            light ? 'Activar tema oscuro' : 'Activar tema claro'
        );
        themeButton.title = light
            ? 'Activar tema oscuro'
            : 'Activar tema claro';
    }

    if (themeButton) {
        new MutationObserver(syncThemeButton).observe(root, {
            attributes: true,
            attributeFilter: ['class']
        });

        syncThemeButton();
    }

    /* ─────────────────────────────────────────────
       Demo: patrón accesible de pestañas
       ───────────────────────────────────────────── */

    var demo = document.getElementById('lecto-demo');

    if (demo) {
        var tabs = Array.from(
            demo.querySelectorAll('[role="tab"]')
        );

        var demoStage = document.getElementById('demo-stage');
        var demoStatus = document.getElementById('demo-status');
        var demoText = document.getElementById('demo-text');

        if (demoStatus) {
            demoStatus.setAttribute('aria-atomic', 'true');
        }

        if (demoText) {
            demoText.removeAttribute('aria-hidden');
        }

        /* Escrituras guardadas aunque el filtro de este observer
           (`class`, `aria-selected`) no incluya hoy `tabindex` ni
           `aria-labelledby`: si mañana los incluye, no habrá bucle. */
        function syncTabs() {
            tabs.forEach(function (tab) {
                var selected =
                    tab.getAttribute('aria-selected') === 'true';

                setAttr(tab, 'tabindex', selected ? '0' : '-1');
            });

            var active = tabs.find(function (tab) {
                return tab.getAttribute('aria-selected') === 'true';
            });

            if (active && demoStage) {
                setAttr(demoStage, 'aria-labelledby', active.id);
            }
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                window.queueMicrotask(syncTabs);
            });

            tab.addEventListener('keydown', function (event) {
                var targetIndex = null;

                if (event.key === 'Home') {
                    targetIndex = 0;
                }

                if (event.key === 'End') {
                    targetIndex = tabs.length - 1;
                }

                if (
                    event.key === 'ArrowDown' ||
                    event.key === 'ArrowRight'
                ) {
                    targetIndex = (index + 1) % tabs.length;
                }

                if (
                    event.key === 'ArrowUp' ||
                    event.key === 'ArrowLeft'
                ) {
                    targetIndex =
                        (index - 1 + tabs.length) % tabs.length;
                }

                if (targetIndex === null) return;

                event.preventDefault();
                tabs[targetIndex].click();
                tabs[targetIndex].focus();
            });
        });

        new MutationObserver(syncTabs).observe(demo, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-selected']
        });

        syncTabs();
    }

    /* ─────────────────────────────────────────────
       Formulario y pasos de reserva
       ───────────────────────────────────────────── */

    var bookingWidget = document.getElementById('booking-widget');
    var contactForm = document.getElementById('contact-form');
    var backButton = document.getElementById('booking-back');

    var bookingSteps = [
        document.getElementById('booking-step-1'),
        document.getElementById('booking-step-2'),
        document.getElementById('booking-step-3')
    ].filter(Boolean);

    var activeStepId = '';

    function isVisible(element) {
        return (
            element &&
            !element.hidden &&
            window.getComputedStyle(element).display !== 'none'
        );
    }

    /* Igual que syncTabs(): el filtro de este observer es `style`,
       `class` y `hidden`, así que hoy no hay intersección con lo que
       escribe (`aria-hidden`, `inert`, `tabindex`). Las guardas la
       mantienen inofensiva si alguien amplía el filtro. */
    function syncBookingSteps(moveFocus) {
        var currentStep = null;

        bookingSteps.forEach(function (step) {
            var visible = isVisible(step);

            setAttr(step, 'aria-hidden', String(!visible));

            setInert(step, !visible);

            if (visible) currentStep = step;
        });

        if (
            moveFocus &&
            currentStep &&
            currentStep.id !== activeStepId
        ) {
            var heading = currentStep.querySelector(
                'h2, h3, h4'
            );

            if (heading) {
                setAttr(heading, 'tabindex', '-1');
                heading.focus({
                    preventScroll: true
                });

                currentStep.scrollIntoView({
                    behavior: reducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        }

        activeStepId = currentStep ? currentStep.id : '';
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!contactForm.reportValidity()) {
                return;
            }

            if (typeof window.goToStep2 === 'function') {
                window.goToStep2();
                window.queueMicrotask(function () {
                    syncBookingSteps(true);
                });
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function () {
            if (typeof window.goToStep1 === 'function') {
                window.goToStep1();

                window.queueMicrotask(function () {
                    syncBookingSteps(true);
                });
            }
        });
    }

    if (bookingWidget) {
        new MutationObserver(function () {
            syncBookingSteps(true);
        }).observe(bookingWidget, {
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden']
        });

        syncBookingSteps(false);
    }

    /* ─────────────────────────────────────────────
       Horarios generados por booking.min.js
       ───────────────────────────────────────────── */

    var slotsContainer = document.getElementById(
        'slots-container'
    );

    function syncSlots() {
        if (!slotsContainer) return;

        var slots = slotsContainer.querySelectorAll(
            '.course-time-slot, .time-slot'
        );

        slots.forEach(function (slot) {
            var selected = slot.classList.contains('selected');
            var booked =
                slot.disabled ||
                slot.classList.contains('booked');

            setAttr(slot, 'aria-pressed', String(selected));

            setAttr(
                slot,
                'aria-label',
                booked
                    ? 'Horario ' + slot.textContent.trim() +
                      ', no disponible'
                    : 'Seleccionar horario ' +
                      slot.textContent.trim()
            );
        });
    }

    if (slotsContainer) {
        /* `childList` y `subtree` son los que detectan la inyección de
           botones que hace loadTimeSlots() de booking.min.js: sin ellos
           los horarios se quedan sin etiquetar. `aria-pressed` sale del
           filtro porque lo escribe este mismo callback; `class` y
           `disabled` son las señales que sí llegan de fuera. */
        new MutationObserver(syncSlots).observe(slotsContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                'class',
                'disabled'
            ]
        });

        syncSlots();
    }

    /* ─────────────────────────────────────────────
       Barra de conversión móvil
       ───────────────────────────────────────────── */

    var mobileBar = document.getElementById(
        'lectoMobileBar'
    );

    var inscription = document.getElementById(
        'inscripcion'
    );

    var mobileQuery = window.matchMedia(
        '(max-width: 900px)'
    );

    var stickyTicking = false;

    function updateStickyBar() {
        if (!mobileBar) return;

        var formIsNear =
            inscription &&
            inscription.getBoundingClientRect().top <
                window.innerHeight;

        var visible =
            mobileQuery.matches &&
            window.scrollY > 600 &&
            !formIsNear;

        /* Único dueño de #lectoMobileBar: `class`, `hidden`,
           `aria-hidden` e `inert` salen solo de aquí, y las cuatro
           escrituras van guardadas para no encolar mutaciones
           inútiles. Los umbrales (viewport, 600 px y proximidad del
           formulario) no cambian. */
        if (mobileBar.classList.contains('show') !== visible) {
            mobileBar.classList.toggle('show', visible);
        }

        setBool(mobileBar, 'hidden', !visible);

        setAttr(mobileBar, 'aria-hidden', String(!visible));

        setInert(mobileBar, !visible);
    }

    function requestStickyUpdate() {
        if (stickyTicking) return;

        stickyTicking = true;

        window.requestAnimationFrame(function () {
            updateStickyBar();
            stickyTicking = false;
        });
    }

    if (mobileBar) {
        window.addEventListener(
            'scroll',
            requestStickyUpdate,
            { passive: true }
        );

        window.addEventListener(
            'resize',
            requestStickyUpdate,
            { passive: true }
        );

        if (typeof mobileQuery.addEventListener === 'function') {
            mobileQuery.addEventListener(
                'change',
                requestStickyUpdate
            );
        } else {
            mobileQuery.addListener(requestStickyUpdate);
        }

        updateStickyBar();
    }

    /* Evita reverse tabnabbing en enlaces dinámicos. */
    document
        .querySelectorAll('a[target="_blank"]')
        .forEach(function (link) {
            var relations = new Set(
                (link.rel || '').split(/\s+/).filter(Boolean)
            );

            relations.add('noopener');
            relations.add('noreferrer');

            link.rel = Array.from(relations).join(' ');
        });
})();
