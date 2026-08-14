# Auditoría SEO del lote nacional/internacional — 2026-08-14

## 1. Resumen ejecutivo

**Alcance exacto:** comparación `748406c92756f444df56b699a10ce849030f297c..961dfd0e44f6638820fd40301196e6ad4959d32e`, correspondiente al merge de [PR #30](https://github.com/DanielAguilarJ/ultravelozmentee/pull/30).

**Veredicto:** el lote es publicable y técnicamente indexable después de las correcciones de esta auditoría. No se encontró un bloqueo de rastreo, canonicalización, schema, respuesta HTTP, sitemap o seguridad. Sí se comprobaron y corrigieron dos defectos:

1. **`lastmod` falso en el sitemap (prioridad alta):** los generadores reescribían 263 HTML, `blog-index.html` y `data/posts.json` aunque el contenido fuera idéntico. Como `server.js` usa el `mtime` del archivo, cada regeneración podía simular cientos de actualizaciones editoriales.
2. **Tres fuentes editoriales no disponibles (prioridad media):** un dominio no resolvía y dos URLs devolvían 404. Se sustituyeron por fuentes vigentes, relevantes y verificadas.

También se documentaron, sin cambiar silenciosamente el funnel, dos cross-sells del lote: Soroban → recurso de FastKids y técnicas de estudio → recurso de Fotolectura. La revisión global descubrió **146** diferencias entre el CTA principal del artículo y el CTA interno de su PDF; **2 son de este lote y 144 son heredadas**. Es un backlog separado, no una razón para inventar o sustituir 144 ofertas dentro de esta corrección.

**Riesgo operativo pendiente:** a las 2026-08-14, Google todavía no había rastreado ninguna de las cinco URLs (`URL is unknown to Google`, `Last crawled: Never`). Se publicaron minutos antes de la inspección y no se halló un defecto técnico que explique ese estado. Debe monitorizarse tras desplegar estas correcciones.

## 2. Alcance e inventario del merge

Commit anterior:

- `748406c92756f444df56b699a10ce849030f297c`
- 2026-08-14T15:34:30+02:00
- `Merge pull request #29 from DanielAguilarJ/feat/seo-local-robotica-faq-cursos`

Merge auditado:

- `961dfd0e44f6638820fd40301196e6ad4959d32e`
- 2026-08-14T16:06:21+02:00
- `Merge pull request #30 from DanielAguilarJ/feat/seo-nacional-internacional`

Magnitud exacta: **15 archivos, 4,839 inserciones y 14 eliminaciones**.

Archivos nuevos:

- `blog-comprension-lectora-primaria-por-grados.html`
- `blog-ejercicios-lectura-rapida-comprension.html`
- `blog-ejercicios-soroban-principiantes.html`
- `blog-primer-lenguaje-programacion-ninos.html`
- `blog-tecnicas-estudio-secundaria.html`
- `content/posts/batch-national-international-01.json`
- `reports/seo/editorial-plan-national-international.json`
- `reports/seo/research-national-international-2026-08-14.md`
- `test/national-international-content.test.js`

Archivos modificados:

- `blog-index.html`
- `data/posts.json`
- `test/cta-anchors.test.js`
- `tools/inject_lead_magnet.py`
- `tools/seo_content/build_blog_index.py`
- `tools/seo_content/build_html.py`

## 3. Metodología y fuentes de evidencia

Todas las señales se consultaron el **2026-08-14**. No se atribuyeron volúmenes, tendencias ni rankings no observados.

| Señal | Fuente | Ventana o fecha | Uso y limitación |
|---|---|---|---|
| Rendimiento orgánico | Google Search Console, propiedad `https://ultravelozmente.com/` | 2026-05-15 a 2026-08-12; consulta 2026-08-14 | Impresiones, posición y combinaciones consulta/página/país observadas; no equivale a volumen total de búsqueda. |
| Indexabilidad real | GSC URL Inspection | 2026-08-14 | Estado de las cinco URLs en el índice de Google; inspección de índice, no prueba en vivo. |
| Demanda sugerida | Google Autocomplete México (`hl=es`, `gl=mx`) | 2026-08-14 | Confirma formulaciones que Google sugiere; no aporta volumen ni crecimiento. |
| Tendencias | [Documentación oficial de Google Trends API](https://developers.google.com/search/apis/trends) | consultada 2026-08-14 | La API está en alpha y requiere acceso. No se obtuvieron ni inventaron series. |
| Estimaciones de terceros | Semrush | verificadas 2026-08-14 | Conservadas con su metodología y limitaciones en `reports/seo/research-national-international-2026-08-14.md`; no se presentan como datos oficiales de Google. |
| Producción | HTTP con navegador simulado, `robots.txt`, `sitemap.xml` y cabeceras | 2026-08-14 | Comprueba disponibilidad e indexabilidad técnica actual. |
| Fuentes editoriales | Comprobación HTTP automatizada de 15 URLs | 2026-08-14 | Un 403 de automatización no se clasificó como enlace roto sin evidencia adicional. |
| Rendimiento sintético | PageSpeed Insights API | 2026-08-14 | Artículo nuevo e índice devolvieron HTTP 429. No hay puntuaciones PSI válidas. |
| Calidad local | Suite Node, gates, auditor SEO y pruebas de idempotencia | 2026-08-14 | Valida artefactos del repositorio; no sustituye datos de usuarios reales o Core Web Vitals. |

## 4. Demanda por intención

### 4.1 Ejercicios de lectura rápida con comprensión

- **GSC (2026-05-15 a 2026-08-12):** 38 combinaciones consulta/página/país relacionadas con lectura.
- `curso de lectura rapida`: 10 impresiones en México, posición media 1.8.
- `lectura rapida`: 8 impresiones en México, posición media 5.
- `fotolectura`: 55 impresiones en México sobre `/fotolectura.html`, además de señales en Argentina, España, Estados Unidos, Colombia, Chile y otros países.
- **Autocomplete México (2026-08-14):** devolvió `ejercicios de lectura rapida`, `ejercicios de lectura rapida y comprensiva` y variantes para secundaria, adultos y niños.
- **Conclusión:** demanda de categoría y long-tail confirmada. No se infiere volumen mensual.

### 4.2 Ejercicios de Soroban para principiantes

- **GSC (2026-05-15 a 2026-08-12):** 25 combinaciones relacionadas con Soroban/ábaco, repartidas entre `/blog-abaco-soroban-que-es` y `/mathekids`.
- Países observados: México, Chile, Perú, Colombia, Costa Rica, Ecuador, España, Francia y Estados Unidos.
- **Autocomplete México (2026-08-14):** `ejercicios de soroban`, `ejercicios de soroban para imprimir` y `ejercicios soroban pdf`.
- **Conclusión:** intención informativa y comercial demostrada; la nueva guía amplía el clúster sin reemplazar la pieza “qué es”.

### 4.3 Primer lenguaje de programación para niños

- **GSC (2026-05-15 a 2026-08-12):** 7 combinaciones de cursos/programación para niños en México que antes aterrizaban principalmente en la portada.
- **Autocomplete México (2026-08-14):** la long-tail exacta `primer lenguaje de programacion para ninos` no devolvió sugerencias. La base `programacion para niños` sí devolvió primaria, Scratch, online y edades 4–6, 5 y 10 años.
- **Conclusión:** demanda base confirmada y URL informativa específica justificada. No se atribuye demanda propia a la long-tail exacta.

### 4.4 Comprensión lectora en primaria por grados

- **GSC (2026-05-15 a 2026-08-12):** no hubo filas para consultas que contuvieran `comprensi`.
- **Autocomplete México (2026-08-14):** la long-tail exacta no apareció, pero `comprension lectora primaria` devolvió grados 1, 2, 3 y 5, PDF y segundo grado.
- **Conclusión:** demanda de categoría/grado confirmada sólo por Autocomplete; sin señal propia de GSC ni volumen atribuible.

### 4.5 Técnicas de estudio para secundaria

- **GSC (2026-05-15 a 2026-08-12):** no hubo filas para consultas que contuvieran `estudio`.
- **Autocomplete México (2026-08-14):** devolvió `tecnicas de estudio para secundaria` y variantes PDF, actividades, matemáticas y taller.
- **Conclusión:** long-tail confirmada por Autocomplete, todavía sin señal propia en GSC.

## 5. Revisión individual de contenidos

Los conteos de palabras son aproximados y se calcularon sobre lead, respuesta rápida, secciones y FAQ del JSON editorial, excluyendo navegación y plantilla.

| ID / artículo | Palabras | Secciones | FAQ | Fuentes | Relacionados | CTA principal | Evaluación |
|---|---:|---:|---:|---:|---:|---|---|
| 1001 · lectura rápida | 1,504 | 8 | 5 | 3 | 3 | `/fotolectura` | Rutina accionable, controles de comprensión y medición; cubre intención sin prometer velocidad garantizada. |
| 1002 · Soroban | 1,580 | 9 | 5 | 2 | 3 | `/mathekids` | Progresión desde lectura de cuentas a complementos y resta; fuentes rotas sustituidas por institución japonesa y revisión científica. |
| 1003 · programación | 1,547 | 9 | 5 | 4 | 3 | `/robotics` | Compara Scratch, Python, JavaScript y Arduino por etapa/proyecto; fuentes oficiales de cada tecnología. |
| 1004 · comprensión primaria | 1,493 | 9 | 5 | 3 | 3 | `/lectoescritura` | Organiza por nivel y no presenta los grados como fronteras rígidas; usa guías IES y marco PISA. |
| 1005 · técnicas de estudio | 1,534 | 9 | 5 | 3 | 4 | `/memoria-prodigiosa` | Diferencia técnicas por materia y semana; Cambridge roto sustituido por su recurso vigente. |

Comprobaciones comunes:

- Un único H1 coherente con la intención.
- Canonical absoluto a la URL limpia y sin `.html`.
- Descripción única; longitudes observadas: 151–170 caracteres.
- Títulos HTML con marca: 75–85 caracteres. La keyword está al inicio, pero algunos title links pueden truncarse visualmente; es una optimización de CTR a medir, no un defecto de indexación ni un límite rígido de Google.
- FAQ visible y `FAQPage` con las mismas cinco preguntas/respuestas.
- `BlogPosting`, `WebPage`, `WebSite`, `BreadcrumbList`, organización y autor presentes; `datePublished`/`dateModified` = `2026-08-14`.
- Imagen local con dimensiones reales, canonical, `mainEntityOfPage`, autor y fecha.
- CTA comercial y destinos existentes.
- Tres o cuatro enlaces internos relacionados por artículo.

## 6. SEO técnico e indexabilidad

### 6.1 Producción

Las cinco URLs respondieron **HTTP 200**, sin redirección, el 2026-08-14:

| URL corta | Bytes | Tiempo observado |
|---|---:|---:|
| lectura rápida | 44,377 | 0.279 s |
| Soroban | 43,612 | 0.253 s |
| programación | 44,638 | 0.268 s |
| comprensión primaria | 44,492 | 0.264 s |
| técnicas de estudio | 44,849 antes de la corrección de fuente | 0.262 s |

Además:

- `Content-Type: text/html; charset=UTF-8`.
- `X-Robots-Tag: index, follow, max-image-preview:large`.
- `robots.txt` permite rastreo.
- Las cinco URLs aparecen en `https://ultravelozmente.com/sitemap.xml`.
- El lector web automatizado recibió 403, pero peticiones con navegador simulado obtuvieron 200; se clasificó como bloqueo del bot, no caída del sitio.
- Todas las URLs del sitemap respondieron 200 sin redirección durante la suite local contra el servidor.

### 6.2 Estado real en Google

GSC URL Inspection (2026-08-14), para las cinco URLs:

- `URL is unknown to Google`.
- `Last crawled: Never`.
- `Verdict: NEUTRAL`.

Interpretación: publicación demasiado reciente para concluir un problema. Acción: inspeccionar de nuevo a 3, 7 y 14 días después del despliegue y revisar cobertura del sitemap si el estado no cambia.

### 6.3 Defecto corregido: `lastmod` falso

Causa:

- `tools/seo_content/build_html.py` hacía `write_text` para los 263 posts en cada ejecución.
- `tools/seo_content/build_blog_index.py` reescribía siempre `blog-index.html` y `data/posts.json`.
- `server.js` deriva `lastmod` de `fs.statSync(...).mtime`.

Impacto: un build sin cambios podía anunciar a buscadores cientos de modificaciones inexistentes. La idempotencia por contenido era correcta, pero la señal temporal del sitemap no.

Corrección:

- Escritura sólo cuando el texto nuevo difiere del existente.
- Prueba de regresión sobre `mtimeNs`.
- Dos ejecuciones consecutivas sobre 276 objetivos: **0 cambios de SHA-256 y 0 cambios de `mtimeNs` en ambas ejecuciones**.

## 7. Fuentes editoriales

### 7.1 Inventario auditado

| Artículo | Fuente | Resultado automatizado 2026-08-14 |
|---|---|---|
| 1001 | Rayner et al., SAGE | 403 de automatización; no clasificada como rota. |
| 1001 | Reading Rockets, Fluency | 200. |
| 1001 | IES Practice Guide 14 | 200. |
| 1002 | Liga Japonesa de Ábaco, Soroban | 200 a las 14:32:21Z. |
| 1002 | Wang, revisión sobre entrenamiento con ábaco (PubMed 32982681) | 2xx; 203 al cliente automatizado a las 14:32:21Z. |
| 1003 | Scratch | 200. |
| 1003 | Python | 200. |
| 1003 | MDN JavaScript | 200. |
| 1003 | Arduino Language Reference | 200. |
| 1004 | IES Practice Guide 21 | 200. |
| 1004 | IES Practice Guide 29 | 200. |
| 1004 | OECD PISA Reading Framework | 403 de automatización; no clasificada como rota. |
| 1005 | Dunlosky et al., SAGE | 403 de automatización; no clasificada como rota. |
| 1005 | Cepeda et al., DOI | 403 de automatización; no clasificada como rota. |
| 1005 | Cambridge International, Study resources | 200 a las 14:32:21Z. |

### 7.2 Tres fallos comprobados y sustituciones

| URL defectuosa | Fallo | Sustitución verificada |
|---|---|---|
| `https://ligaabaco.com/que-es-el-soroban/` | Dominio no resoluble. | `https://www.shuzan.jp/english/`, fuente institucional de la Liga Japonesa de Ábaco. |
| `https://doi.org/10.1016/0010-0277(77)90011-3` | 404. | `https://pubmed.ncbi.nlm.nih.gov/32982681/`, revisión de Wang sobre evidencia cognitiva y neural. |
| URL antigua de Cambridge `/teaching-cambridge-at-your-school/study-skills/` | 404. | Página vigente `/learning-with-lasting-impact/study-resources/`. |

La redacción de Soroban se mantuvo prudente: “posibles efectos”, no garantía cognitiva ni causalidad universal.

## 8. Lead magnets y coherencia comercial

| Artículo | CTA principal | Recurso | CTA dentro del PDF | Estado |
|---|---|---|---|---|
| lectura rápida | Fotolectura | guía de técnicas de estudio | Fotolectura | Alineado. |
| Soroban | MatheKids | guía de estimulación temprana | FastKids | Cross-sell documentado; falta guía específica de MatheKids. |
| programación | Robotics | guía de robótica educativa | Robotics | Alineado. |
| comprensión primaria | Lectoescritura | guía de lectoescritura | Lectoescritura | Alineado. |
| técnicas de estudio | Memoria Prodigiosa | guía de técnicas de estudio | Fotolectura | Cross-sell documentado; falta variante de Memoria Prodigiosa. |

Decisión de auditoría:

- No se cambiaron los dos funnels sin datos de conversión ni PDF específico disponible.
- Se revisó el contenido fuente de ambos PDF y se confirmó su CTA real.
- `tools/lead_magnets/catalog.json` declara las dos excepciones bajo `national-international-01`.
- Una prueba compara HTML publicado, CTA principal, recurso y curso del catálogo; rechaza excepciones ausentes, obsoletas o desactualizadas.
- Se retiró del inyector el claim falso de coherencia comercial universal.

Hallazgo fuera del lote: el escaneo de todos los HTML detectó **146** diferencias CTA artículo/PDF. Descontando estas dos, quedan **144 heredadas**. Recomendación: auditarlas por familia de contenido y decidir con negocio entre PDF específico, cross-sell aprobado o cambio de CTA; no registrar 144 excepciones mecánicamente.

## 9. Rendimiento y peso

### 9.1 Artículos

| Artículo | HTML | Gzip nivel 9 local |
|---|---:|---:|
| lectura rápida | 44,377 B | 11,771 B |
| Soroban | 43,612 B | 11,372 B |
| programación | 44,638 B | 11,728 B |
| comprensión primaria | 44,492 B | 11,683 B |
| técnicas de estudio corregido | 44,868 B | 11,893 B |

Los tiempos HTTP de 0.253–0.279 s son observaciones de respuesta, **no Core Web Vitals**.

### 9.2 Índice del blog frente a `748406c9`

| Métrica | Antes | Después | Delta |
|---|---:|---:|---:|
| HTML sin comprimir | 344,299 B | 350,182 B | +5,883 B (+1.7%) |
| Gzip nivel 9 | 35,324 B | 36,144 B | +820 B (+2.3%) |
| Ocurrencias de tarjeta `.ed-card` | 269 | 274 | +5 |

El coste marginal del lote es pequeño comprimido. Aun así, el índice monolítico seguirá creciendo; no se justifica paginar por sólo +820 B, pero conviene definir un umbral futuro basado en LCP/INP reales y tamaño transferido.

### 9.3 PageSpeed Insights

Intentos móviles sobre:

- `https://ultravelozmente.com/blog-ejercicios-lectura-rapida-comprension`
- `https://ultravelozmente.com/blog-index`

Resultado: HTTP 429 de la API en ambos casos. No se inventaron ni reutilizaron puntuaciones antiguas. Reintentar cuando haya cuota o consultar datos de campo de CrUX si existen.

## 10. Pipeline y reproducibilidad

Flujo verificado:

1. Metadatos: `reports/seo/editorial-plan-national-international.json`.
2. Contenido editorial: `content/posts/batch-national-international-01.json`.
3. Render: `tools/seo_content/build_html.py`.
4. Índice/feed: `tools/seo_content/build_blog_index.py`.
5. Lead magnets: catálogo + selector compartido en `tools/inject_lead_magnet.py`.
6. HTML publicados en raíz.
7. Sitemap dinámico de `server.js`.

Invariantes comprobadas:

- Los cinco IDs, slugs y keywords no colisionan con otros planes.
- El generador integra el plan nuevo y produce la intersección plan/contenido.
- Índice y `data/posts.json` incluyen el lote.
- HTML regenerado coincide con fuente JSON.
- Canonical, FAQ, schema, CTA y lead magnet se conservan.
- La segunda y tercera ejecución no modifican bytes ni `mtime`.

## 11. Validación final

| Validación | Resultado |
|---|---|
| `npm run build` | Correcto; el proyecto declara explícitamente que Express sirve estáticos sin build. |
| `node --test --test-concurrency=1 test/*.test.js` | **272/272 pass**, 0 fail. |
| `./check.sh` | **9/9 gates**; éxito. Emitió avisos preexistentes de claims/imagen, no fallos y ninguno de los cinco artículos nuevos quedó señalado. |
| `npm run seo:audit` | Correcto; **311 archivos revisados**. Mismos avisos no bloqueantes del gate. |
| Generadores, ejecución 1 | 276 objetivos; 0 cambios de checksum, 0 cambios de `mtimeNs`. |
| Generadores, ejecución 2 | 276 objetivos; 0 cambios de checksum, 0 cambios de `mtimeNs`. |
| `git diff --check` | Correcto. |
| Fuentes sustitutas | 200 / 2xx / 200 el 2026-08-14. |

## 12. Priorización y siguientes acciones

### P0 — antes o inmediatamente después del despliegue

1. Fusionar y desplegar las correcciones de fuentes e idempotencia.
2. Confirmar en producción que los dos HTML regenerados muestran las URLs nuevas.
3. Volver a inspeccionar las cinco URLs en GSC y solicitar indexación sólo después del despliegue estable.

### P1 — seguimiento de 3 a 14 días

1. Registrar `Last crawled`, estado de indexación e impresiones a 3, 7 y 14 días.
2. Si siguen desconocidas a 14 días, revisar sitemap procesado, logs de Googlebot y canonical seleccionada por Google antes de reescribir contenido.
3. Auditar las 144 desalineaciones heredadas de lead magnets por familia y con decisión comercial explícita.

### P2 — optimización basada en datos

1. Reintentar PageSpeed/CrUX y actuar sólo sobre métricas reales.
2. Medir CTR antes de acortar títulos de 75–85 caracteres; la keyword ya está al inicio y no existe un límite de caracteres oficial.
3. Crear PDF específico de MatheKids y variante de Memoria Prodigiosa si negocio decide eliminar los dos cross-sells del lote.

## 13. Limitaciones

- No hubo acceso a series propias de Google Trends; la API oficial está en alpha restringida.
- PageSpeed Insights no entregó resultados por cuota (429).
- Los 403 de SAGE/OECD/DOI se trataron como bloqueo de automatización, no como enlaces rotos.
- GSC todavía no tenía rastreo de las URLs por su publicación reciente.
- Los datos Semrush son estimaciones de terceros y permanecen identificados como tales en el informe de investigación.
- Esta auditoría corrige el lote `748406c9..961dfd0e`; los 144 cross-sells heredados requieren un proyecto separado para no mezclar alcance ni alterar funnels sin aprobación.
