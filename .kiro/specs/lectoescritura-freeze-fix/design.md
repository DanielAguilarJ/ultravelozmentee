# Lectoescritura · Congelamiento de la página — Diseño de la corrección

## Resumen del bug

Al abrir `/lectoescritura` la página se pinta pero queda inusable: no responde a clics, scroll ni teclado. La causa es un bucle infinito de `MutationObserver` en `js/lectoescritura-adapter.js`: el callback del observer escribe uno de los atributos que ese mismo observer vigila, así que se re-dispara a sí mismo en microtareas y el hilo principal nunca cede el control al navegador.

Hay dos instancias del mismo antipatrón:

- **Bug A** — Panel móvil (`#navMobilePanel`): se dispara **siempre, al cargar la página**. Es el que reporta el usuario.
- **Bug B** — Contenedor de horarios (`#slots-container`): latente al cargar, se dispara **al elegir una fecha en el paso 2** del formulario, cuando `booking.min.js` inyecta los botones de horario. Hoy nadie llega ahí porque A congela antes; al corregir A solo, el freeze reaparecería en el paso 2.

Además hay **Problemas C**: `js/lecto-demo.js` y `js/lectoescritura-adapter.js` se pisan entre sí sobre los mismos elementos (barra sticky, tabs del demo, `#date-picker`). No congelan la página, pero producen estado contradictorio y son la clase de duplicación que genera el próximo bug. Se corrigen en el mismo cambio porque tocan los mismos archivos.

Estrategia: hacer **idempotentes** todas las escrituras de atributos del adapter (leer antes de escribir) y **limpiar los `attributeFilter`** para que no incluyan atributos que el callback escribe — defensa en profundidad, dos capas independientes. Y asignar **un único dueño** por elemento entre los dos scripts.

### Verificación previa del entorno (no asumido)

| Hecho | Estado |
|---|---|
| `lectoescritura.html` carga `js/navbar.min.js` y `js/booking.min.js` | Confirmado (líneas 1164 y 1167). Las versiones sin minificar **no** se ejecutan en esta página |
| `lectoescritura.html` carga `js/lecto-demo.js` y `js/lectoescritura-adapter.js` sin minificar | Confirmado (líneas 1169–1170), ambos con `defer` |
| `lectoescritura.html` carga `css/lectoescritura.css` sin minificar | Confirmado (línea 77) |
| `js/lecto-demo.min.js` y `css/lectoescritura.min.css` existen | Sí, pero **ninguna página HTML los referencia** |
| `js/lectoescritura-adapter.js` tiene versión `.min` | No existe |
| El proyecto tiene runner de pruebas JS | **No.** `package.json` solo trae Eleventy + Express; los gates son `check.sh` (grep) y `.github/workflows/ci.yml` |

## Glosario

- **Bug_Condition (C)**: existe un `MutationObserver` cuyo callback escribe, sobre un nodo observado, un atributo que pertenece al `attributeFilter` de ese mismo observer.
- **Property (P)**: el callback del observer alcanza un punto fijo — tras un número finito y acotado de invocaciones deja de generar mutaciones nuevas, y el hilo principal queda libre.
- **Preservation**: todo lo que hoy funciona en la página (demo de lectura, apertura/cierre del menú, flujo de 3 pasos del formulario, tema claro/oscuro, `rel="noopener"`, reveal on scroll) se comporta igual después del cambio.
- **Escritura idempotente**: `setAttribute` solo se ejecuta si el valor nuevo difiere del actual. `setAttribute` encola un registro de mutación **siempre**, incluso con valor idéntico; ahí está el motor del bucle.
- **`syncMobileMenu()`**: callback del observer de `#navMobilePanel` en `js/lectoescritura-adapter.js`.
- **`syncSlots()`**: callback del observer de `#slots-container` en `js/lectoescritura-adapter.js`.
- **`setInert(el, state)`**: helper del adapter que escribe la propiedad `.inert` **y** el atributo `inert`.

## Detalles del bug

### Condición del bug

Formulada como invariante verificable sobre el código, no sobre un síntoma:

