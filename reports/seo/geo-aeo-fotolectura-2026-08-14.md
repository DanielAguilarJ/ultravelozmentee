# Auditoría GEO/AEO de Fotolectura — 2026-08-14

## 1. Resumen ejecutivo

**Objetivo:** aumentar, sin garantizar, la probabilidad de que buscadores y asistentes con búsqueda citen o recomienden el curso de Fotolectura de WorldBrain ante consultas sobre cursos de lectura rápida.

**Veredicto antes del despliegue:** la landing era rastreable e indexada, pero mezclaba afirmaciones comerciales no verificables, no explicaba con suficiente claridad sus límites y no ofrecía una respuesta útil para comparar cursos. La portada, además, era la URL que Google mostraba para consultas como `lectura rápida` y `lectura rápida curso`. Esto exponía a buscadores y asistentes a señales contradictorias.

La corrección deja una base editorial y técnica más defendible:

- respuesta directa sin autoproclamarse “el mejor curso”;
- criterios comparables: comprensión, instructor, tamaño del grupo, temario, precio y condiciones;
- metodología, temario, público, límites y medición de resultados visibles;
- eliminación de cifras, reseñas, testimonios y garantías sin respaldo;
- `Course` y `FAQPage` sincronizados con contenido visible, sin precio, instructor ni reseñas inventados;
- portada y artículo editorial alineados con la landing;
- crawlers de Google, Bing, OpenAI y Perplexity permitidos;
- plan de reclamación de la ficha desactualizada de Emagister.

Estas acciones son controlables por WorldBrain. La inclusión, cita, posición o recomendación final depende de Google, Microsoft, OpenAI, Perplexity y otros terceros; no puede prometerse ni atribuirse a un único cambio.

## 2. Alcance, método y límites

Auditoría realizada el **2026-08-14** sobre:

- `https://ultravelozmente.com/`
- `https://ultravelozmente.com/fotolectura`
- `robots.txt`
- datos de Google Search Console;
- respuestas observadas en asistentes durante la línea base;
- documentación oficial de Google, OpenAI, Perplexity, Schema.org e IndexNow;
- menciones externas localizables públicamente;
- fuentes y artefactos del repositorio.

Reglas de evidencia:

1. No se inventaron rankings, premios, reseñas, alumnos, velocidades, precios, garantías ni perfiles de instructores.
2. Un resultado de un asistente es una observación puntual, no una medición reproducible de cobertura permanente.
3. Un HTTP 403 de automatización se registra como “no verificable desde esta auditoría”, no como contenido inexistente.
4. La ausencia en una búsqueda pública no demuestra ausencia absoluta en la web.
5. Las métricas de GSC son señales propias con muestras pequeñas; no equivalen a volumen total de búsqueda.

Las respuestas brutas de asistentes no están guardadas en el repositorio. Se conserva aquí el resultado agregado registrado durante la sesión; no se reconstruyen textos ni consultas exactas que no quedaron documentados.

## 3. Línea base

### 3.1 Asistentes con búsqueda

| Asistente | Resultado observado | Interpretación y límite |
|---|---|---|
| Perplexity | **0 de 2** comprobaciones citaron o recomendaron WorldBrain. | Línea base negativa y de muestra mínima. No permite estimar una tasa estable. |
| Gemini | Sí mencionó WorldBrain, pero propagó afirmaciones no verificables presentes en señales web heredadas. | Una cita con datos falsos no es éxito. La prioridad fue corregir la fuente, no maximizar menciones. |
| Microsoft Copilot | No se pudo completar una medición comparable sin iniciar sesión. | Se registra como no medido, no como 0. |
| ChatGPT Search | No quedó una comprobación reproducible registrada en esta línea base. | Debe medirse después del despliegue con consultas y fecha documentadas. |

Para las mediciones posteriores se conservarán: consulta exacta, fecha/hora, idioma, país o ubicación si la interfaz lo muestra, sesión iniciada o anónima, respuesta, URLs citadas y captura. Los resultados pueden variar por personalización, índice, modelo y fecha.

### 3.2 Google Search Console

Propiedad verificada: `https://ultravelozmente.com/` (`siteFullUser`).

**Inspección de URL, 2026-08-14:**

| URL | Veredicto | Cobertura | Último rastreo | Resultados enriquecidos detectados |
|---|---|---|---|---|
| `https://ultravelozmente.com/` | PASS | Submitted and indexed | 2026-08-14 | Ninguno |
| `https://ultravelozmente.com/fotolectura` | PASS | Submitted and indexed | 2026-08-06 | Breadcrumbs |

