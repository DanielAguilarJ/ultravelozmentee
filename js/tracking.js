/**
 * WorldBrain México - Sistema de Seguimiento Completo (Pixel + CAPI)
 * Incluye TODOS los eventos estándar de Meta para máxima efectividad de anuncios.
 */

(function () {
    'use strict';

    /**
     * Envía un evento a Meta de forma híbrida (Pixel + CAPI)
     */
    window.trackMetaEvent = function (eventName, userData = {}) {
        // Generar un ID único para el evento (deduplicación)
        const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 1. Enviar vía Navegador (Pixel)
        if (window.fbq) {
            window.fbq('track', eventName, userData, { eventID: eventId });
        }

        // 2. Enviar vía Servidor (CAPI)
        fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName, userData, eventId })
        }).catch(err => console.error('Error CAPI:', err));
    };

    /**
     * Detectar clics en botones de WhatsApp (Contact)
     */
    function setupWhatsAppTracking() {
        document.addEventListener('click', function (e) {
            const waLink = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
            if (waLink) {
                window.trackMetaEvent('Contact', {
                    content_name: 'WhatsApp Click',
                    content_category: 'Contact'
                });
            }
        });
    }

    /**
     * ViewContent: Se dispara en páginas de cursos individuales
     */
    function setupViewContentTracking() {
        const coursePage = document.querySelector('[data-course-name]');
        const pagePath = window.location.pathname;

        // Detectar si estamos en una página de curso (no index.html)
        const coursePages = [
            'fotolectura', 'mathekids', 'fastkids', 'robotics', 'homeschool',
            'admision-universitaria', 'memoria-prodigiosa', 'neurocomunicacion',
            'lectoescritura', 'regularizacion', 'juniormath', 'grandes-lideres',
            'ciencia-astronomia', 'alfa-cash', 'redaccion-ejecutiva', 'universidad-dominical'
        ];

        const isCourse = coursePages.some(c => pagePath.includes(c));
        if (isCourse) {
            const courseName = document.title.split('|')[0].trim() || pagePath;
            window.trackMetaEvent('ViewContent', {
                content_name: courseName,
                content_type: 'course',
                content_category: 'Education'
            });
        }
    }

    /**
     * Search: Detectar uso de buscadores en la página
     */
    function setupSearchTracking() {
        document.addEventListener('submit', function (e) {
            const form = e.target;
            const searchInput = form.querySelector('input[type="search"], input[name*="search"], input[name*="q"]');
            if (searchInput && searchInput.value) {
                window.trackMetaEvent('Search', {
                    search_string: searchInput.value,
                    content_category: 'Site Search'
                });
            }
        });
    }

    /**
     * SubmitApplication: Detectar envío de cualquier formulario
     */
    function setupFormTracking() {
        document.addEventListener('submit', function (e) {
            const form = e.target;
            // Evitar doble conteo con Search
            const isSearch = form.querySelector('input[type="search"], input[name*="search"], input[name*="q"]');
            if (!isSearch) {
                const formName = form.getAttribute('name') || form.getAttribute('id') || 'Formulario';
                window.trackMetaEvent('SubmitApplication', {
                    content_name: formName,
                    content_category: 'Form Submission'
                });
            }
        });
    }

    /**
     * FindLocation: Detectar clics en mapas o direcciones
     */
    function setupLocationTracking() {
        document.addEventListener('click', function (e) {
            const mapLink = e.target.closest('a[href*="maps.google"], a[href*="goo.gl/maps"], a[href*="waze.com"]');
            if (mapLink) {
                window.trackMetaEvent('FindLocation', {
                    content_name: 'Map Click',
                    content_category: 'Location'
                });
            }
        });
    }

    /**
     * Scroll Depth: Detectar scroll profundo (75%+) como señal de interés
     */
    function setupScrollTracking() {
        let scrolled = false;
        window.addEventListener('scroll', function () {
            if (scrolled) return;
            const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
            if (scrollPercent > 0.75) {
                scrolled = true;
                window.trackMetaEvent('ViewContent', {
                    content_name: 'Deep Scroll (75%+)',
                    content_category: 'Engagement'
                });
            }
        });
    }

    /**
     * Clics en botones CTA principales (Inscríbete, Agendar, etc.)
     */
    function setupCTATracking() {
        document.addEventListener('click', function (e) {
            const ctaButton = e.target.closest('.btn-primary, .cta-button, [class*="cta"], button[type="submit"]');
            if (ctaButton && !e.target.closest('a[href*="wa.me"]')) {
                const buttonText = ctaButton.textContent.trim().substring(0, 50);
                window.trackMetaEvent('AddToWishlist', {
                    content_name: buttonText,
                    content_category: 'CTA Click'
                });
            }
        });
    }

    // Inicializar todos los trackers
    function initAllTracking() {
        setupWhatsAppTracking();
        setupViewContentTracking();
        setupSearchTracking();
        setupFormTracking();
        setupLocationTracking();
        setupScrollTracking();
        setupCTATracking();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllTracking);
    } else {
        initAllTracking();
    }

})();

