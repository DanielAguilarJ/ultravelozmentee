# Plan de implementación · Lectoescritura · Congelamiento de la página

Alcance del cambio (invariante para todas las tareas):

- Archivos que se modifican: `js/lectoescritura-adapter.js`, `js/lecto-demo.js`, `package.json` (+ `package-lock.json` regenerado).
- Archivos nuevos: `test/helpers/lecto-fixtures.js`, `test/helpers/observer-harness.js`, `test/lecto-freeze.bug.test.js`, `test/lecto-preservation.test.js`.
- NO se toca: `lectoescritura.html`, `css/lectoescritura.css`, `css/lectoescritura.min.css`, `js/navbar.js`, `js/navbar.min.js`, `js/booking.js`, `js/booking.min.js`, `js/lecto-demo.min.js`.

Orden metodológico del bugfix, y razón de que sea ese: primero se escribe el test que reproduce la condición del bug y **falla** sobre el código sin corregir (tarea 1), después la línea base de preservación medida sobre ese mismo código sin corregir (tarea 2), luego la corrección (tareas 3.1–3.6) y por último la reverificación de los mismos tests, sin reescribirlos (3.7–3.8). Invertir el orden dejaría sin evidencia de que el bug existía y sin línea base con la que comparar.

Estado de la verificación automatizada al cerrar el plan:

- `npm test` (`node --test test/*.test.js`) → **13 tests, 13 pasan, 0 fallan**, exit 0, 2,0 s. Reparto: 4 en `test/lecto-freeze.bug.test.js`, 9 en `test/lecto-preservation.test.js`.
- `./check.sh` → **✅ Todos los gates pasan (9/9)**, exit 0. Los `⚠️` de su salida son avisos SEO preexistentes de otras páginas (imágenes sin `alt` o sin `width`/`height`, claims que piden evidencia); ninguno proviene de este cambio ni rompe un gate.
- `node --check js/lectoescritura-adapter.js` y `node --check js/lecto-demo.js` → sin errores de sintaxis.
- Sin cerrar: la checklist manual en navegador (tarea 5), la decisión sobre los artefactos `.min` huérfanos (tarea 6) y el enganche de la suite a los gates (tarea 7).

---

