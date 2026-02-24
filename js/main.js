/**
 * WorldBrain México — Main Page Controller
 * @description Handles UI interactions, animations, parallax effects and scroll behaviors
 * @version 2.0.0 — Performance-optimized (rAF throttle, passive listeners, batched DOM, event delegation)
 */
; (function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════
       PERFORMANCE UTILITIES
       ═══════════════════════════════════════════════════════ */

    /**
     * Returns a rAF-throttled version of a callback.
     * Prevents layout thrashing on high-frequency events (scroll, mousemove).
     * Only one frame is scheduled at a time → guaranteed 60 fps ceiling.
     */
    var _rafTicking = new WeakMap();
    function throttleRAF(fn) {
        return function () {
            var ctx = this, args = arguments;
            if (_rafTicking.get(fn)) return;
            _rafTicking.set(fn, true);
            requestAnimationFrame(function () {
                fn.apply(ctx, args);
                _rafTicking.set(fn, false);
            });
        };
    }

    /** Shorthand DOM selectors — avoids repeated querySelector boilerplate */
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    /** Random integer in [min, max] inclusive */
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    /* ═══════════════════════════════════════════════════════
       DOM READY
       ═══════════════════════════════════════════════════════ */

    /* ── Loading Screen Fix (Global) ── */
    window.addEventListener('load', function () {
        var loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.transition = 'opacity 0.5s ease';
            loader.style.opacity = '0';
            setTimeout(function () {
                loader.style.display = 'none';
            }, 500);
        }
    });

    document.addEventListener('DOMContentLoaded', function () {

        /* ── Urgency & Social Proof Badges ────────────────── */
        var urgencyBadge = $('.cta-urgency-badge');
        if (urgencyBadge) {
            urgencyBadge.textContent = '🔥 ¡Solo quedan ' + randInt(2, 10) + ' lugares para este mes!';
        }

        var liveStrong = $('.cta-live-activity span strong');
        if (liveStrong) {
            liveStrong.textContent = randInt(3, 10) + ' personas';
        }

        /* ── Floating Particles (batched with DocumentFragment) ── */
        var particlesContainer = document.getElementById('particles');
        if (particlesContainer) {
            var fragment = document.createDocumentFragment();
            var PARTICLE_COUNT = 20;

            for (var i = 0; i < PARTICLE_COUNT; i++) {
                var particle = document.createElement('div');
                particle.className = 'particle';
                var size = (4 + Math.random() * 4) + 'px';
                var s = particle.style;
                s.left = Math.random() * 100 + '%';
                s.top = Math.random() * 100 + '%';
                s.animationDelay = Math.random() * 5 + 's';
                s.animationDuration = (10 + Math.random() * 10) + 's';
                s.opacity = (0.1 + Math.random() * 0.3).toString();
                s.width = size;
                s.height = size;
                fragment.appendChild(particle);
            }
            /* Single DOM write instead of 20 individual appendChild calls */
            particlesContainer.appendChild(fragment);
        }

        /* ── Mobile Menu Toggle (legacy — backwards compat) ── */
        var menuToggle = $('.menu-toggle');
        var navLinks = $('.nav-links');
        var navbar = $('.navbar');

        if (menuToggle) {
            menuToggle.addEventListener('click', function () {
                navLinks.classList.toggle('active');
                var icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-bars');
                    icon.classList.toggle('fa-times');
                }
            });
        }

        /* ── FAQ Accordion (Event Delegation — single listener) ─── */
        var faqContainer = $('.faq-container');
        if (faqContainer) {
            faqContainer.addEventListener('click', function (e) {
                var question = e.target.closest('.faq-question');
                if (!question) return;

                var clickedItem = question.parentElement;
                $$('.faq-item', faqContainer).forEach(function (item) {
                    if (item !== clickedItem && item.classList.contains('active')) {
                        item.classList.remove('active');
                    }
                });
                clickedItem.classList.toggle('active');
            });
        }

        /* ── Smooth Scrolling (Event Delegation — single listener) ── */
        document.addEventListener('click', function (e) {
            var anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;

            var targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            var targetEl = $(targetId);
            if (!targetEl) return;

            e.preventDefault();

            /* Close mobile menu if open */
            if (window.innerWidth <= 768 && navLinks) {
                navLinks.style.display = 'none';
            }

            var headerOffset = 80;
            var elPosition = targetEl.getBoundingClientRect().top;
            var offsetPosition = elPosition + window.pageYOffset - headerOffset;

            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        });

        /* ── Initialize AOS (defensive — guard against CDN failure) ── */
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 800, once: true, offset: 100 });
        }

        /* ── Initialize Swiper (defensive) ────────────────── */
        if (typeof Swiper !== 'undefined') {
            new Swiper('.testimonial-swiper', {
                loop: true,
                autoplay: { delay: 5000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev'
                },
                effect: 'coverflow',
                coverflowEffect: {
                    rotate: 0,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: false
                },
                breakpoints: {
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2, spaceBetween: 20 },
                    1024: { slidesPerView: 3, spaceBetween: 30 }
                }
            });
        }

        /* ── Number Counter Animation (IntersectionObserver) ── */
        var counterObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var target = +el.getAttribute('data-target');
                var duration = 2000;                    // 2 seconds
                var increment = target / (duration / 16); // ~60 fps steps
                var suffix = target > 99 ? '+' : '';
                var current = 0;

                function updateCounter() {
                    current += increment;
                    if (current < target) {
                        el.textContent = Math.ceil(current) + suffix;
                        requestAnimationFrame(updateCounter);
                    } else {
                        el.textContent = target + suffix;
                    }
                }

                updateCounter();
                obs.unobserve(el);
            });
        }, { threshold: 0.5 });

        $$('.number').forEach(function (el) { counterObserver.observe(el); });

        /* ── Navbar Scroll Effect (rAF-throttled + passive) ──── */
        if (navbar) {
            var onNavScroll = throttleRAF(function () {
                navbar.style.boxShadow = window.scrollY > 50
                    ? '0 2px 10px rgba(0,0,0,0.1)'
                    : '0 2px 5px rgba(0,0,0,0.05)';
            });
            window.addEventListener('scroll', onNavScroll, { passive: true });
        }

        /* ═══════════════════════════════════════════════════════
           HERO PARALLAX & 3D TILT EFFECTS
           ═══════════════════════════════════════════════════════ */
        var heroSection = $('.hero');
        if (!heroSection) return;

        var parallaxShapes = $$('.shape', heroSection);
        var tiltCard = $('.glass-card', heroSection);
        var floatBadges = $$('.float-ui', heroSection);
        var heroText = $('.hero-text', heroSection);

        /* GPU compositing hint — applied once, avoids per-frame recalc */
        [tiltCard, heroText].concat(parallaxShapes, floatBadges)
            .filter(Boolean)
            .forEach(function (el) { el.style.willChange = 'transform'; });

        /** Hero mousemove handler — rAF-throttled to prevent jank */
        var onHeroMouseMove = throttleRAF(function (e) {
            var x = (e.clientX / window.innerWidth - 0.5) * 2;   // -1 → 1
            var y = (e.clientY / window.innerHeight - 0.5) * 2;   // -1 → 1

            /* Parallax background shapes */
            parallaxShapes.forEach(function (shape) {
                var speed = parseFloat(shape.getAttribute('data-speed')) || 2;
                shape.style.transform = 'translate(' + (x * speed * 20) + 'px,' + (y * speed * 20) + 'px)';
            });

            /* 3D tilt on hero image card */
            if (tiltCard) {
                tiltCard.style.transform = 'rotateY(' + (x * 5) + 'deg) rotateX(' + (-y * 5) + 'deg)';
            }

            /* Floating badge parallax */
            floatBadges.forEach(function (badge, idx) {
                var speed = (idx + 1) * 2;
                badge.style.transform = 'translate(' + (x * speed * 3) + 'px,' + (y * speed * 3) + 'px)';
            });

            /* Subtle text parallax */
            if (heroText) {
                var textSpeed = parseFloat(heroText.getAttribute('data-speed')) || 1;
                heroText.style.transform = 'translate(' + (x * textSpeed * 10) + 'px,' + (y * textSpeed * 10) + 'px)';
            }
        });

        /** Reset all transforms on mouse leave */
        function onHeroMouseLeave() {
            var reset = 'translate(0,0)';
            parallaxShapes.forEach(function (s) { s.style.transform = reset; });
            floatBadges.forEach(function (b) { b.style.transform = reset; });
            if (tiltCard) tiltCard.style.transform = 'rotateY(0) rotateX(0)';
            if (heroText) heroText.style.transform = reset;
        }

        /* Passive: true — tells browser this handler won't call preventDefault,
           allowing optimized scroll/touch compositing on mobile */
        heroSection.addEventListener('mousemove', onHeroMouseMove, { passive: true });
        heroSection.addEventListener('mouseleave', onHeroMouseLeave);
    });
})();