```
FUNCTION isBugCondition(observerSpec)
  INPUT: observerSpec = { target, options, callback }
  OUTPUT: boolean

  writes ← conjunto de nombres de atributos que callback escribe
                  sobre target o sus descendientes observados

  watched ← observerSpec.options.attributeFilter
             (o TODOS los atributos si attributes = true sin filtro)

  RETURN observerSpec.options.attributes = true
         AND (writes ∩ watched) ≠ ∅
END FUNCTION
```

```
FUNCTION expectedBehavior(observerSpec)
  INPUT: observerSpec
  OUTPUT: boolean

  // Con cualquier estado inicial del DOM observado, el número de
  // invocaciones del callback tras la mutación inicial es finito y
  // acotado por una constante pequeña.
  RETURN invocationCount(observerSpec) ≤ MAX_SETTLE_INVOCATIONS
END FUNCTION
```

`MAX_SETTLE_INVOCATIONS` propuesto: 5. Un sincronizador correcto necesita 1 invocación por mutación externa; el margen cubre encadenamientos legítimos (por ejemplo `class` y `style` en mutaciones separadas).

### Instancias que violan la invariante hoy

| # | Observer | `attributeFilter` | Atributos que escribe el callback | Intersección |
|---|---|---|---|---|
| A | `#navMobilePanel` → `syncMobileMenu` | `['class', 'aria-hidden']` | `aria-hidden`, `inert` (vía `setInert`) | **`aria-hidden`** |
| B | `#slots-container` → `syncSlots` | `['class', 'disabled', 'aria-pressed']` | `aria-pressed`, `aria-label` | **`aria-pressed`** |
| — | `document.documentElement` → `syncThemeButton` | `['class']` | escribe en `#navThemeToggle`, no en el nodo observado | ∅ — correcto |
| — | `#lecto-demo` → `syncTabs` | `['class', 'aria-selected']` | `tabindex`, `aria-labelledby` | ∅ — correcto, **pero a un atributo de distancia** |
| — | `#booking-widget` → `syncBookingSteps` | `['style', 'class', 'hidden']` | `aria-hidden`, `inert`, `tabindex` | ∅ — correcto, **pero a un atributo de distancia** |

Los dos últimos casos son la razón por la que la corrección no puede quedarse en “quitar el atributo del filtro”: cualquiera que añada `aria-hidden` o `inert` a esos filtros —algo razonable para un sincronizador de accesibilidad— reintroduce el freeze idéntico.

### Ejemplos concretos

- **A (siempre)**: abrir `/lectoescritura` en cualquier viewport. El HTML llega y se pinta; a los pocos ms la pestaña deja de responder. `#navMobilePanel` ya viene con `aria-hidden="true"` en el markup, así que la primera escritura ni cambia el valor: igual encola mutación. Esperado: la página carga y responde.
- **A (arranque del ciclo)**: al final del bloque `if (mobilePanel && mobileButton) { … }` se llama `syncMobileMenu()` **después** de registrar el observer. Esa llamada directa ya escribe `aria-hidden` → primer registro → callback → escribe otra vez → bucle. No hace falta ninguna interacción del usuario.
- **A (agravante)**: `js/navbar.min.js` (deferido, se ejecuta antes del adapter) también escribe `aria-hidden` y clases sobre el mismo panel en `setMobilePanelFocusable()`, `openMobileMenu()` y `closeMobileMenu()`. Con A corregido, abrir el menú debe disparar el callback una vez, no en cascada.
- **B**: con A ya corregido, ir al paso 2 y elegir una fecha. `loadTimeSlots()` inserta 10 botones `.course-time-slot`; `syncSlots()` les escribe `aria-pressed` → bucle → congela en pleno flujo de conversión. Esperado: los horarios aparecen y se pueden seleccionar.
- **B (por qué no se ve al cargar)**: `#slots-container` solo contiene `<p class="slots-placeholder">`. El `querySelectorAll('.course-time-slot, .time-slot')` inicial devuelve 0 elementos, no hay escritura y no hay bucle.
- **Caso borde que debe seguir igual**: en `prefers-reduced-motion: reduce` el adapter no añade `lecto-enhanced`, pero los observers se registran igual. El bucle es independiente de la animación.