- [x] 1. Escribir el test exploratorio de la condición del bug (ANTES de corregir)
  - **Property 1: Bug Condition** - Los callbacks de `MutationObserver` no alcanzan un punto fijo
  - **CRÍTICO**: este test DEBE FALLAR sobre el código sin corregir. El fallo es la confirmación del bug, no un problema que haya que arreglar.
  - **NO intentes corregir el test ni el código cuando falle.** El test codifica el comportamiento esperado y es el que valida la corrección en la tarea 3.7.
  - **OBJETIVO**: producir contraejemplos legibles de los dos bucles (Bug A `#navMobilePanel`, Bug B `#slots-container`).
  - Infraestructura de pruebas en `package.json`:
    - Añadir a `devDependencies`: `"jsdom": "26.1.0"` — versión exacta, sin rango. Es la última con `engines: node >=18`, que es lo que declara el proyecto; `jsdom@30` exige Node ≥ 22.22 y rompería el job `build` del CI, que corre en Node 20.
    - Añadir a `scripts`: `"test": "node --test test/*.test.js"` — runner integrado de Node, sin framework nuevo. El glob apunta solo a los archivos de test para que `node --test` no intente ejecutar `test/helpers/*.js`, que son módulos de apoyo sin tests. NO añadir `fast-check`.
    - Regenerar `package-lock.json` con `npm install` (el job `build` del CI usa `npm ci`). El job `gates` usa `npm install --omit=dev`, así que jsdom no entra en runtime.
  - `test/helpers/lecto-fixtures.js` — markup mínimo de `/lectoescritura` (no se copia el HTML real): `#navHamburger`, `#navMobilePanel[aria-hidden="true"][inert]`, `.nav-dropdown > .nav-pill-link` + `.nav-dropdown-menu` con `[role="menuitem"]`, `#navThemeToggle`, `#lecto-demo` con dos `.demo-tab[role="tab"]` (`#tab-silabeo`, `#tab-fluida`), `#demo-stage`, `#demo-text`, `#demo-progress`, `#demo-status`, `#demo-play`, `#demo-compare`, `#compare-silabeo`, `#compare-fluida`, `#booking-widget` con `#booking-step-1..3`, `#contact-form`, `#booking-back`, `#slots-container` con `<p class="slots-placeholder">`, `#date-picker`, `#lectoMobileBar`, `#inscripcion`, un `a[target="_blank"]` y algún `.reveal`.
    - Helper `makeSlots(doc, n, combinación)` que inyecte `n` botones `.course-time-slot` imitando `loadTimeSlots()` de `booking.min.js`, con las variantes libre / `.selected` / `disabled.booked`.
  - `test/helpers/observer-harness.js` — construcción del entorno e instrumentación:
    - Crear el `JSDOM` con `runScripts: 'dangerously'` y `pretendToBeVisual: true` (habilita `requestAnimationFrame`, que usa `requestStickyUpdate`).
    - Stub de `Element.prototype.scrollIntoView` (jsdom no lo implementa y `syncBookingSteps(true)` lo llama).
    - Stub parametrizable de `window.matchMedia` (móvil `matches: true` / escritorio `matches: false`, con `addEventListener`): jsdom no evalúa media queries.
    - **Envolver `window.MutationObserver` ANTES de cargar el adapter.** Contar invocaciones por observer y registrar `{ targetId, attributeFilter, atributosEscritos }`.
    - Al superar el presupuesto (50 invocaciones): registrar la violación, llamar a `disconnect()` de ese observer y dejar de invocar el callback original. **No lanzar una excepción dentro del callback**: jsdom la reporta al virtual console, la cola de microtareas sigue drenándose y el test se cuelga igual que el navegador, convirtiéndose en un timeout ilegible en vez de un contraejemplo.
    - Envolver `Element.prototype.setAttribute` y `removeAttribute` mientras un callback está en ejecución para capturar el conjunto `writes`, y calcular `writes ∩ attributeFilter`. Esto implementa literalmente `isBugCondition(observerSpec)` del diseño.
    - Cargar el script bajo prueba con `fs.readFileSync('js/lectoescritura-adapter.js')` + `window.eval(...)`, siempre después de instrumentar. Exponer también la carga aislada de `js/lecto-demo.js` (sin el adapter) para la tarea 2.
    - Exponer `MAX_SETTLE_INVOCATIONS = 5` y `ABORT_INVOCATION_BUDGET = 50` como constantes.
  - `test/lecto-freeze.bug.test.js` con `node:test` y `node:assert/strict`:
    - Caso A concreto (bug determinista): documento con `#navMobilePanel[aria-hidden="true"][inert]` y cargar el adapter. Sin corregir, el presupuesto se supera durante la carga.
    - Caso B concreto: tras cargar el adapter, insertar 3 horarios en `#slots-container` (uno libre, uno `.selected`, uno `disabled.booked`). Sin corregir, el presupuesto se supera al insertar.
    - Enumeración exhaustiva del dominio (espacio pequeño, no hace falta generación aleatoria): panel abierto/cerrado × 0..10 horarios × combinaciones `selected`/`booked`/`disabled`. Para cada estado: `violaciones.length === 0` e `invocaciones ≤ MAX_SETTLE_INVOCATIONS` en todos los observers del adapter.
  - Ejecutar `node --test test/lecto-freeze.bug.test.js` sobre el código SIN corregir.
  - **RESULTADO ESPERADO: FALLA.** Documentar los contraejemplos en la salida del test: `syncMobileMenu` invocado > 50 veces escribiendo `aria-hidden="true"` sobre un panel que ya tenía `aria-hidden="true"`; `syncSlots` invocado > 50 veces escribiendo `aria-pressed`.
  - **RESULTADO OBTENIDO: FALLÓ, como debía.** `exit 1`, `# fail 3`, 2,1 s (sin cuelgue, gracias al presupuesto del harness). Contraejemplos registrados: Bug A · `syncMobileMenu`, `attributeFilter: [class, aria-hidden]`, intersección `{aria-hidden}`, 51 invocaciones; Bug B · `syncSlots`, `attributeFilter: [class, disabled, aria-pressed]`, intersección `{aria-pressed}`, 51 invocaciones; e invariante violada en 82 de 82 estados enumerados. El detalle literal queda en `tasks.meta.json`.
  - **No re-ejecutable tal cual hoy**: con la corrección aplicada este test pasa (ver 3.7). Reproducir el fallo exige revertir `js/lectoescritura-adapter.js`.
  - _Requisitos: 1.1, 1.2_

