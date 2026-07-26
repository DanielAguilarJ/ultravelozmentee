/**
 * Admisión Universitaria — Landing 2026
 * Vanilla JS, cero dependencias. IIFE + "use strict".
 * Principios: un solo scroll listener (rAF-throttled), IntersectionObserver
 * one-shot, countdown honesto renovable, tracking fail-safe.
 */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Ticker: duplicar contenido por JS para loop infinito (DRY) ---------- */
  const tk = $("#tk");
  if (tk) {
    tk.innerHTML += tk.innerHTML.replace(/<span/g, '<span aria-hidden="true"');
  }

  /* ---------- 2. Scroll: barra de progreso + sticky CTA (1 listener, rAF) ---------- */
  const prog = $("#prog");
  const sticky = $("#sticky");
  const hero = $(".hero");
  let ticking = false;

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (sticky && hero) sticky.classList.toggle("on", scrollY > hero.offsetHeight * 0.8);
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- 3. Reveal on scroll (one-shot: libera memoria al desconectar) ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("on");
        revealIO.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
  $$(".rv").forEach((el) => revealIO.observe(el));

  /* ---------- 4. Countdown: deadline renovable al 1º del mes siguiente.
        Urgencia real sin mentir: siempre hay un cierre de grupo próximo. ---------- */
  const cd = {
    d: $('[data-cd="d"]'), h: $('[data-cd="h"]'),
    m: $('[data-cd="m"]'), s: $('[data-cd="s"]'),
  };
  if (cd.d && cd.h && cd.m && cd.s) {
    const nextDeadline = () => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth() + 1, 1);
    };
    let deadline = nextDeadline();
    const pad = (n) => String(n).padStart(2, "0");

    const tickCd = () => {
      let diff = deadline - Date.now();
      if (diff <= 0) { deadline = nextDeadline(); diff = deadline - Date.now(); }
      cd.d.textContent = pad(Math.floor(diff / 864e5));
      cd.h.textContent = pad(Math.floor(diff / 36e5) % 24);
      cd.m.textContent = pad(Math.floor(diff / 6e4) % 60);
      cd.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    };
    tickCd();
    setInterval(tickCd, 1000);
  }

  /* ---------- 5. Contadores animados (easeOutExpo + Intl es-MX) ---------- */
  const fmt = new Intl.NumberFormat("es-MX");
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (!Number.isFinite(target)) return;
    if (reducedMotion) { el.textContent = fmt.format(target); return; }

    const DURATION = 1600;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / DURATION, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); }
    }
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- 6. FAQ exclusivo: un solo panel abierto a la vez ---------- */
  const faqs = $$(".faq details");
  faqs.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
    });
  });

  /* ---------- 7. Tracking fail-safe (delegación; GA4/Meta-ready).
        El analytics JAMÁS debe romper un clic de conversión. ---------- */
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-track]");
    if (!el) return;
    const payload = {
      event_category: "conversion",
      event_label: el.dataset.track,
      page: "admision-universitaria",
    };
    try {
      if (typeof gtag === "function") gtag("event", "cta_click", payload);
      if (typeof fbq === "function") fbq("track", "Lead", payload);
    } catch (_) { /* silencioso a propósito */ }
  });

  /* ---------- 8. Menú móvil accesible (aria-expanded + cierre al navegar) ---------- */
  const burger = $("#burger");
  const mmenu = $("#mmenu");
  if (burger && mmenu) {
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      mmenu.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () =>
      setMenu(burger.getAttribute("aria-expanded") !== "true"));
    mmenu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false); // cierra al elegir destino
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- 9. Stagger automático: asigna --d según orden entre hermanos.
        Cero clases manuales; la cascada emerge del DOM. ---------- */
  $$(".rv").forEach((el) => {
    const sibs = el.parentElement
      ? [...el.parentElement.children].filter((c) => c.classList.contains("rv"))
      : [el];
    el.style.setProperty("--d", sibs.indexOf(el));
  });
})();