## Comportamiento esperado

### Numeración de requisitos

Las propiedades de más abajo referencian cláusulas de `requirements.md`. Numeración:

- **1.1–1.3** Comportamiento actual (defecto): 1.1 freeze al cargar (A), 1.2 freeze al generar horarios (B), 1.3 estado contradictorio por doble dueño (C).
- **2.1–2.3** Comportamiento esperado, correspondencia 1:1 con las anteriores.
- **3.1–3.5** Comportamiento a preservar.

### Requisitos de preservación

**Comportamientos que no deben cambiar:**

- El demo de lectura sigue funcionando: cambio de pestaña por clic, `ArrowLeft`/`ArrowRight` mueven de pestaña, botón «Leer» anima el texto silabeado y fluido, y la comparativa de segundos aparece al probar ambos modos (3.1).
- El menú móvil abre y cierra por hamburguesa, overlay, `Escape` y clic en enlace; el panel cerrado queda fuera del orden de tabulación (3.2).
- El formulario avanza paso 1 → paso 2 → paso 3, «Volver» regresa al paso 1, el foco se mueve al encabezado del paso visible y la reserva genera el enlace de Google Calendar (3.3).
- `#date-picker` sigue aceptando solo fechas a partir de mañana, consistente con la validación de `loadTimeSlots()` (3.4).
- Resto del comportamiento del adapter: tema claro/oscuro con su `aria-pressed`, limpieza de `role="menuitem"` en el dropdown de escritorio, `rel="noopener noreferrer"` en enlaces `target="_blank"`, reveal on scroll (3.5).

**Alcance:**

Todo lo que no involucre (a) escrituras de atributos dentro de callbacks de `MutationObserver` del adapter, ni (b) los tres elementos con dueño duplicado (`#lectoMobileBar`, `.demo-tab`, `#date-picker`), queda intacto. En particular **no** se toca `js/navbar.js`/`js/navbar.min.js`, `js/booking.js`/`js/booking.min.js`, ni `lectoescritura.html`.

## Causa raíz

### A · Bucle de `MutationObserver` en el panel móvil

**Archivo**: `js/lectoescritura-adapter.js` · bloque “Navegación” · función `syncMobileMenu()`

El observer se registra con `attributeFilter: ['class', 'aria-hidden']` sobre `#navMobilePanel` y el callback ejecuta `mobilePanel.setAttribute('aria-hidden', String(!open))`. `setAttribute` encola un registro de mutación aunque el valor no cambie, los callbacks de `MutationObserver` se ejecutan como microtareas, y la cola de microtareas se drena por completo antes de que la tarea termine: el ciclo nunca devuelve el control al navegador. La llamada directa a `syncMobileMenu()` al final del bloque, posterior al `observe()`, es el disparador. Efecto observable: HTML pintado, cero interactividad.

### B · Mismo antipatrón en el contenedor de horarios

**Archivo**: `js/lectoescritura-adapter.js` · bloque “Horarios generados por booking.min.js” · función `syncSlots()`

`attributeFilter: ['class', 'disabled', 'aria-pressed']` y el callback escribe `slot.setAttribute('aria-pressed', String(selected))` en cada horario. `subtree: true` hace que la escritura sobre los hijos cuente. Inerte al cargar (solo hay placeholder) y activo desde el momento en que `loadTimeSlots()` de `booking.min.js` inyecta los botones al cambiar `#date-picker`.

### C · Doble dueño entre `lecto-demo.js` y `lectoescritura-adapter.js`

Ambos se cargan en `lectoescritura.html` con `defer`, en ese orden.