- [x] 2. Escribir los tests de preservación sobre el código SIN corregir
  - **Property 2: Preservation** - Comportamiento observable equivalente fuera de la condición del bug
  - **IMPORTANTE**: metodología de observación primero. Medir la línea base sobre el código sin corregir, y solo después escribir las aserciones.
  - Cómo se obtiene la línea base, según el diseño:
    - Adapter: en jsdom con la instrumentación de la tarea 1, que aborta el bucle. El estado de atributos que queda tras el aborto es la línea base de `syncTabs`, `syncBookingSteps` y `updateStickyBar`. Consecuencia práctica medida: una vez abortado el observer del panel, las mutaciones posteriores ya no se sincronizan, así que las transiciones del menú móvil se provocan en el MISMO turno síncrono que la carga del adapter.
    - `js/lecto-demo.js`: cargado solo, sin el adapter, porque es autónomo. Línea base del demo, la barra sticky y `#date-picker`.
  - Archivo nuevo `test/lecto-preservation.test.js`, reutilizando `test/helpers/observer-harness.js` y `test/helpers/lecto-fixtures.js`.
  - Fijar `process.env.TZ = 'UTC'` antes de cualquier `Date`: `booking.min.js` deriva `#date-picker.min` con `toISOString()`, cuyo día puede no coincidir con el día local en husos ≠ 0. `node --test` aísla cada archivo en su propio proceso.
  - Casos (los cinco del diseño, más el resto del adapter):
    1. `#date-picker.min` = mañana. Reproducir el orden de carga real: `js/lecto-demo.js` primero y después un stub de `initBookingSystem()` que escriba `min` = mañana como último escritor. Aserción sobre el valor efectivo (`min` === mañana en ISO local), que es lo que hay que preservar.
    2. Pestañas del demo: `click` y `ArrowLeft`/`ArrowRight` dejan el mismo `aria-selected`, `tabindex`, `#demo-stage[aria-labelledby]` y el mismo `#demo-text.textContent` que la línea base, y el foco en la pestaña nueva.
    3. Menú móvil: abrir y cerrar (`.active` sobre `#navMobilePanel`, como hace `navbar.min.js`) deja `aria-hidden`, atributo `inert` y el `tabindex` de los enlaces exactamente como la línea base.
    4. Pasos del formulario: 1 → 2 → 1 → 2 → 3 con stubs de `window.goToStep1`/`goToStep2`/`goToStep3` que alternen `style.display` igual que `booking.min.js`; `aria-hidden` e `inert` correctos y foco en el encabezado del paso visible.
    5. Barra sticky: en viewport móvil (`matchMedia` `matches: true`, `scrollY > 600`, `#inscripcion` fuera de vista) queda visible; en escritorio queda oculta. Asertar sobre la **visibilidad efectiva** (`hidden === true`), que es la que hoy gana por `.lecto-sticky-cta[hidden] { display:none !important }`.
    6. Resto del adapter (3.5): `#navThemeToggle` con su `aria-pressed`/`aria-label`/`title` al alternar `light-mode`, `role="menuitem"` eliminados del dropdown de escritorio, `rel="noopener noreferrer"` en `a[target="_blank"]`, y la rama de reveal on scroll (jsdom no trae `IntersectionObserver`, así que se ejercita el fallback que añade `is-visible` a todos los `.reveal`; documentarlo en el test).
  - **NO escribir en este archivo** las dos aserciones que son cambio intencional y fallarían sobre el código sin corregir: «`selectMode` se ejecuta una sola vez por pulsación de flecha» (línea base: 2) y «`syncMobileMenu` corre una vez por transición» (línea base: > 50). Van en las tareas 3.6 y 3.7 respectivamente.
  - Asertar sobre el atributo `inert` y no sobre la propiedad `.inert`: el harness confirma que jsdom no refleja la propiedad IDL (vale `undefined` hasta la primera escritura).
  - Ejecutar `node --test test/lecto-preservation.test.js` sobre el código SIN corregir.
  - **RESULTADO ESPERADO: PASAN.** Eso confirma la línea base a preservar.
  - **RESULTADO OBTENIDO: PASARON** sobre el código sin corregir, con la línea base medida y codificada en cada aserción.
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Corregir el bucle de `MutationObserver` y el doble dueño entre scripts

  - [x] 3.1 Añadir los helpers idempotentes en `js/lectoescritura-adapter.js`
    - Junto al `setInert` actual, al inicio del IIFE, con un comentario que explique el mecanismo del bucle.
    - `setAttr(el, name, value)`: retorna si `!el`; escribe solo si `el.getAttribute(name) !== value`.
    - `setInert(el, state)`: guardar contra `el.inert === state` y contra `el.hasAttribute('inert') === state` antes de escribir la propiedad y el atributo.
    - `setBool(el, name, on)`: misma guarda para `hidden` y similares (propiedad + presencia del atributo).
    - Es la capa principal de la corrección: `setAttribute` encola un registro de mutación aunque el valor no cambie, y ahí está el motor del bucle.
    - Sin otros cambios en este paso: los llamadores se migran en 3.2–3.5.
    - _Bug_Condition: isBugCondition(observerSpec) — writes ∩ attributeFilter ≠ ∅_
    - _Expected_Behavior: expectedBehavior(observerSpec) — invocationCount ≤ MAX_SETTLE_INVOCATIONS (5)_
    - _Requisitos: 2.1, 2.2, 2.3_

  - [x] 3.2 Corregir el Bug A: panel móvil, en `js/lectoescritura-adapter.js`
    - En `syncMobileMenu()`: sustituir `mobilePanel.setAttribute('aria-hidden', String(!open))` por `setAttr(mobilePanel, 'aria-hidden', String(!open))`.
    - En el `observe()` de `#navMobilePanel`: dejar `attributeFilter: ['class']`, quitando `'aria-hidden'`. `class` es la única señal que el adapter necesita, porque `navbar.min.js` marca el estado con `.active`.
    - No tocar el trap de `Tab`, el movimiento de foco ni la llamada directa a `syncMobileMenu()` posterior al `observe()`.
    - _Bug_Condition: isBugCondition(#navMobilePanel → syncMobileMenu) — writes ∩ attributeFilter = {aria-hidden}_
    - _Expected_Behavior: la página carga y responde; invocationCount ≤ 5 tras cada mutación externa_
    - _Requisitos: 2.1, 3.2_

  - [x] 3.3 Corregir el Bug B: contenedor de horarios, en `js/lectoescritura-adapter.js`
    - En `syncSlots()`: `setAttr(slot, 'aria-pressed', String(selected))` y `setAttr(slot, 'aria-label', …)`.
    - En el `observe()` de `#slots-container`: `attributeFilter: ['class', 'disabled']`, eliminando `'aria-pressed'`. Conservar `childList: true` y `subtree: true`, que son los que detectan la inyección de botones de `loadTimeSlots()`.
    - _Bug_Condition: isBugCondition(#slots-container → syncSlots) — writes ∩ attributeFilter = {aria-pressed}_
    - _Expected_Behavior: los horarios aparecen, se pueden seleccionar y la página sigue respondiendo_
    - _Requisitos: 2.2, 3.3_

  - [x] 3.4 Endurecer `syncTabs()` y `syncBookingSteps()` en `js/lectoescritura-adapter.js`
    - `syncTabs()`: `setAttr(tab, 'tabindex', selected ? '0' : '-1')` y `setAttr(demoStage, 'aria-labelledby', active.id)`.
    - `syncBookingSteps()`: `setAttr(step, 'aria-hidden', String(!visible))`, `setInert(step, !visible)` (ya guardado por 3.1) y `setAttr(heading, 'tabindex', '-1')`.
    - No cambiar el `attributeFilter` de esos dos observers, ni el movimiento de foco, ni el `scrollIntoView`. Hoy no tienen bucle, pero están a un atributo de distancia: con la guarda no lo tendrán aunque alguien amplíe sus filtros.
    - Sin cambio de comportamiento observable.
    - _Bug_Condition: isBugCondition — prevención, intersección hoy vacía_
    - _Expected_Behavior: invocationCount ≤ 5 también si el filtro incorpora `aria-hidden` o `inert`_
    - _Requisitos: 2.1, 3.1, 3.3_

  - [x] 3.5 Dejar `updateStickyBar()` como único dueño de `#lectoMobileBar`, en `js/lectoescritura-adapter.js`
    - `mobileBar.classList.toggle('show', visible)` → guardar con `if (mobileBar.classList.contains('show') !== visible)`.
    - `mobileBar.hidden = !visible` → `setBool(mobileBar, 'hidden', !visible)`.
    - `mobileBar.setAttribute('aria-hidden', …)` → `setAttr(mobileBar, 'aria-hidden', String(!visible))`.
    - `setInert(mobileBar, !visible)` queda guardado por 3.1.
    - No cambiar los umbrales: `matchMedia('(max-width: 900px)')`, `scrollY > 600` y la proximidad de `#inscripcion`.
    - _Bug_Condition: no aplica — este paso resuelve el doble dueño (C.1), no un bucle_
    - _Expected_Behavior: `class`, `hidden`, `aria-hidden` e `inert` siempre coherentes entre sí y respetando el viewport_
    - _Requisitos: 2.3_

  - [x] 3.6 Recortar `js/lecto-demo.js` a lo que le corresponde
    - Eliminar el bloque «Sticky CTA móvil» completo: `var mobileBar`, `var inscripcionSec`, el listener de `scroll`, el `classList.toggle('show', …)` y el `setAttribute('aria-hidden', …)`. Dueño único: `updateStickyBar()` del adapter.
    - Eliminar el `keydown` de `ArrowRight`/`ArrowLeft` dentro de `tabs.forEach(...)`. **Conservar el `click`**, que es donde vive `selectMode`. El teclado lo cubre el adapter con el patrón ARIA completo, incluidos `Home`/`End`, y llega aquí como un `click()` sintético.
    - Eliminar el bloque final que fija `datePicker.min` = hoy. Dueño único: `initBookingSystem()` de `booking.min.js`, que fija mañana y es consistente con su propia validación en `loadTimeSlots()`.
    - Dejar un comentario en el archivo que documente qué elementos ya NO gestiona y quién es su dueño, para que el recorte no se lea como un olvido.
    - **NO tocar `#demo-play`**: el reemplazo de `innerHTML` en `play()`/`stopPlayback()` queda como está (C.3 del diseño, impacto nulo).
    - Añadir a `test/lecto-preservation.test.js` las dos aserciones diferidas de la tarea 2, que son cambio intencional: con `js/lecto-demo.js` cargado solo, `#date-picker` no recibe ningún `min` y `#lectoMobileBar` no recibe `show` ni `aria-hidden`; y `selectMode` se ejecuta una sola vez por pulsación de flecha (línea base 2 → 1), verificando además que la pestaña sí cambia, para que el conteo de 1 no se deba a una pulsación sin efecto.
    - _Bug_Condition: no aplica — este paso resuelve el doble dueño (C.1, C.2, C.4)_
    - _Expected_Behavior: un único responsable por elemento; estado determinista y no dependiente del orden de carga_
    - _Requisitos: 2.3, 3.1, 3.4_

  - [x] 3.7 Verificar que el test exploratorio ahora pasa
    - **Property 1: Expected Behavior** - Los callbacks de `MutationObserver` alcanzan un punto fijo
    - **IMPORTANTE**: re-ejecutar el MISMO test de la tarea 1, sin escribir uno nuevo ni relajar sus aserciones.
    - `node --test test/lecto-freeze.bug.test.js`.
    - **RESULTADO ESPERADO: PASA** — ninguna violación de `isBugCondition` y todos los observers dentro de `MAX_SETTLE_INVOCATIONS`, en los 82 estados del dominio enumerado (2 estados del panel × (1 estado sin horarios + 10 recuentos × 4 combinaciones)) y sus 162 fases observadas.
    - Añadir aquí la aserción diferida de la tarea 2: `syncMobileMenu` se invoca 0 veces en la carga y exactamente 1 por transición abrir/cerrar, y 4 transiciones seguidas producen 4 invocaciones (coste lineal, sin cascada con `navbar.min.js`). Línea base previa: 51 invocaciones ya en la carga (bucle abortado por el presupuesto de 50), con lo que el observer quedaba desconectado y la transición posterior ni se sincronizaba.
    - **VERIFICADO**: 4 tests, 4 pasan, 0 fallan.
    - _Requisitos: 2.1, 2.2_

  - [x] 3.8 Verificar que los tests de preservación siguen pasando
    - **Property 2: Preservation** - Comportamiento observable equivalente fuera de la condición del bug
    - **IMPORTANTE**: re-ejecutar los MISMOS tests de la tarea 2, sin escribir nuevos.
    - `node --test test/lecto-preservation.test.js`.
    - **RESULTADO ESPERADO: PASAN** — sin regresiones en 3.1–3.5.
    - Único desvío admitido, ya documentado en el diseño como cambio intencional: en escritorio `#lectoMobileBar` pasa a tener `hidden`, `inert` y `aria-hidden` coherentes entre sí. La visibilidad efectiva en móvil no cambia.
    - Dos aserciones de este archivo no vienen de la tarea 2 sino de la 3.6, porque son cambio intencional y sobre el código sin corregir fallaban por diseño: `js/lecto-demo.js` ya no escribe `min` en `#date-picker` (línea base previa: hoy) y `selectMode` corre una sola vez por pulsación de flecha (línea base previa: 2). Lo que se preserva en el primer caso es el valor **efectivo** de `min` —mañana—, que es lo que exige el requisito 3.4.
    - **VERIFICADO**: 9 tests, 9 pasan, 0 fallan.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - la suite completa y los gates del repositorio pasan
  - `npm test` → **13 tests, 13 pasan, 0 fallan**, exit 0, 2,0 s.
  - `node --check js/lectoescritura-adapter.js` y `node --check js/lecto-demo.js` → ambos sin errores de sintaxis.
  - `./check.sh` → **✅ Todos los gates pasan (9/9)**, exit 0. Los `⚠️` de su salida son avisos SEO preexistentes de otras páginas; ninguno proviene de este cambio ni rompe el gate. Cierra el punto 8 de la checklist manual de la tarea 5.
  - `git diff --numstat`: cambian exactamente 4 archivos versionados — `js/lecto-demo.js` (+20/−43, el recorte de la tarea 3.6), `js/lectoescritura-adapter.js` (+90/−26, helpers y migración de llamadores), `package.json` (+3/−1, `test` y `jsdom`) y `package-lock.json` (+515/−1). Los 4 archivos de `test/` aparecen como directorio sin seguimiento porque son nuevos y todavía no están en el índice.
  - Nota sobre `git status`: `.kiro/` también sale sin seguimiento; es preexistente y ajeno al bugfix.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Verificación manual en navegador (NO automatizable por un agente)
  - **Tarea manual**: el freeze y la fluidez real solo se confirman en un navegador. Un agente no puede cerrarla; queda para el usuario. Es la checklist de 8 puntos de `design.md`.
  - 1. Abrir `/lectoescritura`: carga, hace scroll y responde a clics. En DevTools → Performance, sin tarea larga infinita al cargar.
  - 2. Menú hamburguesa (viewport ≤ 768 px): abre y cierra varias veces, el foco entra al panel y regresa a la hamburguesa, `Escape` cierra, la página sigue respondiendo.
  - 3. Formulario: nombre y WhatsApp → paso 2 → elegir fecha → **los 10 horarios aparecen y la página sigue respondiendo** (este es el punto del Bug B) → seleccionar horario → confirmar → paso 3 con enlace de Google Calendar.
  - 4. `#date-picker`: el calendario no ofrece hoy ni fechas pasadas, y no aparece el `alert` de «a partir de mañana» al elegir la primera fecha disponible.
  - 5. Demo: clic en ambas pestañas, `ArrowLeft`/`ArrowRight`, `Home`/`End`, botón «Leer» en los dos modos y comparativa de segundos al completar ambos.
  - 6. Barra sticky en móvil: aparece pasados 600 px, desaparece al llegar a `#inscripcion`, el botón «Agendar» es clicable. En escritorio no aparece.
  - 7. Consola sin errores en toda la sesión.
  - 8. `./check.sh` pasa. **Ya cubierto por la tarea 4** (9/9, exit 0); los 7 puntos anteriores siguen pendientes.
  - Por qué no basta con la suite: jsdom no hace layout, no evalúa media queries y no implementa `IntersectionObserver`; el harness los sustituye por stubs. El congelamiento del hilo principal y la fluidez percibida solo se confirman en un navegador real.
  - _Requisitos: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Seguimiento fuera del alcance de este bugfix - artefactos `.min` huérfanos
  - **Requiere una decisión del usuario antes de tocar nada**: no es una regresión ni parte de la corrección, y el diseño lo declara explícitamente fuera de alcance.
  - Hecho verificado: `js/lecto-demo.min.js` y `css/lectoescritura.min.css` existen en el repositorio, pero **ninguna página HTML los referencia** (`grep -rln 'lecto-demo\.min\.js\|lectoescritura\.min\.css' --include='*.html' .` → cero coincidencias) y `package.json` no tiene paso de minificado. Están desactualizados: `js/lecto-demo.min.js` conserva la barra sticky duplicada y el `min` = hoy que la tarea 3.6 eliminó.
  - Riesgo asumido si se dejan como están: quien cambie la página a `.min.js` revive los problemas C.1 y C.4 sin que ningún test lo detecte, porque la suite carga los archivos sin minificar.
  - [ ] 6.1 Aplicar la decisión sobre los dos artefactos huérfanos
    - Opción A: borrar `js/lecto-demo.min.js` y `css/lectoescritura.min.css`. Antes de borrar, repetir el `grep` anterior para confirmar que sigue sin haber referencias.
    - Opción B: conservarlos y añadir un gate a `check.sh` que falle cuando un `.min` sea más antiguo que su fuente, replicando el formato de salida de los 9 gates existentes.
    - Se implementa una sola de las dos, la que elija el usuario.
    - _Requisitos: ninguno — deuda técnica detectada durante el bugfix, no un requisito de la corrección_

- [ ] 7. Seguimiento - ningún gate ejecuta la suite de pruebas
  - **Requiere decisión del usuario**: es un hueco detectado al cerrar el plan, no un requisito de la corrección.
  - Hecho verificado: `check.sh` tiene 9 gates y **ninguno ejecuta `npm test`**; `.github/workflows/ci.yml` tampoco lo invoca (el job `gates` corre `check.sh`, resuelve deps de runtime con `npm install --omit=dev`, compila los scripts de Python y hace `node --check server.js`; el job `build` corre `npm ci || npm install` y `npm run build`). El script `test` de `package.json` solo se ejecuta a mano.
  - Consecuencia: los dos archivos de test de este bugfix no protegen contra regresiones de forma automática. Si alguien vuelve a meter `aria-hidden` en el `attributeFilter` del panel móvil, el commit y el CI pasan igual.
  - [ ] 7.1 Enganchar `npm test` a los gates
    - Añadir un gate a `check.sh` que ejecute `npm test` y falle con el mismo formato de salida que los 9 existentes, o añadir un paso `npm test` al job `gates` de `.github/workflows/ci.yml` (o ambos).
    - Si se añade al job `gates`: hoy instala con `npm install --omit=dev`, que **excluye `jsdom`**. Habría que instalar también las devDependencies en ese paso, o mover la suite al job `build`, que sí corre `npm ci`.
    - Verificar ejecutando `./check.sh` y comprobando que el recuento sube de 9 a 10; actualizar el texto «Todos los gates pasan (9/9)» de `check.sh` y el nombre del paso «Ejecutar quality gates (8/8)» del CI, que ya está desalineado.
    - _Requisitos: ninguno — refuerzo del proceso, no de la corrección_

## Notas

- El orden 1 → 2 → 3 → 3.7/3.8 no es decorativo: el test de la tarea 1 **tiene que fallar** sobre el código sin corregir, porque ese fallo es la única evidencia de que el bug existía; y la línea base de la tarea 2 **tiene que pasar** antes y después, porque es la referencia que detecta regresiones. Un test de bugfix que pasa desde el primer día no demuestra nada.
- El harness (`test/helpers/observer-harness.js`) envuelve `MutationObserver` con un presupuesto de 50 invocaciones. Al superarlo registra la violación, llama a `disconnect()` de ese observer y deja de invocar el callback. Es lo que convierte el bucle en un contraejemplo legible en vez de un timeout eterno: no lanza una excepción dentro del callback, porque jsdom la reportaría al virtual console, la cola de microtareas seguiría drenándose y el proceso se colgaría igual que la pestaña del navegador.
- `MAX_SETTLE_INVOCATIONS = 5` es el umbral del comportamiento correcto; 50 es solo el cortafuegos. Un sincronizador correcto necesita 1 invocación por mutación externa.
- Las tareas marcadas con `*` serían opcionales; en este plan no hay ninguna. Los dos archivos de test son la evidencia del bugfix, no un extra que se pueda saltar.
- Tareas 1, 2, 3.x y 4 están completadas con evidencia de ejecución (`npm test` 13/13, `./check.sh` 9/9). Las tareas 5, 6 y 7 quedan abiertas a propósito: la 5 no la puede cerrar un agente (necesita un navegador real), y la 6 y la 7 necesitan una decisión del usuario.
- Todas las rutas son relativas a la raíz del repositorio.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["6.1"] },
    { "id": 1, "tasks": ["7.1"] }
  ]
}
```

Solo quedan dos subtareas incompletas que un agente pueda ejecutar, y las dos están bloqueadas por una decisión del usuario. Van en olas distintas porque ambas pueden acabar escribiendo en `check.sh` (opción B de la 6.1 y el gate nuevo de la 7.1). Las tareas 5, 6 y 7 son de nivel superior y la 5 es manual, así que no entran en el grafo; el resto ya está completado.
