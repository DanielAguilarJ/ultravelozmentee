/* ============================================
   JUNIORMATH 2026 - Premium JavaScript
   GSAP + ScrollTrigger + Interactivity
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // === Loading Screen ===
    const loadingScreen = document.getElementById('jmLoadingScreen');
    if (loadingScreen) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 600);
        });
        // Fallback: force hide after 3s
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 3000);
    }

    // === Navbar Scroll Effect ===
    const nav = document.getElementById('jmNav');
    if (nav) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 80) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // === Glow Card Mouse Follow ===
    const glowCards = document.querySelectorAll('.jm-bento-card');
    glowCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // === Scrollytelling: Morph Card ===
    const triggerSection = document.getElementById('trigger-solution');
    const morphCard = document.getElementById('morphCard');

    if (triggerSection && morphCard) {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -20% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    morphCard.classList.add('active');
                } else {
                    const bounding = triggerSection.getBoundingClientRect();
                    if (bounding.top > 0) {
                        morphCard.classList.remove('active');
                    }
                }
            });
        }, observerOptions);

        observer.observe(triggerSection);
    }

    // === FAQ Accordion ===
    const faqItems = document.querySelectorAll('.jm-faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.jm-faq-question');
        question.addEventListener('click', () => {
            // Close others
            faqItems.forEach(other => {
                if (other !== item) other.classList.remove('active');
            });
            // Toggle current
            item.classList.toggle('active');
        });
    });

    // === Animated Counters ===
    const counterElements = document.querySelectorAll('[data-counter]');

    const animateCounter = (element) => {
        const target = parseInt(element.getAttribute('data-counter'));
        const suffix = element.getAttribute('data-suffix') || '';
        const duration = 2000;
        const start = 0;
        const startTime = performance.now();

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const current = Math.floor(start + (target - start) * easedProgress);

            element.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counterElements.forEach(el => counterObserver.observe(el));

    // === Mini Stat Counters in Hero ===
    const miniStatValues = document.querySelectorAll('.jm-mini-stat-value[data-count]');
    miniStatValues.forEach(el => {
        const target = parseInt(el.getAttribute('data-count'));
        const duration = 1500;
        const startTime = performance.now();

        const easeOut = (t) => 1 - Math.pow(1 - t, 3);

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(target * easeOut(progress));
            el.textContent = current;
            if (progress < 1) requestAnimationFrame(step);
        };

        // Delay slightly so user sees the animation
        setTimeout(() => requestAnimationFrame(step), 800);
    });

    // === GSAP Animations (if available) ===
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Fade-in sections
        const sections = document.querySelectorAll('.jm-section-header, .jm-bento-card, .jm-metric-card, .jm-timeline-card, .jm-testimonial-card');
        sections.forEach((el, i) => {
            gsap.fromTo(el,
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    },
                    delay: (i % 4) * 0.1
                }
            );
        });

        // Hero entrance
        gsap.fromTo('.jm-hero-text',
            { opacity: 0, x: -50 },
            { opacity: 1, x: 0, duration: 1, ease: 'power3.out', delay: 0.8 }
        );

        gsap.fromTo('.jm-hero-visual',
            { opacity: 0, x: 50 },
            { opacity: 1, x: 0, duration: 1, ease: 'power3.out', delay: 1 }
        );

        // Parallax on orbs
        gsap.to('.jm-orb-1', {
            y: -100,
            scrollTrigger: {
                trigger: '.jm-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        gsap.to('.jm-orb-2', {
            y: 80,
            scrollTrigger: {
                trigger: '.jm-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        // Offer box entrance
        gsap.fromTo('.jm-offer-box',
            { opacity: 0, scale: 0.9 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: '.jm-offer-box',
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                }
            }
        );

        // FAQ items stagger
        gsap.fromTo('.jm-faq-item',
            { opacity: 0, y: 20 },
            {
                opacity: 1, y: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.jm-faq-list',
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                }
            }
        );
    }

    // === Smooth Scroll for Anchor Links ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
