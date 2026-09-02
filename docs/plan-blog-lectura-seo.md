# Plan: expansión de blog SEO para lectura rápida, fotolectura y lectoescritura

Fecha: 2026-09-02. Objetivo del usuario (cycle 1 del auto-nudge): entradas de blog
mucho más completas y con SEO fuerte, que hablen a fondo del curso de lectura
(Fotolectura) y de Lectoescritura, cubran cada variante de palabra clave buscada
(lectura rápida, comprensión veloz, etc.), incluyan un comparador de cursos que
razone por qué WorldBrain es la opción y sigan produciéndose de forma continua.

## Qué ya existe (auditado antes de escribir nada)

- Pipeline real: `reports/seo/editorial-plan-*.json` (metadatos: id, slug, título,
  keyword, cluster, course_url, imagen) + `content/posts/batch-*.json` (cuerpo:
  description, quick_answer, lead, sections, faq, sources, cta) → `python3
  tools/seo_content/build_html.py` renderiza `blog-{slug}.html` en la raíz con
  cabecera, esquema, CTA determinista por slug y enlazado interno. Reglas de
  contenido obligatorias en `tools/seo_content/CONTENT_CONTRACT.md` (1400-1800
  palabras útiles, 5-7 H2, 3-5 FAQ, nada de "el mejor/garantizado", fuentes
  reales, CTA ≤15-20% del texto).
- `tools/seo_content/build_blog_index.py` regenera `blog-index.html` a partir de
  los mismos PLANS; hay que correrlo tras publicar posts nuevos.
- CTA_ANCHORS en `build_html.py` ya tiene anclas deterministas para `/fotolectura`
  y `/lectoescritura`, así que los posts nuevos de estos clusters heredan el
  patrón sin tocar código.
- Máximo id usado en todos los planes: **1005**. IDs nuevos empiezan en **1006**.
- Ya existen: `blog-fotolectura-que-es-como-funciona.html`,
  `blog-ejercicios-lectura-rapida-comprension.html`,
  `blog-tecnicas-lectura-estudiantes.html`, `blog-velocidad-lectora-*`,
  `blog-leer-rapido-sin-perder-comprension.html`,
  `blog-mejorar-comprension-lectora.html`,
  `blog-plan-cuatro-semanas-habito-lector.html`,
  `blog-comprension-lectora-primaria-por-grados.html`,
  `blog-actividades-lectoescritura-casa.html`,
  `blog-como-ensenar-a-leer-ninos.html`, `blog-dislexia-senales-cuando-evaluar.html`.
  **No** existe un post "comprensión veloz", ni un comparador de cursos de
  lectura rápida, ni cobertura de variantes long-tail (lectura veloz para
  adultos, para exámenes, por edad, mitos, ejercicios oculares, etc.).
- No hay ningún post "comparador de cursos" en todo el sitio (`grep` sobre
  slugs de comparativa da 0 para lectura). El patrón de comparativa que sí
  existe (`universidad-dominical-vs-sabatina-en-linea`,
  `arduino-microbit-scratch-cual-elegir`) compara *opciones genéricas*, no
  proveedores con nombre — importante para no violar la regla de "no atacar
  competidores" del CONTENT_CONTRACT ni inventar datos de terceros.

## Restricción de honestidad (CONTENT_CONTRACT + reglas del proyecto)

El comparador de "cuál es el mejor curso para ti" **no puede** nombrar y
denigrar competidores reales, inventar tablas comparativas con datos que no se
pueden verificar (precios, certificaciones, opiniones de otras escuelas), ni
usar superlativos prohibidos ("el mejor", "garantizado"). La forma honesta de
lograr que "el nuestro aparezca siempre" es:
1. Un cuestionario/checklist de criterios objetivos y verificables por el
   lector (modalidad presencial vs. en línea, edad, objetivo -- velocidad vs.
   comprensión vs. hábito, duración, seguimiento del progreso).
2. Explicar en qué perfil de lector encaja Fotolectura (presencial, niños y
   adolescentes en Cuautitlán Izcalli/Cuernavaca -- coherente con
   `pref.seo_research_evidence` y la restricción geográfica ya aprendida) sin
   fabricar comparaciones con proveedores nombrados.