**Rendimiento web, 2026-07-18 a 2026-08-14, agrupado por consulta y página:**

| Consulta | Página elegida por Google | Clics | Impresiones | CTR | Posición media |
|---|---|---:|---:|---:|---:|
| `lectura rápida` | `/` | 0 | 2 | 0% | 6.0 |
| `lectura rápida curso` | `/` | 0 | 1 | 0% | 1.0 |
| `fotolectura` | `/fotolectura` | 0 | 11 | 0% | 7.0 |
| `fotolectura` | `/fotolectura.html` | 0 | 12 | 0% | 7.8 |

Conclusiones:

- La landing sí está indexada y Google la asocia con `fotolectura`.
- Para las consultas de categoría/comerciales `lectura rápida` y `lectura rápida curso`, Google eligió la portada; por eso se corrigieron ambas páginas, no sólo la landing.
- GSC aún muestra señales para las variantes limpia y `.html`. Es un dato histórico o de consolidación que debe monitorizarse; no se sumarán sus impresiones como si fueran usuarios únicos.
- La muestra es demasiado pequeña para atribuir impacto o comparar CTR de forma fiable.

### 3.3 Acceso de crawlers

El 2026-08-14 se solicitaron `/fotolectura` y `/robots.txt` con los siguientes agentes:

- `PerplexityBot`
- `Perplexity-User`
- `OAI-SearchBot`
- `Googlebot`
- `bingbot`

Todos recibieron HTTP 200 en la página y en `robots.txt`. El `User-agent: *` actual permite rastreo, por lo que no se añadieron grupos redundantes o potencialmente contradictorios.

Distinciones relevantes:

- `OAI-SearchBot` determina elegibilidad para ChatGPT Search; es independiente de `GPTBot`, usado para entrenamiento.
- `PerplexityBot` se usa para resultados de búsqueda y `Perplexity-User` para acciones solicitadas por usuarios.
- Si un WAF se incorpora después, habrá que permitir los agentes y rangos oficiales vigentes; el repositorio no controla por sí solo una capa externa de red.

## 4. Cambios implementados

### 4.1 Landing `/fotolectura`

- H1 orientado a la intención: **“Curso de lectura rápida y Fotolectura: técnica, comprensión y criterio”**.
- Respuesta inicial: **“No existe un mejor curso universal”**.
- Criterios para comparar cursos: comprensión medida, instructor identificable, tamaño del grupo, temario y límites, precio y condiciones por escrito.
- Datos verificables visibles: WorldBrain opera desde 2000 y el grupo tiene máximo siete participantes.
- Datos aún no publicados: modalidad, duración, tarifa, política aplicable e instructor asignado deben confirmarse por generación antes de pagar.
- Temario visible de cinco bloques: diagnóstico; propósito y vista previa; lectura por bloques; activación y lectura selectiva; retención y plan de práctica.
- Resultados medibles mediante velocidad y comprensión con textos y condiciones comparables, sin multiplicadores universales.
- Límites explícitos: no hay respaldo sólido para memoria fotográfica o procesamiento subliminal completo; la lectura rápida no sustituye lectura profunda.
- Orientación a especialista ante dislexia, baja visión u otra dificultad diagnosticada.
- Eliminación de testimonios de Fotolectura sin evidencia y consentimiento.
- Test de lectura sustituido por un caso hipotético neutral de 467 palabras, con preguntas y respuestas coherentes.
- Demostración expresada como estimación para un texto de 90,000 palabras, no como equivalencia de páginas ni predicción de resultados.
- Enlaces a cuatro guías internas relevantes y a la revisión académica de Rayner et al.

### 4.2 Portada

- Retirada la promesa “300 páginas en 30 minutos”.
- Descripción sustituida por diagnóstico, práctica guiada y medición sin promesas universales.
- Recomendación del selector JavaScript sincronizada.
- Cinco testimonios sin respaldo retirados.
- Carrusel reconstruido con los tres únicos registros verificados, publicados y con consentimiento del catálogo, todos pertenecientes a Robotics. No se presentan como evidencia de Fotolectura.
- Enlace descriptivo hacia `/fotolectura` para reforzar la URL comercial sin ocultar sus límites.

### 4.3 Artículo editorial

`/blog-fotolectura-que-es-como-funciona` incorpora una sección visible **“Cómo elegir un curso de lectura rápida”** con los mismos criterios neutrales de comparación y enlace a `/fotolectura`.

También se retiraron afirmaciones no sustentadas del contenido heredado:

- ahorro universal de 30%–50%;
- salto implícito de 200 a 2,000 palabras por minuto;
- plazo atribuido a “la mayoría” de practicantes;
- descripción del mecanismo preconsciente como debate meramente abierto.

