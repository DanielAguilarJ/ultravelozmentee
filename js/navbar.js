/**
 * Unified Pill Navbar - WorldBrain Mexico
 * Handles: scroll effect, dropdown, hamburger menu, theme toggle, smooth scroll
 */

(function () {
    'use strict';

    // Elements
    const nav = document.querySelector('.nav-pill');
    const hamburger = document.getElementById('navHamburger');
    const mobilePanel = document.getElementById('navMobilePanel');
    const mobileOverlay = document.getElementById('navMobileOverlay');
    const themeToggle = document.getElementById('navThemeToggle');
    const dropdownBtn = document.querySelector('.nav-dropdown > .nav-pill-link');
    const dropdownContainer = document.querySelector('.nav-dropdown');
    const mobileDropdownBtn = document.getElementById('mobileDropdownBtn');
    const mobileDropdownContent = document.getElementById('mobileDropdownContent');

    // =========================================
    // SCROLL EFFECT - Add .scrolled class
    // =========================================
    let ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function () {
                if (nav) {
                    if (window.scrollY > 50) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    onScroll();

    // =========================================
    // DESKTOP DROPDOWN
    // =========================================
    if (dropdownBtn && dropdownContainer) {
        let closeTimeout;

        dropdownBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropdownContainer.classList.toggle('open');
            dropdownBtn.setAttribute('aria-expanded',
                dropdownContainer.classList.contains('open') ? 'true' : 'false'
            );
        });

        // Close on mouse leave (with small delay)
        dropdownContainer.addEventListener('mouseleave', function () {
            closeTimeout = setTimeout(function () {
                dropdownContainer.classList.remove('open');
                dropdownBtn.setAttribute('aria-expanded', 'false');
            }, 200);
        });

        dropdownContainer.addEventListener('mouseenter', function () {
            clearTimeout(closeTimeout);
        });

        // Close on click outside
        document.addEventListener('click', function (e) {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('open');
                dropdownBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && dropdownContainer.classList.contains('open')) {
                dropdownContainer.classList.remove('open');
                dropdownBtn.setAttribute('aria-expanded', 'false');
                dropdownBtn.focus();
            }
        });
    }

    // =========================================
    // MOBILE MENU (Hamburger)
    // =========================================
    // Helper: manage focusability of mobile panel interactive elements
    function setMobilePanelFocusable(focusable) {
        if (!mobilePanel) return;
        var elements = mobilePanel.querySelectorAll('a, button, input, select, textarea, [tabindex]');
        elements.forEach(function (el) {
            if (focusable) {
                el.removeAttribute('tabindex');
            } else {
                el.setAttribute('tabindex', '-1');
            }
        });
        mobilePanel.setAttribute('aria-hidden', focusable ? 'false' : 'true');
    }

    // Initialize: hide mobile panel elements from tab order
    setMobilePanelFocusable(false);

    function openMobileMenu() {
        if (hamburger && mobilePanel && mobileOverlay) {
            hamburger.classList.add('active');
            mobilePanel.classList.add('active');
            mobileOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            hamburger.setAttribute('aria-expanded', 'true');
            setMobilePanelFocusable(true);
        }
    }

    function closeMobileMenu() {
        if (hamburger && mobilePanel && mobileOverlay) {
            hamburger.classList.remove('active');
            mobilePanel.classList.remove('active');
            mobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
            hamburger.setAttribute('aria-expanded', 'false');
            setMobilePanelFocusable(false);
        }
    }

    if (hamburger) {
        hamburger.addEventListener('click', function () {
            if (mobilePanel && mobilePanel.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Keyboard support
        hamburger.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                hamburger.click();
            }
        });
    }

    // Close on overlay click
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close mobile menu when clicking a link
    if (mobilePanel) {
        mobilePanel.querySelectorAll('a:not(.mobile-dropdown-toggle)').forEach(function (link) {
            link.addEventListener('click', function () {
                closeMobileMenu();
            });
        });
    }

    // Close on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobilePanel && mobilePanel.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // =========================================
    // MOBILE DROPDOWN (Accordion)
    // =========================================
    if (mobileDropdownBtn && mobileDropdownContent) {
        mobileDropdownBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var isOpen = mobileDropdownContent.classList.contains('active');
            mobileDropdownContent.classList.toggle('active');
            mobileDropdownBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
            // Rotate icon
            var icon = mobileDropdownBtn.querySelector('i');
            if (icon) {
                icon.style.transform = !isOpen ? 'rotate(180deg)' : '';
            }
        });
    }

    // =========================================
    // THEME TOGGLE
    // =========================================
    if (themeToggle) {
        // Initialize from localStorage
        var savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        }

        themeToggle.addEventListener('click', function () {
            document.documentElement.classList.toggle('light-mode');
            var isLight = document.documentElement.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }

    // =========================================
    // SMOOTH SCROLL (for anchor links)
    // =========================================
    document.addEventListener('click', function (e) {
        var anchor = e.target.closest('a[href*="#"]');
        if (!anchor) return;

        var href = anchor.getAttribute('href');
        if (!href || href === '#') return;

        // Handle same-page anchors
        var hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        var path = href.substring(0, hashIndex);
        var hash = href.substring(hashIndex);

        // Only handle if same page or empty path
        var currentPath = window.location.pathname.split('/').pop() || 'index.html';
        var linkPath = path || currentPath;

        // Normalize paths
        if (linkPath === '' || linkPath === currentPath || linkPath === 'index.html' && currentPath === '') {
            var targetEl = document.querySelector(hash);
            if (targetEl) {
                e.preventDefault();
                closeMobileMenu();
                var headerOffset = 90;
                var elPosition = targetEl.getBoundingClientRect().top;
                var offsetPosition = elPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                // Update URL
                history.pushState(null, '', hash);
            }
        }
    });

    // =========================================
    // CLOSE DROPDOWN ON RESIZE (desktop<->mobile)
    // =========================================
    var resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
            if (dropdownContainer) {
                dropdownContainer.classList.remove('open');
            }
        }, 150);
    });

})();
