# Lectoescritura · Congelamiento de la página — Requisitos de la corrección

## Introducción

Reporte original del usuario: «cuando abro la página de lectoescritura se traba o hay algo ahí que no deja usarla».

Al abrir `/lectoescritura` el HTML se pinta, pero la pestaña queda inutilizable: no responde a clics, scroll ni teclado. La causa es un bucle infinito de `MutationObserver` en `js/lectoescritura-adapter.js`: el callback escribe uno de los atributos que ese mismo observador vigila, se re-dispara en microtareas y el hilo principal nunca devuelve el control al navegador.

El mismo antipatrón aparece dos veces. El del panel móvil se dispara **siempre al cargar** y es el que reporta el usuario. El del contenedor de horarios está **latente**: se activa al elegir una fecha en el paso 2 del formulario, así que corregir solo el primero movería el congelamiento al punto exacto donde el visitante reserva su clase.

Junto a eso, `js/lecto-demo.js` y `js/lectoescritura-adapter.js` escriben ambos sobre los mismos tres elementos (barra sticky móvil, pestañas del demo y fecha mínima del calendario). No congelan la página, pero dejan estado contradictorio y dependen del orden de carga de los scripts. Se corrigen en el mismo cambio porque viven en los mismos dos archivos.

Impacto: la página de captación de lectoescritura está inaccesible para cualquier visitante, en cualquier viewport y navegador. El formulario de reserva no se puede completar.

La condición del bug (`isBugCondition`), las propiedades de corrección y la estrategia de verificación están en `design.md`, ya aprobado.

### Alcance del cambio

Dentro del alcance:

- `js/lectoescritura-adapter.js`
- `js/lecto-demo.js`

Fuera del alcance:

- `lectoescritura.html` — ningún cambio de markup es necesario.
- `css/lectoescritura.css` — la regla `.lecto-sticky-cta[hidden] { display:none !important }` ya hace lo correcto.
- `js/navbar.min.js` y `js/booking.min.js` — son las versiones que la página carga en realidad, y las comparten otras ~10 páginas del sitio. Sus escrituras de `aria-hidden` y de clases son mutaciones legítimas que el adapter debe seguir observando; tocarlas ampliaría el radio del cambio a todo el sitio.
- `js/lecto-demo.min.js` y `css/lectoescritura.min.css` — artefactos huérfanos: existen en el repositorio pero ninguna página HTML los referencia, y no hay paso de minificado en el build. Replicar la corrección a mano en ellos crearía una segunda fuente de verdad divergente.

## Análisis del bug

### Comportamiento actual (defecto)

Lo que ocurre hoy, con el código sin corregir.

**1.1** CUANDO un visitante abre `/lectoescritura` en cualquier viewport ENTONCES el sistema pinta el HTML y a los pocos milisegundos deja de responder a clics, scroll y teclado, de forma indefinida: el observador de mutaciones de `#navMobilePanel` ejecuta `syncMobileMenu`, que escribe `aria-hidden`, atributo incluido en su propio `attributeFilter`; cada escritura encola una mutación nueva —incluso cuando el valor no cambia, porque el panel ya llega con `aria-hidden="true"` en el markup— y el ciclo se realimenta en microtareas sin ceder el control al navegador. No hace falta ninguna interacción del usuario: la llamada directa a `syncMobileMenu()`, posterior al `observe()`, arranca el bucle.

**1.2** CUANDO el visitante completa el paso 1 del formulario, llega al paso 2 y elige una fecha, con lo que `booking.min.js` inyecta los botones de horario en `#slots-container` ENTONCES el sistema se congela del mismo modo: `syncSlots` escribe `aria-pressed` en cada horario, atributo incluido en su propio `attributeFilter`. Al cargar la página el defecto está latente, porque el contenedor solo tiene un placeholder y no hay ningún horario sobre el que escribir. Hoy nadie llega a observarlo porque 1.1 congela antes.

**1.3** CUANDO el visitante interactúa con alguno de los tres elementos que `js/lecto-demo.js` y `js/lectoescritura-adapter.js` gestionan a la vez ENTONCES el sistema queda en estado contradictorio o dependiente del orden de carga de los scripts:

- `#lectoMobileBar` — en escritorio, con scroll superior a 600 px y el formulario fuera de vista, `js/lecto-demo.js` deja la barra con clase `show` y `aria-hidden="false"` sobre un elemento que el adapter mantiene `hidden` e `inert`. `lecto-demo.js` no comprueba el viewport; el adapter sí. Dos condiciones distintas para el mismo elemento.
- `.demo-tab` — al pulsar `ArrowLeft` o `ArrowRight` sobre una pestaña, el manejador de `lecto-demo.js` y el del adapter se ejecutan los dos, así que `selectMode` corre dos veces por pulsación: doble render del texto y doble reescritura de `#demo-status`.
- `#date-picker` — `js/lecto-demo.js` fija `min` = hoy y `booking.min.js` fija `min` = mañana. El valor final es «mañana» solo por el orden de ejecución actual (scripts deferidos antes de `DOMContentLoaded`). Si ese orden cambia, gana «hoy» y el visitante recibe un `alert` de fecha inválida al elegir la primera fecha que el propio calendario le ofrece.