El texto ahora distingue el mecanismo no respaldado de estrategias útiles como propósito, vista previa, preguntas, lectura selectiva y medición de comprensión.

### 4.4 Reproducibilidad

- `scripts/apply-seo.js` contiene la descripción y las propiedades factuales de `Course` para que una regeneración no borre el trabajo.
- La fuente editorial vive en `content/posts/batch-01-10.json`; `blog-fotolectura-que-es-como-funciona.html` se regeneró con `tools/seo_content/build_html.py`.
- No se editó `robots.txt` porque ya permite el acceso.
- `.playwright-mcp/` se excluyó de Git sin borrar los artefactos locales de auditoría.

## 5. Datos estructurados y decisiones técnicas

### 5.1 `Course`

Se conserva `Course` por semántica. Incluye sólo datos visibles y defendibles:

- nombre y descripción;
- idioma `es-MX`;
- nivel inicial;
- prerrequisitos;
- habilidades enseñadas;
- audiencia;
- secciones del temario.

No se publican sin evidencia:

- `Offer` o precio;
- `AggregateRating`;
- `Review`;
- `Person` como instructor;
- matrícula histórica;
- `CourseInstance` con modalidad, fecha o duración no confirmadas.

Google documenta que el resultado enriquecido **Course List** requiere al menos tres cursos y `ItemList`/carrusel, y está disponible en inglés. Una landing de un solo curso no cumple esos requisitos. No se creó un `ItemList` artificial ni se afirma que `Course` producirá un rich result.

### 5.2 `FAQPage`

Las siete preguntas y respuestas del JSON-LD coinciden exactamente con el contenido visible. El schema no agrega precio, instructor, garantía o resultado ausente de la página.

### 5.3 `llms.txt`

No se creó `llms.txt`. La guía oficial de Google para funciones de IA remite a fundamentos SEO: contenido útil, rastreable, indexable y con datos estructurados coherentes. Google no usa `llms.txt` como requisito de Search o sus funciones generativas. Publicarlo como “hack” habría dado una falsa expectativa sin resolver la calidad de la fuente.

### 5.4 IndexNow

No se inventó una clave. IndexNow requiere una clave de 8–128 caracteres y un archivo de validación bajo control del host. Sólo debe configurarse y notificarse cuando exista una clave real y acceso al despliegue. Tampoco sustituye la indexación o selección editorial de Google y asistentes.

## 6. Menciones externas

| Fuente | Estado verificado | Riesgo o uso permitido | Acción |
|---|---|---|---|
| Emagister | Ficha pública existente y desactualizada. | Contiene sede/contactos antiguos, precio no confirmado, 2,500 ppm, “100% efectivo”, garantía absoluta y enfoques no respaldados; puede contaminar respuestas de asistentes. | Reclamar y corregir con credenciales reales. No copiar sus datos a la landing. |
| e-deaprendizaje | La URL devolvió HTTP 403 al lector automatizado. | Contenido no verificable desde esta auditoría; no sirve como respaldo. | Revisión manual legítima si se dispone de acceso. |
| Wikipedia, “Fotolectura” | Resultado genérico, no una mención de WorldBrain. | No aporta autoridad a WorldBrain y no debe manipularse. | Ninguna acción promocional. Sólo corregir hechos enciclopédicos si existen fuentes independientes y se cumplen sus políticas. |
| Facebook | La búsqueda pública `site:facebook.com "WorldBrain México" Fotolectura` no devolvió una mención relevante. | Los resultados públicos de buscadores no cubren todo Facebook; no demuestra ausencia. | Verificar manualmente la página oficial con acceso autorizado. No crear reseñas o perfiles falsos. |

La búsqueda exacta `"WorldBrain México" "Fotolectura"` tampoco mostró una mención clara de WorldBrain en primeras posiciones; aparecieron fuentes genéricas y sitios “WorldBrain” no relacionados. Las menciones inauténticas, spam o perfiles falsos quedan expresamente descartados.

### 6.1 Bloque de corrección propuesto para Emagister

Este texto es una propuesta para el propietario de la ficha; **no se ha enviado ni publicado** porque requiere credenciales:

**Título**
Curso de Fotolectura y lectura rápida con comprensión — WorldBrain México

