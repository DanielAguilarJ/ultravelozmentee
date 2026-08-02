'use strict';

/* ══════════════════════════════════════════════════════════════════
   LEAD-REPORT · Aviso de agendado para páginas con flujo propio

   Por qué existe: el reporte a /api/bookings vive dentro de
   booking.min.js. Las páginas que implementan su propio agendado
   inline no lo cargan, así que agendaban sin avisar a nadie: el
   visitante veía "cita confirmada", se abría WhatsApp, y el lead
   nunca llegaba al equipo. Lo detectó una auditoría que cruzó
   "¿la página agenda?" contra "¿llama a /api/bookings?".

   Afectaba a grandes-lideres.html (flujo completo: datos, fecha,
   horario y confirmación) y a robotics.html.

   Dos reglas de diseño:

   1 · Nunca estorbar. Si la red falla, si el servidor responde 500 o
       si esta petición se pierde, el visitante debe ver su
       confirmación igual. Por eso todo va envuelto y nada se propaga.

   2 · Sobrevivir a la navegación. Al confirmar, estas páginas abren
       WhatsApp en otra pestaña, y en móvil eso puede descargar la
       página. `keepalive` permite que la petición termine aunque el
       documento se esté yendo; sendBeacon es el respaldo.

   El servidor valida: nombre de 2 caracteres o más, teléfono de 10
   dígitos o más, y para la etapa "confirmado" exige fecha y hora.
   Se reporta en dos etapas para no perder al que da sus datos y
   abandona antes de elegir horario.
   ══════════════════════════════════════════════════════════════════ */

(function () {
    var ENDPOINT = '/api/bookings';

    /** Normaliza a 'HH:MM'. El servidor rechaza otros formatos. */
    function asTime(value) {
        if (value == null) return '';

        var text = String(value).trim();
        var match = /^(\d{1,2}):(\d{2})/.exec(text);
        if (!match) return '';

        var hour = Number(match[1]);
        var minute = Number(match[2]);
        if (hour > 23 || minute > 59) return '';

        return (hour < 10 ? '0' + hour : String(hour)) + ':' + match[2];
    }

    /** Normaliza a 'AAAA-MM-DD', que es lo único que el servidor acepta. */
    function asDate(value) {
        if (value == null) return '';

        var text = String(value).trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
    }

    /**
     * Envía el lead. No devuelve promesa a propósito: quien llama no
     * debe poder esperar ni encadenar nada a este aviso.
     *
     * @param {{stage?:string,name?:string,phone?:string,course?:string,
     *          date?:string,time?:string}} lead
     */
    function reportLead(lead) {
        try {
            var input = lead || {};

            var payload = {
                stage: input.stage === 'confirmado' ? 'confirmado' : 'contacto',
                name: String(input.name || '').trim(),
                phone: String(input.phone || '').trim(),
                course: String(input.course || '').trim(),
                date: asDate(input.date),
                time: asTime(input.time),
                page: window.location.pathname
            };

            /* Sin nombre o sin teléfono el servidor devolvería 400.
               Se calla en lugar de generar ruido en la consola. */
            if (payload.name.length < 2) return;
            if (payload.phone.replace(/\D/g, '').length < 10) return;

            /* Una cita "confirmada" sin fecha u hora no sirve: se
               degrada a contacto en vez de perderla por completo. */
            if (payload.stage === 'confirmado' && (!payload.date || !payload.time)) {
                payload.stage = 'contacto';
            }

            var body = JSON.stringify(payload);

            if (typeof window.fetch === 'function') {
                window.fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    keepalive: true
                })['catch'](function () { /* el visitante no se entera */ });
                return;
            }

            if (navigator.sendBeacon) {
                navigator.sendBeacon(
                    ENDPOINT,
                    new Blob([body], { type: 'application/json' })
                );
            }
        } catch (err) {
            /* Un fallo del aviso nunca puede romper el agendado. */
        }
    }

    window.reportLead = reportLead;
})();
