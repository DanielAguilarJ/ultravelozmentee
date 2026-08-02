/* ══════════════════════════════════════════════════════════════════
   ALFA-CASH · WorldBrain México
   Avance de lectura, revelado, cifras, diagnóstico de idoneidad,
   barra de precio y formulario. Vanilla JS, cero dependencias.

   Criterios que se respetan en TODO el archivo. Cada uno nació de un
   bug real en otra página de este sitio:

   1 · Un solo listener de scroll y uno de pointermove, ambos
       regulados con requestAnimationFrame. Nada de un rAF por
       tarjeta.

   2 · Donde el navegador trae scroll-driven animations, el trabajo lo
       hace el CSS y aquí NO se registra el listener.

   3 · prefers-reduced-motion se consulta en el momento de animar, no
       al cargar: el sistema puede cambiarlo con la pestaña abierta.

   4 · Los efectos de puntero solo se montan si hay puntero fino.

   5 · Cero handlers en atributos del HTML. Todo por delegación.

   ── Sobre el diagnóstico ──

   Sustituye a la "calculadora de fuga presupuestal" de la versión
   anterior, que multiplicaba un presupuesto por un porcentaje
   inventado, lo presentaba como "dinero que estás perdiendo" y lo
   dividía entre el precio para fabricar un retorno. Aquí el
   cuestionario CALIFICA: con pocas señales devuelve "probablemente no
   es para ti" y lo dice en pantalla. Un diagnóstico que nunca dice no
   no es un diagnóstico, es un anuncio.
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

    /* Escritura idempotente: no encola mutaciones que no cambian nada,
       que es lo que dispara bucles de observadores. */
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

    /* inert como propiedad Y como atributo: la propiedad para quien lo
       implementa de forma nativa, el atributo para los polyfills. */
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
    var ticking = false;

    function frame() {
        ticking = false;
        for (var i = 0; i < painters.length; i++) painters[i]();
    }

    function request() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(frame);
    }

    function addPainter(fn) {
        painters.push(fn);
        fn();
    }

    /* ══════════════════════════════════════════════
       2 · Avance de lectura
       Solo se calcula aquí si el navegador no sabe hacerlo con
       animation-timeline: scroll().
       ══════════════════════════════════════════════ */

    var folio = document.querySelector('.ac-folio-bar');

    if (folio && (!hasScrollTimeline || reduced())) {
        addPainter(function () {
            var doc = document.documentElement;
            var scrollable = doc.scrollHeight - doc.clientHeight;

            folio.style.setProperty(
                '--ac-progress',
                scrollable > 0
                    ? clamp01(doc.scrollTop / scrollable).toFixed(4)
                    : '0'
            );
        });
    }

    /* ══════════════════════════════════════════════
       3 · Trazado de la serie del gráfico
       Con animation-timeline: view() lo hace el CSS. El respaldo
       escribe --ac-draw de 0 a 1 según el gráfico cruza la pantalla.
       ══════════════════════════════════════════════ */

    var plots = list('.ac-plot');

    if (plots.length && !hasViewTimeline) {
        if (reduced()) {
            plots.forEach(function (plot) {
                plot.style.setProperty('--ac-draw', '1');
            });
        } else {
            addPainter(function () {
                var viewport = window.innerHeight;

                for (var i = 0; i < plots.length; i++) {
                    var rect = plots[i].getBoundingClientRect();

                    /* Fuera de pantalla no se calcula nada. */
                    if (rect.bottom < -160 || rect.top > viewport + 160) continue;

                    var from = viewport * 0.9;
                    var to = viewport * 0.35;
                    var span = from - to;

                    plots[i].style.setProperty(
                        '--ac-draw',
                        span > 0 ? clamp01((from - rect.top) / span).toFixed(3) : '1'
                    );
                }
            });
        }
    }

    /* ══════════════════════════════════════════════
       4 · Revelado al entrar en pantalla
       El escalonado va en una custom property (--d) y lo aplica el CSS
       como transition-delay. Aquí no hay un solo setTimeout: con
       temporizadores, al hacer scroll rápido los bloques aparecen
       desordenados.
       ══════════════════════════════════════════════ */

    var rises = list('.ac-rise');

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
                { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
            );

            rises.forEach(function (el) {
                riseObserver.observe(el);
            });
        }
    }

    /* ══════════════════════════════════════════════
       5 · Barrido del puntero
       Un único pointermove en el documento. Se resuelve qué hay bajo
       el cursor con closest() en lugar de suscribir cada pieza.
       ══════════════════════════════════════════════ */

    if (finePointer) {
        var hero = document.querySelector('.ac-hero');
        var lit = null;
        var lastEvent = null;
        var pointerTicking = false;

        var applyPointer = function () {
            pointerTicking = false;

            var event = lastEvent;
            if (!event) return;

            if (hero) {
                var stage = hero.getBoundingClientRect();

                if (event.clientY >= stage.top && event.clientY <= stage.bottom) {
                    hero.style.setProperty(
                        '--ac-mx',
                        ((event.clientX - stage.left) / stage.width * 100).toFixed(1) + '%'
                    );
                    hero.style.setProperty(
                        '--ac-my',
                        ((event.clientY - stage.top) / stage.height * 100).toFixed(1) + '%'
                    );
                }
            }

            var target = event.target.closest
                ? event.target.closest('.ac-kit > li, .ac-btn')
                : null;

            if (lit && lit !== target) {
                lit.style.removeProperty('--ac-mx');
                lit.style.removeProperty('--ac-my');
                lit = null;
            }

            if (!target) return;

            var box = target.getBoundingClientRect();

            target.style.setProperty(
                '--ac-mx',
                ((event.clientX - box.left) / box.width * 100).toFixed(1) + '%'
            );
            target.style.setProperty(
                '--ac-my',
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
       número correcto sigue ahí. Se reserva su ancho antes de animar,
       porque en cifras tabulares «0» y «12» no miden lo mismo y el
       texto que sigue se desplazaría en cada fotograma.
       ══════════════════════════════════════════════ */

    var counters = list('.ac-count[data-to]');

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

            var duration = 1000;
            var start = 0;

            var step = function (now) {
                if (!start) start = now;

                var t = clamp01((now - start) / duration);
                /* easeOutCubic: arranca rápido y frena, que es como se
                   lee un número que sube. */
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
       7 · Barra de precio
       Aparece cuando el hero ya salió y se retira al llegar al
       formulario: allí estorba y tapa los campos.

       Se gestiona con inert + aria-hidden, no solo con desplazamiento:
       una barra fuera de pantalla que sigue en el orden de tabulación
       es una trampa para quien navega con teclado.
       ══════════════════════════════════════════════ */

    var rail = document.getElementById('ac-rail');

    if (rail && hasObserver) {
        var heroSeen = true;
        var formSeen = false;
        var revealed = false;

        var refresh = function () {
            var show = !heroSeen && !formSeen;

            if (show && !revealed) {
                /* Primera aparición: se quita `hidden` en un frame y se
                   desliza en el siguiente, si no la transición no
                   arranca. */
                revealed = true;
                rail.removeAttribute('hidden');
                requestAnimationFrame(function () {
                    toggleAttr(rail, 'data-shown', true);
                });
            } else if (revealed) {
                toggleAttr(rail, 'data-shown', show);
            }

            setInert(rail, !show);
            setAttr(rail, 'aria-hidden', show ? 'false' : 'true');
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

        watch('.ac-hero', function (v) { heroSeen = v; });
        watch('#inscripcion', function (v) { formSeen = v; });
    }

    /* ══════════════════════════════════════════════
       8 · Indicio de deslizamiento del calendario
       El aviso «desliza» solo tiene sentido si la franja de verdad no
       cabe. Anunciarlo siempre es ruido, y no anunciarlo cuando hace
       falta deja al visitante sin ver la mitad del calendario.
       ══════════════════════════════════════════════ */

    var weeksWrap = document.querySelector('.ac-weeks-wrap');
    var weeksHint = document.querySelector('.ac-hint');

    if (weeksWrap && weeksHint) {
        var syncHint = function () {
            toggleAttr(
                weeksHint,
                'hidden',
                weeksWrap.scrollWidth <= weeksWrap.clientWidth + 4
            );
        };

        if ('ResizeObserver' in window) {
            new ResizeObserver(syncHint).observe(weeksWrap);
        } else {
            window.addEventListener('resize', syncHint, { passive: true });
        }

        syncHint();
    }

    /* ══════════════════════════════════════════════
       9 · Diagnóstico de idoneidad

       Cinco preguntas, cada una con tres opciones que valen 0, 1 o 2.
       El puntaje se normaliza a 100 y cae en uno de tres veredictos.

       El umbral bajo NO recomienda el programa y ofrece a dónde ir en
       su lugar. Eso no es generosidad: un lead que no encaja cuesta
       más en soporte y devoluciones de lo que aporta, y decirlo por
       adelantado es lo que hace creíble el resto de la página.
       ══════════════════════════════════════════════ */

    (function diagnostic() {
        var quiz = document.getElementById('ac-quiz');
        var verdict = document.getElementById('ac-verdict');
        if (!quiz || !verdict) return;

        var scoreEl = document.getElementById('ac-score');
        var meterEl = document.getElementById('ac-meter');
        var labelEl = document.getElementById('ac-verdict-label');
        var titleEl = document.getElementById('ac-verdict-title');
        var textEl = document.getElementById('ac-verdict-text');
        var ctaEl = document.getElementById('ac-verdict-cta');
        var answeredEl = document.getElementById('ac-answered');

        var questions = list('.ac-q', quiz);
        var total = questions.length;

        /* Cada veredicto lleva su copia completa: así el texto vive en
           un solo lugar y no se arma concatenando frases. */
        var VERDICTS = {
            alto: {
                label: 'Encaja bien',
                title: 'Sí, este programa es para tu caso',
                text: 'Administras recursos, rindes cuentas y ya te has topado con ' +
                    'los tres problemas que resuelve el temario. Aprovecharías el ' +
                    'programa desde el primer módulo.',
                cta: 'Ver la inversión y apartar lugar'
            },
            medio: {
                label: 'Encaja en parte',
                title: 'Puede servirte, pero conviene revisarlo antes',
                text: 'Hay coincidencia en algunos puntos y no en otros. Antes de ' +
                    'inscribirte, escríbenos con tu caso: si vemos que no vas a ' +
                    'aprovecharlo, te lo decimos.',
                cta: 'Consultar mi caso por WhatsApp'
            },
            bajo: {
                label: 'Probablemente no',
                title: 'Con estas respuestas, no te lo recomendamos',
                text: 'El programa asume que administras un presupuesto y que tienes ' +
                    'que justificarlo ante alguien. Si no es tu caso, pagarías por ' +
                    'algo que no vas a usar. Redacción Ejecutiva o Neurocomunicación ' +
                    'encajan mejor con ese perfil.',
                cta: 'Ver otros programas'
            }
        };

        var CTA_HREF = {
            alto: '#inversion',
            medio: 'https://wa.me/525578107837?text=' +
                encodeURIComponent('Hola, hice el diagnóstico de ALFA-CASH y quiero revisar si me conviene.'),
            bajo: '#otros'
        };

        function score() {
            var sum = 0;
            var answered = 0;

            questions.forEach(function (q) {
                var picked = q.querySelector('input:checked');
                if (!picked) return;
                answered++;
                sum += Number(picked.value) || 0;
            });

            return { sum: sum, answered: answered };
        }

        function paint() {
            var s = score();
            var max = total * 2;
            var pct = max ? Math.round(s.sum / max * 100) : 0;

            if (answeredEl) {
                answeredEl.textContent = s.answered + ' de ' + total;
            }

            if (meterEl) {
                meterEl.style.setProperty('--ac-score', String(pct));
            }

            if (scoreEl) {
                scoreEl.textContent = pct;
            }

            /* Sin responder todo no se emite veredicto: un resultado a
               medias con las primeras dos respuestas es engañoso. */
            if (s.answered < total) {
                setAttr(verdict, 'data-verdict', 'parcial');
                if (labelEl) labelEl.textContent = 'Sin completar';
                if (titleEl) titleEl.textContent = 'Responde las cinco preguntas';
                if (textEl) {
                    textEl.textContent = 'Al terminar te decimos si el programa ' +
                        'encaja con tu caso, incluso si la respuesta es que no.';
                }
                if (ctaEl) {
                    ctaEl.hidden = true;
                    setInert(ctaEl, true);
                }
                return;
            }

            var key = pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo';
            var v = VERDICTS[key];

            setAttr(verdict, 'data-verdict', key);
            if (labelEl) labelEl.textContent = v.label;
            if (titleEl) titleEl.textContent = v.title;
            if (textEl) textEl.textContent = v.text;

            if (ctaEl) {
                ctaEl.hidden = false;
                setInert(ctaEl, false);
                ctaEl.textContent = v.cta;
                ctaEl.href = CTA_HREF[key];

                /* El enlace externo se abre en otra pestaña; los
                   internos, no. Sin esto WhatsApp reemplazaba la
                   página y se perdía el diagnóstico. */
                if (CTA_HREF[key].indexOf('http') === 0) {
                    ctaEl.target = '_blank';
                    ctaEl.rel = 'noopener noreferrer';
                } else {
                    ctaEl.removeAttribute('target');
                    ctaEl.removeAttribute('rel');
                }
            }

            /* El resultado viaja con el lead si después se envía el
               formulario: el equipo llama sabiendo el perfil. */
            window.__acDiagnostic = { pct: pct, key: key };
        }

        /* Un solo listener para las quince opciones. */
        quiz.addEventListener('change', function (event) {
            if (event.target.type !== 'radio') return;

            /* Respaldo visual donde :has() no existe. */
            list('.ac-opt', quiz).forEach(function (opt) {
                var input = opt.querySelector('input');
                opt.classList.toggle('is-on', !!(input && input.checked));
            });

            paint();
        });

        paint();
    })();

    /* ══════════════════════════════════════════════
       10 · Formulario

       No hay pasarela de pago en esta página: el formulario apunta el
       lead y abre WhatsApp para cerrar. Por eso lo importante es que
       el aviso a /api/bookings salga SIEMPRE y salga antes de abrir la
       otra pestaña, que en móvil puede descargar este documento.
       ══════════════════════════════════════════════ */

    (function enrollment() {
        var form = document.getElementById('ac-form');
        if (!form) return;

        var WHATSAPP = '525578107837';
        var COURSE = 'ALFA-CASH';

        var status = document.getElementById('ac-status');
        var waLink = document.getElementById('ac-wa');

        var fields = {
            name: document.getElementById('ac-name'),
            phone: document.getElementById('ac-phone'),
            role: document.getElementById('ac-role'),
            org: document.getElementById('ac-org'),
            consent: document.getElementById('ac-consent')
        };

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

        function digits(value) {
            return String(value || '').replace(/\D/g, '');
        }

        function validate() {
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

            if (!fields.role || !fields.role.value) {
                fail(fields.role, 'Elige el puesto que más se parezca al tuyo.');
                problems.push(fields.role);
            }

            if (fields.consent && !fields.consent.checked) {
                fail(fields.consent, 'Necesitamos tu consentimiento para contactarte.');
                problems.push(fields.consent);
            }

            problems = problems.filter(Boolean);

            if (!problems.length) return true;

            say(
                problems.length === 1
                    ? 'Falta un dato para enviar.'
                    : 'Faltan ' + problems.length + ' datos para enviar.'
            );

            problems[0].focus();
            return false;
        }

        function send() {
            if (!validate()) return;

            var name = fields.name.value.trim();
            var phone = fields.phone.value.trim();
            var role = fields.role.value;
            var org = fields.org ? fields.org.value.trim() : '';

            var diag = window.__acDiagnostic;

            var who = name + ' · ' + role +
                (org ? ' · ' + org : '') +
                (diag ? ' · diagnóstico ' + diag.pct + '/100 (' + diag.key + ')' : '');

            /* El aviso va ANTES de abrir WhatsApp: esa pestaña puede
               descargar este documento en móvil. lead-report.js usa
               keepalive para que la petición termine igual. */
            if (typeof window.reportLead === 'function') {
                window.reportLead({
                    stage: 'contacto',
                    name: who,
                    phone: phone,
                    course: COURSE
                });
            }

            var message =
                'Hola, quiero apartar lugar en ' + COURSE + '.\n\n' +
                'Nombre: ' + name + '\n' +
                'Puesto: ' + role + '\n' +
                (org ? 'Dependencia o empresa: ' + org + '\n' : '') +
                'WhatsApp: ' + phone + '\n' +
                (diag ? 'Diagnóstico de idoneidad: ' + diag.pct + '/100\n' : '') +
                '\nQuedo pendiente de las formas de pago y la próxima fecha de inicio.';

            var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message);

            if (waLink) waLink.href = url;

            toggleAttr(form, 'data-sent', true);
            say('Datos registrados. Te contactamos por WhatsApp en horario de oficina.');

            var heading = document.getElementById('ac-done-title');
            if (heading) heading.focus();

            /* Se abre desde el propio clic, así que ningún bloqueador
               lo descarta. Si aun así falla, la pantalla de
               confirmación tiene el mismo enlace a la vista. */
            window.open(url, '_blank', 'noopener');
        }

        form.addEventListener('click', function (event) {
            var action = event.target.closest('[data-action]');
            if (!action) return;

            event.preventDefault();

            if (action.dataset.action === 'send') send();
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
            var field = event.target;
            if (field.id && document.getElementById(field.id + '-err')) {
                clear(field);
            }
        });

        /* El formulario no se envía al servidor: no debe recargar la
           página si alguien pulsa Enter. */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            send();
        });
    })();

    /* ══════════════════════════════════════════════
       11 · Listener de scroll
       Se instala al final y SOLO si alguna pieza se registró. En un
       navegador con scroll-driven animations, esta página no escucha
       el scroll en absoluto.
       ══════════════════════════════════════════════ */

    if (painters.length) {
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request, { passive: true });
    }
})();