1. **Barra sticky `#lectoMobileBar`** — `lecto-demo.js` (bloque “Sticky CTA móvil”) registra un `scroll` que hace `classList.toggle('show', y > 600 && !nearForm)` y escribe `aria-hidden`, **sin** comprobar viewport. El adapter (`updateStickyBar`) registra otro `scroll` + `resize` + `matchMedia('(max-width: 900px)')` y escribe `class`, `hidden`, `aria-hidden` e `inert`. `css/lectoescritura.css:1649` define `.lecto-sticky-cta[hidden] { display:none !important }`, así que el `hidden` del adapter gana la visibilidad; el conflicto real es de estado: en escritorio con scroll > 600 `lecto-demo.js` deja `aria-hidden="false"` y clase `show` sobre un elemento que el adapter mantiene `hidden` e `inert`. Estado incoherente y dos condiciones distintas para el mismo elemento.
2. **Tabs `.demo-tab`** — `lecto-demo.js` maneja `ArrowRight`/`ArrowLeft` con lógica de “ir a la otra pestaña”; el adapter maneja `ArrowLeft/Right/Up/Down/Home/End` con el patrón WAI-ARIA completo (tabindex móvil, `tabs[i].click()`, foco). Con dos pestañas ambos coinciden por casualidad, pero cada flechazo ejecuta `selectMode()` dos veces (doble re-render del texto y doble reescritura de `#demo-status`), y `Home`/`End` solo los cubre el adapter.
3. **`#demo-play`** — `lecto-demo.js` reemplaza el `innerHTML` del botón en `stopPlayback()` y `play()`, descartando el `<span>Leer</span>` del markup. Revisado `css/lectoescritura.css`: no hay ninguna regla `.btn-demo-play span`, y el `gap` del flex funciona igual con un nodo de texto anónimo. **Impacto nulo, no se cambia.**
4. **`#date-picker`** — `booking.min.js` fija `min` = mañana y además rechaza con `alert()` cualquier fecha ≤ hoy; `lecto-demo.js` fija `min` = hoy. Hoy el valor final es “mañana” **por accidente del orden de ejecución**: `lecto-demo.js` corre en la fase de scripts deferidos y `initBookingSystem()` de `booking.min.js` corre después, en `DOMContentLoaded`. Si alguien mueve o deja de deferir un script, gana “hoy” y el usuario recibe un `alert` al elegir la fecha que el propio input le ofreció como válida.

## Propiedades de corrección

Property 1: Bug Condition - Los callbacks de MutationObserver alcanzan un punto fijo

_For any_ estado inicial del DOM observado en `/lectoescritura` (panel móvil abierto o cerrado, 0..N horarios con cualquier combinación de `selected`/`booked`/`disabled`, cualquier paso del formulario visible), ningún callback de `MutationObserver` del adapter escribe un atributo incluido en su propio `attributeFilter`, y el número de invocaciones del callback tras una mutación externa es ≤ `MAX_SETTLE_INVOCATIONS`. La página termina de cargar, responde a clics y scroll, y el flujo hasta los horarios se completa sin congelarse.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Comportamiento observable equivalente fuera de la condición del bug

_For any_ interacción que no dependa del bucle de observers (clic en pestañas del demo, `ArrowLeft`/`ArrowRight`, botón «Leer», apertura y cierre del menú móvil, avance y retroceso entre pasos del formulario, selección de horario, cambio de tema), el código corregido produce el mismo resultado observable que el código actual medido sobre estado alcanzable: mismos atributos finales de accesibilidad, mismo `#date-picker.min` (mañana), mismo texto renderizado en el demo y misma visibilidad efectiva de la barra sticky en viewport móvil.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Implementación de la corrección

### Decisión de estrategia para A y B

Opciones evaluadas:

| Opción | Veredicto |
|---|---|
| (i) Quitar del `attributeFilter` los atributos que el callback escribe | **Se adopta como segunda capa.** Barata y explícita, pero frágil: el filtro queda a un commit de distancia de reintroducir el bucle, y ya hay dos observers (tabs y booking) en esa situación |
| (ii) Escrituras idempotentes con guarda (leer, comparar, escribir solo si cambia) | **Se adopta como capa principal.** Ataca el mecanismo del bucle, no su configuración: aunque el filtro vuelva a incluir el atributo, no hay mutación que encolar. Protege también contra regresiones futuras y contra la cascada con `navbar.min.js` |
| (iii) `disconnect()` / `takeRecords()` alrededor de las escrituras | Rechazada. Descarta mutaciones reales ocurridas en la ventana (los horarios los inyecta otro script), y hay que acordarse de reconectar en cada camino de salida |
| (iv) Flag de reentrada | Rechazada. Oculta el síntoma y suprime actualizaciones legítimas que llegan mientras el flag está alzado; el bucle sigue latente en el código |

