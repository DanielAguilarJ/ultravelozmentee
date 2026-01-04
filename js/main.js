document.addEventListener('DOMContentLoaded', () => {

    // Random urgency number
    const urgencyBadge = document.querySelector('.cta-urgency-badge');
    if (urgencyBadge) {
        const randomNum = Math.floor(Math.random() * 9) + 2; // Random number between 2 and 10
        urgencyBadge.textContent = '🔥 ¡Solo quedan ' + randomNum + ' lugares para este mes!';
    }

    // Random live activity number
    const liveActivityStrong = document.querySelector('.cta-live-activity span strong');
    if (liveActivityStrong) {
        const randomLiveNum = Math.floor(Math.random() * 8) + 3; // Random number between 3 and 10
        liveActivityStrong.textContent = randomLiveNum + ' personas';
    }

    // Create Floating Particles
    const createParticles = () => {
        const container = document.getElementById('particles');
        if (!container) return;

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.animationDuration = (10 + Math.random() * 10) + 's';
            particle.style.opacity = 0.1 + Math.random() * 0.3;
            particle.style.width = (4 + Math.random() * 4) + 'px';
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }
    };
    createParticles();

    // Mobile Menu Toggle (legacy - keeping for backwards compatibility)
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');

            // Optional: Animate hamburger icon
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    navLinks.style.display = 'none';
                }

                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });

    // Initialize Swiper
    const swiper = new Swiper('.testimonial-swiper', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        effect: 'coverflow',
        coverflowEffect: {
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: false,
        },
        breakpoints: {
            640: {
                slidesPerView: 1,
            },
            768: {
                slidesPerView: 2,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 30,
            },
        }
    });

    // Number Counter Animation
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('number')) {
                    const target = +entry.target.getAttribute('data-target');
                    const duration = 2000; // 2 seconds
                    const increment = target / (duration / 16); // 60fps

                    let current = 0;
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            entry.target.innerText = Math.ceil(current) + (target > 99 ? '+' : '');
                            requestAnimationFrame(updateCounter);
                        } else {
                            entry.target.innerText = target + (target > 99 ? '+' : '');
                        }
                    };
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);

    const statNumbers = document.querySelectorAll('.number');
    statNumbers.forEach(el => observer.observe(el));

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        } else {
            navbar.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        }
    });

    // Slider Revolution Style Effects
    const heroSection = document.querySelector('.hero');
    const parallaxShapes = document.querySelectorAll('.shape');
    const tiltCard = document.querySelector('.glass-card');
    const floatBadges = document.querySelectorAll('.float-ui');
    const heroText = document.querySelector('.hero-text');

    // Apply will-change hints to prevent forced reflows
    if (tiltCard) tiltCard.style.willChange = 'transform';
    parallaxShapes.forEach(shape => shape.style.willChange = 'transform');
    floatBadges.forEach(badge => badge.style.willChange = 'transform');
    if (heroText) heroText.style.willChange = 'transform';

    if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
            const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1

            // Parallax Background Shapes
            parallaxShapes.forEach(shape => {
                const speed = shape.getAttribute('data-speed') || 2;
                const xOffset = x * speed * 20;
                const yOffset = y * speed * 20;
                shape.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            });

            // 3D Tilt Effect for Image
            if (tiltCard) {
                const rotateY = x * 5; // Max 5deg rotation
                const rotateX = -y * 5;
                tiltCard.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
            }

            // Parallax for Floating Badges
            floatBadges.forEach((badge, index) => {
                const speed = (index + 1) * 2;
                const xOffset = x * speed * 3;
                const yOffset = y * speed * 3;
                badge.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            });

            // Subtle Text Parallax
            if (heroText) {
                const speed = heroText.getAttribute('data-speed') || 1;
                const xOffset = x * speed * 10;
                const yOffset = y * speed * 10;
                heroText.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            }
        });

        // Reset on Mouse Leave
        heroSection.addEventListener('mouseleave', () => {
            parallaxShapes.forEach(shape => {
                shape.style.transform = 'translate(0, 0)';
            });

            if (tiltCard) {
                tiltCard.style.transform = 'rotateY(0) rotateX(0)';
            }

            floatBadges.forEach(badge => {
                badge.style.transform = `translate(0, 0)`;
            });

            if (heroText) {
                heroText.style.transform = 'translate(0, 0)';
            }
        });
    }
});