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

import html as html_lib
import json
import re
import sys
import unicodedata
from pathlib import Path

from review_post_quality import validate_post_shape

ROOT = Path(__file__).parents[2]
POSTS_DIR = ROOT / "content" / "posts"
SITE = "https://ultravelozmente.com"

def plan_paths() -> tuple[Path, ...]:
    """Descubre planes editoriales sin una lista manual que pueda quedar obsoleta."""
    return tuple(sorted((ROOT / "reports" / "seo").glob("editorial-plan-*.json")))


# Google muestra ~60 caracteres del título; por encima se trunca en la SERP.
TITLE_MAX = 60
DESC_MIN, DESC_MAX = 140, 158
KEYWORD_STUFFING_MAX = 10  # apariciones de la frase exacta en el texto visible


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()


def load_plan_index() -> dict[int, dict]:
    metas: dict[int, dict] = {}
    for p in plan_paths():
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
    return re.sub(r"\s+", " ", html_lib.unescape(body)).strip()


def fragment_text(fragment: str) -> str:
    return visible_text(fragment)


def json_ld_nodes(html: str) -> tuple[list[dict], list[str]]:
    """Parsea JSON-LD real; buscar palabras sueltas acepta schemas corruptos."""
    nodes: list[dict] = []
    errors: list[str] = []
    scripts = re.findall(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.S | re.I,
    )
    for index, raw in enumerate(scripts, 1):
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            errors.append(f"JSON-LD #{index}: {exc.msg}")
            continue
        roots = value if isinstance(value, list) else [value]
        for root in roots:
            if not isinstance(root, dict):
                errors.append(f"JSON-LD #{index}: raíz no es objeto")
                continue
            graph = root.get("@graph")
            if isinstance(graph, list):
                nodes.extend(node for node in graph if isinstance(node, dict))
            else:
                nodes.append(root)
    if not scripts:
        errors.append("sin script JSON-LD")
    return nodes, errors


