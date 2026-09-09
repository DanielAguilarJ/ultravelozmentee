#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
SEO_TOOLS = ROOT / "tools" / "seo_content"
if str(SEO_TOOLS) not in sys.path:
    sys.path.insert(0, str(SEO_TOOLS))

import review_post_quality as quality  # noqa: E402
import review_seo_onpage as onpage  # noqa: E402
import review_strict_content as strict  # noqa: E402


def words(prefix: str, count: int) -> str:
    return " ".join([prefix, *(f"{prefix}palabra{i}" for i in range(count - 1))])


def make_post() -> dict:
    return {
        "id": 9001,
        "slug": "prueba-clara-guia",
        "description": "Aprende a crear una prueba clara con estructura práctica, ejemplos útiles, revisión cuidadosa y pasos aplicables para resolver una necesidad concreta.",
        "quick_answer": "Una prueba clara comienza con un propósito concreto, organiza la información según lo que necesita el lector y termina con una acción visible. Conviene preparar un esquema, escribir un borrador y revisar contenido, estructura y corrección en pasadas separadas. Así, la persona puede comprender el mensaje, localizar los datos relevantes y actuar sin reconstruir el contexto por su cuenta.",
        "lead": [words("apertura", 45), words("contexto", 45)],
        "sections": [
            {
                "heading": "Cómo preparar una prueba clara",
                "paragraphs": [words("metodoa", 120), words("metodob", 120)],
                "steps": ["Definir el propósito y el lector.", "Ordenar las ideas principales.", "Revisar la versión completa."],
            },
            {"heading": "Definir el propósito", "paragraphs": [words("propositoa", 120), words("propositob", 120)]},
            {"heading": "Ordenar la información", "paragraphs": [words("ordena", 120), words("ordenb", 120)]},
            {"heading": "Escribir con precisión", "paragraphs": [words("precisiona", 120), words("precisionb", 120)]},
            {"heading": "Revisar antes de publicar", "paragraphs": [words("revisiona", 120), words("revisionb", 120)]},
        ],
        "faq": [
            {"question": "¿Cómo empiezo una prueba clara?", "answer": words("faqprimera", 45)},
            {"question": "¿Qué debo revisar antes de publicar?", "answer": words("faqsegunda", 45)},
            {"question": "¿Cuándo conviene pedir otra revisión?", "answer": words("faqtercera", 45)},
        ],
        "sources": [],
        "related": ["relacion-uno", "relacion-dos", "relacion-tres", "relacion-cuatro"],
        "cta": {"heading": "Practica con una guía", "text": words("llamada", 45), "label": "Conocer el curso"},
    }


def make_meta(post: dict) -> dict:
    return {
        "id": post["id"],
        "slug": post["slug"],
        "title": "Prueba clara: guía práctica",
        "primary_keyword": "prueba clara",
        "course_url": "/curso-prueba",
        "image": "images/prueba.webp",
        "publication_date": "2026-09-09",
    }


def make_html(post: dict, meta: dict, *, schema: str | None = None, canonical_count: int = 1,
              noindex: bool = False, cover_dimensions: bool = True,
              description: str | None = None) -> str:
    canonical = f'<link rel="canonical" href="{onpage.SITE}/blog-{meta["slug"]}">'
    schema_value = schema or json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BlogPosting", "url": f'{onpage.SITE}/blog-{meta["slug"]}', "headline": meta["title"], "description": post["description"]},
            {"@type": "FAQPage", "mainEntity": []},
        ],
    }, ensure_ascii=False)
    dims = ' width="1280" height="720"' if cover_dimensions else ""
    robots = '<meta name="robots" content="noindex,follow">' if noindex else ""
    return f'''<!doctype html><html><head>
<title>{meta["title"]} | WorldBrain</title>
<meta name="description" content="{description or post["description"]}">
{canonical * canonical_count}
{robots}
<meta property="og:image" content="https://ultravelozmente.com/images/prueba.webp">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{schema_value}</script>
</head><body>
<div class="blog-post-cover"><img src="images/prueba.webp" alt="{meta["title"]}"{dims}></div>
<h1>{meta["title"]}</h1>
<p>{post["quick_answer"]}</p>
<h2>Cómo preparar una prueba clara</h2>
<a href="/blog-relacion-uno">Uno</a><a href="/blog-relacion-dos">Dos</a><a href="/blog-relacion-tres">Tres</a>
<a href="{meta["course_url"]}">Curso</a>
</body></html>'''


class QualityReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.post = make_post()
        self.meta = make_meta(self.post)
        self.slugs = {*self.post["related"], self.post["slug"]}

    def score(self, post: dict | None = None) -> tuple[int, list[str]]:
        return quality.review(post or self.post, self.meta, self.slugs, set())

    def test_valid_post_keeps_ten_out_of_ten(self) -> None:
        score, _ = self.score()
        self.assertEqual(score, 10)

    def test_short_faq_answer_loses_the_faq_point(self) -> None:
        post = copy.deepcopy(self.post)
        post["faq"][0]["answer"] = "Respuesta demasiado corta."
        score, lines = self.score(post)
        self.assertEqual(score, 9)
        self.assertTrue(any("FAQ" in line and "[ ]" in line for line in lines))

    def test_related_must_be_unique_and_must_not_link_to_itself(self) -> None:
        post = copy.deepcopy(self.post)
        post["related"] = ["relacion-uno", "relacion-uno", "relacion-dos", post["slug"]]
        score, lines = self.score(post)
        self.assertEqual(score, 9)
        self.assertTrue(any("related" in line and "[ ]" in line for line in lines))

    def test_duplicate_long_paragraph_loses_the_uniqueness_point(self) -> None:
        post = copy.deepcopy(self.post)
        post["sections"][1]["paragraphs"][0] = post["sections"][0]["paragraphs"][0]
        score, lines = self.score(post)
        self.assertEqual(score, 9)
        self.assertTrue(any("duplic" in line.lower() and "[ ]" in line for line in lines))

    def test_lead_requires_two_substantial_paragraphs(self) -> None:
        post = copy.deepcopy(self.post)
        post["lead"] = ["Introducción corta."]
        score, lines = self.score(post)
        self.assertEqual(score, 9)
        self.assertTrue(any("lead" in line.lower() and "[ ]" in line for line in lines))


class StrictCorpusTests(unittest.TestCase):
    def two_posts(self) -> tuple[list[tuple[Path, dict]], dict[int, list[tuple[Path, dict]]]]:
        first = make_post()
        first_meta = make_meta(first)
        second = copy.deepcopy(first)
        second["id"] = 9002
        second["slug"] = "segunda-prueba-clara"
        second["description"] = "Segunda descripción única para una guía distinta, con información práctica, estructura clara, revisión cuidadosa y aplicación profesional concreta."
        second_meta = make_meta(second)
        second_meta["id"] = second["id"]
        second_meta["slug"] = second["slug"]
        second_meta["title"] = "Segunda guía práctica"
        records = [(Path("batch-a.json"), first), (Path("batch-b.json"), second)]
        plans = {
            first["id"]: [(Path("plan-a.json"), first_meta)],
            second["id"]: [(Path("plan-b.json"), second_meta)],
        }
        return records, plans

    def test_duplicate_primary_keyword_is_rejected_globally(self) -> None:
        records, plans = self.two_posts()
        errors: list[str] = []
        strict.add_unique_metadata_errors(records, plans, errors)
        self.assertTrue(any("primary_keyword duplicado" in error for error in errors))

    def test_duplicate_paragraph_between_posts_is_rejected(self) -> None:
        records, _ = self.two_posts()
        errors: list[str] = []
        strict.add_cross_post_duplicate_errors(records, errors)
        self.assertTrue(any("bloque duplicado" in error for error in errors))

    def test_malformed_object_inside_modern_batch_is_rejected(self) -> None:
        original_posts_dir = strict.POSTS_DIR
        with tempfile.TemporaryDirectory() as directory:
            strict.POSTS_DIR = Path(directory)
            try:
                (strict.POSTS_DIR / "batch-modern.json").write_text(
                    json.dumps([make_post(), {"slug": "sin-id"}]), encoding="utf-8"
                )
                records, errors = strict.strict_content()
            finally:
                strict.POSTS_DIR = original_posts_dir
        self.assertEqual(len(records), 1)
        self.assertTrue(any("ID ausente" in error for error in errors))


class SeoOnPageReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.post = make_post()
        self.meta = make_meta(self.post)
        self.temp = tempfile.TemporaryDirectory()
        self.original_root = onpage.ROOT
        onpage.ROOT = Path(self.temp.name)

    def tearDown(self) -> None:
        onpage.ROOT = self.original_root
        self.temp.cleanup()

    def review_html(self, html: str) -> tuple[int, list[str]]:
        (onpage.ROOT / f'blog-{self.meta["slug"]}.html').write_text(html, encoding="utf-8")
        return onpage.review(self.post, self.meta)

    def test_valid_html_keeps_ten_out_of_ten(self) -> None:
        score, _ = self.review_html(make_html(self.post, self.meta))
        self.assertEqual(score, 10)

    def test_meta_description_must_match_source_json(self) -> None:
        other = "Otra descripción con longitud deliberadamente suficiente para pasar el rango, pero que no coincide con el contenido fuente del artículo publicado ahora."
        other = (other + " texto adicional")[:145]
        score, lines = self.review_html(make_html(self.post, self.meta, description=other))
        self.assertEqual(score, 9)
        self.assertTrue(any("description" in line.lower() and "[ ]" in line for line in lines))

    def test_canonical_must_be_unique_and_page_must_be_indexable(self) -> None:
        score, lines = self.review_html(make_html(self.post, self.meta, canonical_count=2, noindex=True))
        self.assertEqual(score, 9)
        self.assertTrue(any("canonical" in line.lower() and "[ ]" in line for line in lines))

    def test_schema_must_be_valid_json_ld(self) -> None:
        score, lines = self.review_html(make_html(self.post, self.meta, schema='{"@type":"BlogPosting","x":"FAQPage",}'))
        self.assertEqual(score, 9)
        self.assertTrue(any("json-ld" in line.lower() and "[ ]" in line for line in lines))

    def test_cover_requires_alt_width_and_height(self) -> None:
        score, lines = self.review_html(make_html(self.post, self.meta, cover_dimensions=False))
        self.assertEqual(score, 9)
        self.assertTrue(any("portada" in line.lower() and "[ ]" in line for line in lines))


if __name__ == "__main__":
    unittest.main()
