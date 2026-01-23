/**
 * WorldBrain México - Sistema de Seguimiento (Pixel + CAPI)
 * Este script centraliza el envío de eventos para asegurar que lleguen tanto vía Navegador como Servidor.
 */

(function () {
    'use strict';

    /**
     * Envía un evento a Meta de forma híbrida (Pixel + CAPI)
     */
    window.trackMetaEvent = function (eventName, userData = {}) {
        // 1. Enviar vía Navegador (Pixel)
        if (window.fbq) {
            window.fbq('track', eventName, userData);
        }

        // 2. Enviar vía Servidor (CAPI) a través de nuestra API local
        fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName, userData })
        }).catch(err => console.error('Error enviando a CAPI:', err));
    };

    /**
     * Detectar clics en botones de WhatsApp
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

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupWhatsAppTracking);
    } else {
        setupWhatsAppTracking();
    }

})();
