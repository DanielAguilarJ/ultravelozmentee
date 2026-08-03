/* ══════════════════════════════════════════════════════════════════
   UNIVERSIDAD DOMINICAL · WorldBrain México

   Parallax, relieve 3D, foco de puntero, cifras animadas, selector de
   ruta y accesibilidad del formulario. Vanilla JS, cero dependencias.

   Criterios que se respetan en todo el archivo:

   · prefers-reduced-motion apaga TODO el movimiento no esencial.
   · Los efectos de puntero solo se activan si hay puntero fino: en
     táctil sobran y cuestan batería.
   · Un solo listener de scroll y un solo listener de pointermove,
     ambos regulados con requestAnimationFrame. Nada de un rAF por
     tarjeta.
   · Donde el navegador soporta scroll-driven animations, el parallax
     y el riel del proceso los hace el CSS y aquí no se toca nada.
   · NINGÚN callback de MutationObserver escribe un atributo que su
     propio attributeFilter observe: ese patrón congela la pestaña.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    var finePointer = window.matchMedia('(pointer: fine)').matches;

    var supportsScrollTimeline =
        window.CSS &&
        CSS.supports &&
        CSS.supports('animation-timeline: scroll()');

    var supportsViewTimeline =
        window.CSS &&
        CSS.supports &&
        CSS.supports('animation-timeline: view()');

    /* Escritura idempotente: no encola mutaciones inútiles. */
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
       1 · Revelado al hacer scroll
       Solo si el navegador no trae el motor nativo.
       ══════════════════════════════════════════════ */
    var rises = document.querySelectorAll('.ud-rise');

    if (!supportsViewTimeline) {
        if (!('IntersectionObserver' in window) || reduced) {
            rises.forEach(function (el) {
                el.classList.add('is-in');
            });
        } else {
            var riseObs = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-in');
                        riseObs.unobserve(entry.target);
                    });
                },
                { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
            );

            rises.forEach(function (el) {
                riseObs.observe(el);
            });
        }
    }

    /* ══════════════════════════════════════════════
       2 · Parallax
       Respaldo para navegadores sin animation-timeline: scroll().
       Se escribe una custom property y el CSS aplica el transform,
       así el trabajo de composición se queda en el compositor.
       ══════════════════════════════════════════════ */
    var layers = Array.prototype.slice.call(
        document.querySelectorAll('.ud-parallax')
    );

    if (layers.length && !reduced && !supportsScrollTimeline) {
        var ticking = false;

        var paint = function () {
            var viewport = window.innerHeight;

            layers.forEach(function (layer) {
                var rect = layer.getBoundingClientRect();

                /* Fuera de pantalla no se calcula nada. */
                if (rect.bottom < -200 || rect.top > viewport + 200) return;

                var depth = parseFloat(layer.dataset.depth || '40');

                /* -1 arriba de la pantalla, 0 al centro, 1 abajo */
                var center = rect.top + rect.height / 2;
                var progress = (center - viewport / 2) / viewport;

                layer.style.setProperty(
                    '--ud-shift',
                    (progress * depth).toFixed(2) + 'px'
                );
            });

            ticking = false;
        };

        var request = function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(paint);
        };

        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request, { passive: true });
        paint();
    }

    /* ══════════════════════════════════════════════
       2b · Vídeo decorativo de la banda
       El <video> viene sin `autoplay` a propósito: se descarga y se
       reproduce solo cuando la banda entra en pantalla, y se pausa al
       salir. Así no gasta datos ni batería en una capa que nadie está
       viendo, y el `poster` cubre el hueco mientras tanto.

       Con prefers-reduced-motion no se toca: se queda el póster fijo,
       que es exactamente el comportamiento deseado.
       ══════════════════════════════════════════════ */
    var bgVideos = Array.prototype.slice.call(
        document.querySelectorAll('video[data-bg-video]')
    );

    if (bgVideos.length && !reduced && 'IntersectionObserver' in window) {
        var videoObs = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    var video = entry.target;

                    if (entry.isIntersecting) {
                        /* preload="none" obliga a pedir la carga a mano. */
                        if (!video.dataset.udLoaded) {
                            video.dataset.udLoaded = '1';
                            video.load();
                        }
                        /* play() devuelve una promesa que se rechaza si la
                           política de autoplay lo impide: se ignora en
                           silencio y queda el póster, que ya es válido. */
                        var attempt = video.play();
                        if (attempt && attempt.catch) attempt.catch(function () { });
                    } else if (!video.paused) {
                        video.pause();
                    }
                });
            },
            { rootMargin: '200px 0px' }
        );

        bgVideos.forEach(function (video) {
            videoObs.observe(video);
        });

        /* En una pestaña oculta no tiene sentido seguir decodificando. */
        document.addEventListener('visibilitychange', function () {
            bgVideos.forEach(function (video) {
                if (document.hidden) {
                    if (!video.paused) video.pause();
                } else if (video.dataset.udLoaded) {
                    var attempt = video.play();
                    if (attempt && attempt.catch) attempt.catch(function () { });
                }
            });
        });
    }

    /* ══════════════════════════════════════════════
       3 · Foco de puntero y relieve 3D en tarjetas
       Un único listener para todas: se busca la tarjeta bajo el
       cursor en lugar de suscribir cada una.
       ══════════════════════════════════════════════ */
    var cards = Array.prototype.slice.call(
        document.querySelectorAll('.ud-card')
    );

    if (cards.length && finePointer && !reduced) {
        var pointerTick = false;
        var lastEvent = null;
        var activeCard = null;

        var applyPointer = function () {
            pointerTick = false;

            if (!lastEvent) return;

            var target = lastEvent.target.closest
                ? lastEvent.target.closest('.ud-card')
                : null;

            if (activeCard && activeCard !== target) {
                activeCard.style.transform = '';
                activeCard = null;
            }

            if (!target) return;

            var rect = target.getBoundingClientRect();
            var x = lastEvent.clientX - rect.left;
            var y = lastEvent.clientY - rect.top;

            /* Posición del foco, en porcentaje */
            target.style.setProperty('--mx', (x / rect.width * 100).toFixed(1) + '%');
            target.style.setProperty('--my', (y / rect.height * 100).toFixed(1) + '%');

            /* Inclinación suave: máximo 5 grados. Más se siente a truco. */
            var rx = ((y / rect.height) - 0.5) * -5;
            var ry = ((x / rect.width) - 0.5) * 5;

            target.style.transform =
                'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) ' +
                'rotateY(' + ry.toFixed(2) + 'deg)';

            activeCard = target;
        };

        document.addEventListener('pointermove', function (event) {
            lastEvent = event;

            if (pointerTick) return;
            pointerTick = true;
            requestAnimationFrame(applyPointer);
        }, { passive: true });

        /* Al salir del documento se devuelve todo a su sitio. */
        document.addEventListener('pointerleave', function () {
            if (!activeCard) return;
            activeCard.style.transform = '';
            activeCard = null;
        });
    }

    /* ══════════════════════════════════════════════
       4 · Pasos del proceso
       ══════════════════════════════════════════════ */
    var steps = Array.prototype.slice.call(
        document.querySelectorAll('.ud-step')
    );

    if (steps.length && 'IntersectionObserver' in window && !reduced) {
        var stepObs = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    entry.target.classList.toggle('is-on', entry.isIntersecting);
                });
            },
            { threshold: 0.6 }
        );

        steps.forEach(function (step) {
            stepObs.observe(step);
        });
    } else {
        steps.forEach(function (step) {
            step.classList.add('is-on');
        });
    }

    /* ══════════════════════════════════════════════
       5 · Cifras
       ══════════════════════════════════════════════ */
    var figures = Array.prototype.slice.call(
        document.querySelectorAll('[data-count]')
    );

    function countUp(el) {
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var prefix = el.dataset.prefix || '';
        var decimals = (String(el.dataset.count).split('.')[1] || '').length;

        if (reduced) {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
            return;
        }

        var duration = 1500;
        var start = null;

        function frame(now) {
            if (start === null) start = now;

            var p = Math.min((now - start) / duration, 1);
            /* easeOutQuint: arranca rápido y asienta con calma */
            var eased = 1 - Math.pow(1 - p, 5);

            el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;

            if (p < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    if (figures.length) {
        if ('IntersectionObserver' in window) {
            var figObs = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        countUp(entry.target);
                        figObs.unobserve(entry.target);
                    });
                },
                { threshold: 0.6 }
            );

            figures.forEach(function (el) {
                figObs.observe(el);
            });
        } else {
            figures.forEach(countUp);
        }
    }

    /* ══════════════════════════════════════════════
       6 · Selector de ruta
       Tres preguntas que orientan hacia la ruta que aplica y, sobre
       todo, dejan por escrito qué debe pedir la persona antes de
       pagar. No promete resultados ni plazos: la ruta y la entidad
       emisora las confirma la institución responsable.
       ══════════════════════════════════════════════ */
    var PREGUNTAS = [
        {
            q: '¿Cuántos años de experiencia laboral tiene en el área que quiere acreditar?',
            opts: [
                { t: 'Menos de 2 años', v: 0 },
                { t: 'Entre 2 y 5 años', v: 1 },
                { t: 'Más de 5 años', v: 2 },
                { t: 'Más de 10 años', v: 3 }
            ]
        },
        {
            q: '¿Qué estudios tiene concluidos hasta hoy?',
            opts: [
                { t: 'Preparatoria terminada', v: 0 },
                { t: 'Carrera iniciada, sin concluir', v: 2 },
                { t: 'Carrera concluida, sin titular', v: 3 },
                { t: 'Prefiero revisarlo en la sesión', v: 1 }
            ]
        },
        {
            q: '¿Cuánto tiempo puede dedicar a la semana, además del domingo?',
            opts: [
                { t: 'Solo el domingo', v: 0 },
                { t: 'Domingo y algunas noches', v: 1 },
                { t: 'Domingo y varias horas entre semana', v: 2 },
                { t: 'Tengo horario flexible', v: 3 }
            ]
        }
    ];

    var COMUNES = [
        'El nombre de la institución responsable de evaluar.',
        'El nombre de la institución que emitirá el documento.',
        'La autorización, acuerdo o registro aplicable.',
        'Los requisitos académicos y documentales completos.',
        'La duración estimada, sin promesas de resultado.',
        'Los costos de WorldBrain y los costos de terceros, por separado.'
    ];

    var tool = document.getElementById('ud-tool');

    if (tool) {
        var tIntro = document.getElementById('ud-tool-intro');
        var tPlay = document.getElementById('ud-tool-play');
        var tDone = document.getElementById('ud-tool-done');
        var tStart = document.getElementById('ud-tool-start');
        var tRetry = document.getElementById('ud-tool-retry');
        var tIndex = document.getElementById('ud-tool-index');
        var tBar = document.getElementById('ud-tool-bar');
        var tQ = document.getElementById('ud-tool-q');
        var tOpts = document.getElementById('ud-tool-opts');
        var tOut = document.getElementById('ud-tool-out');

        var paso = 0;
        var puntos = 0;

        function mostrar(panel) {
            [tIntro, tPlay, tDone].forEach(function (p) {
                if (p) p.classList.add('ud-hidden');
            });
            if (panel) panel.classList.remove('ud-hidden');
        }

        function pintarPregunta() {
            var item = PREGUNTAS[paso];

            tIndex.textContent = 'Pregunta ' + (paso + 1) + ' de ' + PREGUNTAS.length;
            tBar.style.width = (paso / PREGUNTAS.length) * 100 + '%';
            tQ.textContent = item.q;
            tOpts.innerHTML = '';

            item.opts.forEach(function (opt, i) {
                var btn = document.createElement('button');

                btn.type = 'button';
                btn.className = 'ud-opt';
                btn.innerHTML = '<kbd>' + String.fromCharCode(65 + i) + '</kbd><span></span>';
                btn.querySelector('span').textContent = opt.t;

                btn.addEventListener('click', function () {
                    puntos += opt.v;
                    paso += 1;

                    if (paso >= PREGUNTAS.length) {
                        terminar();
                    } else {
                        pintarPregunta();
                    }
                });

                tOpts.appendChild(btn);
            });
        }

        function terminar() {
            tBar.style.width = '100%';

            /* Puntuación máxima 9. El corte separa a quien tiene
               trayectoria acreditable de quien conviene que curse. */
            var ruta1 = puntos >= 5;

            var titulo = ruta1
                ? 'Su perfil apunta a la Ruta 1'
                : 'Su perfil apunta a la Ruta 2';

            var texto = ruta1
                ? 'Tiene trayectoria laboral y avance académico suficientes para que ' +
                  'valga la pena revisar una ruta de evaluación de saberes ya adquiridos. ' +
                  'WorldBrain prepara y acompaña esa evaluación; la institución responsable ' +
                  'y la ruta que aplica se confirman por escrito antes de pagar nada.'
                : 'Conviene un itinerario de estudio con acompañamiento semanal, ' +
                  'apoyado en las sesiones dominicales. En la evaluación diagnóstica se ' +
                  'define desde dónde empezar y qué materias se reconocen de lo que ya cursó.';

            tOut.innerHTML = '';

            var caja = document.createElement('div');
            caja.className = 'ud-verdict';

            var h = document.createElement('h3');
            h.textContent = titulo;

            var p = document.createElement('p');
            p.textContent = texto;

            var aviso = document.createElement('p');
            aviso.style.marginTop = '0.9rem';
            aviso.textContent =
                'Esto es una orientación a partir de tres preguntas, no un dictamen. ' +
                'Nadie puede confirmar su ruta sin revisar sus documentos.';

            var lista = document.createElement('ul');
            lista.className = 'ud-verdict-list';

            var intro = document.createElement('li');
            intro.className = 'ud-verdict-lead';
            intro.textContent = 'Pida esto por escrito, siempre:';
            lista.appendChild(intro);

            /* Marca tipográfica en lugar de icono de librería: los
               iconos de catálogo son justo lo que hace que una página
               parezca salida de una plantilla. */
            COMUNES.forEach(function (linea, i) {
                var li = document.createElement('li');

                var marca = document.createElement('span');
                marca.className = 'ud-verdict-mark';
                marca.setAttribute('aria-hidden', 'true');
                marca.textContent = String(i + 1).padStart(2, '0');

                var span = document.createElement('span');
                span.textContent = linea;

                li.appendChild(marca);
                li.appendChild(span);
                lista.appendChild(li);
            });

            caja.appendChild(h);
            caja.appendChild(p);
            caja.appendChild(aviso);
            caja.appendChild(lista);
            tOut.appendChild(caja);

            mostrar(tDone);
        }

        function arrancar() {
            paso = 0;
            puntos = 0;
            mostrar(tPlay);
            pintarPregunta();
        }

        if (tStart) tStart.addEventListener('click', arrancar);
        if (tRetry) tRetry.addEventListener('click', arrancar);

        /* Teclado: A–D eligen opción. */
        document.addEventListener('keydown', function (event) {
            if (!tPlay || tPlay.classList.contains('ud-hidden')) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            var i = 'abcd'.indexOf(String(event.key).toLowerCase());
            if (i === -1) return;

            var botones = tOpts.querySelectorAll('.ud-opt');
            if (botones[i]) {
                event.preventDefault();
                botones[i].click();
            }
        });
    }

    /* ══════════════════════════════════════════════
       7 · Pasos del formulario
       booking.min.js cambia style.display; aquí solo se sincroniza la
       accesibilidad desde los eventos que provocan el cambio.
       ══════════════════════════════════════════════ */
    var form = document.getElementById('contact-form');
    var back = document.getElementById('booking-back');

    var bookingSteps = [
        document.getElementById('booking-step-1'),
        document.getElementById('booking-step-2'),
        document.getElementById('booking-step-3')
    ].filter(Boolean);

    function visible(el) {
        return (
            el &&
            !el.hidden &&
            window.getComputedStyle(el).display !== 'none'
        );
    }

    function syncSteps(moveFocus) {
        var current = null;

        bookingSteps.forEach(function (step) {
            var isVisible = visible(step);

            setAttr(step, 'aria-hidden', String(!isVisible));
            setInert(step, !isVisible);

            if (isVisible) current = step;
        });

        if (moveFocus && current) {
            var heading = current.querySelector('h3, h2');

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

    if (back) {
        back.addEventListener('click', function () {
            if (typeof window.goToStep1 === 'function') {
                window.goToStep1();
                window.queueMicrotask(function () {
                    syncSteps(true);
                });
            }
        });
    }

    /* El paso 3 lo abre booking.min.js al confirmar. Se vigila `style`,
       atributo que este callback NO escribe: sin intersección entre lo
       observado y lo escrito, no hay bucle. */
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

    if (bookingSteps.length) syncSteps(false);

    /* ══════════════════════════════════════════════
       8 · Barra de conversión móvil
       ══════════════════════════════════════════════ */
    var bar = document.getElementById('ud-sticky');
    var enroll = document.getElementById('agendar');
    var mobile = window.matchMedia('(max-width: 900px)');
    var barTick = false;

    function updateBar() {
        if (!bar) return;

        var near =
            enroll &&
            enroll.getBoundingClientRect().top < window.innerHeight;

        var show = mobile.matches && window.scrollY > 700 && !near;

        if (bar.classList.contains('show') !== show) {
            bar.classList.toggle('show', show);
        }

        if (bar.hidden === show) bar.hidden = !show;

        setAttr(bar, 'aria-hidden', String(!show));
        setInert(bar, !show);
    }

    function requestBar() {
        if (barTick) return;
        barTick = true;

        requestAnimationFrame(function () {
            updateBar();
            barTick = false;
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
       9 · Los domingos del año

       La premisa del programa es que solo dispone del domingo. Aquí
       el año se dibuja como 52 marcas y se calcula cuántos domingos
       quedan de verdad. Es un dato comprobable con un calendario, no
       un contador de urgencia inventado.
       ══════════════════════════════════════════════ */
    var yearGrid = document.getElementById('ud-year');

    if (yearGrid) {
        var hoy = new Date();
        var anio = hoy.getFullYear();

        /* Primer domingo del año */
        var cursor = new Date(anio, 0, 1);
        cursor.setDate(cursor.getDate() + ((7 - cursor.getDay()) % 7));

        var domingos = [];

        while (cursor.getFullYear() === anio) {
            domingos.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 7);
        }

        var pasados = domingos.filter(function (d) {
            return d < hoy;
        }).length;

        var restantes = domingos.length - pasados;

        var MESES = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre',
            'noviembre', 'diciembre'
        ];

        yearGrid.innerHTML = '';

        domingos.forEach(function (fecha, i) {
            var cell = document.createElement('div');
            var esPasado = i < pasados;
            var esProximo = i === pasados;

            cell.className = 'ud-sunday ' +
                (esPasado ? 'is-spent' : (esProximo ? 'is-next' : 'is-left'));

            cell.style.setProperty('--k', String(i));

            var etiqueta = fecha.getDate() + ' de ' + MESES[fecha.getMonth()];

            cell.title = esProximo
                ? 'Próximo domingo: ' + etiqueta
                : (esPasado ? 'Domingo transcurrido: ' + etiqueta : 'Domingo disponible: ' + etiqueta);

            yearGrid.appendChild(cell);
        });

        /* La rejilla es decorativa: el dato va en texto, que es lo que
           lee un lector de pantalla. */
        yearGrid.setAttribute('aria-hidden', 'true');

        var elRest = document.getElementById('ud-year-left');
        var elTotal = document.getElementById('ud-year-total');
        var elSpent = document.getElementById('ud-year-spent');
        var elYear = document.getElementById('ud-year-num');
        var elNext = document.getElementById('ud-year-next');

        /* Este número NO se anima desde cero.
           Es un dato verificable con un calendario, y una cuenta
           ascendente mostraría cifras falsas durante segundo y medio:
           quien mire de reojo, o un lector de pantalla que anuncie el
           cambio, leería un número que no es. El interés visual lo
           aporta la entrada escalonada de las 52 marcas, que sí son
           decorativas. */
        if (elRest) elRest.textContent = String(restantes);

        if (elTotal) elTotal.textContent = String(domingos.length);
        if (elSpent) elSpent.textContent = String(pasados);
        if (elYear) elYear.textContent = String(anio);

        if (elNext && domingos[pasados]) {
            var p = domingos[pasados];
            elNext.textContent = p.getDate() + ' de ' + MESES[p.getMonth()];
        } else if (elNext) {
            elNext.textContent = 'el primero de ' + (anio + 1);
        }
    }

    /* ══════════════════════════════════════════════
       10 · Diagrama de rutas
       Cada trazo se mide para que stroke-dasharray coincida con su
       longitud real; si no, el dibujado se ve entrecortado.
       ══════════════════════════════════════════════ */
    var paths = Array.prototype.slice.call(
        document.querySelectorAll('.ud-diagram .ud-path')
    );

    if (paths.length) {
        paths.forEach(function (path) {
            var len = 600;

            try {
                len = Math.ceil(path.getTotalLength());
            } catch (e) {
                /* jsdom no implementa getTotalLength: se deja el valor
                   por defecto y el trazo simplemente no se anima. */
            }

            path.style.setProperty('--len', String(len));
        });

        /* Respaldo para navegadores sin animation-timeline: view() */
        if (!supportsViewTimeline) {
            if (reduced || !('IntersectionObserver' in window)) {
                paths.forEach(function (p) {
                    p.classList.add('is-drawn');
                });
            } else {
                var drawObs = new IntersectionObserver(
                    function (entries) {
                        entries.forEach(function (entry) {
                            if (!entry.isIntersecting) return;
                            entry.target.classList.add('is-drawn');
                            drawObs.unobserve(entry.target);
                        });
                    },
                    { threshold: 0.25 }
                );

                paths.forEach(function (p) {
                    drawObs.observe(p);
                });
            }
        }
    }

    /* ══════════════════════════════════════════════
       11 · Folio y titulillo
       Muestra en el canto la sección que se está leyendo, como el
       encabezado de página de un libro.
       ══════════════════════════════════════════════ */
    var folioTitle = document.getElementById('ud-folio-title');
    var folioNum = document.getElementById('ud-folio-num');

    if (folioTitle && folioNum && 'IntersectionObserver' in window) {
        var marked = Array.prototype.slice.call(
            document.querySelectorAll('[data-folio]')
        );

        if (marked.length) {
            var folioObs = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;

                        folioTitle.textContent = entry.target.dataset.folio;
                        folioNum.textContent = entry.target.dataset.folioNum || '';
                    });
                },
                { rootMargin: '-45% 0px -45% 0px' }
            );

            marked.forEach(function (s) {
                folioObs.observe(s);
            });
        }
    }

    /* ══════════════════════════════════════════════
       12 · Enlaces externos sin reverse tabnabbing
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
