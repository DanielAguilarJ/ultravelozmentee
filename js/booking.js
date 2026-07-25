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

        // Evento IniciateCheckout al pasar al paso 2
        if (window.trackMetaEvent) {
            window.trackMetaEvent('InitiateCheckout', {
                content_name: course,
                content_category: 'Booking'
            });
        }

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
            // Evento Lead al completar la reserva
            if (window.trackMetaEvent) {
                window.trackMetaEvent('Lead', {
                    content_name: bookingData.course,
                    content_category: 'Booking',
                    user_data: {
                        fn: bookingData.name,
                        ph: bookingData.phone
                    }
                });
            }

            // Guardar en "base de datos" local
            if (!bookedSlots[bookingData.date]) {
                bookedSlots[bookingData.date] = [];
            }
            bookedSlots[bookingData.date].push(bookingData.time);

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
