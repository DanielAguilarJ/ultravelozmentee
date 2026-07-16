/*
  WorldBrain México — Diplomado Matemáticas (reingeniería 2025)
  Vanilla JS, performance-first.

  Decisiones de conversión:
  - IntersectionObserver: anima solo lo visible (menos jank móvil).
  - Canvas interactivo: metáfora tangible (caos→orden) que ancla la promesa.
  - Escasez persistente: localStorage mantiene consistencia para el usuario.
  - Acordeón accesible: reduce fricción en móvil sin ocultar contenido.
*/

(function () {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  /* NAV (mobile) */
  function initNav() {
    const btn = qs('.dm-navbtn');
    const nav = qs('#dmNav');
    if (!btn || !nav) return;

    function setOpen(isOpen) {
      nav.setAttribute('data-open', String(isOpen));
      btn.setAttribute('aria-expanded', String(isOpen));
    }

    btn.addEventListener('click', () => {
      const isOpen = nav.getAttribute('data-open') === 'true';
      setOpen(!isOpen);
    });

    nav.addEventListener('click', (event) => {
      const target = event.target;
      if (target && target.matches('a[href^="#"]')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    // Desktop reset
    const mq = window.matchMedia('(min-width: 860px)');
    mq.addEventListener('change', () => setOpen(false));
  }

  /* REVEAL (reemplaza AOS) */
  function initReveal() {
    const items = qsa('.dm-reveal');
    if (!items.length) return;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const stagger = Number(el.getAttribute('data-stagger') || '0');
          el.style.transitionDelay = `${Math.min(240, stagger * 60)}ms`;
          el.classList.add('is-in');
          io.unobserve(el);
        });
      },
      { threshold: 0.18 }
    );

    items.forEach((el) => io.observe(el));
  }

  /* MAGNETIC BUTTONS (micro-interacción física) */
  function initMagneticButtons() {
    if (prefersReducedMotion) return;
    const buttons = qsa('.dm-magnetic');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      let raf = 0;

      function onMove(event) {
        const rect = btn.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        const dx = (clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (clientY - (rect.top + rect.height / 2)) / rect.height;

        const x = Math.max(-1, Math.min(1, dx)) * 10;
        const y = Math.max(-1, Math.min(1, dy)) * 10;

        // Extra: para el "shine" del botón principal.
        btn.style.setProperty('--mx', `${((clientX - rect.left) / rect.width) * 100}%`);
        btn.style.setProperty('--my', `${((clientY - rect.top) / rect.height) * 100}%`);

        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          btn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
      }

      function onLeave() {
        cancelAnimationFrame(raf);
        btn.style.transform = 'translate3d(0,0,0)';
      }

      btn.addEventListener('mousemove', onMove, { passive: true });
      btn.addEventListener('mouseleave', onLeave);
      btn.addEventListener('touchmove', onMove, { passive: true });
      btn.addEventListener('touchend', onLeave);
    });
  }

  /* COUNTDOWN + CUPOS (persistente) */
  function initScarcity() {
    const seatsEl = qs('#dmSeats');
    const seatsEl2 = qs('#dmSeats2');
    const timerEl = qs('#dmTimer');

    if (!seatsEl || !timerEl) return;

    const KEY = 'wb_dm_math_2025_v1';
    const now = Date.now();

    /**
     * Modelo:
     * - deadline: ahora + 72h (una ventana realista para decisión)
     * - seats: inicia 20 y baja suavemente por tiempo (no por recargas)
     */
    let state;
    try {
      state = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      state = null;
    }

    if (!state || typeof state !== 'object') {
      state = {
        createdAt: now,
        deadline: now + 72 * 60 * 60 * 1000,
        seats: 20,
        lastSeatTick: now,
      };
    }

    // Reduce cupos gradualmente: 1 cada 90 min, mínimo 3.
    const stepMs = 90 * 60 * 1000;
    const elapsed = Math.max(0, now - (state.lastSeatTick || now));
    const steps = Math.floor(elapsed / stepMs);
    if (steps > 0) {
      state.seats = Math.max(3, (state.seats || 20) - steps);
      state.lastSeatTick = (state.lastSeatTick || now) + steps * stepMs;
    }

    // Persistimos el estado.
    localStorage.setItem(KEY, JSON.stringify(state));

    function fmt2(n) {
      return String(n).padStart(2, '0');
    }

    function render() {
      const t = Date.now();
      const remaining = Math.max(0, state.deadline - t);

      seatsEl.textContent = String(state.seats);
      if (seatsEl2) seatsEl2.textContent = String(state.seats);

      if (remaining <= 0) {
        timerEl.textContent = 'Cerrado';
        timerEl.setAttribute('aria-label', 'Inscripción cerrada');
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      timerEl.textContent = `${fmt2(h)}:${fmt2(m)}:${fmt2(s)}`;
      timerEl.setAttribute('aria-label', `Tiempo restante ${h} horas ${m} minutos ${s} segundos`);
    }

    render();
    window.setInterval(render, 1000);
  }

  /* ACCORDION (accesible) */
  function initAccordion() {
    const items = qsa('.dm-accItem');
    if (!items.length) return;

    items.forEach((item, index) => {
      const btn = qs('.dm-accBtn', item);
      const panel = qs('.dm-accPanel', item);
      if (!btn || !panel) return;

      const panelId = `dmAccPanel_${index}`;
      btn.setAttribute('aria-controls', panelId);
      panel.id = panelId;

      function setOpen(isOpen) {
        btn.setAttribute('aria-expanded', String(isOpen));
        panel.hidden = !isOpen;
      }

      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        setOpen(!open);
      });

      btn.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          btn.click();
        }
      });

      // Default: primera sección abierta (reduce incertidumbre).
      if (index === 0) setOpen(true);
      else setOpen(false);
    });
  }

  /* MYTHS STICKY HORIZONTAL (scrollytelling) */
  function initMythsScroller() {
    const root = qs('[data-myths]');
    const track = qs('[data-myths-track]');
    const bar = qs('[data-progressbar]');
    if (!root || !track) return;

    // Creamos altura de scroll suficiente para recorrer la pista.
    function resize() {
      const vw = window.innerWidth;
      const trackWidth = track.scrollWidth;
      const extra = Math.max(0, trackWidth - vw + 40);
      // Sección de scrollytelling: altura = viewport + extra
      root.style.height = `${window.innerHeight + extra}px`;
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const rect = root.getBoundingClientRect();
        const start = window.innerHeight * 0.15;
        const end = window.innerHeight * 0.85;
        const total = rect.height - (end - start);
        const progressed = Math.min(Math.max((start - rect.top) / total, 0), 1);

        const vw = window.innerWidth;
        const maxX = Math.max(0, track.scrollWidth - vw + 40);
        const x = -progressed * maxX;
        track.style.transform = `translate3d(${x}px, 0, 0)`;
        if (bar) bar.style.width = `${Math.round(progressed * 100)}%`;
      });
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Canvas: números caóticos -> orden */
  function initNumbersCanvas() {
    const canvas = qs('#dmNumbers');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0;
    let h = 0;

    const COUNT = 80;
    const nodes = [];
    let pointer = { x: 0.5, y: 0.5, active: false };
    let mode = 'chaos'; // 'chaos' | 'order'

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(280, Math.floor(rect.width));
      h = Math.max(200, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function initNodes() {
      nodes.length = 0;
      for (let i = 0; i < COUNT; i++) {
        const val = String(Math.floor(Math.random() * 10));
        nodes.push({
          val,
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.35, 0.35),
          vy: rand(-0.35, 0.35),
          tx: rand(0, w),
          ty: rand(0, h),
        });
      }
    }

    function computeTargets() {
      // Orden geométrico (grid centrado en el pointer): metáfora de “estructura”.
      const cx = pointer.x * w;
      const cy = pointer.y * h;
      const cols = 10;
      const rows = 8;
      const gx = Math.max(18, Math.min(28, w / (cols + 2)));
      const gy = Math.max(18, Math.min(30, h / (rows + 2)));
      const startX = cx - ((cols - 1) * gx) / 2;
      const startY = cy - ((rows - 1) * gy) / 2;

      // Ordenamos por valor para que “se vea” el orden.
      const sorted = nodes.slice().sort((a, b) => Number(a.val) - Number(b.val));
      sorted.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols) % rows;
        n.tx = startX + col * gx;
        n.ty = startY + row * gy;
      });
    }

    function setMode(next) {
      mode = next;
      if (mode === 'order') computeTargets();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Fondo sutil para profundidad.
      const grd = ctx.createRadialGradient(w * 0.2, h * 0.2, 20, w * 0.5, h * 0.6, Math.max(w, h));
      grd.addColorStop(0, 'rgba(34, 211, 238, 0.10)');
      grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      ctx.font = `700 ${Math.max(14, Math.min(22, w / 28))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const n of nodes) {
        if (mode === 'order') {
          const ax = (n.tx - n.x) * 0.06;
          const ay = (n.ty - n.y) * 0.06;
          n.vx = (n.vx + ax) * 0.86;
          n.vy = (n.vy + ay) * 0.86;
        } else {
          // Caos controlado (no mareante): se mueve pero no “grita”.
          n.vx += rand(-0.02, 0.02);
          n.vy += rand(-0.02, 0.02);
          n.vx *= 0.92;
          n.vy *= 0.92;
        }

        n.x += n.vx;
        n.y += n.vy;

        // bounds
        if (n.x < 10) { n.x = 10; n.vx *= -0.6; }
        if (n.x > w - 10) { n.x = w - 10; n.vx *= -0.6; }
        if (n.y < 10) { n.y = 10; n.vy *= -0.6; }
        if (n.y > h - 10) { n.y = h - 10; n.vy *= -0.6; }

        // Color según modo.
        const glow = mode === 'order' ? 'rgba(34, 211, 238, 0.85)' : 'rgba(255,255,255,0.75)';
        ctx.fillStyle = glow;
        ctx.fillText(n.val, n.x, n.y);
      }
    }

    let raf = 0;
    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    function setPointerFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      pointer.x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      pointer.y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      if (mode === 'order') computeTargets();
    }

    resize();
    initNodes();
    loop();

    if (!prefersReducedMotion) {
      canvas.addEventListener('mouseenter', () => setMode('order'));
      canvas.addEventListener('mouseleave', () => setMode('chaos'));
      canvas.addEventListener('mousemove', setPointerFromEvent, { passive: true });
    }

    // Mobile: toque alterna orden/caos (mejor UX que hover inexistente).
    canvas.addEventListener(
      'touchstart',
      (e) => {
        setPointerFromEvent(e);
        setMode(mode === 'order' ? 'chaos' : 'order');
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      resize();
      initNodes();
      if (mode === 'order') computeTargets();
    }, { passive: true });

    // Stop animation when tab is hidden (battery).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(loop);
      }
    });
  }

  function initYear() {
    const el = qs('#dmYear');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initReveal();
    initMagneticButtons();
    initScarcity();
    initAccordion();
    initMythsScroller();
    initNumbersCanvas();
    initYear();
  });
})();
/* Diplomado Matemáticas - Interacciones específicas */

(function () {
    function initNumberSorting() {
        const strips = Array.from(document.querySelectorAll('.dm-number-strip'));
        if (!strips.length) return;

        const setStrip = (strip, mode) => {
            const value = mode === 'sorted' ? strip.dataset.sorted : strip.dataset.scramble;
            if (!value) return;
            strip.textContent = value;
        };

        strips.forEach(strip => {
            setStrip(strip, 'scramble');

            const card = strip.closest('.dm-bento-card') || strip;
            card.addEventListener('mouseenter', () => setStrip(strip, 'sorted'));
            card.addEventListener('mouseleave', () => setStrip(strip, 'scramble'));
            card.addEventListener('focusin', () => setStrip(strip, 'sorted'));
            card.addEventListener('focusout', () => setStrip(strip, 'scramble'));
        });

        // Extra: si el usuario pasa por el contenedor bento, ordena todo.
        const bento = document.querySelector('.dm-bento');
        if (bento) {
            bento.addEventListener('mouseenter', () => strips.forEach(s => setStrip(s, 'sorted')));
            bento.addEventListener('mouseleave', () => strips.forEach(s => setStrip(s, 'scramble')));
        }
    }

    function initMythsSwitch() {
        const toggle = document.getElementById('dmMythSwitch');
        if (!toggle) return;

        const page = document.body;
        const apply = () => {
            page.classList.toggle('dm-show-reality', !!toggle.checked);
        };

        toggle.addEventListener('change', apply);
        apply();
    }

    function initProgressBar() {
        const fill = document.querySelector('.dm-progress-fill');
        if (!fill) return;

        const target = fill.getAttribute('data-target') || '100%';

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                fill.style.width = target;
                obs.disconnect();
            });
        }, { threshold: 0.35 });

        obs.observe(fill);
    }

    function initTestimonialsSwiper() {
        const el = document.querySelector('.dm-testimonial-swiper');
        if (!el) return;
        if (typeof Swiper === 'undefined') return;

        // eslint-disable-next-line no-new
        new Swiper('.dm-testimonial-swiper', {
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false
            },
            pagination: {
                el: '.dm-swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.dm-swiper-next',
                prevEl: '.dm-swiper-prev'
            },
            slidesPerView: 1,
            spaceBetween: 16,
            breakpoints: {
                768: { slidesPerView: 2, spaceBetween: 18 },
                1024: { slidesPerView: 3, spaceBetween: 22 }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initNumberSorting();
        initMythsSwitch();
        initProgressBar();
        initTestimonialsSwiper();
    });
})();