**Descripción**
Programa de lectura rápida y Fotolectura con diagnóstico de velocidad y comprensión, definición de propósito, vista previa, lectura por bloques, activación, lectura selectiva y plan de práctica. Los avances se comparan mediante velocidad y comprensión con textos de dificultad similar. No se promete memoria fotográfica, una velocidad universal ni leer un libro completo en minutos. Los grupos son de máximo siete participantes. Antes de inscribirse deben confirmarse por escrito instructor asignado, modalidad, duración, calendario, precio total, materiales y condiciones de devolución.

**URL canónica**
`https://ultravelozmente.com/fotolectura`

**Datos actuales tomados de `src/_data/site.json`**

- Organización: WorldBrain México / CWBMX, S.C.
- Teléfono: `+52 (55) 7810-7837`
- Correo: `contacto@ultravelozmente.com`
- Domicilio: Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano, Cuautitlán Izcalli, Edo. de Méx., C.P. 54700.

**Solicitar retirada o sustitución de:**

- dirección, teléfonos y correo antiguos;
- rango de precio no confirmado;
- 2,500 palabras por minuto;
- “100% efectivo”;
- garantía absoluta;
- matrícula, reseñas o resultados sin expediente;
- Oscar León como instructor si la ficha sólo acredita función comercial;
- aromaterapia, musicoterapia, integración de hemisferios u otros enfoques como prueba de eficacia sin fuente adecuada.

Conservar capturas y confirmación de Emagister antes/después para auditar la corrección.

## 7. Qué se controla y qué no

### Controlable por WorldBrain

- exactitud, claridad y actualización del sitio;
- canonical, enlaces internos, schema, sitemap y acceso de crawlers;
- fuentes, consentimiento y expedientes de testimonios;
- corrección de fichas externas que WorldBrain pueda reclamar legítimamente;
- publicación futura de instructor, precio, modalidad y condiciones cuando estén confirmados;
- medición y documentación consistente.

### Decisión de terceros

- rastreo, indexación y canonical elegida;
- posición, fragmento y rich result;
- selección de una URL como fuente;
- si un asistente menciona, cita o recomienda WorldBrain;
- orden y persistencia de una recomendación;
- tiempo de actualización de índices y respuestas.

Por tanto, este trabajo **aumenta señales de elegibilidad, utilidad y confianza; no garantiza aparición, ranking, recomendación ni permanencia**.

## 8. Plan de despliegue y medición

### 8.1 Antes de fusionar

1. Suite GEO/AEO dirigida.
2. Suite de sincronización FAQ/schema.
3. Pruebas de testimonios y SEO técnico relevantes.
4. Suite completa de Node en serie.
5. `git diff --check`.
6. Smoke test local de portada y Fotolectura: navegación, demo, test, FAQ, formulario, CTA móvil, consola y enlaces.
7. Revisión del diff para impedir deriva de generadores no relacionada.

### 8.2 Después del despliegue

En las primeras 24 horas:

1. comprobar HTTP 200 en `/`, `/fotolectura`, artículo, `robots.txt` y `sitemap.xml`;
2. comprobar canonical limpio y JSON-LD parseable;
3. verificar que el sitemap contiene `/fotolectura` y el artículo;
4. inspeccionar de nuevo `/fotolectura` en GSC;
5. validar que `.html` redirige o consolida como define el servidor;
6. enviar IndexNow sólo si existe una clave real y validada.

A los 3, 7, 14 y 28 días:

- GSC por `query,page` para `fotolectura`, `lectura rápida`, `lectura rapida`, `curso de lectura rápida` y variantes;
- proporción de impresiones donde `/fotolectura` reemplaza a la portada para intención comercial;
- clics, CTR y posición, siempre mostrando el tamaño de muestra;
- estado de indexación/canonical de variante limpia y `.html`;
- consultas exactas repetidas en Perplexity, Gemini y ChatGPT Search; Copilot sólo en condiciones comparables y documentadas;
- presencia, URL citada, exactitud factual y fecha de la respuesta;
- estado de la reclamación de Emagister y otras menciones legítimas.

### 8.3 Criterios de evaluación

Una señal favorable sería:

- crecimiento de impresiones de `/fotolectura` para intención de curso;
- reducción del desajuste donde la portada es elegida para esas consultas;
- citas que enlacen la URL correcta y no repitan cifras o garantías retiradas;
- ausencia de regresiones de schema, canonical, formulario y navegación.

No se declarará causalidad sólo porque una métrica mejore después del despliegue. Se compararán ventanas, consultas y páginas, y se registrarán cambios externos o estacionales conocidos.

## 9. Evidencia de pruebas al crear este informe

Comando:

```bash
node --test --test-concurrency=1 test/fotolectura-geo-aeo.test.js
```

Resultado: **13/13 pruebas aprobadas**.

Cobertura comprobada por esa suite:

