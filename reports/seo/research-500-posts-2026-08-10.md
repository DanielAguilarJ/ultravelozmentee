# Investigación editorial — 500 posts SEO 2026

## Gap frente a los 71 posts existentes

Los 60 posts recientes (`editorial-plan-60-posts.json`) ya cubren 10 clusters
curso-específicos: universidad dominical, fotolectura, mathekids, robótica,
admisión universitaria, regularización, homeschool/lectoescritura, memoria
prodigiosa, fastkids (inglés), alfa-cash/grandes líderes. Los 11 posts legacy
(`blog-1`…`blog-11`) tocan temas generales una sola vez cada uno, sin
profundidad ni series.

Para 500 posts nuevos sin duplicar esos 10 clusters, se eligen **10 clusters
amplios y generales** — el tipo de tema que el usuario pidió explícitamente
(metodologías de aprendizaje, productividad estudiantil, tecnología educativa,
habilidades blandas, desarrollo profesional, crianza, neurociencia) — cada uno
con 50 posts y conectado a 1–3 cursos reales por afinidad temática, no forzada.

## Los 10 clusters nuevos (IDs 61–560, 50 posts cada uno)

| # | Cluster (slug) | Categoría visible | Ángulo | Cursos destino (CTA rotado) | Imagen |
|---|---|---|---|---|---|
| 1 | `metodologias-aprendizaje` | Metodologías de Aprendizaje | Técnicas de estudio basadas en evidencia (repetición espaciada, recuerdo activo, Pomodoro, Cornell) | fotolectura, memoria-prodigiosa | `metodo-aprendizaje-acelerado-practica-constante-worldbrain.webp` |
| 2 | `productividad-estudiantil` | Productividad Estudiantil | Gestión del tiempo, hábitos, procrastinación, planeación de exámenes | regularizacion-express, admision-universitaria | `metodo-aprendizaje-acelerado-practica-constante-worldbrain.webp` |
| 3 | `tecnologia-educativa` | Tecnología Educativa | IA en el aula, apps de estudio, gamificación, seguridad digital para estudiantes | robotics, mathekids | `integracion-hemisferios-cerebrales-aprendizaje-worldbrain.webp` |
| 4 | `habilidades-blandas` | Habilidades Blandas | Comunicación, trabajo en equipo, liderazgo juvenil, inteligencia emocional | neurocomunicacion, grandes-lideres | `neurocomunicacion-curso-hablar-en-publico-liderazgo.webp` |
| 5 | `desarrollo-profesional` | Desarrollo Profesional | Empleabilidad temprana, redacción profesional, finanzas personales para jóvenes | redaccion-ejecutiva, alfa-cash | `redaccion-ejecutiva-curso-escritura-profesional.webp` |
| 6 | `crianza-educacion` | Crianza y Educación | Acompañamiento parental, rutinas familiares, señales de rezago, comunicación padres-hijos | homeschool, lectoescritura | `homeschool-educacion-en-casa-certificada-sep.webp` |
| 7 | `neurociencia-aprendizaje` | Neurociencia del Aprendizaje | Cómo aprende el cerebro, sueño y memoria, atención, mitos neurocientíficos | memoria-prodigiosa, fotolectura | `integracion-hemisferios-cerebrales-aprendizaje-worldbrain.webp` |
| 8 | `bienestar-estudiantil` | Bienestar Estudiantil | Ansiedad ante examenes, descanso, ergonomía de estudio, técnicas de relajación aplicadas al estudio | admision-universitaria, regularizacion-express | `aromaterapia-para-estudiar-concentracion-worldbrain.webp` |
| 9 | `aprendizaje-temprano` | Aprendizaje Temprano | Estimulación infantil, juego y aprendizaje, lectoescritura temprana, desarrollo motor-cognitivo | fastkids, mathekids | `ludoterapia-infantil-juego-aprendizaje-worldbrain.webp` |
| 10 | `ciencia-y-futuro` | Ciencia y Futuro | Pensamiento científico, astronomía accesible, curiosidad y método científico en niños | ciencia-astronomia, robotics | `ciencia-astronomia-curso-ninos-telescopio.webp` |

Ningún cluster nuevo repite `cluster` ni `category` de los 60 posts existentes
(verificado contra la lista real: admision, estudio-memoria,
finanzas-liderazgo-ia, fotolectura, homeschool-lectoescritura, ingles,
matematicas, regularizacion, robotica, universidad-dominical).

Las 6 imágenes genéricas de aprendizaje (`aromaterapia-`, `ludoterapia-`,
`musicoterapia-`, `integracion-hemisferios-`, `metodo-aprendizaje-acelerado-`,
más las de curso ya existentes) cubren los 10 clusters sin generar ningún
asset nuevo, cumpliendo la restricción de no inventar imágenes.

## Matriz de internal linking (evita 500 posts aislados)

Cada post enlaza a 2–4 posts relacionados, elegidos así:
1. **1–2 posts del mismo cluster** (profundidad temática — mismo tema, otro ángulo).
2. **1 post de un cluster adyacente** (tabla de adyacencias abajo — amplía el interés sin salirse del tema).
3. **1 post "puente"** hacia uno de los 10 clusters curso-específicos ya existentes, cuando el tema conecta de forma natural (ej. un post de `productividad-estudiantil` enlaza a uno de `admision` de los 60 existentes).

Los enlaces se insertan como sección "Sigue leyendo" al final del cuerpo
(antes de FAQ), generada por el propio `build_html.py` a partir de un campo
`related` en el JSON de contenido — no a mano por post.

### Adyacencias entre clusters nuevos

```
metodologias-aprendizaje     ↔ productividad-estudiantil, neurociencia-aprendizaje
productividad-estudiantil    ↔ metodologias-aprendizaje, bienestar-estudiantil
tecnologia-educativa         ↔ ciencia-y-futuro, habilidades-blandas
habilidades-blandas          ↔ desarrollo-profesional, tecnologia-educativa
desarrollo-profesional       ↔ habilidades-blandas, productividad-estudiantil
crianza-educacion            ↔ aprendizaje-temprano, neurociencia-aprendizaje
neurociencia-aprendizaje     ↔ metodologias-aprendizaje, bienestar-estudiantil, crianza-educacion
bienestar-estudiantil        ↔ productividad-estudiantil, neurociencia-aprendizaje
aprendizaje-temprano         ↔ crianza-educacion, ciencia-y-futuro
ciencia-y-futuro             ↔ tecnologia-educativa, aprendizaje-temprano
```

### Puentes hacia los clusters curso-específicos existentes

```
metodologias-aprendizaje   → fotolectura, estudio-memoria
productividad-estudiantil  → regularizacion, admision
tecnologia-educativa       → robotica, matematicas
habilidades-blandas        → finanzas-liderazgo-ia
desarrollo-profesional     → finanzas-liderazgo-ia
crianza-educacion          → homeschool-lectoescritura
neurociencia-aprendizaje   → estudio-memoria, fotolectura
bienestar-estudiantil      → admision, regularizacion
aprendizaje-temprano       → ingles, matematicas
ciencia-y-futuro           → robotica
```

## Convenciones heredadas del contrato existente (sin cambios)

- Español natural de México, 1,400–1,800 palabras útiles, 5–7 H2, 3–5 FAQ.
- 80–85% educación / 15–20% CTA contextual al curso de la fila del plan.
- Sin cifras/estudios/testimonios inventados, sin superlativos, sin asesoría
  legal/médica — ver `tools/seo_content/CONTENT_CONTRACT.md`.
- Slugs y `filename` siguen el patrón `blog-<slug>.html`, coherente con los
  71 posts existentes.
