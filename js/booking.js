/**
 * WorldBrain México - Sistema de Reservas Unificado
 * Este script maneja el formulario de reservas de citas para todos los cursos
 */

(function () {
    'use strict';

    // Datos de reservas (en producción esto vendría de un backend)
    const bookedSlots = {};

    // Datos de la reserva actual
    let bookingData = {
        name: '',
        phone: '',
        course: '',
        date: '',
        time: ''
    };

    /**
     * Avisa al servidor que hay un lead. Sin esto, agendar una cita no
     * notificaba a nadie: el enlace de Google Calendar agrega el evento
     * al calendario DEL VISITANTE y `bookedSlots` vive solo en memoria.
     *
     * Se llama dos veces a propósito:
     *   'contacto'   al pasar al paso 2 — ya hay nombre y WhatsApp, así
     *                que si abandona antes de elegir horario el lead no
     *                se pierde.
     *   'confirmado' al cerrar la cita, ya con fecha y hora.
     *
     * Nunca interrumpe el flujo: cualquier fallo se ignora en silencio
     * porque el servidor ya persiste el lead y el visitante no tiene
     * por qué ver un error de red.
     */
    /**
     * Ejecuta trabajo de analítica sin que pueda tumbar el flujo de
     * agendado. Si el pixel está bloqueado o la red falla, se registra
     * y se sigue: perder una métrica es barato, perder una cita no.
     */
    function safeTrack(fn) {
        try {
            if (typeof window.trackMetaEvent === 'function') fn();
        } catch (e) {
            console.warn('Analytics no disponible, el agendado continúa:', e && e.message);
        }
    }

    function notifyLead(stage) {
        try {
            const body = JSON.stringify({
                stage: stage,
                name: bookingData.name,
                phone: bookingData.phone,
                course: bookingData.course,
                date: bookingData.date || '',
                time: bookingData.time || '',
                page: window.location.pathname
            });

            /* keepalive: la petición sobrevive si la pestaña navega
               justo después de confirmar. */
            if (typeof window.fetch === 'function') {
                window.fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    keepalive: true
                }).catch(function () { /* el lead ya está del lado del servidor o se reintenta al confirmar */ });
            } else if (navigator.sendBeacon) {
                navigator.sendBeacon(
                    '/api/bookings',
                    new Blob([body], { type: 'application/json' })
                );
            }
        } catch (e) {
            /* jamás romper el agendado por un problema de aviso */
        }
    }

    // Inicialización
    function initBookingSystem() {
        const datePicker = document.getElementById('date-picker');
        if (!datePicker) return;

        // Configurar fecha mínima: mañana (no se puede agendar el mismo día)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        datePicker.min = tomorrowStr;
        datePicker.value = ''; // Resetear valor

        // Agregar evento de cambio
        datePicker.addEventListener('change', loadTimeSlots);
    }

    // Ir al paso 2
    window.goToStep2 = function () {
        const nameInput = document.getElementById('client-name');
        const phoneInput = document.getElementById('client-phone');
        const courseSelect = document.getElementById('course-select');

        if (!nameInput || !phoneInput) {
            console.error('Elementos del formulario no encontrados');
            return;
        }

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const course = courseSelect ? courseSelect.value : 'General';

        if (!name || !phone) {
            alert('Por favor completa tu nombre y WhatsApp');
            return;
        }

        bookingData.name = name;
        bookingData.phone = phone;
        bookingData.course = course;

        // Lead parcial: si abandona antes de elegir horario, el
        // contacto ya quedó registrado del lado del servidor.
        notifyLead('contacto');

        // Evento InitiateCheckout al pasar al paso 2.
        //
        // Aislado en try/catch a propósito: trackMetaEvent llama a fetch
        // y a fbq/gtag, que dependen de scripts externos. Si un bloqueador
        // de anuncios o un fallo de red los rompe, la excepción abortaba
        // goToStep2 ANTES de mostrar el paso 2: el usuario pulsaba
        // "Siguiente" y no pasaba nada. El analytics nunca debe impedir
        // una conversión.
        safeTrack(function () {
            window.trackMetaEvent('InitiateCheckout', {
                content_name: course,
                content_category: 'Booking'
            });
        });

        const step1 = document.getElementById('booking-step-1');
        const step2 = document.getElementById('booking-step-2');

        if (step1 && step2) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
    };

    // Volver al paso 1
    window.goToStep1 = function () {
        const step1 = document.getElementById('booking-step-1');
        const step2 = document.getElementById('booking-step-2');

        if (step1 && step2) {
            step2.style.display = 'none';
            step1.style.display = 'block';
        }
    };

    // Cargar horarios disponibles
    function loadTimeSlots() {
        const datePicker = document.getElementById('date-picker');
        const container = document.getElementById('slots-container');

        if (!datePicker || !container) return;

        const date = datePicker.value;
        if (!date) return;

        // Validar que no sea hoy ni un día pasado
        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate <= today) {
            alert('Por favor selecciona una fecha a partir de mañana');
            datePicker.value = '';
            return;
        }

        bookingData.date = date;
        container.innerHTML = '';

        // Generar horarios de 9:00 a 18:00
        const startHour = 9;
        const endHour = 18;

        // Inicializar array de slots para esta fecha si no existe
        if (!bookedSlots[date]) {
            bookedSlots[date] = [];
        }

        for (let h = startHour; h <= endHour; h++) {
            const time = `${h}:00`;
            const btn = document.createElement('button');
            btn.type = 'button';

            // Detectar qué clase usar según el prefijo CSS de la página
            const timeSlotClass = detectTimeSlotClass();
            btn.className = timeSlotClass;
            btn.textContent = time;

            // Verificar si está ocupado
            if (bookedSlots[date].includes(time)) {
                btn.disabled = true;
                btn.classList.add('booked');
                btn.title = 'Horario Ocupado';
            } else {
                btn.onclick = function () {
                    selectSlot(time, btn, timeSlotClass);
                };
            }

            container.appendChild(btn);
        }
    }

    // Detectar la clase de time-slot según la página
    function detectTimeSlotClass() {
        // Buscar elementos existentes para detectar el prefijo
        if (document.querySelector('.fl-time-slot, .fl-booking-card')) {
            return 'fl-time-slot';
        } else if (document.querySelector('.fk-time-slot, .fk-booking-card')) {
            return 'fk-time-slot';
        } else if (document.querySelector('.course-time-slot, .course-booking-card')) {
            return 'course-time-slot';
        } else if (document.querySelector('.rb-booking-card')) {
            return 'rb-time-slot';
        } else if (document.querySelector('.hs-booking-card')) {
            return 'hs-time-slot';
        }
        // Default
        return 'time-slot';
    }

    // Seleccionar un horario
    function selectSlot(time, btnElement, timeSlotClass) {
        // Remover clase selected de otros botones
        document.querySelectorAll('.' + timeSlotClass).forEach(function (b) {
            b.classList.remove('selected');
        });
        btnElement.classList.add('selected');

        bookingData.time = time;

        // Confirmar después de un breve delay para mostrar la selección
        setTimeout(function () {
            const formattedDate = formatDate(bookingData.date);
            if (confirm('¿Confirmar cita para el ' + formattedDate + ' a las ' + time + '?')) {
                finalizeBooking();
            }
        }, 100);
    }

    // Formatear fecha para mostrar
    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-MX', options);
    }

    // Finalizar reserva
    function finalizeBooking() {
        try {
            // Igual que en goToStep2: si el pixel falla, la cita debe
            // completarse de todas formas. Antes esta excepción caía en
            // el catch de abajo y el usuario veía "Hubo un error al
            // procesar tu reserva" pese a estar todo bien.
            safeTrack(function () {
                window.trackMetaEvent('Lead', {
                    content_name: bookingData.course,
                    content_category: 'Booking',
                    user_data: {
                        fn: bookingData.name,
                        ph: bookingData.phone
                    }
                });
            });

            // Guardar en "base de datos" local
            if (!bookedSlots[bookingData.date]) {
                bookedSlots[bookingData.date] = [];
            }
            bookedSlots[bookingData.date].push(bookingData.time);

            // Cita cerrada: ahora sí con fecha y hora. Este es el
            // aviso que el equipo necesita para llamar al alumno.
            notifyLead('confirmado');

            // Generar enlace de Google Calendar
            const title = encodeURIComponent('Asesoría ' + bookingData.course + ' - WorldBrain');
            const details = encodeURIComponent(
                'Cita con ' + bookingData.name + '. Tel: ' + bookingData.phone + '. Curso de interés: ' + bookingData.course
            );

            // Formatear fechas para GCal (YYYYMMDDTHHMMSS)
            const dateStr = bookingData.date.replace(/-/g, '');
            const hour = parseInt(bookingData.time.split(':')[0]);
            const paddedHour = hour.toString().padStart(2, '0');
            const startDateTime = dateStr + 'T' + paddedHour + '0000';

            // Hora de fin (1 hora después)
            const endHour = (hour + 1).toString().padStart(2, '0');
            const endDateTime = dateStr + 'T' + endHour + '0000';

            const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
                '&text=' + title +
                '&dates=' + startDateTime + '/' + endDateTime +
                '&details=' + details +
                '&location=WorldBrain%20México';

            const gcalBtn = document.getElementById('gcal-btn');
            if (gcalBtn) {
                gcalBtn.href = gcalUrl;
            }

            // Mostrar paso 3 (éxito)
            const step2 = document.getElementById('booking-step-2');
            const step3 = document.getElementById('booking-step-3');

            if (step2 && step3) {
                step2.style.display = 'none';
                step3.style.display = 'block';
            }

        } catch (e) {
            console.error('Error al procesar la reserva:', e);
            alert('Hubo un error al procesar tu reserva. Por favor intenta de nuevo.');
        }
    }

    // Exponer loadTimeSlots globalmente para el evento onchange
    window.loadTimeSlots = loadTimeSlots;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBookingSystem);
    } else {
        initBookingSystem();
    }

})();
