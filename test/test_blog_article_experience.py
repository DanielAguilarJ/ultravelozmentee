#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
SEO_TOOLS = ROOT / "tools" / "seo_content"
if str(SEO_TOOLS) not in sys.path:
    sys.path.insert(0, str(SEO_TOOLS))

import build_html  # noqa: E402
import review_blog_experience as experience  # noqa: E402


def fixture() -> tuple[dict, dict, dict[str, str]]:
    post = {
        "id": 9001,
        "slug": "guia-editorial-clara",
        "description": "Una guía editorial clara para comprender el tema, recorrer cada sección y tomar decisiones con información útil, verificable y bien organizada.",
        "quick_answer": "La respuesta rápida resume la decisión principal sin reemplazar el desarrollo. Después, cada sección amplía una parte concreta, ofrece contexto y conduce a una acción comprensible para quien necesita resolver el tema.",
        "lead": [
            "Esta introducción presenta el problema con suficiente contexto para que el lector entienda por qué importa y qué podrá resolver al terminar la lectura completa.",
            "El segundo párrafo delimita el recorrido y anticipa cómo se organizará la información sin repetir la respuesta rápida ni convertir la apertura en relleno.",
        ],
        "sections": [
            {"heading": "Entender el punto de partida", "paragraphs": ["Primer desarrollo editorial con información concreta y una explicación útil para el lector."]},
            {"heading": "Ordenar la información importante", "paragraphs": ["Segundo desarrollo editorial con jerarquía, contexto y una secuencia fácil de seguir."]},
            {"heading": "Aplicar el método paso a paso", "paragraphs": ["Tercer desarrollo editorial que convierte la explicación en una acción verificable."], "steps": ["Definir el objetivo.", "Aplicar el criterio.", "Revisar el resultado."]},
            {"heading": "Evitar los errores frecuentes", "paragraphs": ["Cuarto desarrollo editorial que señala límites y previene interpretaciones equivocadas."]},
            {"heading": "Revisar antes de terminar", "paragraphs": ["Quinto desarrollo editorial que cierra el recorrido con una comprobación concreta."]},
        ],
        "faq": [
            {"question": "¿Cuál es el primer paso?", "answer": "El primer paso consiste en definir el objetivo y reunir el contexto necesario antes de elegir una acción."},
            {"question": "¿Cómo sé si quedó claro?", "answer": "La explicación queda clara cuando una persona puede identificar la decisión, los pasos y el resultado esperado."},
            {"question": "¿Qué conviene revisar?", "answer": "Conviene revisar la precisión, el orden, los enlaces y la correspondencia entre el título y la respuesta."},
        ],
        "sources": [{"name": "Fuente de referencia", "url": "https://example.com/guia", "note": "Criterios editoriales consultados."}],
        "related": ["lectura-uno", "lectura-dos", "lectura-tres", "lectura-cuatro"],
        "cta": {"heading": "Continúa con una guía práctica", "text": "Conoce el programa relacionado y revisa si corresponde a tu objetivo.", "label": "Conocer el programa"},
    }
    meta = {
        "id": post["id"],
        "slug": post["slug"],
        "title": "Guía editorial clara para tomar mejores decisiones",
        "primary_keyword": "guía editorial clara",
        "course_url": "/redaccion-ejecutiva",
        "course_name": "Redacción Ejecutiva",
        "image": "images/blog_1_cover.webp",
        "publication_date": "2026-09-09",
        "category": "Comunicación",
        "icon": "fa-pen",
        "cluster": None,
    }
    titles = {
        "lectura-uno": "Primera lectura relacionada",
        "lectura-dos": "Segunda lectura relacionada",
        "lectura-tres": "Tercera lectura relacionada",
        "lectura-cuatro": "Cuarta lectura relacionada",
    }
    return post, meta, titles


def rendered() -> str:
    post, meta, titles = fixture()
    return build_html.render_body(meta, post, build_html.word_count_of(post), titles)


class PremiumArticleStructureTests(unittest.TestCase):
    def test_article_has_breadcrumbs_dek_semantic_meta_and_reading_layout(self) -> None:
        html = rendered()
        self.assertIn('class="ed-breadcrumbs"', html)
        self.assertIn('class="blog-post-dek"', html)
        self.assertRegex(html, r'<time datetime="2026-09-09"')
        self.assertIn('class="ed-article-layout"', html)
        self.assertIn('class="ed-article-aside"', html)
        self.assertIn('class="ed-mobile-toc"', html)

    def test_table_of_contents_targets_every_article_section(self) -> None:
        html = rendered()
        section_ids = re.findall(r'<section class="ed-article-section" id="([^"]+)"', html)
        toc_targets = set(re.findall(r'class="ed-toc-link" href="#([^"]+)"', html))
        self.assertEqual(len(section_ids), 5)
        self.assertTrue(set(section_ids).issubset(toc_targets))
        for section_id in section_ids:
            self.assertRegex(html, rf'id="{re.escape(section_id)}" aria-labelledby="[^"]+"')

    def test_main_article_has_no_inline_presentation_styles(self) -> None:
        html = rendered()
        main = html.split('<main id="main-content"', 1)[1].split('</main>', 1)[0]
        self.assertNotIn(' style=', main)

    def test_actions_expose_live_feedback_and_related_reading(self) -> None:
        html = rendered()
        self.assertIn('class="ed-share-status" role="status" aria-live="polite"', html)
        self.assertIn('class="ed-related-posts"', html)
        self.assertGreaterEqual(html.count('class="ed-related-link"'), 4)


class PremiumExperienceAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.css = (ROOT / "css" / "blog-editorial.css").read_text(encoding="utf-8")
        cls.script = (ROOT / "js" / "blog-article.js").read_text(encoding="utf-8")

    def test_complete_experience_scores_ten_out_of_ten(self) -> None:
        score, lines = experience.review(rendered(), self.css, self.script)
        self.assertEqual(score, 10, "\n".join(lines))

    def test_missing_table_of_contents_loses_navigation_point(self) -> None:
        html = rendered().replace('class="ed-toc"', 'class="toc-removed"')
        score, lines = experience.review(html, self.css, self.script)
        self.assertEqual(score, 9)
        self.assertTrue(any("navegación" in line.lower() and "[ ]" in line for line in lines))

    def test_shared_assets_cover_responsive_accessible_and_print_states(self) -> None:
        score, lines = experience.review(rendered(), self.css, self.script)
        self.assertEqual(score, 10, "\n".join(lines))
        self.assertIn("@media print", self.css)
        self.assertIn("IntersectionObserver", self.script)
        self.assertIn("aria-current", self.script)


if __name__ == "__main__":
    unittest.main()