3. Dar "razones" reales y verificables (metodología, seguimiento, modalidad)
   en vez de afirmaciones de superioridad no sustentadas.

## Clusters y slugs planeados (lote 1, ids 1006-1015)

Cluster `fotolectura` (course_url `/fotolectura`) salvo donde se indique:

1. `comprension-veloz-que-es` — "Comprensión veloz: qué es y en qué se diferencia de leer rápido sin entender" (informacional, cubre la keyword literal del usuario)
2. `lectura-rapida-adultos-guia` — "Lectura rápida para adultos: guía práctica sin promesas irreales"
3. `como-elegir-curso-lectura-rapida` — **comparador**: checklist de criterios para elegir curso de lectura rápida/fotolectura (investigación-comercial)
4. `mitos-lectura-rapida` — "Mitos y verdades sobre la lectura rápida" (informacional, ataca desinformación común, refuerza autoridad)
5. `ejercicios-oculares-lectura-rapida` — técnica de movimiento ocular y fijaciones
6. `lectura-rapida-examenes-estudio` — lectura veloz aplicada a estudiar para examen
7. `comprension-lectora-vs-velocidad-lectora` — diferencia entre ambas variables (cubre "comprensión veloz" desde otro ángulo)
8. `fotolectura-por-edades` — a qué edad conviene, señales de preparación (cluster fotolectura)
9. `senales-necesitas-mejorar-lectura` — señales de que un niño/adulto necesita trabajar velocidad o comprensión (top-of-funnel)
10. `lectoescritura-vs-fotolectura-diferencias` — cluster mixto: explica que son cursos distintos con objetivos distintos (niños que aprenden a leer/escribir vs. jóvenes/adultos que ya leen y quieren velocidad/comprensión), enlaza a ambos cursos

Cada slug cubre una variante de keyword distinta (lectura rápida, comprensión
veloz, técnicas de lectura, ejercicios oculares, por edad, mitos, comparador)
para maximizar la superficie de coincidencia de búsqueda sin canibalizar: se
verificará solape de keyword principal contra los posts ya existentes antes de
cerrar cada uno (mismo método que `cobertura-consultas.json` del proyecto IPN:
cruzar variantes de texto, no solo título).

## Método de producción (por ciclo de auto-nudge, 1 post cada 1-2 ciclos)

1. Escribir entrada en `reports/seo/editorial-plan-lectura-2026-09.json` (metadatos).
2. Escribir contenido completo en `content/posts/batch-lectura-2026-09-NNN.json`
   siguiendo el contrato al pie de la letra (1400-1800 palabras, 5-7 H2, FAQ,
   fuentes reales o quitar la sección si no hay fuente verificable).
3. Ejecutar `python3 tools/seo_content/build_html.py` y confirmar en la salida
   que el nuevo id aparece en "renderizables" y que no hay `orphan_content`.
4. Ejecutar `python3 tools/seo_content/build_blog_index.py` para que el post
   aparezca listado.
5. Verificar conteo de palabras con el mismo método que usa `build_html.py`
   (`word_count_of`) antes de dar el post por cerrado, porque la lección
   aprendida del proyecto es que los primeros borradores caen en 60-70% del
   mínimo.
6. Registrar avance en memoria semántica (`project.ultravelozmente.*`) al
   cerrar cada lote, no solo al final.

## Fuentes permitidas para citar (sin inventar estudios)

Solo citar: velocidad de lectura promedio en adultos (rangos ampliamente
documentados en manuales de lectura, sin atribuir cifra exacta a un estudio que
no se ha verificado), principios de comprensión lectora de organismos
educativos públicos (SEP, si aplica), y explicaciones metodológicas genéricas
de fijación ocular / subvocalización que son de dominio público en didáctica de
la lectura. Si en el momento de escribir un post no se puede verificar una
fuente concreta, se omite la sección `sources` de ese post en vez de fabricarla
— regla ya aprendida en el proyecto IPN.

## Estado

