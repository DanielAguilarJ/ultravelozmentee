/* ═══════════════════════════════════════════════════════════════════════════
   WORLDBRAIN MÉXICO - JAVASCRIPT PARA PÁGINAS DE CURSOS
   MatheKids, Homeschool Veloz, Robotics Code
   ═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            document.body.style.overflow = 'auto';
        }, 500);
    }
});

// Fallback: ocultar loading screen después de 3 segundos incluso si algo falla
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('hidden');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.visibility = 'hidden';
        document.body.style.overflow = 'auto';
    }
}, 3000);

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE AOS (Animate On Scroll)
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100,
            easing: 'ease-out-cubic'
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM CURSOR
// ═══════════════════════════════════════════════════════════════════════════
const cursorDot = document.getElementById('cursorDot');
const cursorOutline = document.getElementById('cursorOutline');

if (cursorDot && cursorOutline) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });
    
    // Smooth cursor outline follow
    function animateCursor() {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;
        
        cursorOutline.style.left = outlineX + 'px';
        cursorOutline.style.top = outlineY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Cursor hover effects
    const hoverElements = document.querySelectorAll('a, button, .card, .faq-item, .level-card, .benefit-card, .why-card, .course-card-large, .tech-card, .project-item, .testimonial-card, .method-step');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorOutline.classList.add('hovering');
            cursorDot.style.transform = 'translate(-50%, -50%) scale(2)';
        });
        el.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('hovering');
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
    
    // Hide cursor on mobile/touch devices
    if ('ontouchstart' in window) {
        cursorDot.style.display = 'none';
        cursorOutline.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR SCROLL EFFECT
// ═══════════════════════════════════════════════════════════════════════════
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE MENU TOGGLE
// ═══════════════════════════════════════════════════════════════════════════
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelector('.course-nav-links');

if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        
        // Toggle body scroll
        if (navLinks.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SMOOTH SCROLL
// ═══════════════════════════════════════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 100;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAQ ACCORDION
// ═══════════════════════════════════════════════════════════════════════════
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
        // Close other items when one is opened
        if (item.open) {
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.open) {
                    otherItem.open = false;
                }
            });
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GSAP SCROLL ANIMATIONS (if GSAP is available)
// ═══════════════════════════════════════════════════════════════════════════
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Parallax orbs
    gsap.utils.toArray('.hero-orb').forEach((orb, i) => {
        gsap.to(orb, {
            y: -100 * (i + 1),
            ease: 'none',
            scrollTrigger: {
                trigger: '.course-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });
    });
    
    // Cards stagger animation
    gsap.utils.toArray('.benefit-card, .level-card, .feature-card').forEach((card, i) => {
        gsap.from(card, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                toggleActions: 'play none none reverse'
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING NUMBERS ANIMATION (MatheKids)
// ═══════════════════════════════════════════════════════════════════════════
const floatingNumbers = document.querySelectorAll('.floating-num');
floatingNumbers.forEach(num => {
    // Random animation
    const duration = 3 + Math.random() * 2;
    const delay = Math.random() * 2;
    
    num.style.animation = `floatNumber ${duration}s ease-in-out ${delay}s infinite`;
});

// ═══════════════════════════════════════════════════════════════════════════
// COUNTER ANIMATION
// ═══════════════════════════════════════════════════════════════════════════
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    updateCounter();
}

// Observe counters and animate when visible
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = parseInt(entry.target.dataset.count);
            if (target) {
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(counter => {
    counterObserver.observe(counter);
});

// ═══════════════════════════════════════════════════════════════════════════
// GEO-TARGETING — REPLACE [data-geo-city] TEXT WITH DETECTED CITY
// ═══════════════════════════════════════════════════════════════════════════
(function () {
    const GEO_CACHE_KEY = 'wbm_geo_city';
    const GEO_API = 'https://ipapi.co/json/';
    const FALLBACK = 'Ciudad de México';
    const TTL = 24 * 60 * 60 * 1000;

    function applyCity(city) {
        const els = document.querySelectorAll('[data-geo-city]');
        if (!els.length) return;
        els.forEach(function (el) {
            if (el.textContent.trim() === city) {
                el.classList.add('geo-ready');
                return;
            }
            el.classList.add('geo-fading');
            setTimeout(function () {
                el.textContent = city;
                el.classList.remove('geo-fading');
                el.classList.add('geo-ready');
            }, 400);
        });
    }

    function getCity() {
        try {
            var raw = localStorage.getItem(GEO_CACHE_KEY);
            if (raw) {
                var cached = JSON.parse(raw);
                if (cached.exp && Date.now() < cached.exp) {
                    applyCity(cached.city);
                    return;
                }
            }
        } catch (e) { /* ignore */ }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', GEO_API, true);
        xhr.timeout = 4000;
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var city = data.city || FALLBACK;
                    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ city: city, exp: Date.now() + TTL }));
                    applyCity(city);
                } catch (e) { applyCity(FALLBACK); }
            } else { applyCity(FALLBACK); }
        };
        xhr.onerror = xhr.ontimeout = function () { applyCity(FALLBACK); };
        xhr.send();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', getCity);
    } else {
        getCity();
    }
})();

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLE MESSAGE
// ═══════════════════════════════════════════════════════════════════════════
console.log('%c🧠 WorldBrain México', 'font-size: 24px; font-weight: bold; color: #6366f1;');
console.log('%cDesarrollando mentes brillantes desde 1994', 'font-size: 14px; color: #94a3b8;');