### Comportamiento esperado (correcto)

Lo que debe ocurrir con el código corregido. Correspondencia 1:1 con la sección anterior.

**2.1** CUANDO un visitante abre `/lectoescritura` en cualquier viewport ENTONCES el sistema DEBERÁ terminar de cargar y responder a clics, scroll y teclado, sin tarea larga indefinida en el hilo principal. Ningún callback de `MutationObserver` del adapter escribe un atributo incluido en su propio `attributeFilter`, y tras una mutación externa el callback se invoca un número finito y acotado de veces (≤ 5).

**2.2** CUANDO el visitante elige una fecha en el paso 2 y `booking.min.js` inyecta los botones de horario ENTONCES el sistema DEBERÁ mostrar los horarios, permitir seleccionar uno y seguir respondiendo a clics, scroll y teclado, con cualquier combinación de horarios libres, seleccionados y no disponibles.

**2.3** CUANDO el visitante interactúa con la barra sticky, con el teclado en las pestañas del demo o con el calendario ENTONCES el sistema DEBERÁ presentar un estado coherente y determinista, con un único responsable por elemento:

- `#lectoMobileBar` — visibilidad, `hidden`, `aria-hidden` e `inert` DEBERÁN ser siempre coherentes entre sí y respetar el viewport: la barra se muestra solo en móvil, con scroll superior a 600 px y el formulario fuera de vista.
- `.demo-tab` — `ArrowLeft` y `ArrowRight` DEBERÁN producir el mismo resultado visible que hoy (cambio de pestaña, foco en la pestaña nueva, texto y estado renderizados), ejecutando el cambio de modo una sola vez por pulsación.
- `#date-picker` — el atributo `min` DEBERÁ ser «mañana» por diseño y no por accidente del orden de ejecución, de modo que toda fecha que el calendario ofrezca como seleccionable pase la validación de la reserva sin `alert`.

**Nota:** 2.1 y 2.2 se verifican con la Property 1 de `design.md` (punto fijo de los callbacks). 2.3 no tiene propiedad dedicada: su efecto observable queda cubierto por los casos de preservación 3.1 a 3.5 y por la comprobación manual en navegador.

### Comportamiento a preservar (prevención de regresiones)

Lo que hoy funciona y debe seguir igual tras la corrección.

**3.1** CUANDO el visitante usa el demo de lectura ENTONCES el sistema DEBERÁ SEGUIR cambiando de pestaña al hacer clic, moviéndose de pestaña con `ArrowLeft` y `ArrowRight`, animando el texto con el botón «Leer» en los modos silabeado y fluido, y mostrando la comparativa de segundos cuando se han probado los dos modos.

**3.2** CUANDO el visitante abre o cierra el menú móvil con la hamburguesa, el overlay, `Escape` o un clic en un enlace ENTONCES el sistema DEBERÁ SEGUIR abriendo y cerrando el panel igual que hoy, y DEBERÁ SEGUIR manteniendo el panel cerrado fuera del orden de tabulación.

**3.3** CUANDO el visitante recorre el formulario de reserva ENTONCES el sistema DEBERÁ SEGUIR avanzando del paso 1 al 2 y del 2 al 3, regresando al paso 1 con «Volver», moviendo el foco al encabezado del paso visible y generando el enlace de Google Calendar al confirmar.

**3.4** CUANDO el visitante abre `#date-picker` ENTONCES el sistema DEBERÁ SEGUIR aceptando únicamente fechas a partir de mañana, con el mismo valor efectivo de `min` que hoy y consistente con la validación de `loadTimeSlots()`.

**3.5** CUANDO el visitante usa el resto de la página ENTONCES el sistema DEBERÁ SEGUIR alternando tema claro y oscuro con su `aria-pressed` correcto, limpiando los `role="menuitem"` del dropdown de escritorio, añadiendo `rel="noopener noreferrer"` a los enlaces `target="_blank"` y revelando las secciones al hacer scroll.

**Nota:** hay un cambio intencional que no debe leerse como regresión. Al dejar la barra sticky con un único responsable, en escritorio pasa a tener `hidden`, `inert` y `aria-hidden` coherentes entre sí, en lugar del estado contradictorio descrito en 1.3. La visibilidad efectiva en móvil no cambia. 3.1 a 3.5 se verifican con la Property 2 de `design.md`.
