# Contrato editorial para los 60 posts

Cada batch es un arreglo JSON válido. Cada objeto debe corresponder exactamente a un post del mapa editorial y contener:

```json
{
  "id": 1,
  "slug": "igual-al-plan",
  "description": "Meta description única, natural, 140–158 caracteres.",
  "quick_answer": "Respuesta directa de 45–80 palabras que resuelve la consulta principal.",
  "lead": ["Párrafo 1", "Párrafo 2"],
  "sections": [
    {
      "heading": "H2 único y descriptivo",
      "paragraphs": ["Uno o dos párrafos sustanciales."],
      "bullets": ["Opcional: 3–6 puntos accionables"],
      "steps": ["Opcional: 3–7 pasos ordenados"]
    }
  ],
  "faq": [
    {"question": "Pregunta real", "answer": "Respuesta autosuficiente de 35–80 palabras"}
  ],
  "sources": [
    {"name": "Nombre de la fuente", "url": "https://...", "note": "Qué verificar aquí"}
  ],
  "cta": {
    "heading": "CTA contextual sin presión",
    "text": "Un párrafo útil; no más del 15–20% del artículo.",
    "label": "Texto del enlace"
  }
}
```

## Reglas obligatorias

- Español natural de México; tono experto, claro y respetuoso.
- Entre 1,400 y 1,800 palabras útiles por artículo (incluyendo FAQ). No alargar con repeticiones: añadir ejemplos, escenarios, errores frecuentes, criterios de decisión y pasos aplicables.
- `quick_answer` debe ser citable de forma aislada por buscadores y asistentes de IA.
- 5–7 secciones H2; usar listas o pasos solo cuando aclaren.
- 3–5 FAQ que no repitan literalmente los H2.
- 80–85% educación; 15–20% promoción como máximo, concentrada en un CTA.
- No inventar cifras, estudios, testimonios, precios, fechas, duración de cursos ni resultados garantizados.
- No diagnosticar condiciones; en salud/aprendizaje indicar cuándo consultar a profesionales.
- No dar asesoría legal. Para validez educativa y convocatorias, explicar cómo verificar en fuentes oficiales vigentes.
- En admisión, no afirmar fechas ni reglas 2026 sin fuente oficial; enlazar DGAE-UNAM, Admisión IPN o autoridad vigente.
- No atacar a competidores ni usar superlativos como “el mejor”, “líder”, “garantizado” o “definitivo”.
- El CTA debe enlazar conceptualmente al `course_url` del mapa, pero no repetirlo en el JSON.
- No repetir párrafos, aperturas ni listas entre posts. Cada intención debe quedar claramente diferenciada.
- URLs de fuentes reales y preferentemente oficiales; no fabricar rutas profundas inseguras.