**Decisión: (ii) + (i).** La guarda de idempotencia es la corrección; el filtro limpio es defensa en profundidad. Ninguna de las dos sola es suficiente: (i) no impide que otro atributo del filtro se escriba mañana, y (ii) por sí sola deja el filtro pidiendo trabajo inútil en cada mutación.

### Archivo: `js/lectoescritura-adapter.js`

1. **Helpers idempotentes**, junto a `setInert`, usados por todos los sincronizadores del archivo:
   - `setAttr(el, name, value)`: `if (el.getAttribute(name) !== value) el.setAttribute(name, value)`.
   - `setInert(el, state)`: guardar contra `el.inert === state` y contra `el.hasAttribute('inert') === state` antes de escribir propiedad y atributo. Es la pieza que evita que el bucle vuelva si algún filtro incorpora `inert` o `aria-hidden`.
   - `setBool(el, name, on)`: para `hidden` y similares, con la misma guarda.
2. **`syncMobileMenu()`**: `setAttr(mobilePanel, 'aria-hidden', String(!open))` en lugar de `setAttribute` directo. `setInert` ya queda guardado por el punto 1.
3. **Observer del panel móvil**: `attributeFilter: ['class']`. `class` es la única señal que el adapter necesita (`navbar.min.js` marca el estado con `.active`); `aria-hidden` sale del filtro.
4. **`syncSlots()`**: `setAttr(slot, 'aria-pressed', …)` y `setAttr(slot, 'aria-label', …)`.
5. **Observer de horarios**: `attributeFilter: ['class', 'disabled']`; se elimina `aria-pressed`. Se conservan `childList: true` y `subtree: true`, que son los que detectan la inyección de botones.
6. **`syncTabs()` y `syncBookingSteps()`**: migrar sus escrituras a `setAttr`/`setInert`/`setBool` (`tabindex`, `aria-labelledby`, `aria-hidden`, `inert`). Hoy no hay bucle en esos dos observers; con la guarda tampoco lo habrá si alguien amplía sus filtros. Sin cambio de comportamiento observable.
7. **`updateStickyBar()`**: pasar a los helpers guardados y quedar como **único dueño** de `#lectoMobileBar`.

### Archivo: `js/lecto-demo.js`

Se recorta a lo que le corresponde —el demo interactivo— y suelta lo que ya gestiona el adapter:

8. **Eliminar** el bloque “Sticky CTA móvil” completo (listener de `scroll`, `classList.toggle('show', …)` y `setAttribute('aria-hidden', …)`). Dueño único: `updateStickyBar()` del adapter, que sí respeta el viewport y mantiene `hidden`/`inert` coherentes con `aria-hidden`.
9. **Eliminar** el `keydown` de `ArrowRight`/`ArrowLeft` en las tabs. Se conserva el `click`, que es donde vive la lógica de modo (`selectMode`). El teclado lo cubre el adapter con el patrón ARIA completo, incluidos `Home`/`End`; el resultado para `ArrowLeft`/`ArrowRight` es idéntico al actual.
10. **Eliminar** el bloque que fija `datePicker.min = hoy`. Dueño único: `initBookingSystem()` de `booking.min.js`, que fija mañana y es consistente con su propia validación.
11. **No se toca** `#demo-play` (ver Causa raíz C.3). El reemplazo de `innerHTML` no rompe nada; sustituirlo por `textContent` sobre un `<span>` estable es una mejora opcional fuera del alcance de este bugfix.

### Archivos que NO se modifican, y por qué