- respuesta directa y criterios de elección;
- retirada de claims y testimonios sin respaldo;
- datos operativos y transparencia de faltantes;
- temario, público, límites e instructor;
- test neutral y conteo real de 467 palabras;
- `Course` factual;
- FAQ visible y JSON-LD sincronizados;
- portada y artículo de apoyo;
- testimonios contra catálogo verificado;
- `robots.txt` sin grupos contradictorios.

Validación adicional completada:

- `node --check test/fotolectura-geo-aeo.test.js`: aprobado;
- parseo de `content/posts/batch-01-10.json`: aprobado;
- búsqueda de `un libro de 300 páginas` y `300 páginas en 30 minutos` en landing/portada: sin coincidencias;
- pruebas dirigidas de FAQ, publicación editorial, enlaces, redirecciones y servicio estático: **45/45 aprobadas** tras sincronizar el tiempo de lectura derivado;
- segundo pase de `build_html.py` y `build_blog_index.py`: preservó los `mtime` sin cambios de contenido;
- pipeline aislado `apply-seo.js` + `sync_course_faq_schema.js`: reprodujo `fotolectura.html` byte por byte, SHA-256 `67ab949c1299912c554f576d9c1aec8be7d50c37d174a5706eb57f59de5c4a4d`;
- suite completa serial `node --test --test-concurrency=1 test/*.test.js`: **285/285 aprobadas** en 16.0 s;
- `git diff --check`: aprobado;
- smoke test local en `127.0.0.1`: demo 180/260 ppm, test completo de tres pasos, ocho respuestas, resultado con advertencias, campos de reserva y carrusel 1/3 → 2/3 operativos.

El smoke se ejecutó con un servidor estático, por lo que `/api/event`, `/api/ip` y `/api/bookings` devolvieron 404/501 esperados; no hubo excepciones de la lógica de página. La suite del servidor cubrió los endpoints y flujos de leads. **CI sigue pendiente** hasta publicar la rama y abrir el PR.

## 10. Riesgos y pendientes

1. **Instructor, modalidad, duración, precio y devoluciones:** faltan datos públicos confirmados. La transparencia actual evita inventarlos, pero limita la riqueza comercial hasta que negocio los publique.
2. **Ficha Emagister:** sigue fuera del control del repositorio y puede continuar alimentando datos antiguos hasta su reclamación.
3. **Variantes `/fotolectura` y `/fotolectura.html`:** GSC muestra ambas; verificar consolidación tras despliegue.
4. **Muestra de GSC pequeña:** no permite conclusiones estadísticas.
5. **Asistentes variables:** una respuesta puntual puede cambiar sin modificación del sitio.
6. **Generadores heredados:** `apply-seo.js` procesa todos los HTML y existe deriva histórica. Las comprobaciones de generación deben aislar Fotolectura o restaurar únicamente cambios producidos por la ejecución.
7. **Testimonios:** el catálogo público sólo tiene tres testimonios verificados y todos son de Robotics; no deben reutilizarse como evidencia de Fotolectura.
8. **Facebook y e-deaprendizaje:** pendientes de verificación manual legítima; no se asumirán como respaldo.
9. **Tagline global heredado:** el footer de 309 HTML afirma “Pioneros en Neuroaprendizaje” y “Transformamos la manera en que Latinoamérica aprende”. No se usó como evidencia y no se modificó en este PR porque su corrección reproducible exige una migración sitewide del template y todos sus artefactos, no una sustitución aislada en Fotolectura. Debe auditarse y sustituirse en un cambio global antes de afirmar que todo el sitio carece de autoridad no demostrada.

## 11. Fuentes principales

- Google, guía para funciones de IA en Search: `https://developers.google.com/search/docs/fundamentals/ai-optimization-guide`
- Google, datos estructurados de cursos: `https://developers.google.com/search/docs/data-types/courses`
- OpenAI, crawlers: `https://developers.openai.com/api/docs/bots`
- Perplexity, crawlers: `https://docs.perplexity.ai/docs/resources/perplexity-crawlers`
- IndexNow, documentación: `https://www.indexnow.org/documentation`
- Rayner et al., revisión sobre lectura rápida: `https://journals.sagepub.com/doi/10.1177/1529100615623267`
- Emagister, ficha auditada: `https://www.emagister.com.mx/curso_devora_libros_curso_fotolectura_lectura_rapida-cursos-2452462.htm`
- e-deaprendizaje, mención no verificable por 403: `https://e-deaprendizaje.com/curso-de-fotolectura-y-lectura-veloz`
- Google Search Console, propiedad: `https://ultravelozmente.com/`