- [x] Auditoría del pipeline existente y huecos de cobertura (este documento).
- [x] Lote 1 (ids 1006-1015): 10 de 10 posts escritos, construidos y verificados.
  - 1006 comprension-veloz-que-es (1579 palabras)
  - 1007 lectura-rapida-adultos-guia (1498 palabras)
  - 1008 como-elegir-curso-lectura-rapida — comparador (1495 palabras)
  - 1009 mitos-lectura-rapida (1547 palabras)
  - 1010 ejercicios-oculares-lectura-rapida (1506 palabras)
  - 1011 lectura-rapida-examenes-estudio (1508 palabras)
  - 1012 comprension-lectora-vs-velocidad-lectora (1514 palabras)
  - 1013 fotolectura-por-edades (1532 palabras)
  - 1014 senales-necesitas-mejorar-lectura (1405 palabras)
  - 1015 lectoescritura-vs-fotolectura-diferencias — cierre mixto (1484 palabras)
- [x] Regenerar `blog-index.html` tras cada lote (273 tarjetas al cierre del lote 1, desde 264 al inicio).
- [ ] Lotes siguientes: cluster Lectoescritura a fondo (variantes: cómo enseñar
      a leer y escribir, dislexia, edad para aprender a leer, actividades por
      grado) — pendiente de planear en detalle tras cerrar el lote 1.
- [ ] Nota operativa para lotes futuros: verificar conteo de palabras ANTES de
      dar un post por cerrado, no después. En este lote, 6 de 10 posts
      quedaron por debajo del mínimo de 1400 en el primer borrador (rango
      1255-1368) y necesitaron una sección adicional sustantiva, confirmando
      la lección ya registrada en memoria semántica del proyecto
      (`project.ultravelozmente.content_generation_lesson`).

## Lote 2: cluster Lectoescritura a fondo (ids 1016+)

Auditado 2026-09-02, cycle 12. Cobertura existente real de Lectoescritura (no
solo menciones de enlace interno, confirmado con grep de conteo alto):
`blog-actividades-lectoescritura-casa.html` (44 menciones reales),
`blog-dislexia-senales-cuando-evaluar.html` (28), `blog-comprension-lectora-primaria-por-grados.html`
(14), `blog-como-ensenar-a-leer-ninos.html` (9), `blog-plan-cuatro-semanas-habito-lector.html`
(8), más el cierre mixto `blog-lectoescritura-vs-fotolectura-diferencias.html` (60,
del lote 1). El resto de coincidencias del grep son menciones de enlazado
interno de 1-4 apariciones en posts de otros temas, no cobertura real.

Huecos identificados para lote 2 (evitando duplicar los 5 posts reales de
arriba):

1. `senales-listo-para-aprender-a-leer` — señales de preparación (no edad
   rígida) para EMPEZAR el proceso de lectoescritura, paralelo conceptual al
   post 1013 de fotolectura pero para la etapa anterior (aprender desde cero,
   no optimizar). No existe post propio con este ángulo específico.
2. `metodo-fonetico-vs-global-lectoescritura` — comparativa metodológica
   (síntesis fonética vs. método global/whole language) con criterios
   objetivos, siguiendo el mismo patrón de honestidad sin superlativos que el
   comparador de cursos del lote 1.
3. `errores-comunes-ensenar-a-leer-ninos` — complementa
   `blog-como-ensenar-a-leer-ninos.html` (que explica CÓMO hacerlo) con el
   ángulo inverso: qué NO hacer (presionar, comparar con hermanos, saltar
   sílabas). Verificar antes de escribir que no canibaliza el post existente.
4. `escritura-a-mano-vs-teclado-ninos` — variante de búsqueda sobre si enseñar
   trazo a mano sigue siendo relevante en la era de tablets/teclados.
5. `cuentos-para-practicar-lectura-en-casa` — recurso práctico de actividad
   con libros/cuentos, distinto de `actividades-lectoescritura-casa` (que ya
   cubre actividades generales) al enfocarse específicamente en QUÉ leer, no
   en ejercicios de escritura o trazo.

