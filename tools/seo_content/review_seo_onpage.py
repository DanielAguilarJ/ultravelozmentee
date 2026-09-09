#!/usr/bin/env python3
"""Segundo check por post: auditoría SEO on-page sobre el HTML YA GENERADO.

Complementa a review_post_quality.py (que puntúa el contenido antes de
construir). Este revisa lo que Google realmente ve en blog-<slug>.html:
título, meta description, H1 único con la keyword, keyword en el primer
párrafo y en un H2, enlazado interno real, CTA al curso, canonical,
datos estructurados y ausencia de sobre-optimización (keyword stuffing).

Se ejecuta DESPUÉS de build_html.py. 10 comprobaciones, 1 punto cada una;
un post con < 10 se marca para mejorar, porque el objetivo es SEO impecable.

Uso:
    python3 tools/seo_content/review_seo_onpage.py content/posts/batch-XXXX.json
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).parents[2]
POSTS_DIR = ROOT / "content" / "posts"
SITE = "https://ultravelozmente.com"
PLANS = (
    ROOT / "reports" / "seo" / "editorial-plan-60-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-500-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-national-international.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectura-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectoescritura-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectoescritura-secundaria-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-mathekids-soroban-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-mathekids-matematicas-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-ciencia-astronomia-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-memoria-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-redaccion-ejecutiva-2026-09.json",
)

# Google muestra ~60 caracteres del título; por encima se trunca en la SERP.
TITLE_MAX = 60
DESC_MIN, DESC_MAX = 140, 158
KEYWORD_STUFFING_MAX = 10  # apariciones de la frase exacta en el texto visible


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()


def load_plan_index() -> dict[int, dict]:
    metas: dict[int, dict] = {}
    for p in PLANS:
        if not p.exists():
            continue
        for m in json.loads(p.read_text(encoding="utf-8"))["posts"]:
            if m.get("title") and m.get("slug"):
                metas[m["id"]] = m
    return metas


def visible_text(html: str) -> str:
    """Texto aproximado del artículo, sin scripts/estilos ni etiquetas."""
    body = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.S)
    body = re.sub(r"<style\b[^>]*>.*?</style>", " ", body, flags=re.S)
    body = re.sub(r"<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", body)


def review(post: dict, meta: dict) -> tuple[int, list[str]]:
    slug = meta["slug"]
    html_path = ROOT / f"blog-{slug}.html"
    checks: list[tuple[str, bool, str]] = []
    if not html_path.exists():
        return 0, [f"    [ ] HTML no encontrado: blog-{slug}.html (ejecuta build_html.py)"]
    html = html_path.read_text(encoding="utf-8")
    kw = strip_accents(meta["primary_keyword"])
    kw_root = " ".join(kw.split()[:2])
    text_norm = strip_accents(visible_text(html))

    # 1. Título: núcleo (sin sufijo de marca) <= 60 caracteres
    core_title = meta["title"]
    checks.append((f"Título <= {TITLE_MAX} chars", len(core_title) <= TITLE_MAX,
                   f"{len(core_title)} chars"))

    # 2. Meta description 140-158
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    dlen = len(m.group(1)) if m else 0
    checks.append(("Meta description 140-158", DESC_MIN <= dlen <= DESC_MAX,
                   f"{dlen} chars"))

    # 3. Un solo H1 y contiene la keyword
    h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", html, flags=re.S)
    one_h1 = len(h1s) == 1
    h1_kw = one_h1 and (kw in strip_accents(h1s[0]) or kw_root in strip_accents(h1s[0]))
    checks.append(("H1 único con la keyword", one_h1 and h1_kw,
                   f"{len(h1s)} H1; keyword={'sí' if h1_kw else 'no'}"))

    # 4. Keyword en el primer párrafo (lead) o en la respuesta rápida
    lead0 = strip_accents(post["lead"][0]) if post.get("lead") else ""
    qa = strip_accents(post.get("quick_answer", ""))
    in_intro = kw in lead0 or kw_root in lead0 or kw in qa or kw_root in qa
    checks.append(("Keyword en intro/respuesta rápida", in_intro,
                   "sí" if in_intro else "no"))

    # 5. Keyword en al menos un H2
    h2s = re.findall(r"<h2\b[^>]*>(.*?)</h2>", html, flags=re.S)
    in_h2 = any(kw in strip_accents(h) or kw_root in strip_accents(h) for h in h2s)
    checks.append(("Keyword en algún H2", in_h2, "sí" if in_h2 else "no"))

    # 6. >= 3 enlaces internos a otros posts del blog en el HTML
    internal = len(re.findall(r'href="/blog-[a-z0-9-]+"', html))
    checks.append((">= 3 enlaces internos", internal >= 3, f"{internal} enlaces /blog-"))

    # 7. CTA que enlaza al curso (course_url)
    course = meta["course_url"]
    has_cta = f'href="{course}"' in html
    checks.append(("CTA enlaza al curso", has_cta, f'{course} {"ok" if has_cta else "AUSENTE"}'))

    # 8. Canonical presente y correcto
    canon = f'<link rel="canonical" href="{SITE}/blog-{slug}">'
    checks.append(("Canonical correcto", canon in html, "ok" if canon in html else "no coincide"))

    # 9. Datos estructurados (BlogPosting + FAQPage) y og:image
    has_schema = '"BlogPosting"' in html and '"FAQPage"' in html
    has_ogimg = 'property="og:image"' in html
    checks.append(("Schema BlogPosting+FAQPage y og:image", has_schema and has_ogimg,
                   f"schema={'sí' if has_schema else 'no'} og:image={'sí' if has_ogimg else 'no'}"))

    # 10. Sin keyword stuffing y con alt en la imagen de portada
    kw_count = text_norm.count(kw)
    cover = re.search(r'<div class="blog-post-cover".*?<img\b[^>]*>', html, flags=re.S)
    cover_alt = bool(cover and re.search(r'\balt="[^"]+"', cover.group(0)))
    ok10 = kw_count <= KEYWORD_STUFFING_MAX and cover_alt
    checks.append(("Sin keyword stuffing + alt en portada",
                   ok10, f"keyword x{kw_count} (max {KEYWORD_STUFFING_MAX}); alt={'sí' if cover_alt else 'no'}"))

    score = sum(1 for _, ok, _ in checks if ok)
    lines = [f"    [{'x' if ok else ' '}] {name}: {detail}" for name, ok, detail in checks]
    return score, lines


def main() -> None:
    batch = Path(sys.argv[1]) if len(sys.argv) > 1 else \
        POSTS_DIR / "batch-mathekids-soroban-2026-09.json"
    posts = json.loads(batch.read_text(encoding="utf-8"))
    metas = load_plan_index()

    worst = 10
    print(f"== SEO on-page: {batch.name} ({len(posts)} posts) ==\n")
    for post in posts:
        meta = metas.get(post["id"])
        if not meta:
            print(f"id {post['id']}: SIN metadatos en el plan\n")
            worst = 0
            continue
        score, lines = review(post, meta)
        worst = min(worst, score)
        verdict = "10/10" if score == 10 else (f"{score}/10 OK" if score >= 8 else f"{score}/10 MEJORAR")
        print(f"id {post['id']} · {post['slug']} → SEO {verdict}")
        print("\n".join(lines))
        print()

    print(f"== Peor SEO del lote: {worst}/10 ==")
    if worst < 8:
        print("HAY POSTS CON SEO DÉBIL: corregir antes de cerrar.")
        sys.exit(1)
    if worst < 10:
        print("SEO aceptable, pero hay puntos mejorables para dejarlo impecable.")
        sys.exit(2)
    print("SEO on-page impecable en todo el lote.")


if __name__ == "__main__":
    main()