def node_has_type(node: dict, expected: str) -> bool:
    value = node.get("@type")
    return expected in value if isinstance(value, list) else value == expected


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

    # 1. Título real: único, sincronizado con el plan y núcleo <= 60
    core_title = meta["title"]
    expected_title = f"{core_title} | WorldBrain"
    title_matches = re.findall(r"<title>(.*?)</title>", html, flags=re.S | re.I)
    actual_title = html_lib.unescape(fragment_text(title_matches[0])) if len(title_matches) == 1 else ""
    title_ok = len(core_title) <= TITLE_MAX and len(title_matches) == 1 and actual_title == expected_title
    checks.append((f"Título único, sincronizado y <= {TITLE_MAX} chars", title_ok,
                   f"núcleo={len(core_title)}; tags={len(title_matches)}; coincide={'sí' if actual_title == expected_title else 'no'}"))

    # 2. Meta description única, en rango y exactamente igual al JSON fuente
    descriptions = re.findall(r'<meta\s+name="description"\s+content="([^"]*)"', html, flags=re.I)
    actual_description = html_lib.unescape(descriptions[0]) if len(descriptions) == 1 else ""
    dlen = len(actual_description)
    description_ok = (len(descriptions) == 1 and DESC_MIN <= dlen <= DESC_MAX
                      and actual_description == post["description"])
    checks.append(("Meta description única, 140-158 y sincronizada", description_ok,
                   f"{dlen} chars; tags={len(descriptions)}; coincide={'sí' if actual_description == post['description'] else 'no'}"))

    # 3. Un solo H1 y contiene la keyword
    h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", html, flags=re.S)
    one_h1 = len(h1s) == 1
    h1_text = fragment_text(h1s[0]) if one_h1 else ""
    h1_kw = one_h1 and (kw in strip_accents(h1_text) or kw_root in strip_accents(h1_text))
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
    in_h2 = any(kw in strip_accents(fragment_text(h)) or kw_root in strip_accents(fragment_text(h)) for h in h2s)
    checks.append(("Keyword en algún H2", in_h2, "sí" if in_h2 else "no"))

    # 6. >= 3 enlaces únicos a otros posts, sin enlazar al propio artículo
    internal_links = re.findall(r'href="(/blog-[a-z0-9-]+)"', html)
    unique_internal = set(internal_links)
    self_link = f"/blog-{slug}" in unique_internal
    internal_ok = len(unique_internal) >= 3 and not self_link
    checks.append((">= 3 enlaces internos únicos y sin self-link", internal_ok,
                   f"{len(unique_internal)} únicos; self={'sí' if self_link else 'no'}"))

    # 7. CTA que enlaza al curso (course_url)
    course = meta["course_url"]
    has_cta = f'href="{course}"' in html
    checks.append(("CTA enlaza al curso", has_cta, f'{course} {"ok" if has_cta else "AUSENTE"}'))

    # 8. Canonical único, autocanónico y sin directiva noindex
    expected_canonical = f"{SITE}/blog-{slug}"
    canonicals = re.findall(r'<link\s+rel="canonical"\s+href="([^"]+)"', html, flags=re.I)
    has_noindex = bool(re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', html, flags=re.I))
    canonical_ok = len(canonicals) == 1 and canonicals[0] == expected_canonical and not has_noindex
    checks.append(("Canonical único, correcto y página indexable", canonical_ok,
                   f"tags={len(canonicals)}; coincide={'sí' if canonicals == [expected_canonical] else 'no'}; "
                   f"noindex={'sí' if has_noindex else 'no'}"))

    # 9. JSON-LD parseable con entidades correctas y metadatos sociales
    nodes, schema_errors = json_ld_nodes(html)
    expected_url = f"{SITE}/blog-{slug}"
    blog_nodes = [node for node in nodes if node_has_type(node, "BlogPosting")]
    faq_nodes = [node for node in nodes if node_has_type(node, "FAQPage")]
    blog_schema_ok = any(node.get("url") == expected_url and node.get("headline") == meta["title"]
                         and node.get("description") == post["description"] for node in blog_nodes)
    faq_schema_ok = bool(faq_nodes)
    expected_image = f"{SITE}/{meta['image']}"
    og_images = re.findall(r'<meta\s+property="og:image"\s+content="([^"]+)"', html, flags=re.I)
    has_ogimg = og_images == [expected_image]
    has_twitter_card = bool(re.search(r'<meta\s+name="twitter:card"\s+content="summary_large_image"', html, flags=re.I))
    schema_ok = not schema_errors and blog_schema_ok and faq_schema_ok and has_ogimg and has_twitter_card
    checks.append(("JSON-LD válido + BlogPosting/FAQPage + social image", schema_ok,
                   f"json_errors={len(schema_errors)}; blog={'sí' if blog_schema_ok else 'no'}; "
                   f"faq={'sí' if faq_schema_ok else 'no'}; og={'sí' if has_ogimg else 'no'}; "
                   f"twitter={'sí' if has_twitter_card else 'no'}"))

    # 10. Sin keyword stuffing y portada completa (src, alt, width, height)
    kw_count = text_norm.count(kw)
    cover = re.search(r'<div class="blog-post-cover".*?<img\b[^>]*>', html, flags=re.S)
    cover_tag = cover.group(0) if cover else ""
    alt_match = re.search(r'\balt="([^"]+)"', cover_tag)
    src_match = re.search(r'\bsrc="([^"]+)"', cover_tag)
    width_match = re.search(r'\bwidth="([1-9]\d*)"', cover_tag)
    height_match = re.search(r'\bheight="([1-9]\d*)"', cover_tag)
    cover_ok = bool(
        alt_match and html_lib.unescape(alt_match.group(1)).strip()
        and src_match and src_match.group(1) == meta["image"]
        and width_match and height_match
    )
    ok10 = kw_count <= KEYWORD_STUFFING_MAX and cover_ok
    checks.append(("Sin keyword stuffing + portada con alt y dimensiones", ok10,
                   f"keyword x{kw_count} (max {KEYWORD_STUFFING_MAX}); "
                   f"portada={'completa' if cover_ok else 'incompleta'}"))

    score = sum(1 for _, ok, _ in checks if ok)
    lines = [f"    [{'x' if ok else ' '}] {name}: {detail}" for name, ok, detail in checks]
    return score, lines


def main() -> None:
    batch = Path(sys.argv[1]) if len(sys.argv) > 1 else \
        POSTS_DIR / "batch-mathekids-soroban-2026-09.json"
    posts = json.loads(batch.read_text(encoding="utf-8"))
    if not isinstance(posts, list):
        print(f"ERROR: {batch.name} debe contener un arreglo JSON de posts.")
        sys.exit(1)
    metas = load_plan_index()

    worst = 10
    print(f"== SEO on-page: {batch.name} ({len(posts)} posts) ==\n")
    for index, post in enumerate(posts, 1):
        shape_errors = validate_post_shape(post)
        if shape_errors:
            print(f"post #{index} · id {post.get('id', '?')} → CONTRATO INVÁLIDO")
            for error in shape_errors:
                print(f"    [ ] {error}")
            print()
            worst = 0
            continue
        meta = metas.get(post["id"])
        if not meta:
            print(f"id {post['id']}: SIN metadatos en el plan\n")
            worst = 0
            continue
        if post["slug"] != meta["slug"]:
            print(f"id {post['id']}: slug del contenido no coincide con el plan\n")
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