Cada post de este lote debe verificar overlap real de keyword contra los 5
posts existentes ANTES de escribirse (mismo método de grep de conteo alto
usado en esta auditoría), no solo contra el título.

### Estado del lote 2

- [x] 1016 senales-listo-para-aprender-a-leer (1482 palabras)
- [x] 1017 metodo-fonetico-vs-global-lectoescritura (1433 palabras)
- [x] 1018 errores-comunes-ensenar-a-leer-ninos (1413 palabras)
- [x] 1019 escritura-a-mano-vs-teclado-ninos (1445 palabras)
- [x] 1020 cuentos-para-practicar-lectura-en-casa (1428 palabras)

Lote 2 completo: 5 de 5 posts escritos, construidos sin `orphan_content` y
verificados por palabra. Plan registrado en
`reports/seo/editorial-plan-lectoescritura-2026-09.json` (registrado en la
tupla PLANS de `build_html.py` y `build_blog_index.py`, requisito documentado
en `project.ultravelozmente.blog_pipeline_end_to_end`). `blog-index.html`
pasó de 273 tarjetas (cierre del lote 1) a 278 al cierre del lote 2.

Total acumulado de esta sesión: **14 posts nuevos** (1006-1020, cubriendo
lectura rápida, comprensión veloz, comparador de cursos y el clúster
Lectoescritura), sitio pasó de 264 a 278 entradas de blog.

Pendiente para una sesión futura: seguir produciendo lotes nuevos por
petición explícita del usuario ("que sean siempre nuevas entradas al blog"),
auditando cobertura real antes de cada lote nuevo con el mismo método usado
aquí, y verificando conteo de palabras ANTES de construir cada post.

## Lote 3 (ids 1021+)

Auditado 2026-09-02, cycle 4 del bucle continuado. Confirmado que
`blog-comprension-lectora-primaria-por-grados.html` cubre 1º-5º de primaria
(sus 5 H2 son por grado escolar) y no llega a secundaria/adultos. Ningún post
del sitio cubre comprensión lectora en secundaria específicamente.

1. `comprension-lectora-secundaria` — comprensión lectora para adolescentes de
   secundaria: texto más denso, lectura crítica, identificar sesgo y postura
   del autor (distinto del nivel primaria ya cubierto).

### Estado del lote 3

- [x] 1021 comprension-lectora-secundaria (1422 palabras). Plan registrado en
  `reports/seo/editorial-plan-lectoescritura-secundaria-2026-09.json`
  (registrado en la tupla PLANS de ambos scripts). `blog-index.html` pasó de
  278 a 279 tarjetas.

Total acumulado tras el lote 3: **15 posts nuevos** (1006-1021) desde el
inicio de este objetivo, sitio pasó de 264 a 279 entradas de blog.

## Lote 4 (ids 1022+)

Auditado 2026-09-02, cycle 5. Hueco identificado: ningún post conecta
fotolectura/lectura rápida con dislexia o dificultades de lectura, pese a
que ambos clústeres (fotolectura y lectoescritura/dislexia) existen por
separado. Es contenido sensible (salud/aprendizaje) -- debe seguir la regla
del CONTENT_CONTRACT de no diagnosticar y remitir a profesionales cuando
corresponda, no afirmar que el curso "cura" ni "mejora" dislexia.

1. `fotolectura-nino-dificultad-lectura` — si un niño con dificultad de
   lectura (o dislexia diagnosticada) puede beneficiarse de entrenamiento de
   eficiencia lectora, con matices honestos: distinto de "curar" o
   "compensar" la dificultad, remite a evaluación profesional si no hay
   diagnóstico previo.

### Estado del lote 4

- [x] 1022 fotolectura-nino-dificultad-lectura (1408 palabras). Contenido
  sensible verificado: no diagnostica, no promete que el curso ayuda con
  dislexia diagnosticada, distingue lentitud por hábito de dificultad de
  base y remite a evaluación profesional en ambos sentidos (antes de
  inscribir sin diagnóstico previo, y coordinando con el profesional si ya
  hay diagnóstico). Plan registrado en el mismo archivo del lote 3
  (`editorial-plan-lectoescritura-secundaria-2026-09.json`). `blog-index.html`
  pasó de 279 a 280 tarjetas.