- `js/navbar.js` / `js/navbar.min.js`, `js/booking.js` / `js/booking.min.js`: la página carga las versiones `.min`; sus escrituras de `aria-hidden` y clases son mutaciones legítimas que el adapter debe observar. Con la guarda de idempotencia dejan de encadenar trabajo. Tocarlas ampliaría el radio a las otras ~10 páginas que las comparten.
- `lectoescritura.html`: ningún cambio de markup es necesario.
- `css/lectoescritura.css`: `.lecto-sticky-cta[hidden] { display:none !important }` ya hace lo correcto.

## Estrategia de verificación

### Enfoque

Primero producir contraejemplos que demuestren el bug sobre el código **sin corregir**, después verificar la corrección y la ausencia de regresiones.

Restricción real: **el proyecto no tiene runner de pruebas JS**. `package.json` solo declara Eleventy y Express; los gates son `check.sh` (grep, enganchado como `pre-commit` y replicado en `.github/workflows/ci.yml`). Propuesta mínima, sin framework nuevo: usar el runner integrado `node --test` (Node ≥ 18, ya exigido en `engines`) y añadir **una** devDependency, `jsdom`, que implementa `MutationObserver`. Si se prefiere cero dependencias nuevas, la alternativa es el gate estático del punto 3, que cubre la invariante aunque no el comportamiento.

### Comprobación exploratoria de la condición del bug (antes de la corrección)

**Objetivo**: hacer visible el bucle sin colgar la suite.

**Truco necesario**: un test que solo cargue el adapter en jsdom se colgaría igual que el navegador. Hay que instrumentar `MutationObserver` antes de cargar el script: envolver la clase para contar invocaciones del callback y lanzar una excepción al superar un presupuesto (por ejemplo 50). Así el freeze se convierte en un fallo legible con contraejemplo, en lugar de un timeout.

**Casos**:
1. **A · panel móvil** — documento con `#navHamburger` y `#navMobilePanel[aria-hidden="true"][inert]`; cargar el adapter. Sobre código sin corregir: se supera el presupuesto en la carga. Contraejemplo esperado: `syncMobileMenu` invocado > 50 veces escribiendo `aria-hidden="true"` sobre un panel que ya tenía `aria-hidden="true"`.
2. **B · horarios** — mismo documento con `#slots-container`; tras cargar el adapter, insertar botones `.course-time-slot` (uno normal, uno `selected`, uno `disabled.booked`) imitando `loadTimeSlots()`. Sobre código sin corregir: presupuesto superado al insertar.
3. **Invariante, dominio acotado** — enumerar el espacio de entrada completo (panel abierto/cerrado × 0..10 horarios × combinaciones `selected`/`booked`) y afirmar que ningún callback supera `MAX_SETTLE_INVOCATIONS = 5`. El espacio es pequeño, así que basta enumeración exhaustiva; `fast-check` como devDependency es opcional y no aporta cobertura aquí.

**Resultado esperado antes de la corrección: FALLA.** Eso confirma el diagnóstico. Después de la corrección: pasa.

### Fix Checking

```
FOR ALL estado ∈ EstadosObservables DO
  observers ← cargarAdapterCorregido(estado)
  FOR ALL obs ∈ observers DO
    ASSERT (atributosQueEscribe(obs.callback) ∩ obs.options.attributeFilter) = ∅
    ASSERT invocationCount(obs) ≤ MAX_SETTLE_INVOCATIONS
  END FOR
END FOR
```

### Preservation Checking

```
FOR ALL entrada WHERE NOT isBugCondition(entrada) DO
  ASSERT comportamiento_original(entrada) = comportamiento_corregido(entrada)
END FOR
```

Metodología de observación primero: como el código sin corregir se congela al cargar, la línea base no se puede medir en el navegador tal cual. Se obtiene de dos formas, y hay que decidirlo antes de escribir los tests:

