/* ══════════════════════════════════════════════════════════════════
   GRANDES LÍDERES · WorldBrain México
   Reflector, riel del guion, revelado, cifras y agendado.
   Vanilla JS, cero dependencias.

   Criterios que se respetan en TODO el archivo. Están arriba porque
   cada uno nació de un bug real en otra página de este sitio:

   1 · Un solo listener de scroll y un solo listener de pointermove,
       los dos regulados con requestAnimationFrame. Nada de un rAF
       por tarjeta: con doce tarjetas eso son doce bucles compitiendo.

   2 · Donde el navegador trae scroll-driven animations, el trabajo lo
       hace el CSS y aquí NO se registra el listener. No es un
       adorno: es la diferencia entre animar en el compositor y animar
       en el hilo principal.

   3 · prefers-reduced-motion se consulta en el momento de animar, no
       al cargar: el sistema puede cambiar la preferencia con la
       pestaña abierta.

   4 · Los efectos de puntero solo se montan si hay puntero fino. En
       táctil no aportan y gastan batería.

   5 · El agendado nunca pierde un lead. Se avisa al equipo en dos
       etapas y el aviso va SIEMPRE antes de abrir WhatsApp, porque
       esa pestaña puede descargar este documento en móvil.

   6 · Cero handlers en atributos del HTML. Todo por delegación, lo
       que además mantiene la página compatible con una CSP estricta
       el día que se retire 'unsafe-inline'.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ══════════════════════════════════════════════
       0 · Capacidades del navegador
       ══════════════════════════════════════════════ */

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(pointer: fine)').matches;

    /** Se consulta en cada uso: la preferencia puede cambiar en vivo. */
    function reduced() {
        return motionQuery.matches;
    }

    function supports(declaration) {
        return !!(window.CSS && CSS.supports && CSS.supports(declaration));
    }

    var hasScrollTimeline = supports('animation-timeline: scroll()');
    var hasViewTimeline = supports('animation-timeline: view()');
    var hasObserver = 'IntersectionObserver' in window;

    function list(selector, scope) {
        return Array.prototype.slice.call(
            (scope || document).querySelectorAll(selector)
        );
    }

    function clamp01(value) {
        return value < 0 ? 0 : value > 1 ? 1 : value;
    }

    /* Escritura idempotente de atributos: no encola mutaciones que no
       cambian nada, que es lo que dispara bucles de observadores. */
    function setAttr(el, name, value) {
        if (!el || el.getAttribute(name) === value) return;
        el.setAttribute(name, value);
    }

    function toggleAttr(el, name, on) {
        if (!el) return;
        if (on === el.hasAttribute(name)) return;
        if (on) el.setAttribute(name, '');
        else el.removeAttribute(name);
    }

    /* inert se escribe como propiedad Y como atributo: la propiedad
       para los navegadores que lo implementan de forma nativa, el
       atributo para los polyfills y para poder estilarlo. */
    function setInert(el, state) {
        if (!el) return;
        if (el.inert !== state) el.inert = state;
        toggleAttr(el, 'inert', state);
    }

    /* ══════════════════════════════════════════════
       1 · Bucle único de scroll

       Las piezas se registran aquí y el bucle las recorre una vez por
       frame. Si nadie se registra, el listener no se instala.
       ══════════════════════════════════════════════ */

    var painters = [];
    var scrollTicking = false;

    function onScrollFrame() {
        scrollTicking = false;
        for (var i = 0; i < painters.length; i++) painters[i]();
    }

    function requestScrollFrame() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(onScrollFrame);
    }

    function addPainter(fn) {
        painters.push(fn);
        fn();
    }

    /* ══════════════════════════════════════════════
       2 · Barra de avance de lectura

       Solo se calcula aquí si el navegador no sabe hacerlo con
       animation-timeline: scroll().
       ══════════════════════════════════════════════ */

    var folio = document.querySelector('.gl-folio-bar');

    if (folio && (!hasScrollTimeline || reduced())) {
        addPainter(function () {
            var doc = document.documentElement;
            var scrollable = doc.scrollHeight - doc.clientHeight;

            folio.style.setProperty(
                '--gl-progress',
                scrollable > 0
                    ? clamp01(doc.scrollTop / scrollable).toFixed(4)
                    : '0'
            );
        });
    }

    /* ══════════════════════════════════════════════
       3 · Riel del guion

       El riel se llena conforme la lista de módulos cruza la
       pantalla. Con animation-timeline: view() lo hace el CSS.
       ══════════════════════════════════════════════ */

    var rails = list('.gl-rail');

    if (rails.length && !hasViewTimeline) {
        addPainter(function () {
            var viewport = window.innerHeight;

            for (var i = 0; i < rails.length; i++) {
                var rect = rails[i].getBoundingClientRect();

                /* Fuera de pantalla no se calcula nada. */
                if (rect.bottom < -160 || rect.top > viewport + 160) continue;

                /* Empieza cuando el riel entra al 85% del alto y
                   termina cuando su final pasa el 15% superior. */
                var from = viewport * 0.85;
                var to = viewport * 0.15;
                var span = rect.height + from - to;

                rails[i].style.setProperty(
                    '--gl-fill',
                    span > 0 ? clamp01((from - rect.top) / span).toFixed(3) : '1'
                );
            }
        });
    }

    /* ══════════════════════════════════════════════
       4 · Revelado al entrar en pantalla

       El escalonado va en una custom property (--d) y lo aplica el
       CSS como transition-delay. Aquí no hay un solo setTimeout: con
       temporizadores, al hacer scroll rápido las tarjetas aparecen
       desordenadas.
       ══════════════════════════════════════════════ */

    var rises = list('.gl-rise');

    /* Índice dentro de su grupo, para el retraso escalonado. */
    (function stagger() {
        var seen = new Map();

        rises.forEach(function (el) {
            var parent = el.parentElement || document.body;
            var index = seen.get(parent) || 0;
            seen.set(parent, index + 1);
            /* Se corta en 6: más allá el último llega tarde y parece
               que la página se quedó colgada. */
            el.style.setProperty('--d', String(Math.min(index, 6)));
        });
    })();

    if (!hasViewTimeline) {
        if (!hasObserver || reduced()) {
            rises.forEach(function (el) {
                el.classList.add('is-in');
            });
        } else {
            var riseObserver = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-in');
                        riseObserver.unobserve(entry.target);
                    });
                },
                { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
            );

            rises.forEach(function (el) {
                riseObserver.observe(el);
            });
        }
    }

    /* Las escenas y los cambios encienden su nodo y su tachado con la
       misma clase, pero necesitan observarse aparte porque el CSS de
       view() no cubre estados que dependen de una clase. */
    var marked = list('.gl-scene, .gl-shift');

    if (marked.length) {
        if (!hasObserver) {
            marked.forEach(function (el) {
                el.classList.add('is-in');
            });
        } else {
            var markObserver = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-in');
                        markObserver.unobserve(entry.target);
                    });
                },
                { threshold: 0.3 }
            );

            marked.forEach(function (el) {
                markObserver.observe(el);
            });
        }
    }

    /* ══════════════════════════════════════════════
       5 · Reflector

       Un único pointermove en el documento. Se resuelve qué hay bajo
       el cursor con closest() en lugar de suscribir cada tarjeta:
       con veinte elementos serían veinte listeners haciendo el mismo
       trabajo.
       ══════════════════════════════════════════════ */

    if (finePointer) {
        var hero = document.querySelector('.gl-hero');
        var lit = null;
        var lastEvent = null;
        var pointerTicking = false;

        var applyPointer = function () {
            pointerTicking = false;

            var event = lastEvent;
            if (!event) return;

            /* Reflector del hero: se sigue moviendo mientras el
               puntero esté sobre él. */
            if (hero) {
                var stage = hero.getBoundingClientRect();

                if (
                    event.clientY >= stage.top &&
                    event.clientY <= stage.bottom
                ) {
                    hero.style.setProperty(
                        '--gl-mx',
                        ((event.clientX - stage.left) / stage.width * 100).toFixed(1) + '%'
                    );
                    hero.style.setProperty(
                        '--gl-my',
                        ((event.clientY - stage.top) / stage.height * 100).toFixed(1) + '%'
                    );
                }
            }

            /* Foco de las piezas interactivas. */
            var target = event.target.closest
                ? event.target.closest('.gl-card, .gl-btn')
                : null;

            if (lit && lit !== target) {
                lit.style.removeProperty('--gl-mx');
                lit.style.removeProperty('--gl-my');
                lit = null;
            }

            if (!target) return;

            var box = target.getBoundingClientRect();

            target.style.setProperty(
                '--gl-mx',
                ((event.clientX - box.left) / box.width * 100).toFixed(1) + '%'
            );
            target.style.setProperty(
                '--gl-my',
                ((event.clientY - box.top) / box.height * 100).toFixed(1) + '%'
            );

            lit = target;
        };

        document.addEventListener(
            'pointermove',
            function (event) {
                if (reduced()) return;
                lastEvent = event;
                if (pointerTicking) return;
                pointerTicking = true;
                requestAnimationFrame(applyPointer);
            },
            { passive: true }
        );
    }

    /* ══════════════════════════════════════════════
       6 · Cifras

       Solo las que ya están en el HTML: si el script no corre, el
       número correcto sigue ahí. El contador anima desde 0 hacia el
       valor que el propio HTML declara en data-to.
       ══════════════════════════════════════════════ */

    var counters = list('.gl-count[data-to]');

    if (counters.length && hasObserver) {
        var formatter = new Intl.NumberFormat('es-MX');

        var run = function (el) {
            var target = Number(el.dataset.to);
            if (!isFinite(target)) return;

            var suffix = el.dataset.suffix || '';

            if (reduced()) {
                el.textContent = formatter.format(target) + suffix;
                return;
            }

            var duration = 1100;
            var start = 0;

            var step = function (now) {
                if (!start) start = now;

                var t = clamp01((now - start) / duration);
                /* easeOutCubic: arranca rápido y frena, que es como se
                   lee un número que "sube". */
                var eased = 1 - Math.pow(1 - t, 3);

                el.textContent =
                    formatter.format(Math.round(target * eased)) + suffix;

                if (t < 1) requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        };

        var countObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    countObserver.unobserve(entry.target);
                    run(entry.target);
                });
            },
            { threshold: 0.6 }
        );

        counters.forEach(function (el) {
            /* Se reserva el ancho del valor final ANTES de animar. Sin
               esto el texto que va detrás se desplaza en cada
               fotograma, porque «0 semanales» ocupa menos que
               «12 semanales». */
            var target = Number(el.dataset.to);

            if (isFinite(target)) {
                el.style.setProperty(
                    '--digits',
                    String(formatter.format(target).length)
                );
            }

            countObserver.observe(el);
        });
    }

    /* ══════════════════════════════════════════════
       7 · Barra fija de conversión

       Aparece cuando el hero ya salió de pantalla y se retira al
       llegar al formulario: allí estorba y tapa los horarios.

       Se gestiona con inert + aria-hidden, no solo con opacidad: una
       barra invisible que sigue en el orden de tabulación es una
       trampa para quien navega con teclado.
       ══════════════════════════════════════════════ */

    var sticky = document.getElementById('gl-sticky');

    if (sticky && hasObserver) {
        var heroSeen = true;
        var formSeen = false;
        var revealed = false;

        var refresh = function () {
            var show = !heroSeen && !formSeen;

            if (show && !revealed) {
                /* Primera aparición: se quita `hidden` en un frame y
                   se desliza en el siguiente, si no la transición no
                   arranca. */
                revealed = true;
                sticky.removeAttribute('hidden');
                requestAnimationFrame(function () {
                    toggleAttr(sticky, 'data-shown', true);
                });
            } else if (revealed) {
                toggleAttr(sticky, 'data-shown', show);
            }

            setInert(sticky, !show);
            setAttr(sticky, 'aria-hidden', show ? 'false' : 'true');
        };

        var watch = function (selector, assign) {
            var el = document.querySelector(selector);
            if (!el) return;

            new IntersectionObserver(
                function (entries) {
                    assign(entries[0].isIntersecting);
                    refresh();
                },
                { threshold: 0 }
            ).observe(el);
        };

        watch('.gl-hero', function (v) { heroSeen = v; });
        watch('#agendar', function (v) { formSeen = v; });
    }

    /* ══════════════════════════════════════════════
       8 · Índice lateral de secciones

       Marca cuál se está leyendo. Un único IntersectionObserver con
       la ventana reducida a una banda central: así casi siempre hay
       una sola sección dentro y la marca no parpadea entre dos
       vecinas al cruzar el límite.

       Cuando aun así coinciden dos, gana la primera en el orden del
       documento. Comparar posiciones con getBoundingClientRect en
       cada callback costaba una relectura de layout por sección y
       daba el mismo resultado.
       ══════════════════════════════════════════════ */

    var secnav = document.querySelector('.gl-secnav');

    if (secnav && hasObserver) {
        var navMarks = list('a[href^="#"]', secnav)
            .map(function (link) {
                var section = document.getElementById(
                    link.getAttribute('href').slice(1)
                );

                return section
                    ? { link: link, section: section, visible: false }
                    : null;
            })
            .filter(Boolean);

        if (navMarks.length) {
            var paintNav = function () {
                var active = null;

                for (var i = 0; i < navMarks.length; i++) {
                    if (navMarks[i].visible) {
                        active = navMarks[i];
                        break;
                    }
                }

                navMarks.forEach(function (mark) {
                    if (mark === active) {
                        setAttr(mark.link, 'aria-current', 'true');
                    } else if (mark.link.hasAttribute('aria-current')) {
                        mark.link.removeAttribute('aria-current');
                    }
                });
            };

            var navObserver = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        for (var i = 0; i < navMarks.length; i++) {
                            if (navMarks[i].section === entry.target) {
                                navMarks[i].visible = entry.isIntersecting;
                                break;
                            }
                        }
                    });

                    paintNav();
                },
                { rootMargin: '-45% 0px -45% 0px' }
            );

            navMarks.forEach(function (mark) {
                navObserver.observe(mark.section);
            });
        }
    }

    /* ══════════════════════════════════════════════
       9 · Indicio de deslizamiento en la franja de la sesión

       El aviso "desliza para ver las 2 horas" solo tiene sentido si
       la franja de verdad no cabe. Anunciarlo siempre es ruido.
       ══════════════════════════════════════════════ */

    var clockWrap = document.querySelector('.gl-clock-wrap');
    var clockHint = document.querySelector('.gl-scroll-hint');

    if (clockWrap && clockHint) {
        var syncHint = function () {
            toggleAttr(
                clockHint,
                'hidden',
                clockWrap.scrollWidth <= clockWrap.clientWidth + 4
            );
        };

        if ('ResizeObserver' in window) {
            new ResizeObserver(syncHint).observe(clockWrap);
        } else {
            window.addEventListener('resize', syncHint, { passive: true });
        }

        syncHint();
    }

    /* ══════════════════════════════════════════════
       10 · Agendado

       Tres pasos: datos, horario, confirmación.

       Decisiones que se apartan del flujo anterior, con su motivo:

       · Los horarios son <input type="radio"> de verdad. El navegador
         regala navegación con flechas, agrupación y el anuncio
         "opción 3 de 6" en lectores de pantalla. Con <button> hay que
         reimplementar las tres cosas y nadie lo hace.

       · Elegir horario ya NO confirma la cita. Antes, tocar un
         horario abría WhatsApp: quien exploraba opciones acababa con
         una cita que no pidió.

       · WhatsApp se abre desde el clic de confirmar, que es un gesto
         del usuario. Abrirlo desde un setTimeout lo bloquea cualquier
         navegador, y ese era el punto donde se perdía el traspaso.
       ══════════════════════════════════════════════ */

    (function booking() {
        var form = document.getElementById('gl-form');
        if (!form) return;

        var WHATSAPP = '525578107837';
        var COURSE = 'Grandes Líderes';
        var SESSION_MINUTES = 60;

        /* Horarios por día de la semana, alineados con el horario de
           atención de la sede: L-J 9:00-18:00, V 9:00-17:00,
           S 8:00-15:00, domingo cerrado. El último inicio deja una
           hora completa antes de cerrar. */
        var SLOTS_BY_DAY = {
            0: [],
            1: ['15:00', '16:00', '17:00'],
            2: ['15:00', '16:00', '17:00'],
            3: ['15:00', '16:00', '17:00'],
            4: ['15:00', '16:00', '17:00'],
            5: ['15:00', '16:00'],
            6: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
        };

        var steps = list('[data-step]', form);
        var marks = list('.gl-steps span', form);
        var status = document.getElementById('gl-status');

        var fields = {
            name: document.getElementById('gl-name'),
            phone: document.getElementById('gl-phone'),
            child: document.getElementById('gl-child'),
            age: document.getElementById('gl-age'),
            consent: document.getElementById('gl-consent')
        };

        var dateInput = document.getElementById('gl-date');
        var slotsBox = document.getElementById('gl-slots');
        var confirmBtn = document.getElementById('gl-confirm');
        var gcalLink = document.getElementById('gl-gcal');
        var waLink = document.getElementById('gl-wa');
        var recap = document.getElementById('gl-recap');

        var current = 1;

        /* ── Utilidades de fecha ── */

        function pad(n) {
            return (n < 10 ? '0' : '') + n;
        }

        function isoDay(date) {
            return (
                date.getFullYear() + '-' +
                pad(date.getMonth() + 1) + '-' +
                pad(date.getDate())
            );
        }

        /** 'AAAA-MM-DD' → Date local. new Date('2026-08-01') lo lee
         *  como UTC y en México adelanta el día. */
        function parseDay(value) {
            var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
            if (!parts) return null;

            return new Date(
                Number(parts[1]),
                Number(parts[2]) - 1,
                Number(parts[3])
            );
        }

        var LONG_DATE = new Intl.DateTimeFormat('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        /* ── Errores ── */

        function say(message) {
            if (status) status.textContent = message;
        }

        function fail(field, message) {
            if (!field) return;

            var box = document.getElementById(field.id + '-err');
            if (box) box.textContent = message;

            setAttr(field, 'aria-invalid', 'true');
        }

        function clear(field) {
            if (!field) return;

            var box = document.getElementById(field.id + '-err');
            if (box) box.textContent = '';

            field.removeAttribute('aria-invalid');
        }

        /* ── Validación del paso 1 ── */

        function digits(value) {
            return String(value || '').replace(/\D/g, '');
        }

        function validateContact() {
            var problems = [];

            Object.keys(fields).forEach(function (key) {
                clear(fields[key]);
            });

            if (!fields.name || fields.name.value.trim().length < 2) {
                fail(fields.name, 'Escribe tu nombre.');
                problems.push(fields.name);
            }

            /* Diez dígitos es el mínimo que acepta el servidor: con
               menos, el aviso al equipo se descarta en silencio. */
            if (!fields.phone || digits(fields.phone.value).length < 10) {
                fail(fields.phone, 'Un WhatsApp a 10 dígitos, por favor.');
                problems.push(fields.phone);
            }

            if (!fields.child || fields.child.value.trim().length < 2) {
                fail(fields.child, 'Escribe el nombre de tu hijo o hija.');
                problems.push(fields.child);
            }

            if (!fields.age || !fields.age.value) {
                fail(fields.age, 'Elige un rango de edad.');
                problems.push(fields.age);
            }

            if (fields.consent && !fields.consent.checked) {
                fail(fields.consent, 'Necesitamos tu consentimiento para continuar.');
                problems.push(fields.consent);
            }

            /* Un campo ausente del DOM sería un error de plantilla, no
               del visitante: se filtra para no reventar el foco. */
            problems = problems.filter(Boolean);

            if (!problems.length) return true;

            say(
                problems.length === 1
                    ? 'Falta un dato para continuar.'
                    : 'Faltan ' + problems.length + ' datos para continuar.'
            );

            problems[0].focus();
            return false;
        }

        /* ── Navegación entre pasos ── */

        /**
         * @param {number} step
         * @param {boolean} moveFocus  En la carga inicial va en false:
         *        enfocar el encabezado desplazaría la página hasta el
         *        formulario sin que nadie lo haya pedido.
         */
        function goTo(step, moveFocus) {
            current = step;

            steps.forEach(function (panel) {
                var active = Number(panel.dataset.step) === step;
                toggleAttr(panel, 'data-active', active);
                /* inert saca del foco y del árbol de accesibilidad los
                   pasos que no están en pantalla: sin esto el tabulador
                   entra en campos invisibles. */
                setInert(panel, !active);
            });

            marks.forEach(function (mark, index) {
                toggleAttr(mark, 'data-done', index < step);
            });

            if (moveFocus === false) return;

            var heading = document.getElementById('gl-step-' + step + '-title');
            if (heading) heading.focus();
        }

        /* ── Horarios ── */

        function renderSlots() {
            if (!slotsBox) return;

            slotsBox.textContent = '';
            if (confirmBtn) confirmBtn.disabled = true;

            var day = parseDay(dateInput && dateInput.value);

            if (!day) {
                slotsBox.appendChild(
                    note('Elige una fecha para ver los horarios libres.')
                );
                return;
            }

            var available = SLOTS_BY_DAY[day.getDay()] || [];

            if (!available.length) {
                slotsBox.appendChild(
                    note('Los domingos no hay sesiones. Elige de lunes a sábado.')
                );
                say('Ese día no tiene horarios disponibles.');
                return;
            }

            /* Un fragmento: un solo reflow en lugar de uno por opción. */
            var fragment = document.createDocumentFragment();

            available.forEach(function (time, index) {
                var id = 'gl-slot-' + index;

                var label = document.createElement('label');
                label.className = 'course-time-slot';
                label.setAttribute('for', id);

                var radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'gl-slot';
                radio.id = id;
                radio.value = time;

                var text = document.createElement('span');
                text.textContent = time;

                label.appendChild(radio);
                label.appendChild(text);
                fragment.appendChild(label);
            });

            slotsBox.appendChild(fragment);
            say(
                available.length + ' horarios disponibles el ' +
                LONG_DATE.format(day) + '.'
            );
        }

        function note(message) {
            var p = document.createElement('p');
            p.className = 'gl-slots-empty';
            p.textContent = message;
            return p;
        }

        function pickedSlot() {
            var checked = slotsBox
                ? slotsBox.querySelector('input[name="gl-slot"]:checked')
                : null;

            return checked ? checked.value : '';
        }

        /* ── Confirmación ── */

        function calendarUrl(day, time, childName, phone) {
            var start = day.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';

            var endHour = Number(time.slice(0, 2)) +
                Math.floor((Number(time.slice(3, 5)) + SESSION_MINUTES) / 60);
            var endMinute = (Number(time.slice(3, 5)) + SESSION_MINUTES) % 60;

            var end = day.replace(/-/g, '') + 'T' +
                pad(endHour) + pad(endMinute) + '00';

            /* Se manda la hora local con ctz en lugar de convertir a
               UTC: así el evento cae a la hora correcta aunque el
               visitante viaje o cambie el horario de verano. */
            return 'https://calendar.google.com/calendar/render' +
                '?action=TEMPLATE' +
                '&text=' + encodeURIComponent('Sesión diagnóstica · ' + COURSE + ' · WorldBrain') +
                '&dates=' + start + '/' + end +
                '&ctz=America/Mexico_City' +
                '&details=' + encodeURIComponent(
                    'Sesión de diagnóstico para ' + childName +
                    '. Contacto: ' + phone + '.'
                ) +
                '&location=' + encodeURIComponent(
                    'WorldBrain México · Cuautitlán Izcalli, Estado de México'
                );
        }

        /* No se llama `confirm`: ese nombre sombrea window.confirm y el
           siguiente que edite el archivo se lleva una sorpresa. */
        function confirmBooking() {
            var time = pickedSlot();
            var day = dateInput ? dateInput.value : '';

            if (!day || !time) {
                say('Elige fecha y horario para confirmar.');
                return;
            }

            var parent = fields.name.value.trim();
            var phone = fields.phone.value.trim();
            var child = fields.child.value.trim();
            var age = fields.age.value;

            var who = child + ' (' + age + ' años) · contacto: ' + parent;

            /* El aviso va ANTES de abrir WhatsApp: esa pestaña puede
               descargar este documento en móvil. lead-report.js usa
               keepalive para que la petición termine igual. */
            if (typeof window.reportLead === 'function') {
                window.reportLead({
                    stage: 'confirmado',
                    name: who,
                    phone: phone,
                    course: COURSE,
                    date: day,
                    time: time
                });
            }

            var parsed = parseDay(day);
            var pretty = parsed ? LONG_DATE.format(parsed) : day;

            if (recap) {
                recap.textContent = pretty + ' a las ' + time + ' h';
            }

            if (gcalLink) {
                gcalLink.href = calendarUrl(day, time, child, phone);
            }

            var message =
                'Hola, acabo de agendar una sesión de diagnóstico para el curso ' +
                COURSE + '.\n\n' +
                'Fecha: ' + pretty + '\n' +
                'Hora: ' + time + '\n' +
                'Contacto: ' + parent + '\n' +
                'Alumno: ' + child + ' (' + age + ' años)\n' +
                'WhatsApp: ' + phone + '\n\n' +
                'Quedo pendiente de la confirmación.';

            var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message);

            if (waLink) waLink.href = url;

            goTo(3);
            say('Cita registrada. Te contactamos por WhatsApp para confirmarla.');

            /* Se abre desde el propio clic, así que ningún bloqueador
               lo descarta. Si aun así falla, el paso 3 tiene el mismo
               enlace a la vista. */
            window.open(url, '_blank', 'noopener');
        }

        /* ── Delegación: un solo listener para todo el formulario ── */

        form.addEventListener('click', function (event) {
            var action = event.target.closest('[data-action]');
            if (!action) return;

            event.preventDefault();

            switch (action.dataset.action) {
                case 'next':
                    if (!validateContact()) return;

                    /* Aviso temprano: si abandona al elegir horario, el
                       lead ya llegó al equipo en lugar de perderse. */
                    if (typeof window.reportLead === 'function') {
                        window.reportLead({
                            stage: 'contacto',
                            name: fields.child.value.trim() +
                                ' (' + fields.age.value + ' años) · contacto: ' +
                                fields.name.value.trim(),
                            phone: fields.phone.value.trim(),
                            course: COURSE
                        });
                    }

                    goTo(2);
                    say('Elige el día y la hora que te acomoden.');
                    break;

                case 'back':
                    goTo(1);
                    break;

                case 'confirm':
                    confirmBooking();
                    break;
            }
        });

        /* Al escribir se retira el error del campo: mantenerlo
           mientras el visitante ya lo está corrigiendo es hostil. */
        form.addEventListener('input', function (event) {
            var field = event.target;
            if (field.id && document.getElementById(field.id + '-err')) {
                clear(field);
            }
        });

        form.addEventListener('change', function (event) {
            if (event.target === dateInput) {
                renderSlots();
                return;
            }

            if (event.target.name === 'gl-slot') {
                if (confirmBtn) confirmBtn.disabled = false;

                /* Respaldo visual donde :has() no existe. */
                list('.course-time-slot', slotsBox).forEach(function (label) {
                    var input = label.querySelector('input');
                    label.classList.toggle('is-picked', !!(input && input.checked));
                });
            }
        });

        /* El formulario no se envía al servidor: el paso 1 no debe
           recargar la página si alguien pulsa Enter. */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (current === 1) {
                var next = form.querySelector('[data-action="next"]');
                if (next) next.click();
            }
        });

        /* ── Estado inicial ── */

        if (dateInput) {
            var today = new Date();
            var horizon = new Date(today.getTime() + 90 * 86400000);

            dateInput.min = isoDay(today);
            dateInput.max = isoDay(horizon);
        }

        goTo(1, false);
        renderSlots();
    })();

    /* ══════════════════════════════════════════════
       11 · Listener de scroll

       Se instala al final y SOLO si alguna pieza se registró. En un
       navegador con scroll-driven animations, esta página no escucha
       el scroll en absoluto.
       ══════════════════════════════════════════════ */

    if (painters.length) {
        window.addEventListener('scroll', requestScrollFrame, { passive: true });
        window.addEventListener('resize', requestScrollFrame, { passive: true });
    }
})();
