/**
 * ═══════════════════════════════════════════════════════════
 * UNIVERSIDAD DOMINICAL — Interactive Engine v2.0
 * Scroll reveals, counters, parallax, particles, progress
 * ═══════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    /* ── Scroll Progress Bar ──────────────────────────────── */
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.prepend(progressBar);

    function updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
    }

    /* ── Floating Particles ───────────────────────────────── */
    function createParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.prepend(container);

        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.width = (Math.random() * 3 + 2) + 'px';
            p.style.height = p.style.width;
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.opacity = (Math.random() * 0.4 + 0.1).toFixed(2);
            container.appendChild(p);
        }
    }

    /* ── Scroll Reveal (IntersectionObserver) ──────────────── */
    function initScrollReveals() {
        const revealClasses = ['reveal', 'reveal-left', 'reveal-right', 'reveal-scale', 'stagger-children'];
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        revealClasses.forEach(function (cls) {
            document.querySelectorAll('.' + cls).forEach(function (el) {
                observer.observe(el);
            });
        });
    }

    /* ── Animated Counters ────────────────────────────────── */
    function animateCounter(el) {
        const rawText = el.textContent.trim();
        const match = rawText.match(/^([\d,.]+)(\+?)/);
        if (!match) return;

        const target = parseFloat(match[1].replace(/,/g, ''));
        const suffix = rawText.replace(match[0], '');
        const plus = match[2];
        const hasDecimal = match[1].includes('.');
        const isThousands = target >= 1000;
        const duration = 2000;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
            const current = eased * target;

            let display;
            if (hasDecimal) {
                display = current.toFixed(1);
            } else if (isThousands) {
                display = Math.floor(current).toLocaleString('en-US');
            } else {
                display = Math.floor(current).toString();
            }

            el.textContent = display + plus + suffix;

            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    function initCounters() {
        const counterEls = document.querySelectorAll('.uni-stat strong, .counter-value');
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counterEls.forEach(function (el) { observer.observe(el); });
    }

    /* ── Parallax on Images ───────────────────────────────── */
    function initParallax() {
        const parallaxEls = document.querySelectorAll('.parallax-img');
        if (!parallaxEls.length) return;

        function onScroll() {
            const scrollY = window.scrollY;
            parallaxEls.forEach(function (el) {
                const rect = el.getBoundingClientRect();
                const speed = parseFloat(el.dataset.speed || 0.15);
                const yOffset = (rect.top - window.innerHeight / 2) * speed;
                el.style.transform = 'translateY(' + yOffset + 'px)';
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ── Navbar Shrink on Scroll ───────────────────────────── */
    function initNavbar() {
        const nav = document.querySelector('.glass-nav');
        if (!nav) return;

        function check() {
            if (window.scrollY > 60) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', check, { passive: true });
        check();
    }

    /* ── Back to Top Button ───────────────────────────────── */
    function initBackToTop() {
        const btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Volver arriba');
        btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        document.body.appendChild(btn);

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        function check() {
            if (window.scrollY > 500) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', check, { passive: true });
    }

    /* ── Cursor glow (desktop only) ───────────────────────── */
    function initCursorGlow() {
        if (window.innerWidth < 1024) return;

        const glow = document.createElement('div');
        glow.className = 'cursor-glow';
        document.body.appendChild(glow);

        let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animate() {
            glowX += (mouseX - glowX) * 0.08;
            glowY += (mouseY - glowY) * 0.08;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Tilt effect on hero card ──────────────────────────── */
    function initTiltEffect() {
        const heroCard = document.querySelector('.uni-hero .uni-card');
        if (!heroCard || window.innerWidth < 768) return;

        heroCard.addEventListener('mousemove', function (e) {
            const rect = heroCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            heroCard.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-5px)';
        });

        heroCard.addEventListener('mouseleave', function () {
            heroCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    }

    /* ── Smooth anchor scroll with offset ─────────────────── */
    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();
                const navHeight = 80;
                const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;
                window.scrollTo({ top: targetTop, behavior: 'smooth' });
            });
        });
    }

    /* ── Magnetic button effect ────────────────────────────── */
    function initMagneticButtons() {
        if (window.innerWidth < 768) return;

        document.querySelectorAll('.uni-btn').forEach(function (btn) {
            btn.addEventListener('mousemove', function (e) {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px) scale(1.02)';
            });

            btn.addEventListener('mouseleave', function () {
                btn.style.transform = 'translate(0, 0) scale(1)';
            });
        });
    }

    /* ── Number morphing for stats ─────────────────────────── */
    function addClassesToSections() {
        // Add reveal classes to sections that don't already have AOS
        const sections = document.querySelectorAll('.uni-section, section');
        sections.forEach(function (section) {
            const header = section.querySelector('.section-header');
            if (header && !header.classList.contains('reveal')) {
                header.classList.add('reveal');
            }

            // Add stagger to grids
            const grids = section.querySelectorAll('.uni-grid');
            grids.forEach(function (grid) {
                if (!grid.classList.contains('stagger-children')) {
                    grid.classList.add('stagger-children');
                }
            });
        });

        // Add parallax to relevant images
        document.querySelectorAll('.img-reveal-wrapper img').forEach(function (img) {
            img.classList.add('parallax-img');
            img.dataset.speed = '0.08';
        });
    }

    /* ── Hero text animation ──────────────────────────────── */
    function initHeroAnimation() {
        const heroTitle = document.querySelector('.uni-hero .uni-title-display');
        if (!heroTitle) return;

        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(30px)';

        setTimeout(function () {
            heroTitle.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 300);

        // Animate checklist items sequentially
        const checkItems = document.querySelectorAll('.uni-hero .uni-checklist li');
        checkItems.forEach(function (item, i) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(function () {
                item.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 600 + i * 150);
        });

        // Animate hero buttons
        const heroBtns = document.querySelectorAll('.uni-hero .uni-btn, .uni-hero .uni-btn-outline, .uni-hero .uni-pill');
        heroBtns.forEach(function (btn, i) {
            btn.style.opacity = '0';
            btn.style.transform = 'translateY(15px)';
            setTimeout(function () {
                btn.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                btn.style.opacity = '1';
                btn.style.transform = 'translateY(0)';
            }, 1100 + i * 120);
        });
    }

    /* ── Scroll Event Throttle ────────────────────────────── */
    let ticking = false;
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function () {
                updateProgress();
                ticking = false;
            });
            ticking = true;
        }
    }

    /* ── Init Everything ──────────────────────────────────── */
    function init() {
        // Disable AOS to use our custom reveal system (smoother)
        // We keep AOS CSS for compatibility but override with our own
        if (typeof AOS !== 'undefined') {
            // Remove AOS data attributes to prevent double animation
            document.querySelectorAll('[data-aos]').forEach(function (el) {
                el.removeAttribute('data-aos');
                el.removeAttribute('data-aos-delay');
                el.style.opacity = '';
                el.style.transform = '';
            });
        }

        addClassesToSections();
        createParticles();
        initScrollReveals();
        initCounters();
        initParallax();
        initNavbar();
        initBackToTop();
        initCursorGlow();
        initTiltEffect();
        initSmoothAnchors();
        initMagneticButtons();
        initHeroAnimation();

        window.addEventListener('scroll', onScroll, { passive: true });
        updateProgress();
    }

    // Run when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
