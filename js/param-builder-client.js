/**
 * WorldBrain México — Meta ParamBuilder (Client-Side)
 * Inicializa clientParamBuilder para recopilar _fbc, _fbp, y _fbi (IP)
 * al cargar cualquier página. Sigue las prácticas recomendadas de Meta.
 *
 * Dependencia: clientParamBuilder.bundle.js debe cargarse antes de este script.
 */
(function () {
    'use strict';

    /**
     * getIpFn — Recupera la IP del visitante (IPv6 preferida) desde /api/ip
     * Se pasa a processAndCollectAllParams para guardar IP en cookie _fbi
     */
    async function getIpFn() {
        try {
            const response = await fetch('/api/ip');
            if (!response.ok) throw new Error('IP fetch failed');
            const data = await response.json();
            return data.ip || '';
        } catch (err) {
            console.warn('[ParamBuilder] No se pudo obtener IP del cliente:', err.message);
            return '';
        }
    }

    /**
     * Inicialización principal del ParamBuilder del lado del cliente
     */
    function initClientParamBuilder() {
        // Verificar que la librería esté cargada
        if (typeof window.clientParamBuilder === 'undefined') {
            console.warn('[ParamBuilder] clientParamBuilder.bundle.js no está cargado. Reintentando...');
            // Reintentar una vez después de 2 segundos
            setTimeout(function () {
                if (typeof window.clientParamBuilder !== 'undefined') {
                    runParamBuilder();
                } else {
                    console.error('[ParamBuilder] clientParamBuilder no disponible después del reintento.');
                }
            }, 2000);
            return;
        }

        runParamBuilder();
    }

    function runParamBuilder() {
        try {
            // Procesar y recopilar TODOS los parámetros:
            // - Extrae fbclid de la URL y genera _fbc cookie
            // - Genera _fbp (Meta browser ID) si no existe
            // - Invoca getIpFn para obtener IPv6 y guardarla en _fbi cookie
            // - Detecta click IDs de in-app browsers (Facebook, Instagram)
            window.clientParamBuilder.processAndCollectAllParams(
                window.location.href,
                getIpFn
            );

            console.log('[ParamBuilder] ✅ Inicializado correctamente');

            // Exponer API para uso en tracking.js si es necesario
            window._paramBuilderReady = true;
        } catch (err) {
            console.error('[ParamBuilder] Error durante inicialización:', err.message);
        }
    }

    // Ejecutar tan pronto como el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClientParamBuilder);
    } else {
        initClientParamBuilder();
    }

})();
