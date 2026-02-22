/**
 * WorldBrain México - Sistema de Seguimiento Completo (Pixel + CAPI + ParamBuilder)
 * Incluye TODOS los eventos estándar de Meta para máxima efectividad de anuncios.
 * Integrado con Meta ParamBuilder para parámetros de alta calidad.
 */

(function () {
    'use strict';

    /**
     * Obtiene parámetros mejorados de ParamBuilder del lado del cliente
     * para incluir en los eventos enviados al servidor
     */
    function getParamBuilderData() {
        var data = {};
        try {
            if (typeof window.clientParamBuilder !== 'undefined' && window._paramBuilderReady) {
                var fbc = window.clientParamBuilder.getFbc();
                var fbp = window.clientParamBuilder.getFbp();
                var clientIp = window.clientParamBuilder.getClientIpAddress();

                if (fbc) data.fbc = fbc;
                if (fbp) data.fbp = fbp;
                if (clientIp) data.client_ip_address = clientIp;
            }
        } catch (e) {
            // Silenciar errores — el servidor tiene su propio ParamBuilder
        }
        return data;
    }

    /**
     * Envía un evento de forma híbrida a TODAS las plataformas:
     * - Meta Pixel (navegador)
     * - Meta CAPI (servidor) con datos mejorados de ParamBuilder
     * - Google Ads (gtag)
     */
    window.trackMetaEvent = function (eventName, userData) {
        userData = userData || {};

        // Generar un ID único para el evento (deduplicación Pixel ↔ CAPI)
        var eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 1. Enviar vía Navegador (Meta Pixel)
        if (window.fbq) {
            window.fbq('track', eventName, userData, { eventID: eventId });
        }

        // 2. Enviar vía Servidor (Meta CAPI) con datos ParamBuilder
        var capiPayload = {
            eventName: eventName,
            userData: userData,
            eventId: eventId
        };

        // Agregar datos de ParamBuilder del cliente para reforzar la señal
        var pbData = getParamBuilderData();
        if (pbData.fbc) capiPayload.userData.fbc = pbData.fbc;
        if (pbData.fbp) capiPayload.userData.fbp = pbData.fbp;
        if (pbData.client_ip_address) capiPayload.userData.client_ip_address = pbData.client_ip_address;

        fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiPayload)
        }).catch(function (err) { console.error('Error CAPI:', err); });

        // 3. Enviar a Google Ads (gtag) con mapeo de eventos
        if (window.gtag) {
            var gtagEventMap = {
                'Contact': 'conversion',
                'ViewContent': 'view_item',
                'SubmitApplication': 'generate_lead',
                'AddToWishlist': 'add_to_wishlist',
                'Search': 'search',
                'FindLocation': 'view_item',
                'Lead': 'generate_lead'
            };
            var gtagEventName = gtagEventMap[eventName] || eventName.toLowerCase();

            // Para conversiones específicas de Google Ads
            if (eventName === 'Contact' || eventName === 'SubmitApplication' || eventName === 'Lead') {
                gtag('event', 'conversion', {
                    'send_to': 'AW-10846614576/default',
                    'value': 1.0,
                    'currency': 'MXN',
                    'event_callback': function () { }
                });
            }

            // Evento estándar de GA4
            gtag('event', gtagEventName, {
                'event_category': userData.content_category || 'engagement',
                'event_label': userData.content_name || eventName
            });
        }
    };

    /**
     * Detectar clics en botones de WhatsApp (Contact)
     */
    function setupWhatsAppTracking() {
        document.addEventListener('click', function (e) {
            var waLink = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
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
        var pagePath = window.location.pathname;

        // Detectar si estamos en una página de curso (no index.html)
        var coursePages = [
            'fotolectura', 'mathekids', 'fastkids', 'robotics', 'homeschool',
            'admision-universitaria', 'memoria-prodigiosa', 'neurocomunicacion',
            'lectoescritura', 'regularizacion', 'juniormath', 'grandes-lideres',
            'ciencia-astronomia', 'alfa-cash', 'redaccion-ejecutiva', 'universidad-dominical'
        ];

        var isCourse = coursePages.some(function (c) { return pagePath.includes(c); });
        if (isCourse) {
            var courseName = document.title.split('|')[0].trim() || pagePath;
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
            var form = e.target;
            var searchInput = form.querySelector('input[type="search"], input[name*="search"], input[name*="q"]');
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
            var form = e.target;
            // Evitar doble conteo con Search
            var isSearch = form.querySelector('input[type="search"], input[name*="search"], input[name*="q"]');
            if (!isSearch) {
                var formName = form.getAttribute('name') || form.getAttribute('id') || 'Formulario';
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
            var mapLink = e.target.closest('a[href*="maps.google"], a[href*="goo.gl/maps"], a[href*="waze.com"]');
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
        var scrolled = false;
        window.addEventListener('scroll', function () {
            if (scrolled) return;
            var scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
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
            var ctaButton = e.target.closest('.btn-primary, .cta-button, [class*="cta"], button[type="submit"]');
            if (ctaButton && !e.target.closest('a[href*="wa.me"]')) {
                var buttonText = ctaButton.textContent.trim().substring(0, 50);
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
