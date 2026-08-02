/* ══════════════════════════════════════════════════════════════════
   CIENCIA Y ASTRONOMÍA · WorldBrain México

   Sombreador del cielo, orquestación con GSAP, constelación
   interactiva, calculadora de gravedad y formulario.

   ══════════════════ POR QUÉ ESTÁ ESCRITO ASÍ ══════════════════

   La versión anterior de esta página tenía las bibliotecas correctas
   y el peor montaje posible:

   · gsap.min.js y ScrollTrigger.min.js en <head>, SIN defer. Dos
     descargas de terceros bloqueando el parser antes del primer
     pintado.
   · AOS desde un segundo CDN (unpkg), CSS incluido. El CSS de AOS
     pone opacity: 0 en todo lo que lleva data-aos, así que un fallo
     de ese CDN dejaba la página EN BLANCO. Un tercero podía tumbar
     la conversión.
   · setInterval(createShootingStar, ...) sin fin, creando nodos en
     el body con estilos en línea, sin parar en pestaña oculta y sin
     mirar prefers-reduced-motion.
   · gsap.registerPlugin() en un script en línea: si el CDN fallaba,
     la excepción mataba también el menú móvil y el scroll suave que
     venían después.

   Las reglas de este archivo salen de ahí:

   1 · NADA de terceros bloquea el primer pintado. GSAP se pide
       después de 'load', en tiempo libre, y con integrity.

   2 · GSAP se pide solo si el dispositivo puede pagarlo. Son 46 KB
       comprimidos: en 2G o con ahorro de datos activo eso es medio
       segundo de nada. La puerta se consulta ANTES de la descarga.

   3 · Todo lo que hace GSAP tiene su estado final en el CSS. Si no
       llega, la página se ve terminada. Se puede comprobar
       bloqueando cdnjs en el navegador: no cambia nada esencial.

   4 · Cero three.js. El cielo es un sombreador escrito a mano sobre
       un cuadrilátero a pantalla completa: unos 2 KB de GLSL contra
       los ~600 KB de la biblioteca. Y se apaga fuera de pantalla y
       en pestaña oculta.

   5 · Un solo listener de scroll y uno de pointermove, regulados con
       requestAnimationFrame.

   6 · Cero handlers en atributos del HTML.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ══════════════════════════════════════════════
       0 · Capacidades y puerta de coste
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

    /**
     * ¿Vale la pena gastar en efectos?
     *
     * Decide ANTES de descargar nada. Los umbrales no son caprichosos:
     * · saveData lo activa el usuario a propósito. Respetarlo no es
     *   opcional.
     * · 2G y slow-2g: 46 KB extra son cientos de milisegundos.
     * · Menos de 4 núcleos: el sombreador competiría con el hilo
     *   principal justo mientras el visitante intenta leer.
     * · deviceMemory por debajo de 4 GB suele ser un teléfono de
     *   entrada, donde WebGL cuesta batería y calor.
     *
     * Los navegadores que no informan de nada de esto pasan la
     * puerta: no se castiga a Safari por no exponer la API.
     */
    function canAfford() {
        if (reduced()) return false;

        var c = navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        if (c) {
            if (c.saveData === true) return false;

            var slow = ['slow-2g', '2g'];
            if (c.effectiveType && slow.indexOf(c.effectiveType) !== -1) return false;
        }

        if (typeof navigator.hardwareConcurrency === 'number' &&
            navigator.hardwareConcurrency > 0 &&
            navigator.hardwareConcurrency < 4) {
            return false;
        }

        if (typeof navigator.deviceMemory === 'number' &&
            navigator.deviceMemory > 0 &&
            navigator.deviceMemory < 4) {
            return false;
        }

        return true;
    }

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

    function setInert(el, state) {
        if (!el) return;
        if (el.inert !== state) el.inert = state;
        toggleAttr(el, 'inert', state);
    }

    /** ¿Estamos en carta impresa? El sombreador no aplica ahí. */
    function isLight() {
        return document.documentElement.classList.contains('light-mode');
    }

    /* Espera de verdad al momento libre. Safari no trae
       requestIdleCallback, así que se degrada a un setTimeout corto
       después de 'load'. */
    function whenIdle(fn) {
        var run = function () {
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(fn, { timeout: 2500 });
            } else {
                window.setTimeout(fn, 400);
            }
        };

        if (document.readyState === 'complete') run();
        else window.addEventListener('load', run, { once: true });
    }

    /* ══════════════════════════════════════════════
       1 · Bucle único de scroll
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
       animation-timeline: scroll(). GSAP no toca esto: sería usar
       46 KB para algo que el navegador ya hace gratis.
       ══════════════════════════════════════════════ */

    var folio = document.querySelector('.as-folio-bar');

    if (folio && (!hasScrollTimeline || reduced())) {
        addPainter(function () {
            var doc = document.documentElement;
            var scrollable = doc.scrollHeight - doc.clientHeight;

            folio.style.setProperty(
                '--as-progress',
                scrollable > 0
                    ? clamp01(doc.scrollTop / scrollable).toFixed(4)
                    : '0'
            );
        });
    }

    /* ══════════════════════════════════════════════
       3 · Revelado
       El escalonado va en una custom property (--d) y lo aplica el CSS
       como transition-delay. Aquí no hay un solo setTimeout: con
       temporizadores, al hacer scroll rápido los bloques aparecen
       desordenados.
       ══════════════════════════════════════════════ */

    var rises = list('.as-rise');

    (function stagger() {
        var seen = new Map();

        rises.forEach(function (el) {
            var parent = el.parentElement || document.body;
            var index = seen.get(parent) || 0;
            seen.set(parent, index + 1);
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
       4 · Índice de renglones del titular
       GSAP los escalona si llega; el CSS ya lo hace con --i. Se
       numeran aquí para no repetir el índice en el HTML.
       ══════════════════════════════════════════════ */

    list('.as-hero-copy .as-line').forEach(function (line, i) {
        line.style.setProperty('--i', String(i));
    });

    /* ══════════════════════════════════════════════
       5 · Barrido del puntero
       Un único pointermove en el documento. Se resuelve qué hay bajo
       el cursor con closest() en lugar de suscribir cada pieza.
       ══════════════════════════════════════════════ */

    if (finePointer) {
        var lit = null;
        var lastEvent = null;
        var pointerTicking = false;

        var applyPointer = function () {
            pointerTicking = false;

            var event = lastEvent;
            if (!event) return;

            var target = event.target.closest
                ? event.target.closest('.as-btn, .as-rel')
                : null;

            if (lit && lit !== target) {
                lit.style.removeProperty('--as-mx');
                lit.style.removeProperty('--as-my');
                lit = null;
            }

            if (!target) return;

            var box = target.getBoundingClientRect();

            target.style.setProperty(
                '--as-mx',
                ((event.clientX - box.left) / box.width * 100).toFixed(1) + '%'
            );
            target.style.setProperty(
                '--as-my',
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
       porque en cifras tabulares «0» y «12» no miden lo mismo.
       ══════════════════════════════════════════════ */

    var counters = list('.as-count[data-to]');

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

            var duration = 950;
            var start = 0;

            var step = function (now) {
                if (!start) start = now;

                var t = clamp01((now - start) / duration);
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
       7 · CIELO EN WEBGL

       Un cuadrilátero a pantalla completa con un sombreador de
       fragmentos: nebulosa por ruido de valor en cuatro octavas y tres
       capas de estrellas con paralaje y centelleo.

       Por qué no three.js: para dibujar UN cuadrilátero con UN
       sombreador, la biblioteca aporta una escena, una cámara, un
       grafo y un cargador que aquí no se usan. Son ~600 KB
       comprimidos contra los ~2 KB de este GLSL. La diferencia se
       nota en el móvil de un padre en el patio de la escuela.

       Controles de coste, todos obligatorios:
       · No arranca si canAfford() dice que no.
       · No arranca en carta impresa (no hay cielo que pintar).
       · Se detiene cuando el documento está oculto.
       · Se detiene cuando el lienzo sale de pantalla.
       · Resolución acotada a 1.5× para no rellenar 3× píxeles en un
         teléfono con pantalla densa.
       · Tope de ~30 fps: es un fondo, no un videojuego.
       ══════════════════════════════════════════════ */

    (function sky() {
        var canvas = document.getElementById('as-shader');
        if (!canvas) return;

        if (!canAfford()) return;
        if (isLight()) return;

        var gl = null;

        try {
            var opts = {
                alpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                /* Le pide a la GPU integrada, no a la dedicada: en un
                   portátil eso es la diferencia entre ventilador y
                   silencio. */
                powerPreference: 'low-power',
                preserveDrawingBuffer: false
            };

            gl = canvas.getContext('webgl', opts) ||
                canvas.getContext('experimental-webgl', opts);
        } catch (err) {
            gl = null;
        }

        if (!gl) return;

        var VERT = [
            'attribute vec2 aPos;',
            'varying vec2 vUv;',
            'void main(){',
            '  vUv = aPos * 0.5 + 0.5;',
            '  gl_Position = vec4(aPos, 0.0, 1.0);',
            '}'
        ].join('\n');

        var FRAG = [
            'precision mediump float;',
            'varying vec2 vUv;',
            'uniform vec2 uRes;',
            'uniform float uT;',
            'uniform vec2 uPtr;',
            'uniform float uScroll;',

            /* Hash entero determinista: la misma semilla da el mismo
               cielo en cada carga. Un cielo que cambia al recargar se
               siente roto. */
            'float hash(vec2 p){',
            '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
            '}',

            'float vnoise(vec2 p){',
            '  vec2 i = floor(p); vec2 f = fract(p);',
            '  f = f * f * (3.0 - 2.0 * f);',
            '  float a = hash(i);',
            '  float b = hash(i + vec2(1.0, 0.0));',
            '  float c = hash(i + vec2(0.0, 1.0));',
            '  float d = hash(i + vec2(1.0, 1.0));',
            '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
            '}',

            'float fbm(vec2 p){',
            '  float v = 0.0; float a = 0.5;',
            '  for (int k = 0; k < 4; k++){',
            '    v += a * vnoise(p);',
            '    p *= 2.03; a *= 0.5;',
            '  }',
            '  return v;',
            '}',

            /* Una capa de estrellas. Cada celda de la retícula guarda
               como mucho una estrella, colocada al azar dentro de la
               celda: así no se ve el patrón de la retícula. */
            'float layer(vec2 uv, float scale, float par, float dens){',
            '  vec2 g = uv * scale + vec2(uPtr.x * par, uPtr.y * par - uScroll * par * 2.4);',
            '  vec2 i = floor(g); vec2 f = fract(g);',
            '  float r = hash(i);',
            '  if (r < dens) return 0.0;',
            '  vec2 c = vec2(hash(i + 1.37), hash(i + 2.71));',
            '  float d = length(f - c);',
            '  float tw = 0.62 + 0.38 * sin(uT * 1.6 + r * 42.0);',
            '  float core = smoothstep(0.075, 0.0, d);',
            '  return core * tw * (0.3 + 0.7 * hash(i + 5.11));',
            '}',

            'void main(){',
            '  vec2 uv = vUv;',
            '  float ar = uRes.x / max(uRes.y, 1.0);',
            '  vec2 p = vec2(uv.x * ar, uv.y);',

            /* Nebulosa: dos campos de ruido a distinta escala, tan
               tenues que solo se notan como textura. Sin esto el
               degradado de fondo se ve en bandas. */
            '  float n1 = fbm(p * 2.2 + vec2(0.0, uScroll * 0.35));',
            '  float n2 = fbm(p * 5.4 - vec2(uT * 0.008, uScroll * 0.2));',
            '  float neb = smoothstep(0.35, 0.95, n1 * 0.72 + n2 * 0.28);',

            /* Rojo de observatorio abajo, oro arriba: la misma paleta
               de la hoja de estilos. */
            '  vec3 emberCol = vec3(0.62, 0.21, 0.13);',
            '  vec3 goldCol  = vec3(0.55, 0.44, 0.22);',
            '  vec3 col = mix(emberCol, goldCol, uv.y);',
            '  col *= neb * 0.16;',

            /* Tres capas con paralaje distinto: la sensación de
               profundidad sale de aquí, no de mover divs. */
            '  float s = 0.0;',
            '  s += layer(p, 26.0, 0.010, 0.9880) * 1.00;',
            '  s += layer(p, 52.0, 0.022, 0.9915) * 0.72;',
            '  s += layer(p, 96.0, 0.038, 0.9945) * 0.48;',

            /* Las estrellas no son blanco puro: se tiñen ligeramente
               hacia el oro, que es lo que se ve a simple vista. */
            '  vec3 starCol = mix(vec3(1.0), vec3(1.0, 0.92, 0.76), 0.35);',
            '  col += starCol * s;',

            /* Viñeta: el cielo se apaga en los bordes para que el texto
               nunca compita con una estrella. */
            '  float vig = smoothstep(1.25, 0.25, length(uv - vec2(0.5, 0.35)));',
            '  col *= vig;',

            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');

        function compile(type, src) {
            var sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);

            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                /* Silencio: si el sombreador no compila, el fondo CSS
                   ya está pintado y el visitante no pierde nada. */
                gl.deleteShader(sh);
                return null;
            }

            return sh;
        }

        var vs = compile(gl.VERTEX_SHADER, VERT);
        var fs = compile(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return;

        var prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        );

        var aPos = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        var uRes = gl.getUniformLocation(prog, 'uRes');
        var uT = gl.getUniformLocation(prog, 'uT');
        var uPtr = gl.getUniformLocation(prog, 'uPtr');
        var uScroll = gl.getUniformLocation(prog, 'uScroll');

        var ptr = { x: 0, y: 0 };
        var target = { x: 0, y: 0 };
        var scroll = 0;
        var running = false;
        var visible = true;
        var onScreen = true;
        var raf = 0;
        var last = 0;
        var t0 = 0;

        /* 1.5× es el punto donde ya no se distingue el grano y todavía
           no se triplica el número de píxeles a rellenar. */
        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            var w = Math.floor(canvas.clientWidth * dpr);
            var h = Math.floor(canvas.clientHeight * dpr);

            if (canvas.width === w && canvas.height === h) return;

            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            gl.uniform2f(uRes, w, h);
        }

        function draw(now) {
            raf = 0;

            if (!running) return;

            /* Tope de ~30 fps. Es un fondo: a 60 fps se gasta el doble
               de batería para algo que nadie mira de frente. */
            if (now - last < 32) {
                raf = requestAnimationFrame(draw);
                return;
            }

            last = now;
            if (!t0) t0 = now;

            /* Suavizado del puntero en el propio bucle: así el
               seguimiento no da saltos y no hace falta interpolar en
               una custom property. */
            ptr.x += (target.x - ptr.x) * 0.06;
            ptr.y += (target.y - ptr.y) * 0.06;

            resize();

            gl.uniform1f(uT, (now - t0) / 1000);
            gl.uniform2f(uPtr, ptr.x, ptr.y);
            gl.uniform1f(uScroll, scroll);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            raf = requestAnimationFrame(draw);
        }

        function evaluate() {
            var should = visible && onScreen && !reduced() && !isLight();

            if (should === running) return;

            running = should;

            if (running) {
                toggleAttr(canvas, 'data-on', true);
                if (!raf) raf = requestAnimationFrame(draw);
            } else {
                if (raf) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                }
                /* Se queda visible con el último fotograma: apagarlo de
                   golpe al cambiar de pestaña provoca un destello. */
            }
        }

        document.addEventListener('visibilitychange', function () {
            visible = !document.hidden;
            evaluate();
        });

        if (hasObserver) {
            new IntersectionObserver(function (entries) {
                onScreen = entries[0].isIntersecting;
                evaluate();
            }, { threshold: 0 }).observe(canvas);
        }

        /* El interruptor de tema del sitio cambia una clase en <html>.
           Se observa SOLO para leer; este callback no escribe ningún
           atributo que él mismo observe, que es el patrón que congela
           la pestaña. */
        if ('MutationObserver' in window) {
            new MutationObserver(function () {
                if (isLight()) toggleAttr(canvas, 'data-on', false);
                evaluate();
            }).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', evaluate);
        }

        if (finePointer) {
            document.addEventListener('pointermove', function (e) {
                target.x = (e.clientX / window.innerWidth - 0.5) * 2;
                target.y = (e.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });
        }

        addPainter(function () {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            scroll = max > 0 ? doc.scrollTop / max : 0;
        });

        window.addEventListener('resize', resize, { passive: true });

        resize();
        evaluate();
    })();

    /* ══════════════════════════════════════════════
       8 · CONSTELACIÓN INTERACTIVA

       Los datos de cada estrella viven en el HTML, en atributos
       data-*, no aquí. Motivo: así hay UNA sola fuente. Si estuvieran
       en este archivo, el <title> del SVG que lee un lector de
       pantalla y el panel que lee todo el mundo podrían decir cosas
       distintas sin que nadie lo notara.

       Las magnitudes, distancias y tipos espectrales son los reales de
       Orión. Un curso de astronomía no puede permitirse datos
       decorativos.
       ══════════════════════════════════════════════ */

    (function constellation() {
        var box = document.querySelector('.as-chart-box');
        if (!box) return;

        var stars = list('.as-star', box);
        if (!stars.length) return;

        var panel = document.getElementById('as-star-panel');
        var fields = {
            name: document.getElementById('as-star-name'),
            bayer: document.getElementById('as-star-bayer'),
            mag: document.getElementById('as-star-mag'),
            dist: document.getElementById('as-star-dist'),
            type: document.getElementById('as-star-type'),
            note: document.getElementById('as-star-note')
        };

        var current = null;

        function select(star) {
            if (current === star) return;

            if (current) toggleAttr(current, 'data-on', false);
            current = star;
            toggleAttr(star, 'data-on', true);

            var d = star.dataset;

            if (fields.name) fields.name.textContent = d.name || '';
            if (fields.bayer) fields.bayer.textContent = d.bayer || '';
            if (fields.mag) fields.mag.textContent = d.mag || '';
            if (fields.dist) fields.dist.textContent = d.dist || '';
            if (fields.type) fields.type.textContent = d.type || '';
            if (fields.note) fields.note.textContent = d.note || '';

            if (panel) setAttr(panel, 'data-picked', 'true');
        }

        /* Un solo listener para las ocho estrellas, por delegación. */
        box.addEventListener('click', function (event) {
            var star = event.target.closest ? event.target.closest('.as-star') : null;
            if (star) select(star);
        });

        /* El teclado: Enter y Espacio sobre el grupo enfocado. Los
           grupos SVG no son botones nativos, así que hay que
           implementarlo. */
        box.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            var star = event.target.closest ? event.target.closest('.as-star') : null;
            if (!star) return;

            event.preventDefault();
            select(star);
        });

        /* Al tabular también se muestra: quien navega con teclado no
           debería tener que pulsar para ver el dato. */
        box.addEventListener('focusin', function (event) {
            var star = event.target.closest ? event.target.closest('.as-star') : null;
            if (star) select(star);
        });

        /* Trazado de las líneas.
           Tres caminos posibles, en este orden de preferencia:
           1 · GSAP, si llega, con un easing propio (más abajo).
           2 · IntersectionObserver, que pone .is-drawn al entrar.
           3 · La casilla del usuario, que funciona solo con CSS.
           En movimiento reducido ya salen trazadas desde el CSS. */
        var gsapWillDraw = false;

        window.__asMarkGsapDraw = function () {
            gsapWillDraw = true;
        };

        if (hasObserver && !reduced()) {
            var drawObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    drawObserver.unobserve(entry.target);
                    if (gsapWillDraw) return;
                    entry.target.classList.add('is-drawn');
                });
            }, { threshold: 0.35 });

            drawObserver.observe(box);
        } else {
            box.classList.add('is-drawn');
        }

        /* Respaldo de la casilla donde :has() no existe. */
        var toggle = box.querySelector('.as-switch input');

        if (toggle && !supports('selector(:has(*))')) {
            toggle.addEventListener('change', function () {
                box.classList.toggle('is-drawn', toggle.checked);
            });
        }

        /* Se selecciona la primera estrella para que el panel no nazca
           vacío. */
        select(stars[0]);
    })();

    /* ══════════════════════════════════════════════
       9 · TU PESO EN OTROS MUNDOS

       Gravedades superficiales reales, escritas en el HTML como
       data-g. El resultado se puede comprobar en cualquier tabla
       planetaria, que es justo lo que se espera de un curso de
       ciencia.

       Es el gancho de la página: un niño mete su peso, ve que en la
       Luna pesa seis veces menos y va a buscar a su madre. Cuesta
       unas veinte líneas.
       ══════════════════════════════════════════════ */

    (function gravity() {
        var input = document.getElementById('as-weight');
        if (!input) return;

        var range = document.getElementById('as-weight-range');
        var worlds = list('.as-world[data-g]');
        if (!worlds.length) return;

        var nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

        /* Referencia para la barra: el peso en Júpiter, que es el
           mayor. Así ninguna barra se sale y la comparación entre
           mundos se mantiene honesta. */
        var maxG = worlds.reduce(function (m, w) {
            return Math.max(m, Number(w.dataset.g) || 0);
        }, 0);

        function paint() {
            var kg = Number(input.value);

            /* Sin límites, un niño escribe 999999 y la fila se rompe.
               Con límites, el propio campo enseña que hay un rango
               razonable. */
            if (!isFinite(kg) || kg <= 0) kg = 0;
            kg = Math.min(kg, 250);

            worlds.forEach(function (world) {
                var g = Number(world.dataset.g) || 0;
                var out = world.querySelector('.as-world-out');
                var bar = world.querySelector('.as-world-bar span');

                if (out) {
                    out.textContent = kg ? nf.format(kg * g) + ' kg' : '—';
                }

                if (bar) {
                    var pct = maxG > 0 ? (g / maxG) * 100 : 0;
                    world.style.setProperty('--as-pct', pct.toFixed(1));
                }
            });
        }

        input.addEventListener('input', function () {
            if (range && range.value !== input.value) range.value = input.value;
            paint();
        });

        if (range) {
            range.addEventListener('input', function () {
                input.value = range.value;
                paint();
            });
        }

        paint();
    })();

    /* ══════════════════════════════════════════════
       10 · Barra fija de conversión
       Aparece cuando el hero ya salió y se retira al llegar al
       formulario: allí estorba y tapa los campos.

       Se gestiona con inert + aria-hidden, no solo con
       desplazamiento: una barra fuera de pantalla que sigue en el
       orden de tabulación es una trampa para quien usa teclado.
       ══════════════════════════════════════════════ */

    var rail = document.getElementById('as-rail');

    if (rail && hasObserver) {
        var heroSeen = true;
        var formSeen = false;
        var revealed = false;

        var refresh = function () {
            var show = !heroSeen && !formSeen;

            if (show && !revealed) {
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

            new IntersectionObserver(function (entries) {
                assign(entries[0].isIntersecting);
                refresh();
            }, { threshold: 0 }).observe(el);
        };

        watch('.as-hero', function (v) { heroSeen = v; });
        watch('#agendar', function (v) { formSeen = v; });
    }

    /* ══════════════════════════════════════════════
       11 · Formulario
       No hay pasarela de pago: se apunta el lead y se abre WhatsApp
       para cerrar. Por eso lo importante es que el aviso a
       /api/bookings salga SIEMPRE y salga antes de abrir la otra
       pestaña, que en móvil puede descargar este documento.
       ══════════════════════════════════════════════ */

    (function enrollment() {
        var form = document.getElementById('as-form');
        if (!form) return;

        var WHATSAPP = '525578107837';
        var COURSE = 'Ciencia y Astronomía';

        var status = document.getElementById('as-status');
        var waLink = document.getElementById('as-wa');

        var fields = {
            name: document.getElementById('as-name'),
            phone: document.getElementById('as-phone'),
            child: document.getElementById('as-child'),
            age: document.getElementById('as-age'),
            consent: document.getElementById('as-consent')
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

            if (!fields.child || fields.child.value.trim().length < 2) {
                fail(fields.child, 'Escribe el nombre de tu hijo o hija.');
                problems.push(fields.child);
            }

            if (!fields.age || !fields.age.value) {
                fail(fields.age, 'Elige un rango de edad.');
                problems.push(fields.age);
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
                    stage: 'contacto',
                    name: who,
                    phone: phone,
                    course: COURSE
                });
            }

            var message =
                'Hola, quiero información del curso de ' + COURSE + '.\n\n' +
                'Contacto: ' + parent + '\n' +
                'Alumno: ' + child + ' (' + age + ' años)\n' +
                'WhatsApp: ' + phone + '\n\n' +
                'Me interesa la sesión de observación sin costo y la próxima fecha de inicio.';

            var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message);

            if (waLink) waLink.href = url;

            toggleAttr(form, 'data-sent', true);
            say('Datos registrados. Te contactamos por WhatsApp en horario de oficina.');

            var heading = document.getElementById('as-done-title');
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

        /* Al escribir se retira el error del campo: mantenerlo mientras
           el visitante ya lo está corrigiendo es hostil. */
        function relax(event) {
            var field = event.target;
            if (field.id && document.getElementById(field.id + '-err')) clear(field);
        }

        form.addEventListener('input', relax);
        form.addEventListener('change', relax);

        /* El formulario no se envía al servidor: no debe recargar la
           página si alguien pulsa Enter. */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            send();
        });
    })();

    /* ══════════════════════════════════════════════
       12 · Listener de scroll
       Se instala al final y SOLO si alguna pieza se registró. En un
       navegador con scroll-driven animations y sin sombreador, esta
       página no escucha el scroll en absoluto.
       ══════════════════════════════════════════════ */

    if (painters.length) {
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request, { passive: true });
    }

    /* ══════════════════════════════════════════════════════════════
       13 · GSAP + ScrollTrigger  ·  LO ÚLTIMO Y CONDICIONADO

       Qué hace GSAP que el CSS no puede, y por eso justifica 46 KB:

       a) Interpolar UN número (--as-zoom) con scrub y compartirlo
          entre cuatro elementos del recorrido de escala. Con
          scroll-driven CSS se podría, pero no en Safari, que es medio
          tráfico de esta página en México.

       b) Trazar la constelación con un easing real y en cadena con el
          resto de la sección.

       c) Escalonar los renglones del titular con control de solape.

       Lo que NO se le da a GSAP, a propósito:
       · La barra de avance: el navegador ya la mueve gratis.
       · Los hover: son CSS.
       · pin: reestructura el DOM y rompe las anclas. Se usa sticky.

       Y las tres condiciones para pedirlo:
       · después de 'load', en tiempo libre;
       · solo si canAfford() pasa;
       · con integrity, para que un CDN comprometido no ejecute nada.

       Si algo de esto falla, la página ya está completa. Se puede
       comprobar bloqueando cdnjs: no cambia nada esencial.
       ══════════════════════════════════════════════════════════════ */

    (function orchestrate() {
        if (!canAfford()) return;

        /* Si el navegador ya trae el motor nativo para todo lo que
           necesitamos, no se descarga nada. La biblioteca es el
           respaldo del navegador, no al revés. */
        var needsScrub = !!document.querySelector('.as-scale-stage');
        if (!needsScrub && !document.querySelector('.as-chart-box')) return;

        var BASE = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/';

        /* Huellas calculadas sobre los archivos servidos por cdnjs. Si
           el CDN devolviera otro contenido, el navegador se niega a
           ejecutarlo y la página se queda con sus respaldos. */
        var LIBS = [
            {
                src: BASE + 'gsap.min.js',
                integrity: 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt'
            },
            {
                src: BASE + 'ScrollTrigger.min.js',
                integrity: 'sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d'
            }
        ];

        function load(lib) {
            return new Promise(function (resolve, reject) {
                var s = document.createElement('script');
                s.src = lib.src;
                s.integrity = lib.integrity;
                s.crossOrigin = 'anonymous';
                s.async = true;
                s.onload = resolve;
                s.onerror = function () {
                    reject(new Error('no se pudo cargar ' + lib.src));
                };
                document.head.appendChild(s);
            });
        }

        function setup() {
            var gsap = window.gsap;
            var ScrollTrigger = window.ScrollTrigger;

            if (!gsap || !ScrollTrigger) return;

            gsap.registerPlugin(ScrollTrigger);

            /* Marca para que el CSS aparte sus propias animaciones del
               titular y no compitan dos motores por lo mismo. */
            document.documentElement.classList.add('as-gsap');

            /* ── a) Renglones del titular ── */
            var lines = list('.as-hero-copy .as-line');

            if (lines.length) {
                gsap.set(lines, { opacity: 0, yPercent: 12 });
                gsap.to(lines, {
                    opacity: 1,
                    yPercent: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    stagger: 0.09
                });
            }

            /* ── b) Recorrido de escala ──
               El scrub interpola --as-zoom entre 0 y 1 mientras la
               lista de pasos cruza la pantalla. El CSS traduce ese
               número a tamaños y opacidades de los cuatro anillos.

               scrub: 0.6 en lugar de true: añade una inercia corta que
               disimula el salto entre eventos de scroll en trackpads
               con aceleración. */
            var stage = document.querySelector('.as-scale-stage');
            var steps = document.querySelector('.as-steps');

            if (stage && steps) {
                gsap.to(stage, {
                    '--as-zoom': 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: steps,
                        start: 'top 72%',
                        end: 'bottom 55%',
                        scrub: 0.6
                    }
                });

                /* Cada paso se marca al pasar por el centro. Es
                   toggleClass, así que el aspecto sigue viviendo en el
                   CSS y GSAP solo decide cuándo. */
                list('.as-step').forEach(function (step) {
                    ScrollTrigger.create({
                        trigger: step,
                        start: 'top 62%',
                        end: 'bottom 42%',
                        toggleClass: { targets: step, className: 'is-near' }
                    });
                });
            }

            /* ── c) Trazado de la constelación ── */
            var box = document.querySelector('.as-chart-box');

            if (box) {
                if (typeof window.__asMarkGsapDraw === 'function') {
                    window.__asMarkGsapDraw();
                }

                /* Se anula la transición del CSS para que no pelee con
                   la interpolación de GSAP sobre la misma propiedad. */
                box.style.setProperty('transition', 'none');

                gsap.fromTo(box,
                    { '--as-draw': 0 },
                    {
                        '--as-draw': 1,
                        duration: 1.8,
                        ease: 'power1.inOut',
                        scrollTrigger: {
                            trigger: box,
                            start: 'top 78%',
                            once: true
                        }
                    }
                );
            }

            /* ── Parallax del orrery ──
               Un desplazamiento corto: el diagrama tiene que seguir
               leyéndose como diagrama.

               Se mueve el envoltorio, NO el escenario. El escenario
               lleva la inclinación de la eclíptica en su transform, y
               GSAP escribe sobre esa misma propiedad: tendría que
               descomponer la matriz 3D y volver a componerla en su
               propio orden en cada fotograma. Funciona, pero deja la
               geometría del diagrama a merced de un redondeo ajeno.
               El envoltorio no tiene transform, así que GSAP es dueño
               de él sin tocar nada. */
            var orrery = document.querySelector('.as-orrery-view');

            if (orrery) {
                gsap.to(orrery, {
                    yPercent: -6,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.as-hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 1
                    }
                });
            }

            /* Si el tamaño de las fuentes cambia al terminar de
               cargarlas, las medidas de ScrollTrigger quedan viejas. */
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () {
                    ScrollTrigger.refresh();
                });
            }
        }

        whenIdle(function () {
            /* La preferencia puede haber cambiado entre la carga y este
               momento: se vuelve a preguntar antes de gastar. */
            if (!canAfford()) return;

            load(LIBS[0])
                .then(function () { return load(LIBS[1]); })
                .then(setup)
                .catch(function () {
                    /* El respaldo ya está en pantalla. Nada que hacer y
                       nada que avisar al visitante. */
                });
        });
    })();
})();
