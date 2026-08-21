
            /* ══════════════════════════════════════════════════════════════
               DIRECCIÓN DE ARTE — motor de los recursos nuevos

               Se apoya en lo que ya existe en este ámbito: `$`, `$$` y
               `reduceMotion`. Nada se anima con keyframes: igual que en la
               referencia auditada, el scroll es la línea de tiempo.
               ══════════════════════════════════════════════════════════════ */

            /* ---------- Titular troceado por palabras ----------
               Recorremos los nodos hijos y reemitimos los espacios tal cual,
               para no separar la puntuación de la última palabra ni romper el
               <em> del titular. */
            (function heroWords() {
                var host = $('.fx-hero h1');
                if (!host) return;
                if (reduceMotion) { host.classList.add('is-lit'); return; }

                var i = 0;
                var out = document.createDocumentFragment();

                Array.prototype.slice.call(host.childNodes).forEach(function (node) {
                    if (node.nodeType !== 3) { out.appendChild(node.cloneNode(true)); return; }
                    node.nodeValue.split(/(\s+)/).forEach(function (chunk) {
                        if (!chunk) return;
                        if (/^\s+$/.test(chunk)) {
                            out.appendChild(document.createTextNode(chunk));
                            return;
                        }
                        var w = document.createElement('span');
                        w.className = 'fx-hword';
                        var inner = document.createElement('i');
                        inner.textContent = chunk;
                        inner.style.setProperty('--w-delay', (i++ * 55) + 'ms');
                        w.appendChild(inner);
                        out.appendChild(w);
                    });
                });

                host.textContent = '';
                host.appendChild(out);
                requestAnimationFrame(function () { host.classList.add('is-lit'); });
            })();

            /* ---------- Vídeo del hero ----------
               Sólo se carga si tiene sentido: nunca con movimiento reducido,
               nunca en pantallas estrechas y nunca con ahorro de datos. En esos
               casos la pintura fija ya está debajo y hace de póster, así que no
               se descarga nada de más. Si el navegador bloquea la reproducción
               automática también se queda la pintura quieta: no hay estado roto
               posible. */
            (function heroVideo() {
                var v = $('[data-hero-video]');
                if (!v) return;
                if (reduceMotion) return;
                if (window.matchMedia('(max-width: 900px)').matches) return;

                var link = navigator.connection || navigator.mozConnection;
                if (link && (link.saveData ||
                    /(^|-)(2g|slow-2g)$/.test(link.effectiveType || ''))) return;

                [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (pair) {
                    var url = v.dataset[pair[0]];
                    if (!url) return;
                    var s = document.createElement('source');
                    s.src = url;
                    s.type = pair[1];
                    v.appendChild(s);
                });

                v.addEventListener('playing', function () {
                    v.classList.add('is-on');
                }, { once: true });

                v.load();
                var intento = v.play();
                if (intento && intento.catch) intento.catch(function () { /* queda el póster */ });
            })();

            /* ---------- Bandas de disolvencia entre bloques ----------
               Mismo recurso que en la referencia (un canvas 2D deshace un color
               en el siguiente) pero dibujado con la trama de semitono de esta
               página: una rejilla desplazada donde la probabilidad de tinta
               crece con la altura. */
            (function dissolveBands() {
                var bands = $$('[data-dissolve]');
                if (!bands.length) return;

                var CELL = 7;

                function paint(cv) {
                    var from = cv.dataset.from || '#f5f1e8';
                    var to = cv.dataset.to || '#efe9dc';
                    var dpr = Math.min(window.devicePixelRatio || 1, 2);
                    var w = cv.clientWidth;
                    var h = cv.clientHeight;
                    if (!w || !h) return;

                    cv.width = Math.round(w * dpr);
                    cv.height = Math.round(h * dpr);

                    var g = cv.getContext('2d');
                    if (!g) return;
                    g.setTransform(dpr, 0, 0, dpr, 0, 0);
                    g.fillStyle = from;
                    g.fillRect(0, 0, w, h);
                    g.fillStyle = to;

                    var cols = Math.ceil(w / CELL) + 2;
                    var rows = Math.ceil(h / CELL) + 2;

                    for (var r = 0; r < rows; r++) {
                        var t = r / (rows - 1);
                        var p = Math.pow(t, 0.85);
                        for (var c = 0; c < cols; c++) {
                            if (Math.random() > p) continue;
                            var offset = (r % 2) * (CELL / 2);
                            var radius = (CELL / 2) * (0.42 + 0.58 * p);
                            g.beginPath();
                            g.arc(c * CELL + offset, r * CELL, radius, 0, Math.PI * 2);
                            g.fill();
                        }
                    }
                    /* Los últimos píxeles quedan sólidos: la banda entrega el
                       color limpio al bloque siguiente y no se ve el corte. */
                    g.fillRect(0, h - CELL, w, CELL);
                }

                function paintAll() { bands.forEach(paint); }
                paintAll();

                var timer;
                window.addEventListener('resize', function () {
                    clearTimeout(timer);
                    timer = setTimeout(paintAll, 180);
                });
            })();

            /* ---------- Secuencia fijada: constelación de fijaciones ----------
               El recorrido del contenedor fijado se traduce en un progreso 0..1
               que releva la frase del centro y va encendiendo las teselas. */
            (function pinnedSequence() {
                var track = $('[data-pin]');
                if (!track) return;

                var stage = $('.fx-pin-stage', track);
                var lines = $$('[data-pin-lines] > span', track);
                var tiles = $$('.fx-pin-tile', track);
                var num = $('[data-pin-num]', track);
                if (!stage || lines.length < 2) return;

                var pad = function (n) { return (n < 10 ? '0' : '') + n; };

                if (reduceMotion) {
                    lines.forEach(function (el) { el.classList.add('is-on'); });
                    tiles.forEach(function (el) { el.classList.add('is-on'); });
                    if (num) num.textContent = '01 — ' + pad(lines.length);
                    return;
                }

                var queued = false;
                var lastStep = -1;

                function render() {
                    queued = false;

                    var box = track.getBoundingClientRect();
                    var span = track.offsetHeight - window.innerHeight;
                    if (span <= 0) return;

                    var p = Math.min(Math.max(-box.top / span, 0), 1);
                    stage.style.setProperty('--pin-progress', p.toFixed(4));

                    /* La frase ocupa una franja del recorrido; el reparto deja
                       aire al principio y al final para que el relevo no
                       coincida con la entrada ni la salida del fijado. */
                    var eased = Math.min(Math.max((p - 0.06) / 0.86, 0), 0.9999);
                    var step = Math.floor(eased * lines.length);

                    if (step !== lastStep) {
                        lastStep = step;
                        lines.forEach(function (el, i) {
                            el.classList.toggle('is-on', i === step);
                        });
                        if (num) num.textContent = pad(step + 1) + ' — ' + pad(lines.length);
                    }

                    tiles.forEach(function (el, i) {
                        el.classList.toggle('is-on', p >= 0.08 + (i / tiles.length) * 0.74);
                    });
                }

                function schedule() {
                    if (queued) return;
                    queued = true;
                    requestAnimationFrame(render);
                }

                window.addEventListener('scroll', schedule, { passive: true });
                window.addEventListener('resize', schedule);
                render();
            })();

