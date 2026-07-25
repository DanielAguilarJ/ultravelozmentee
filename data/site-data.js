/* ================================================================
   SITE DATA — ÚNICA fuente de verdad para cifras, sedes y claims.
   Regla de oro: NINGÚN número de negocio se escribe en HTML.
   Se escribe aquí, con fuente/verificación, y el HTML lo consume.
   Para corregir un dato en todo el sitio: se edita UNA línea.
   ================================================================ */
window.SITE_DATA = Object.freeze({
  org: {
    name: 'WorldBrain México',
    phone: '+52 55 7810 7837',
    phoneHref: 'tel:+525578107837',
    whatsapp: 'https://wa.me/5215578107837',
    email: 'contacto@ultravelozmente.com',
    foundedYear: 1994,
  },

  locations: [
    { city: 'Cuautitlán Izcalli', tag: 'Sede Central', desc: 'Laboratorio de robótica completo. Formación STEAM certificada.', verified: true },
    { city: 'CDMX', tag: 'Zona Metropolitana', desc: 'Clases de robótica y programación en la capital.', verified: true },
    { city: 'Estado de México', tag: 'Zona Norte', desc: 'Cobertura en municipios del EdoMex.', verified: true },
    { city: 'Online', tag: 'Todo México', desc: 'Clases en vivo con los mismos instructores y grupos reducidos.', verified: true },
    { city: 'Guadalajara', tag: 'Occidente', desc: 'Sede en evaluación.', verified: false },
  ],

  robotics: {
    maxGroupSize: 7,
    freeTrialClass: true,
    certifiedStudents: null,
    levels: [
      { id: 'kids',   name: 'Robotics Kids',   ages: '7-10',  stack: ['Scratch Jr & Scratch', 'LEGO WeDo 2.0', 'Creación de juegos', 'Robots básicos'] },
      { id: 'junior', name: 'Robotics Junior', ages: '11-14', stack: ['Python básico', 'Arduino', 'LEGO Mindstorms', 'Competencias'], popular: true },
      { id: 'pro',    name: 'Robotics Pro',    ages: '15-17', stack: ['Python avanzado', 'JavaScript', 'IA & Machine Learning', 'Drones & IoT'] },
    ],
  },

  testimonials: [
    { course: 'robotics', verified: true, initials: 'LM', hue: 1,
      name: 'Laura M.', role: 'Mamá de Andrés, 12 años',
      quote: 'Mi hijo de 12 años creó su propia app. Antes solo jugaba, ahora entiende cómo funcionan las cosas.',
      badge: 'Creó su primera app en Robotics Junior' },
    { course: 'robotics', verified: true, initials: 'RC', hue: 2,
      name: 'Roberto C.', role: 'Papá de Mateo, 9 años',
      quote: 'En 3 meses pasó de armar bloques en Scratch a programar sensores de movimiento reales.',
      badge: 'Robot seguidor de línea completado' },
    { course: 'robotics', verified: true, initials: 'SP', hue: 3,
      name: 'Sofia P.', role: 'Mamá de Gabriel, 15 años',
      quote: 'La atención en grupos pequeños de 7 alumnos hace toda la diferencia. El profesor está al pendiente.',
      badge: 'Proyecto Python & IA presentado' }
  ],
});
