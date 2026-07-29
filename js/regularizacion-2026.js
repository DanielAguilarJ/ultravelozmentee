/* ══════════════════════════════════════════════════════════════════
   REGULARIZACIÓN · WorldBrain México
   Interacciones: diagnóstico de 5 minutos, explorador de temario,
   stepper del método, contadores y barra de conversión.

   Vanilla JS, cero dependencias. Respeta prefers-reduced-motion.

   Nota de diseño: NINGÚN callback de MutationObserver escribe un
   atributo que su propio attributeFilter observe. Ese patrón provoca
   un bucle infinito de microtareas que congela la pestaña. Aquí los
   pasos del formulario se sincronizan desde los eventos que los
   provocan (submit / click), no observando el DOM.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    /* Escritura idempotente: evita mutaciones inútiles del DOM. */
    function setAttr(el, name, value) {
        if (!el) return;
        if (el.getAttribute(name) === value) return;
        el.setAttribute(name, value);
    }

    function setInert(el, state) {
        if (!el) return;
        if (el.inert !== state) el.inert = state;
        if (el.hasAttribute('inert') === state) return;
        if (state) {
            el.setAttribute('inert', '');
        } else {
            el.removeAttribute('inert');
        }
    }

    /* ══════════════════════════════════════════════
       1 · Reveal de respaldo
       Si el navegador soporta animation-timeline, el CSS ya lo hace
       de forma nativa y aquí no se toca nada.
       ══════════════════════════════════════════════ */
    var supportsScrollDriven =
        window.CSS &&
        CSS.supports &&
        CSS.supports('animation-timeline: view()');

    var revealEls = document.querySelectorAll('.rg-reveal');

    if (!supportsScrollDriven) {
        if (!('IntersectionObserver' in window) || reducedMotion) {
            revealEls.forEach(function (el) {
                el.classList.add('is-in');
            });
        } else {
            var revealObs = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-in');
                        revealObs.unobserve(entry.target);
                    });
                },
                { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
            );

            revealEls.forEach(function (el) {
                revealObs.observe(el);
            });
        }
    }

    /* ══════════════════════════════════════════════
       2 · Stepper del método A · B · C
       Resalta el paso que el lector tiene delante.
       ══════════════════════════════════════════════ */
    var methodSteps = Array.prototype.slice.call(
        document.querySelectorAll('.rg-method-step')
    );

    if (methodSteps.length && 'IntersectionObserver' in window) {
        var methodObs = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    entry.target.classList.toggle(
                        'is-active',
                        entry.isIntersecting
                    );
                });
            },
            { threshold: 0.55 }
        );

        methodSteps.forEach(function (step) {
            methodObs.observe(step);
        });
    } else {
        methodSteps.forEach(function (step) {
            step.classList.add('is-active');
        });
    }

    /* ══════════════════════════════════════════════
       3 · Contadores
       ══════════════════════════════════════════════ */
    var counters = Array.prototype.slice.call(
        document.querySelectorAll('[data-count]')
    );

    function runCounter(el) {
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var decimals = (el.dataset.count.split('.')[1] || '').length;

        if (reducedMotion) {
            el.textContent = target.toFixed(decimals) + suffix;
            return;
        }

        var duration = 1400;
        var start = null;

        function frame(now) {
            if (start === null) start = now;

            var progress = Math.min((now - start) / duration, 1);
            /* easeOutExpo: arranca rápido y asienta, se lee mejor */
            var eased = progress === 1
                ? 1
                : 1 - Math.pow(2, -10 * progress);

            el.textContent =
                (target * eased).toFixed(decimals) + suffix;

            if (progress < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    if (counters.length) {
        if ('IntersectionObserver' in window) {
            var countObs = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        runCounter(entry.target);
                        countObs.unobserve(entry.target);
                    });
                },
                { threshold: 0.6 }
            );

            counters.forEach(function (el) {
                countObs.observe(el);
            });
        } else {
            counters.forEach(runCounter);
        }
    }

    /* ══════════════════════════════════════════════
       4 · Diagnóstico de 5 minutos
       Diez reactivos tomados del temario real, dos o tres por área.
       Devuelve un perfil por área, no una calificación global: el
       objetivo es señalar dónde empezar, no premiar ni castigar.
       ══════════════════════════════════════════════ */
    var AREAS = {
        aritmetico: 'Razonamiento aritmético',
        algebraico: 'Razonamiento algebraico',
        estadistico: 'Razonamiento estadístico y probabilístico',
        geometrico: 'Razonamiento geométrico'
    };

    var QUESTIONS = [
        {
            area: 'aritmetico',
            q: '¿Cuál de estos números es mayor?',
            opts: ['−12', '−7', '−20', '−15'],
            right: 1,
            tema: 'Ubicación de positivos y negativos'
        },
        {
            area: 'aritmetico',
            q: 'Si 4 cuadernos cuestan $28, ¿cuánto cuestan 7 cuadernos?',
            opts: ['$42', '$49', '$56', '$35'],
            right: 1,
            tema: 'Problemas con razones y proporciones'
        },
        {
            area: 'aritmetico',
            q: '¿Cuál es el mínimo común múltiplo de 6 y 8?',
            opts: ['12', '24', '48', '14'],
            right: 1,
            tema: 'Mínimo común múltiplo y máximo común divisor'
        },
        {
            area: 'algebraico',
            q: '«El doble de un número, disminuido en 5» se escribe:',
            opts: ['2(x − 5)', '2x − 5', 'x² − 5', '5 − 2x'],
            right: 1,
            tema: 'Lenguaje algebraico: simbolización'
        },
        {
            area: 'algebraico',
            q: 'El resultado de (x + 3)² es:',
            opts: [
                'x² + 9',
                'x² + 3x + 9',
                'x² + 6x + 9',
                'x² + 6x + 3'
            ],
            right: 2,
            tema: 'Binomio al cuadrado'
        },
        {
            area: 'algebraico',
            q: 'Si 3x − 7 = 14, entonces x vale:',
            opts: ['3', '7', '21', '9'],
            right: 1,
            tema: 'Ecuaciones de primer grado'
        },
        {
            area: 'estadistico',
            q: '¿Cuál es la media de 4, 8, 6 y 10?',
            opts: ['6', '7', '8', '6.5'],
            right: 1,
            tema: 'Problemas de media'
        },
        {
            area: 'estadistico',
            q: 'Al lanzar un dado de seis caras, la probabilidad de obtener un número par es:',
            opts: ['1/6', '1/3', '1/2', '2/3'],
            right: 2,
            tema: 'Cálculo de probabilidad'
        },
        {
            area: 'geometrico',
            q: 'En un triángulo rectángulo, si los catetos miden 3 y 4, la hipotenusa mide:',
            opts: ['5', '6', '7', '12'],
            right: 0,
            tema: 'Teorema de Pitágoras'
        },
        {
            area: 'geometrico',
            q: 'El área de un triángulo de base 10 y altura 6 es:',
            opts: ['60', '30', '16', '32'],
            right: 1,
            tema: 'Triángulos: área y perímetro'
        }
    ];

    var quiz = document.getElementById('rg-quiz');

    if (quiz) {
        var TOTAL_SECONDS = 300; /* los 5 minutos del método */

        var elIntro = document.getElementById('rg-quiz-intro');
        var elPlay = document.getElementById('rg-quiz-play');
        var elDone = document.getElementById('rg-quiz-done');
        var elStart = document.getElementById('rg-quiz-start');
        var elRetry = document.getElementById('rg-quiz-retry');
        var elTimer = document.getElementById('rg-quiz-time');
        var elIndex = document.getElementById('rg-quiz-index');
        var elBar = document.getElementById('rg-quiz-bar');
        var elArea = document.getElementById('rg-quiz-area');
        var elQ = document.getElementById('rg-quiz-q');
        var elOpts = document.getElementById('rg-quiz-opts');
        var elHint = document.getElementById('rg-quiz-hint');
        var elResults = document.getElementById('rg-quiz-results');
        var elVerdict = document.getElementById('rg-quiz-verdict');

        var current = 0;
        var locked = false;
        var remaining = TOTAL_SECONDS;
        var tick = null;
        var score = {};

        function resetScore() {
            score = {};
            Object.keys(AREAS).forEach(function (key) {
                score[key] = { right: 0, total: 0 };
            });
        }

        function show(panel) {
            [elIntro, elPlay, elDone].forEach(function (el) {
                if (el) el.classList.add('rg-hidden');
            });
            if (panel) panel.classList.remove('rg-hidden');
        }

        function paintTime() {
            var mins = Math.floor(remaining / 60);
            var secs = remaining % 60;

            elTimer.textContent =
                mins + ':' + String(secs).padStart(2, '0');

            elTimer.classList.toggle('is-low', remaining <= 30);
        }

        function stopTimer() {
            if (tick) {
                clearInterval(tick);
                tick = null;
            }
        }

        function renderQuestion() {
            var item = QUESTIONS[current];

            locked = false;

            elArea.textContent = AREAS[item.area];
            elQ.textContent = item.q;
            elIndex.textContent =
                'Reactivo ' + (current + 1) + ' de ' + QUESTIONS.length;

            elBar.style.width =
                (current / QUESTIONS.length) * 100 + '%';

            elHint.textContent = '';
            elOpts.innerHTML = '';

            item.opts.forEach(function (text, i) {
                var btn = document.createElement('button');

                btn.type = 'button';
                btn.className = 'rg-q-opt';
                btn.innerHTML =
                    '<kbd>' + String.fromCharCode(65 + i) + '</kbd>' +
                    '<span></span>';

                btn.querySelector('span').textContent = text;

                btn.addEventListener('click', function () {
                    answer(i, btn);
                });

                elOpts.appendChild(btn);
            });
        }

        function answer(choice, btn) {
            if (locked) return;

            locked = true;

            var item = QUESTIONS[current];
            var correct = choice === item.right;

            score[item.area].total += 1;
            if (correct) score[item.area].right += 1;

            var buttons = elOpts.querySelectorAll('.rg-q-opt');

            buttons.forEach(function (b, i) {
                b.disabled = true;
                if (i === item.right) b.classList.add('is-right');
            });

            if (!correct) btn.classList.add('is-wrong');

            elHint.textContent = correct
                ? '✓ Correcto · ' + item.tema
                : '✗ Tema por repasar: ' + item.tema;

            window.setTimeout(function () {
                current += 1;

                if (current >= QUESTIONS.length) {
                    finish();
                } else {
                    renderQuestion();
                }
            }, correct ? 700 : 1250);
        }

        function finish() {
            stopTimer();
            elBar.style.width = '100%';

            var totalRight = 0;
            var totalAsked = 0;

            elResults.innerHTML = '';

            Object.keys(AREAS).forEach(function (key) {
                var data = score[key];

                if (!data.total) return;

                var pct = Math.round((data.right / data.total) * 100);

                totalRight += data.right;
                totalAsked += data.total;

                var row = document.createElement('div');
                row.className = 'rg-result-row';

                var name = document.createElement('span');
                name.textContent = AREAS[key];

                var val = document.createElement('b');
                val.textContent = data.right + '/' + data.total;

                var track = document.createElement('div');
                track.className = 'rg-result-track';

                var fill = document.createElement('i');
                if (pct < 50) {
                    fill.className = 'low';
                } else if (pct < 80) {
                    fill.className = 'mid';
                }

                track.appendChild(fill);
                row.appendChild(name);
                row.appendChild(val);
                row.appendChild(track);
                elResults.appendChild(row);

                /* Se pinta en el siguiente frame para que la
                   transición de ancho sí se vea. */
                requestAnimationFrame(function () {
                    fill.style.width = pct + '%';
                });
            });

            var weakest = null;

            Object.keys(AREAS).forEach(function (key) {
                var data = score[key];
                if (!data.total) return;

                var pct = data.right / data.total;

                if (!weakest || pct < weakest.pct) {
                    weakest = { key: key, pct: pct };
                }
            });

            var headline;
            var body;

            if (totalAsked === 0) {
                headline = 'No alcanzó el tiempo';
                body = 'Se terminaron los 5 minutos antes del primer ' +
                    'reactivo. En la clase de diagnóstico el examen se ' +
                    'aplica sin prisa y con un instructor al lado.';
            } else if (totalRight === totalAsked) {
                headline = 'Base sólida en lo que alcanzaste a responder';
                body = 'Respondiste ' + totalRight + ' de ' + totalAsked +
                    ' sin errores. El diagnóstico completo cubre el ' +
                    'temario de los seis semestres y sirve para ubicar ' +
                    'el punto exacto donde conviene continuar.';
            } else {
                headline = 'Tu punto de partida está en ' +
                    AREAS[weakest.key].toLowerCase();
                body = 'Acertaste ' + totalRight + ' de ' + totalAsked +
                    '. Este ejercicio es una muestra de 10 reactivos: el ' +
                    'diagnóstico real cubre el temario completo y lo ' +
                    'revisa un instructor para decidir por dónde empezar.';
            }

            elVerdict.innerHTML = '';

            var strong = document.createElement('strong');
            strong.textContent = headline;

            var text = document.createTextNode(body);

            elVerdict.appendChild(strong);
            elVerdict.appendChild(text);

            show(elDone);
        }

        function start() {
            current = 0;
            remaining = TOTAL_SECONDS;
            resetScore();
            paintTime();
            show(elPlay);
            renderQuestion();

            stopTimer();
            tick = window.setInterval(function () {
                remaining -= 1;
                paintTime();

                if (remaining <= 0) finish();
            }, 1000);
        }

        resetScore();

        if (elStart) elStart.addEventListener('click', start);
        if (elRetry) elRetry.addEventListener('click', start);

        /* Atajos A–D: el examen se puede contestar sin ratón. */
        document.addEventListener('keydown', function (event) {
            if (elPlay.classList.contains('rg-hidden')) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            var index = 'abcd'.indexOf(event.key.toLowerCase());
            if (index === -1) return;

            var buttons = elOpts.querySelectorAll('.rg-q-opt');
            if (buttons[index] && !buttons[index].disabled) {
                event.preventDefault();
                buttons[index].click();
            }
        });
    }

    /* ══════════════════════════════════════════════
       5 · Explorador del temario
       Filtra por área y semestre. El conteo se anuncia en una
       región viva para lectores de pantalla.
       ══════════════════════════════════════════════ */
    var temario = document.getElementById('rg-temario');

    if (temario) {
        var areaChips = Array.prototype.slice.call(
            document.querySelectorAll('[data-filter-area]')
        );
        var semChips = Array.prototype.slice.call(
            document.querySelectorAll('[data-filter-sem]')
        );
        var groups = Array.prototype.slice.call(
            temario.querySelectorAll('.rg-tema-group')
        );
        var items = Array.prototype.slice.call(
            temario.querySelectorAll('.rg-tema-list li')
        );
        var countEl = document.getElementById('rg-temario-count');
        var emptyEl = document.getElementById('rg-temario-empty');

        var activeArea = 'all';
        var activeSem = 'all';

        function syncChips(chips, attr, value) {
            chips.forEach(function (chip) {
                setAttr(
                    chip,
                    'aria-pressed',
                    String(chip.dataset[attr] === value)
                );
            });
        }

        function applyFilters() {
            var visible = 0;

            items.forEach(function (li) {
                var okArea =
                    activeArea === 'all' ||
                    li.dataset.area === activeArea;

                var okSem =
                    activeSem === 'all' ||
                    li.dataset.sem === activeSem;

                var show = okArea && okSem;

                li.classList.toggle('is-out', !show);
                if (show) visible += 1;
            });

            /* Un grupo sin temas visibles se retira por completo:
               deja la retícula limpia en vez de dejar cajas vacías. */
            groups.forEach(function (group) {
                var any = group.querySelectorAll(
                    '.rg-tema-list li:not(.is-out)'
                ).length;

                group.classList.toggle('is-out', any === 0);

                if (any > 0 && activeArea !== 'all') {
                    group.open = true;
                }
            });

            if (countEl) {
                countEl.innerHTML = '';

                var b = document.createElement('b');
                b.textContent = String(visible);

                countEl.appendChild(b);
                countEl.appendChild(
                    document.createTextNode(
                        ' de ' + items.length + ' temas'
                    )
                );
            }

            if (emptyEl) {
                emptyEl.classList.toggle('rg-hidden', visible > 0);
            }
        }

        areaChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                activeArea = chip.dataset.filterArea;
                syncChips(areaChips, 'filterArea', activeArea);
                applyFilters();
            });
        });

        semChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                activeSem = chip.dataset.filterSem;
                syncChips(semChips, 'filterSem', activeSem);
                applyFilters();
            });
        });

        applyFilters();
    }

    /* ══════════════════════════════════════════════
       6 · Pasos del formulario
       booking.min.js cambia style.display; aquí solo se sincroniza
       la accesibilidad desde los eventos que disparan el cambio.
       ══════════════════════════════════════════════ */
    var form = document.getElementById('contact-form');
    var backBtn = document.getElementById('booking-back');

    var steps = [
        document.getElementById('booking-step-1'),
        document.getElementById('booking-step-2'),
        document.getElementById('booking-step-3')
    ].filter(Boolean);

    function isVisible(el) {
        return (
            el &&
            !el.hidden &&
            window.getComputedStyle(el).display !== 'none'
        );
    }

    function syncSteps(moveFocus) {
        var currentStep = null;

        steps.forEach(function (step) {
            var visible = isVisible(step);

            setAttr(step, 'aria-hidden', String(!visible));
            setInert(step, !visible);

            if (visible) currentStep = step;
        });

        if (moveFocus && currentStep) {
            var heading = currentStep.querySelector('h3, h2');

            if (heading) {
                setAttr(heading, 'tabindex', '-1');
                heading.focus({ preventScroll: true });
            }
        }
    }

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!form.reportValidity()) return;

            if (typeof window.goToStep2 === 'function') {
                window.goToStep2();
                window.queueMicrotask(function () {
                    syncSteps(true);
                });
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            if (typeof window.goToStep1 === 'function') {
                window.goToStep1();
                window.queueMicrotask(function () {
                    syncSteps(true);
                });
            }
        });
    }

    /* Paso 3 lo abre booking.min.js al confirmar: se vigila el
       contenedor por cambios de `style`, atributo que este callback
       NO escribe. Sin intersección, no hay bucle. */
    var widget = document.getElementById('booking-widget');

    if (widget && 'MutationObserver' in window) {
        new MutationObserver(function () {
            syncSteps(true);
        }).observe(widget, {
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
    }

    if (steps.length) syncSteps(false);

    /* ══════════════════════════════════════════════
       7 · Barra de conversión móvil
       ══════════════════════════════════════════════ */
    var bar = document.getElementById('rg-sticky');
    var enroll = document.getElementById('inscripcion');
    var mobile = window.matchMedia('(max-width: 900px)');
    var ticking = false;

    function updateBar() {
        if (!bar) return;

        var formNear =
            enroll &&
            enroll.getBoundingClientRect().top < window.innerHeight;

        var visible =
            mobile.matches && window.scrollY > 700 && !formNear;

        if (bar.classList.contains('show') !== visible) {
            bar.classList.toggle('show', visible);
        }

        if (bar.hidden === visible) bar.hidden = !visible;

        setAttr(bar, 'aria-hidden', String(!visible));
        setInert(bar, !visible);
    }

    function requestBar() {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(function () {
            updateBar();
            ticking = false;
        });
    }

    if (bar) {
        window.addEventListener('scroll', requestBar, { passive: true });
        window.addEventListener('resize', requestBar, { passive: true });

        if (typeof mobile.addEventListener === 'function') {
            mobile.addEventListener('change', requestBar);
        }

        updateBar();
    }

    /* ══════════════════════════════════════════════
       8 · Fecha mínima del selector
       booking.min.js la fija en DOMContentLoaded (mañana) y es el
       dueño del atributo. Aquí no se escribe para no crear un
       segundo dueño con un valor distinto.
       ══════════════════════════════════════════════ */

    /* ══════════════════════════════════════════════
       9 · Enlaces externos sin reverse tabnabbing
       ══════════════════════════════════════════════ */
    document
        .querySelectorAll('a[target="_blank"]')
        .forEach(function (link) {
            var rel = new Set(
                (link.rel || '').split(/\s+/).filter(Boolean)
            );

            rel.add('noopener');
            rel.add('noreferrer');
            link.rel = Array.from(rel).join(' ');
        });
})();