- [x] 1023 lectura-rapida-para-trabajo-reportes (1413 palabras). Aplicación
  práctica al contexto laboral (triaje de correo, escaneo de reportes),
  distinto de blog-lectura-rapida-adultos-guia.html que cubre metodología
  de entrenamiento en general. `blog-index.html` pasó de 280 a 281 tarjetas.

Total acumulado tras el lote 4: **17 posts nuevos** (1006-1023) desde el
inicio de este objetivo, sitio pasó de 264 a 281 entradas de blog.

## Verificación técnica de SEO tras el lote 4 (cycle 7)

Antes de seguir generando volumen, se verificó la infraestructura técnica
que soporta las 18 entradas nuevas (1006-1023):

- **Sitemap**: NO es un archivo estático; `server.js` lo genera dinámicamente
  en `/sitemap.xml` escaneando el sistema de archivos por `blog-*.html`
  (excluyendo backups/-old), con caché de 1h invalidada al crear un post.
  `lastmod` sale de la fecha de modificación real del archivo, no de la hora
  de build. Los 18 posts entran automáticamente sin ningún paso adicional.
- **Enlazado interno**: los 18 posts NO tenían el campo `related` (que
  `build_html.py` sí soporta desde antes), así que no cruzaban enlaces entre
  ellos más allá de aparecer en `blog-index.html`. Se añadieron 4 slugs
  `related` por post, deliberadamente mapeados dentro de cada clúster
  (fotolectura entre sí, lectoescritura entre sí, con puentes en los posts
  mixtos). Verificado con `test/enlaces-internos.test.js` (0 enlaces rotos
  en las 282 páginas del sitio tras el cambio).
- **HALLAZGO CRÍTICO**: colisión de `id` 1021 entre
  `content/posts/batch-lectura-2026-09-1021.json` (post
  "que-curso-lectura-elegir-segun-objetivo", un comparador ampliado por
  objetivo ya escrito en una sesión previa a este contexto, nunca antes
  construido a HTML) y `content/posts/batch-lectoescritura-secundaria-2026-09-1021.json`
  (mi propio post "comprension-lectora-secundaria" de este lote). Como
  `load_content()` en `build_html.py` indexa por `id` en un diccionario,
  el archivo que carga después silenciosamente sobrescribía el cuerpo del
  otro bajo el nombre de archivo equivocado -- `blog-comprension-lectora-secundaria.html`
  llevaba el contenido de "qué curso elegir" en vez del suyo, y
  "que-curso-lectura-elegir-segun-objetivo" nunca se había construido en
  absoluto. RESUELTO: renumerado a id 1024 (plan y contenido, archivo
  renombrado a `batch-lectura-2026-09-1024.json`), ambos posts ahora
  construyen correctamente. `blog-index.html` pasó a 282 tarjetas.
- **Lección para el pipeline**: los ids nuevos deben verificarse contra
  TODOS los archivos `content/posts/batch-*.json` existentes (no solo contra
  los planes conocidos de la sesión actual), porque un lote puede colisionar
  con contenido de una sesión anterior que use un rango de ids adyacente.
- **Barrido adicional (cycle 8)**: se comprobaron duplicados de SLUG (no solo
  de id) en todos los `editorial-plan-*.json`. Se encontró una entrada de
  metadatos duplicada para el id 1020 dentro del propio
  `editorial-plan-lectoescritura-2026-09.json` (dos objetos con el mismo id
  y slug, título ligeramente distinto) -- sin impacto en producción porque
  `load_plan()` indexa por id en un diccionario y la entrada más reciente
  gana silenciosamente, verificado comparando el HTML servido con el
  contenido real. Se eliminó la entrada obsoleta. Aparte de esto, el resto
  de duplicados de slug detectados (~170, todos con el mismo id en
  `editorial-plan-500-posts.json` y `editorial-plan-pilot-10.json`) son de
  una sesión anterior a este objetivo y parecen un piloto reflejado
  intencionalmente en el plan de 500 -- fuera del alcance de esta
  verificación, no se tocaron.
