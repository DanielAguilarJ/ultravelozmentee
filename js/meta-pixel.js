/**
 * Meta Pixel — única fuente de verdad para ultravelozmente.com
 *
 * Pixel/conjunto de datos: 280967147554736
 *   Nombre en Meta : "Píxel de Mundo Intelectual"
 *   Portfolio      : Mundo Intelectual (business_id 119305685827473)
 *   Página         : 1460961244140495 · Instagram: 17841409529327527
 *
 * Antes de este archivo el código base del pixel estaba pegado a mano en
 * 11 de 182 páginas HTML. En las 171 restantes (incluida la home) `fbq`
 * nunca existía, así que `tracking.js` llamaba a `window.fbq` en vano y
 * los eventos del navegador se perdían en silencio.
 *
 * DEDUPLICACIÓN Pixel ↔ API de conversiones
 * ─────────────────────────────────────────
 * server.js manda el PageView por CAPI y deja el `event_id` que usó en la
 * cookie `_wb_eid`. Aquí lo leemos y lo reutilizamos como `eventID` del
 * PageView del navegador: Meta recibe dos veces el mismo evento con el
 * mismo id y cuenta UNO. Así se conserva la cobertura de CAPI (usuarios
 * con bloqueador) sin inflar las conversiones.
 *
 * La cookie se CONSUME al leerla (se expira). Motivo: una vista de página
 * servida desde bfcache o caché de disco no pasa por el servidor, así que
 * no hay PageView de CAPI contra el que deduplicar. Si reutilizáramos el
 * id anterior, Meta descartaría ese PageView por duplicado y lo perderíamos.
 */

(function (window, document) {
    'use strict';

    var PIXEL_ID = '280967147554736';
    var EVENT_ID_COOKIE = '_wb_eid';
    var FBEVENTS_URL = 'https://connect.facebook.net/en_US/fbevents.js';

    // Si el pixel ya se inicializó (código inline heredado, doble inclusión
    // del script), no volvemos a hacerlo: evita un segundo PageView.
    if (window.fbq) {
        return;
    }

    /**
     * Lee una cookie y la expira en el mismo paso, para que su valor se use
     * una sola vez. Devuelve null si no existe.
     */
    function readAndConsumeCookie(name) {
        var pattern = new RegExp('(?:^|;\\s*)' + name + '=([^;]*)');
        var match = document.cookie.match(pattern);
        if (!match) {
            return null;
        }
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
        try {
            return decodeURIComponent(match[1]);
        } catch (e) {
            return match[1];
        }
    }

    /**
     * event_id de respaldo cuando el servidor no dejó cookie (página
     * cacheada, CAPI deshabilitado). Solo el navegador manda el evento,
     * así que no hay nada que deduplicar y basta con que sea único.
     */
    function generateEventId() {
        return 'pv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    }

    // ── Código base oficial de Meta ──────────────────────────────────────
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
    }(window, document, 'script', FBEVENTS_URL);
    /* eslint-enable */

    var pageViewEventId = readAndConsumeCookie(EVENT_ID_COOKIE) || generateEventId();

    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView', {}, { eventID: pageViewEventId });

    // Expuesto para tracking.js y para depurar desde la consola.
    window.WB_PIXEL_ID = PIXEL_ID;
    window.WB_PAGEVIEW_EVENT_ID = pageViewEventId;

})(window, document);
