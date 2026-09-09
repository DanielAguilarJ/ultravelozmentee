# Contrato editorial para posts del blog

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
  "related": ["cuatro", "slugs", "reales", "distintos"],
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
- `quick_answer` debe tener 45–80 palabras y ser citable de forma aislada por buscadores y asistentes de IA.
- `lead` debe contener exactamente 2 párrafos sustanciales de 35–100 palabras cada uno.
- 5–7 secciones H2 con encabezados únicos; cada sección necesita párrafos y las listas se usan solo cuando aclaran.
- 3–5 FAQ con preguntas únicas y respuestas autosuficientes de 35–90 palabras.
- 80–85% educación; 15–20% promoción como máximo, concentrada en un CTA.
- No inventar cifras, estudios, testimonios, precios, fechas, duración de cursos ni resultados garantizados.
- No diagnosticar condiciones; en salud/aprendizaje indicar cuándo consultar a profesionales.
- No dar asesoría legal. Para validez educativa y convocatorias, explicar cómo verificar en fuentes oficiales vigentes.
- En admisión, no afirmar fechas ni reglas 2026 sin fuente oficial; enlazar DGAE-UNAM, Admisión IPN o autoridad vigente.
- No atacar a competidores ni usar superlativos como “el mejor”, “líder”, “garantizado” o “definitivo”.
- El CTA debe enlazar conceptualmente al `course_url` del mapa, pero no repetirlo en el JSON.
- No repetir párrafos, aperturas ni listas dentro del post ni entre posts modernos. Cada intención debe quedar claramente diferenciada.
- `related` debe contener al menos 4 slugs reales, distintos y nunca el slug del propio post.
- Cada fuente debe incluir `name`, URL `https://` y `note`; no fabricar rutas ni referencias.

## Gate automático

Desde el ID 1025, todo post presente y futuro entra automáticamente al Gate 10 de `./check.sh`. El gate exige:

- Calidad editorial y SEO on-page en 10/10.
- IDs, slugs, títulos, descriptions y keywords principales sin duplicados.
- HTML exactamente sincronizado con el JSON fuente.
- `blog-index.html` y `data/posts.json` regenerados.
- `<title>` y description únicos y sincronizados; canonical único y sin `noindex`.
- JSON-LD válido con `BlogPosting` y `FAQPage`.
- Portada con `src`, `alt`, `width` y `height`.

Si falla frescura, ejecutar en orden:

```bash
python3 tools/seo_content/build_html.py
python3 tools/seo_content/build_blog_index.py
./check.sh
```
