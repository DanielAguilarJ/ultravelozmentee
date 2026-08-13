/**
 * Captura de correo a cambio de material gratuito.
 *
 * Contexto: antes de esto el sitio no capturaba un solo correo. Los 235
 * artículos del blog atraían tráfico orgánico y lo devolvían a Google
 * salvo que la persona hiciera clic en WhatsApp. Sin lista no hay
 * remarketing por correo ni audiencias personalizadas en Meta/Google.
 *
 * Tres decisiones deliberadas:
 *
 * 1. La descarga se entrega EN EL ACTO, no "te lo mandamos por correo".
 *    El sitio no tiene infraestructura de envío garantizada, y prometer
 *    un correo que quizá no llega es exactamente la clase de afirmación
 *    sin respaldo que el resto del proyecto evita. El PDF existe y se
 *    enlaza al confirmar.
 *
 * 2. Reutiliza POST /api/bookings con stage 'recurso'. Un endpoint nuevo
 *    habría duplicado validación, persistencia, rate limit y avisos que
 *    ya funcionan.
 *
 * 3. NO dispara la conversión de Google Ads de 900 MXN. Ese valor
 *    corresponde a una cita de cortesía (3.000 × 30% de cierre
 *    estimado). Una descarga es un lead mucho más frío; contarla igual
 *    ensuciaría las pujas. Se manda como evento de Meta —que sí sirve
 *    para construir audiencias— y como evento GA4 para poder analizarlo.
 *    Cuando exista una etiqueta propia con un valor realista, basta
 *    añadirla a GOOGLE_ADS_CONVERSIONS en tracking.js.
 */
(function () {
    'use strict';

    var FORM_SELECTOR = 'form[data-lead-magnet]';

    function el(form, name) {
        return form.querySelector('[data-lm-' + name + ']');
    }

    function setStatus(form, message, kind) {
        var box = el(form, 'status');
        if (!box) return;

        box.textContent = message;
        box.dataset.kind = kind || '';
        /* aria-live ya está en el HTML: el lector de pantalla lo anuncia
           sin necesidad de mover el foco y sacar a la persona del campo. */
    }

    /* Espejo de isValidEmail en js/leads.js. Se valida aquí para dar una
       respuesta inmediata, pero el servidor NO confía en esto. */
    function looksLikeEmail(value) {
        return /^[^\s@,;:<>()[\]\\"]+@[^\s@,;.]+(\.[^\s@,;.]+)*\.[A-Za-z]{2,}$/
            .test(value);
    }

    function succeed(form, email) {
        var url = form.getAttribute('data-download');
        var done = el(form, 'done');
        var fields = el(form, 'fields');

        /* Se revela el enlace en vez de forzar la descarga: en iOS una
           descarga automática se pierde sin aviso, y un enlace visible
           siempre se puede volver a pulsar. */
        if (done) {
            var link = done.querySelector('a');
            if (link && url) link.setAttribute('href', url);
            done.hidden = false;
        }
        if (fields) fields.hidden = true;

        setStatus(form, 'Listo. Tu guía está abajo.', 'ok');

        /* Meta: alimenta audiencias personalizadas y similares. El
           nombre propio permite segmentar descargas frente a citas. */
        if (typeof window.trackMetaEvent === 'function') {
            window.trackMetaEvent('DescargaRecurso', {
                em: email,
                content_name: form.getAttribute('data-resource') || 'material',
                content_category: 'lead_magnet'
            });
        }
    }

    function submit(form, event) {
        event.preventDefault();

        if (form.dataset.sending === '1') return;

        var input = el(form, 'email');
        var email = input ? input.value.trim() : '';

        if (!looksLikeEmail(email)) {
            setStatus(form, 'Revisa el correo: parece incompleto.', 'error');
            if (input) {
                input.setAttribute('aria-invalid', 'true');
                input.focus();
            }
            return;
        }

        if (input) input.removeAttribute('aria-invalid');

        var button = el(form, 'submit');
        form.dataset.sending = '1';
        if (button) {
            button.disabled = true;
            button.dataset.label = button.textContent;
            button.textContent = 'Enviando…';
        }
        setStatus(form, 'Enviando…', '');

        function restore() {
            form.dataset.sending = '';
            if (button) {
                button.disabled = false;
                if (button.dataset.label) button.textContent = button.dataset.label;
            }
        }

        fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage: 'recurso',
                email: email,
                resource: form.getAttribute('data-resource') || 'material',
                course: form.getAttribute('data-course') || '',
                page: window.location.pathname
            })
        })
            .then(function (res) {
                if (res.status === 429) {
                    restore();
                    setStatus(form, 'Demasiados intentos. Espera un momento.', 'error');
                    return null;
                }
                if (!res.ok) {
                    restore();
                    setStatus(
                        form,
                        'No se pudo registrar. Escríbenos por WhatsApp y te la enviamos.',
                        'error'
                    );
                    return null;
                }
                return res.json();
            })
            .then(function (data) {
                if (data) succeed(form, email);
            })
            .catch(function () {
                restore();
                /* Sin conexión el lead se pierde, así que se ofrece la
                   guía igual: retener el material no recupera el correo
                   y sí deja a la persona con las manos vacías. */
                setStatus(
                    form,
                    'Falló la conexión, pero aquí tienes la guía de todos modos.',
                    'error'
                );
                succeed(form, email);
            });
    }

    function init() {
        var forms = document.querySelectorAll(FORM_SELECTOR);

        Array.prototype.forEach.call(forms, function (form) {
            form.addEventListener('submit', function (e) { submit(form, e); });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
