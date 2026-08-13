# Investigación de keywords — 2026-08-13

Fuentes: Google Search Console (datos reales del sitio, GSC MCP) + Google Trends
vía pytrends (interés relativo en México, últimos 12 meses).

## Oportunidades de alto valor en GSC (ya rankean, CTR bajo o cero)

Páginas que YA tienen tráfico potencial pero conversión de clic pobre — señal de
que el contenido necesita reforzarse o de que faltan piezas de blog que
capturen la intención específica:

| Query | Impresiones (90d) | Posición | CTR | Página actual |
|---|---|---|---|---|
| culturas mesoamericanas | 268 | 10.3 | 0% | página histórica, no blog |
| legado cultural de mesoamérica | 77 | 1.9 | 0% | ídem |
| universidad dominical | 240 | 5.1 | 1.25% | landing de curso |
| universidades dominicales | 56 | 7.8 | 0% | sin página de blog dedicada |
| modalidad dominical | 31 | 9.5 | 0% | ídem |
| civilizaciones mesoamericanas | 62 | 11.5 | 0% | ídem |
| arduino classes near me | 81 | 7.2 | 0% | robotics.html |
| licenciatura dominical | 8 | 8.4 | 0% | sin cobertura |
| geniox curso de robotica | 13 | 8.5 | 0% | robotics.html |
| robotics classes near me | 14 | 5.0 | 0% | robotics.html (inglés) |

Implicación para blog: los clusters `universidad-dominical` y `educacion-financiera`
del plan de 500 ya tienen demanda validada por Google — priorizarlos.

## Google Trends — interés relativo en México (12 meses, escala 0-100)

### neurociencia-aprendizaje (cluster pendiente, 0/50)
1. estimulación temprana — 74.8 (alto)
2. neuroplasticidad — 51.4 (alto)
3. neuroeducación — 6.5
4. cómo funciona la memoria — 0.9
5. aprendizaje basado en el cerebro — 0.0

→ Priorizar posts sobre estimulación temprana y neuroplasticidad; son los
términos con demanda real, el resto es ruido de nicho.

### desarrollo-profesional (cluster pendiente, 0/50)
1. liderazgo en el trabajo — 59.2 (alto)
2. cómo hacer un buen currículum — 1.2
3. networking profesional — 0.6
4. cómo pedir aumento de sueldo — 0.1
5. habilidades blandas para el trabajo — 0.0

→ "Liderazgo en el trabajo" domina por mucho; encaja con el posicionamiento
de marca de WorldBrain (Grandes Líderes, Redacción Ejecutiva).

### bienestar-estudiantil (cluster pendiente, 0/50)
1. estrés académico — 29.7 (medio)
2. salud mental estudiantes — 12.5
3. ansiedad escolar — 5.7
4. burnout estudiantil — 0.0
5. cómo manejar la presión escolar — 0.0

→ Estrés académico y salud mental estudiantil son los ejes reales de
búsqueda; evitar el término "burnout estudiantil" (sin demanda en MX).

### ciencia-y-futuro (cluster pendiente, 0/50)
1. inteligencia artificial en la educación — 8.2
2. habilidades del futuro — 0.4
3. profesiones del futuro — 0.0
4. carreras con más demanda 2026 — 0.0
5. cómo usar ChatGPT para estudiar — 0.0

→ Demanda baja en general; "IA en la educación" es la única señal con
volumen. Cluster de menor prioridad relativa vs. los tres anteriores.

### crianza-educacion (cluster pendiente, 0/50) — sin datos (rate limit de Trends)
Sin medir por límite de tasa de la API no oficial. Usar como proxy la
categoría "disciplina positiva" / "límites a los hijos", términos estándar
del nicho de parenting en español, y revalidar con GSC una vez publicados
los primeros posts.

## Decisión de priorización para esta sesión

Orden de ataque para completar clusters pendientes/parciales, por demanda
validada (Trends) + oportunidad ya existente en GSC:
1. **tecnologia-educativa** (30/50 → completar) — ya tiene tracción de robótica en GSC.
2. **habilidades-blandas** (32/50 → completar) — liderazgo en el trabajo (59.2) mapea directo.
3. **neurociencia-aprendizaje** (0/50 → arrancar) — estimulación temprana (74.8) y neuroplasticidad (51.4), señal más fuerte de todo el estudio.
4. **bienestar-estudiantil** (0/50) — estrés académico (29.7), demanda real y sensible para E-E-A-T (tono de cuidado, no diagnóstico clínico).
5. desarrollo-profesional, crianza-educacion, ciencia-y-futuro, aprendizaje-temprano: siguientes rondas.