- Para el **adapter**: en jsdom, con la instrumentación que aborta el bucle, se registran los atributos que `syncTabs`, `syncBookingSteps` y `updateStickyBar` dejan en cada estado. Esa es la línea base a preservar.
- Para **`lecto-demo.js`** (demo, sticky, `date-picker`): es autónomo, se puede cargar en jsdom **sin** el adapter y medir su comportamiento real sin interferencia del bucle. Es la línea base de los puntos C.1, C.2 y C.4.

**Casos de preservación**:
1. `#date-picker.min` = mañana tras cargar la página completa (mismo valor efectivo que hoy, ahora por diseño y no por orden de ejecución).
2. Tabs: `click` y `ArrowLeft`/`ArrowRight` producen el mismo `aria-selected`, `tabindex`, `#demo-stage[aria-labelledby]` y mismo texto en `#demo-text` que la línea base; `selectMode` se ejecuta una sola vez por pulsación.
3. Menú móvil: abrir y cerrar deja `aria-hidden`/`inert`/`tabindex` exactamente como la línea base, y `syncMobileMenu` corre una vez por transición.
4. Pasos del formulario: 1 → 2 → 3 y «Volver» dejan `aria-hidden`/`inert` correctos y mueven el foco al encabezado visible.
5. Barra sticky en viewport móvil: visible con `scrollY > 600` y formulario fuera de vista; oculta en escritorio, con `hidden`, `inert` y `aria-hidden` coherentes entre sí (esto **corrige** la incoherencia de C.1 en escritorio; se documenta como cambio intencional, no como regresión).

### Comprobación manual en navegador (no automatizable)

El freeze y la fluidez real solo se confirman en un navegador:

1. Abrir `/lectoescritura`: la página carga, hace scroll y responde a clics. En DevTools → Performance, no debe haber una tarea larga infinita al cargar.
2. Abrir y cerrar el menú hamburguesa varias veces (viewport ≤ 768 px): abre, cierra, el foco entra al panel y regresa a la hamburguesa, `Escape` cierra, la página sigue respondiendo.
3. Formulario: llenar nombre y WhatsApp → paso 2 → elegir una fecha → **los 10 horarios aparecen y la página sigue respondiendo** (este es el punto de B) → seleccionar un horario → confirmar → paso 3 con enlace de Google Calendar.
4. `#date-picker`: el calendario no ofrece hoy ni fechas pasadas; no aparece el `alert` de “a partir de mañana” al elegir la primera fecha disponible.
5. Demo: clic en ambas pestañas, `ArrowLeft`/`ArrowRight`, `Home`/`End`, botón «Leer» en los dos modos y comparativa de segundos al completar ambos.
6. Barra sticky en móvil: aparece pasados 600 px, desaparece al llegar a `#inscripcion`, el botón «Agendar» es clicable. En escritorio no aparece.
7. Consola sin errores en toda la sesión.
8. `./check.sh` pasa (gate de pre-commit y de CI).

## Nota sobre los archivos `.min`

Verificado: `package.json` no tiene paso de minificado (`"build": "echo 'Sin build: Express sirve archivos estáticos de la raíz'"`) y `deploy.sh` sincroniza `js/***` y `css/***` tal cual por `rsync`. Es decir, **los `.min` están versionados a mano**, no se generan en build.

Consecuencias para este bugfix:

- `js/lectoescritura-adapter.js` no tiene versión `.min` y la página lo carga directo: la corrección surte efecto sin más.
- `js/lecto-demo.min.js` y `css/lectoescritura.min.css` existen pero **ninguna página HTML los referencia** (`lectoescritura.html` carga `js/lecto-demo.js` y `css/lectoescritura.css`). Son artefactos huérfanos y desactualizados.
- **Decisión: la corrección NO se replica en `js/lecto-demo.min.js`.** Replicar a mano un archivo muerto añade una segunda fuente de verdad divergente. El riesgo asumido es que alguien cambie la página a `.min.js` en el futuro y reviva la barra sticky duplicada y el `min` = hoy.
- Seguimiento recomendado, fuera del alcance de este bugfix: borrar `js/lecto-demo.min.js` y `css/lectoescritura.min.css`, o añadir un gate en `check.sh` que falle cuando un `.min` sea más antiguo que su fuente.
