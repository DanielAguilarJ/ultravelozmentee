/* ══════════════════════════════════════════════════════
   Lectoescritura · Widget "Así lee hoy vs. así va a leer"
   Vanilla JS, sin dependencias. Accesible y con soporte
   para prefers-reduced-motion.
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Contenido: cuento corto, en dos representaciones ── */
    var SYLLABLES = [
        'El', 'pe', 'rro', 'co', 'rre', 'por', 'el', 'par', 'que.',
        'Sal', 'ta', 'muy', 'al', 'to', 'y', 'a', 'tra', 'pa',
        'la', 'pe', 'lo', 'ta', 'ro', 'ja.'
    ];

    var CHUNKS = [
        'El perro corre', 'por el parque.',
        'Salta muy alto', 'y atrapa', 'la pelota roja.'
    ];

    var MODES = {
        silabeo: {
            units: SYLLABLES,
            delay: function () { return 350 + Math.random() * 400; },
            label: '\u2248 20 palabras por minuto \u00b7 el ni\u00f1o gasta tanta energ\u00eda descifrando que no le queda nada para entender.',
            separator: '-'
        },
        fluida: {
            units: CHUNKS,
            delay: function () { return 420; },
            label: '\u2248 90 palabras por minuto \u00b7 lee grupos de palabras de un vistazo y entiende la historia completa.',
            separator: ' '
        }
    };

    var card = document.getElementById('lecto-demo');
    if (!card) return;

    var tabs        = card.querySelectorAll('.demo-tab');
    var stage       = document.getElementById('demo-stage');
    var textEl      = document.getElementById('demo-text');
    var progressBar = document.getElementById('demo-progress');
    var statusEl    = document.getElementById('demo-status');
    var playBtn     = document.getElementById('demo-play');
    var compareEl   = document.getElementById('demo-compare');
    var cmpSil      = document.getElementById('compare-silabeo');
    var cmpFlu      = document.getElementById('compare-fluida');

    var currentMode = 'silabeo';
    var playing     = false;
    var timerId     = null;
    var results     = { silabeo: null, fluida: null };

    var reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Render texto ── */
    function renderText(mode) {
        var cfg = MODES[mode];
        textEl.innerHTML = '';
        cfg.units.forEach(function (unit, i) {
            var span = document.createElement('span');
            span.className = 'chunk';
            span.textContent = unit;
            textEl.appendChild(span);
            if (i < cfg.units.length - 1) {
                textEl.appendChild(
                    document.createTextNode(cfg.separator === '-' ? '\u2011' : ' ')
                );
            }
        });
        progressBar.style.width = '0%';
    }

    /* ── Cambio de pestaña ── */
    function selectMode(mode) {
        if (playing) stopPlayback();
        currentMode = mode;
        tabs.forEach(function (tab) {
            var active = tab.dataset.mode === mode;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        if (stage) stage.setAttribute('aria-labelledby', 'tab-' + mode);
        renderText(mode);
        statusEl.textContent = mode === 'silabeo'
            ? 'Modo silabeado seleccionado. Presiona \u00abLeer\u00bb para ver c\u00f3mo lee tu hijo hoy.'
            : 'Modo fluido seleccionado. Presiona \u00abLeer\u00bb para ver c\u00f3mo va a leer.';
    }

    /* ── Detener ── */
    function stopPlayback() {
        playing = false;
        if (timerId) { clearTimeout(timerId); timerId = null; }
        playBtn.disabled = false;
        playBtn.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i> Leer';
    }

    /* ── Comparativa ── */
    function showComparison() {
        if (results.silabeo !== null) cmpSil.textContent = results.silabeo + ' seg';
        if (results.fluida  !== null) cmpFlu.textContent = results.fluida  + ' seg';

        if (results.silabeo !== null && results.fluida !== null) {
            compareEl.classList.remove('is-hidden');
            statusEl.textContent = 'Mismo cuento: ' + results.silabeo + ' segundos silabeando vs. '
                + results.fluida + ' con fluidez. Esa es la diferencia entre descifrar y leer.';
        } else if (results.silabeo !== null && currentMode === 'silabeo') {
            statusEl.textContent += ' Ahora prueba el modo \u00abLectura fluida\u00bb y compara.';
        } else if (results.fluida !== null && currentMode === 'fluida') {
            statusEl.textContent += ' Ahora prueba el modo \u00abLectura silabeada\u00bb y compara.';
        }
    }

    /* ── Reproducción ── */
    function play() {
        if (playing) return;

        var cfg    = MODES[currentMode];
        var chunks = textEl.querySelectorAll('.chunk');
        var total  = chunks.length;
        var startTime = Date.now();

        /* prefers-reduced-motion: resultado inmediato sin animación */
        if (reducedMotion) {
            chunks.forEach(function (c) { c.classList.add('is-lit'); });
            progressBar.style.width = '100%';
            results[currentMode] = currentMode === 'silabeo' ? 14 : 4;
            statusEl.textContent = cfg.label;
            showComparison();
            return;
        }

        playing = true;
        playBtn.disabled = true;
        playBtn.innerHTML = '<i class="fas fa-book-open" aria-hidden="true"></i> Leyendo\u2026';
        chunks.forEach(function (c) { c.classList.remove('is-lit'); });
        progressBar.style.width = '0%';
        statusEl.textContent = currentMode === 'silabeo'
            ? 'S\u00edlaba\u2026 por\u2026 s\u00edlaba\u2026 as\u00ed avanza hoy.'
            : 'Grupos completos de palabras, con ritmo.';

        var i = 0;
        function step() {
            if (!playing) return;
            if (i > 0) chunks[i - 1].classList.remove('is-lit');
            if (i < total) {
                chunks[i].classList.add('is-lit');
                progressBar.style.width = Math.round(((i + 1) / total) * 100) + '%';
                i++;
                timerId = setTimeout(step, cfg.delay());
            } else {
                var elapsed = Math.round((Date.now() - startTime) / 1000);
                results[currentMode] = elapsed;
                stopPlayback();
                statusEl.textContent = cfg.label;
                chunks.forEach(function (c) { c.classList.add('is-lit'); });
                showComparison();
            }
        }
        step();
    }

    /* ── Eventos de tabs ── */
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { selectMode(tab.dataset.mode); });
        tab.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                var other = tab.dataset.mode === 'silabeo' ? 'fluida' : 'silabeo';
                selectMode(other);
                var otherTab = card.querySelector('[data-mode="' + other + '"]');
                if (otherTab) otherTab.focus();
            }
        });
    });

    playBtn.addEventListener('click', play);

    /* ── Estado inicial ── */
    renderText(currentMode);

    /* ══════════════════════════════════════════════════
       Reveal on scroll — IntersectionObserver propio
       Usa .reveal / .is-visible (igual que el prompt)
       ══════════════════════════════════════════════════ */
    var revealEls = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window) || reducedMotion) {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
        var revealObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function (el) { revealObs.observe(el); });
    }

    /* ══════════════════════════════════════════════════
       Sticky CTA móvil — aparece tras 600px de scroll,
       se oculta al llegar al formulario
       ══════════════════════════════════════════════════ */
    var mobileBar       = document.getElementById('lectoMobileBar');
    var inscripcionSec  = document.getElementById('inscripcion');

    if (mobileBar) {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var y        = window.scrollY;
                var nearForm = inscripcionSec &&
                    inscripcionSec.getBoundingClientRect().top < window.innerHeight;
                mobileBar.classList.toggle('show', y > 600 && !nearForm);
                mobileBar.setAttribute('aria-hidden', String(!(y > 600 && !nearForm)));
                ticking = false;
            });
        }, { passive: true });
    }

    /* ══════════════════════════════════════════════════
       Fecha mínima del date-picker (booking.js la lee
       pero también la fijamos aquí como refuerzo)
       ══════════════════════════════════════════════════ */
    var datePicker = document.getElementById('date-picker');
    if (datePicker) {
        var today = new Date();
        var iso = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
        datePicker.min = iso;
    }

})();
