# Investigación SEO nacional e internacional — 14 de agosto de 2026

## Objetivo

Seleccionar un primer lote de contenidos educativos con demanda comprobable en México y potencial internacional en español, sin crear otra URL para una intención que el sitio ya cubre.

## Fuentes y límites

1. **Google Search Console**, propiedad `https://ultravelozmente.com/`, periodo 2026-05-15 a 2026-08-12. Se revisaron consultas no branded de México y de países distintos de México.
2. **Google Autocomplete público**, `client=firefox`, `hl=es`, `gl=mx`. Las sugerencias demuestran formulaciones y amplitud de demanda, pero no equivalen a volumen mensual.
3. **Semrush Keyword Search Volume Checker**, país México, consulta del 2026-08-14. Son estimaciones de promedio mensual y dificultad, no datos propios de Google ni una garantía de tráfico.
4. **Google Trends API**: Google confirma que sigue en alpha para un grupo limitado de testers. La interfaz pública devolvió HTTP 429 durante esta investigación, por lo que no se inventó ni extrapoló una serie de Trends.
5. **SearchVolume.io** se consultó como contraste, pero solo ofrecía mercados como Estados Unidos; sus cifras no se utilizaron como proxy de México.

## Demanda estimada en México

| Keyword base | Volumen mensual estimado MX | Dificultad Semrush | Volumen global estimado | Intención mostrada |
|---|---:|---:|---:|---|
| técnicas de estudio | 5,400 | 44 | 21,900 | Informacional |
| lectura rápida | 1,300 | 31 | 5,600 | Informacional |
| programación para niños | 880 | 26 | 3,400 | Informacional |
| comprensión lectora | 590 | 44 | 54,000 | Informacional |
| soroban | 480 | 42 | 24,100 | Informacional |

Las cifras corresponden a las **keywords base**. No se asignó volumen inventado a las long-tail elegidas para los artículos.

## Señales propias de GSC

- **Lectura rápida / Fotolectura**: `fotolectura` y `foto lectura` ya se distribuyen por México, Argentina, España, Estados Unidos y otros países. `curso de lectura rapida` y `lectura rapida` aparecen en México, pero aterrizan en la portada; existe una oportunidad de construir apoyo informativo hacia `/fotolectura`.
- **Soroban**: `soroban que es`, `soroban como funciona`, `curso soroban` y variantes ya activan `/blog-abaco-soroban-que-es` y `/mathekids`. También hay señales en Chile, Costa Rica, Colombia, Ecuador, España, Perú y Estados Unidos.
- **Programación y robótica**: la demanda pública existe, pero las consultas comerciales de robótica siguen aproximadamente en posiciones 30–40. La expansión debe crear autoridad temática, no otra landing genérica.
- **Técnicas de estudio y comprensión lectora**: el sitio ya tiene pilares informativos; las nuevas URLs necesitan segmentar una tarea o nivel escolar.

## Formulaciones observadas en Autocomplete MX

- Lectura rápida: `lectura rapida para niños`, `lectura rapida curso`, `lectura rapida y comprensiva`, `lectura rapida ejemplo`.
- Ábaco Soroban: `ábaco soroban cómo funciona`, `ábaco soroban para niños`, `ábaco soroban ejercicios`.
- Programación para niños: `gratis`, `primaria`, `online`, `Scratch`, `4 a 6 años`, `5 años`, `10 años`.
- Comprensión lectora: búsquedas explícitas de primero, segundo, tercero, cuarto y quinto grado, además de `por grados de primaria`.
- Técnicas de estudio: `para adolescentes`, `para secundaria`, `universitario`, `para niños`, `para primaria`.

## Auditoría de canibalización

| Keyword base | URL que debe conservar la intención principal | Gap elegido | Nueva primary keyword |
|---|---|---|---|
| lectura rápida | `/fotolectura` (comercial) y `/blog-leer-rapido-sin-perder-comprension` (método general) | rutina práctica medible | ejercicios de lectura rápida |
| soroban | `/blog-abaco-soroban-que-es` | práctica inicial de suma/resta | ejercicios de soroban |
| programación para niños | `/blog-programacion-ninos-por-edades` | decisión del primer lenguaje | primer lenguaje de programación para niños |
| comprensión lectora | `/blog-mejorar-comprension-lectora` | progresión por grado de primaria | comprensión lectora por grados de primaria |
| técnicas de estudio | `/blog-tecnicas-estudio-que-si-funcionan` | aplicación por materia en secundaria | técnicas de estudio para secundaria |

También se revisaron `/blog-velocidad-lectora-como-medirla`, `/blog-tecnicas-lectura-estudiantes`, `/blog-calculo-mental-ninos-ejercicios`, `/blog-soroban-edad-ideal`, `/blog-arduino-microbit-scratch-cual-elegir`, `/blog-recuerdo-activo-como-usarlo` y `/blog-repeticion-espaciada-guia`.

## Lote seleccionado

1. **Ejercicios de lectura rápida con comprensión**: responde a una tarea concreta y enlaza a Fotolectura sin intentar reemplazar su landing.
2. **Ejercicios de Soroban para principiantes**: amplía el cluster internacional con práctica; no repite la definición ni la edad ideal.
3. **Primer lenguaje de programación para niños**: aprovecha la dificultad estimada más baja del grupo y complementa la ruta por edades.
4. **Comprensión lectora en primaria por grados**: tiene la mayor demanda global del grupo y una segmentación explícita en Autocomplete.
5. **Técnicas de estudio para secundaria**: parte de la mayor demanda estimada en México, pero deja la keyword genérica a su pilar existente.

## Decisiones descartadas

- No crear otra guía titulada simplemente “lectura rápida”, “soroban”, “programación para niños”, “comprensión lectora” o “técnicas de estudio”. Esas intenciones ya tienen dueño.
- No afirmar que las long-tail tienen el mismo volumen que su keyword base.
- No usar el aparente volumen de Estados Unidos como sustituto de México.
- No crear páginas por cada grado o cada edad en este lote: una guía útil y consolidada evita contenido delgado y canibalización interna.
