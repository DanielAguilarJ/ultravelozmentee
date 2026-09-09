#!/usr/bin/env python3
"""Audita la experiencia de lectura compartida por los posts modernos.

La calidad editorial y el SEO ya tienen revisores propios. Este tercer revisor
comprueba que el HTML generado conserve una experiencia de lectura completa:
jerarquía, orientación, accesibilidad, responsive, interacción y salida impresa.
Una nota menor de 10 bloquea el commit; una nota menor de 5 se marca además como
crítica para obligar a diagnosticar la causa antes de una nueva vuelta.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import review_strict_content as strict

ROOT = Path(__file__).parents[2]
CSS_PATH = ROOT / "css" / "blog-editorial.css"
SCRIPT_PATH = ROOT / "js" / "blog-article.js"


def contains_all(text: str, fragments: tuple[str, ...]) -> bool:
    return all(fragment in text for fragment in fragments)


def main_fragment(html: str) -> str:
    match = re.search(r'<main\b[^>]*id="main-content"[^>]*>(.*?)</main>', html, re.DOTALL)
    return match.group(1) if match else ""


def review(html: str, css: str, script: str) -> tuple[int, list[str]]:
    main = main_fragment(html)
    sections = re.findall(
        r'<section class="ed-article-section" id="([^"]+)" aria-labelledby="([^"]+)">',
        main,
    )
    toc_targets = set(re.findall(r'class="ed-toc-link" href="#([^"]+)"', main))
    heading_ids = set(re.findall(r'<h2 id="([^"]+)"', main))
    section_contract = (
        len(sections) >= 5
        and all(section_id in toc_targets for section_id, _ in sections)
        and all(label_id in heading_ids for _, label_id in sections)
        and " style=" not in main
    )

    cover = re.search(r'<div class="blog-post-cover"[^>]*>\s*<img\b([^>]+)>', main, re.DOTALL)
    cover_attrs = cover.group(1) if cover else ""

    checks = [
        (
            contains_all(main, ('class="ed-breadcrumbs"', 'aria-label="Migas de pan"')),
            "Jerarquía semántica y migas de pan",
        ),
        (
            contains_all(main, ('class="blog-post-dek"', '<time datetime=', 'class="ed-byline"')),
            "Título, bajada, fechas y autor legibles",
        ),
        (
            bool(cover)
            and all(f'{name}="' in cover_attrs for name in ("src", "alt", "width", "height"))
            and contains_all(cover_attrs, ('fetchpriority="high"', 'decoding="async"')),
            "Portada estable, prioritaria y con texto alternativo",
        ),
        (
            contains_all(main, ('class="ed-article-layout"', 'class="ed-article-aside"')),
            "Composición editorial con columna de lectura y raíl auxiliar",
        ),
        (
            contains_all(main, ('class="ed-toc"', 'class="ed-mobile-toc"'))
            and len(toc_targets) >= len(sections) + 1,
            "Navegación interna adaptada a escritorio y móvil",
        ),
        (section_contract, "Secciones enlazables, rotuladas y sin estilos inline"),
        (
            contains_all(main, ('class="ed-quick-answer"', 'class="blog-cta-box"')),
            "Respuesta rápida y siguiente acción contextual",
        ),
        (
            contains_all(main, ('class="ed-related-posts"', 'class="ed-faq-section"', 'class="blog-author"'))
            and main.count('class="ed-related-link"') >= 4,
            "Lecturas relacionadas, FAQ y responsabilidad editorial",
        ),
        (
            contains_all(
                css,
                (
                    ".ed-article-layout",
                    "grid-template-columns:",
                    ".ed-article-aside-inner",
                    "position: sticky",
                    "@media (max-width: 64rem)",
                    "@media print",
                    ":focus-visible",
                    "prefers-reduced-motion",
                ),
            ),
            "CSS responsive, accesible, imprimible y con foco visible",
        ),
        (
            contains_all(
                script,
                ("IntersectionObserver", "aria-current", "data-reading-remaining", "ed-share-status"),
            )
            and ".innerHTML" not in script,
            "Progreso, orientación y compartir con actualización segura",
        ),
    ]
    lines = [f"  {'[x]' if passed else '[ ]'} {label}" for passed, label in checks]
    return sum(1 for passed, _ in checks if passed), lines


def main() -> None:
    records, errors = strict.strict_content()
    if errors:
        print("❌ No se puede auditar la experiencia: el contenido estricto es inválido.")
        for error in errors[:10]:
            print(f"  - {error}")
        raise SystemExit(1)

    css = CSS_PATH.read_text(encoding="utf-8")
    script = SCRIPT_PATH.read_text(encoding="utf-8")
    failures: list[tuple[int, str, int, list[str]]] = []
    scores: list[int] = []
    for _, post in sorted(records, key=lambda item: item[1]["id"]):
        path = ROOT / f"blog-{post['slug']}.html"
        if not path.is_file():
            failures.append((post["id"], post["slug"], 0, ["  [ ] Falta el HTML generado"]))
            scores.append(0)
            continue
        score, lines = review(path.read_text(encoding="utf-8"), css, script)
        scores.append(score)
        if score != 10:
            failures.append((post["id"], post["slug"], score, lines))

    if failures:
        print("❌ Experiencia visual del blog:")
        for post_id, slug, score, lines in failures[:10]:
            severity = " — SEGUNDA VUELTA OBLIGATORIA" if score < 5 else ""
            print(f"  id {post_id} · {slug}: {score}/10{severity}")
            for line in lines:
                if "[ ]" in line:
                    print(line)
        if len(failures) > 10:
            print(f"  ... y {len(failures) - 10} posts más")
        raise SystemExit(1)

    average = sum(scores) / len(scores) if scores else 0
    print(
        f"✅ Experiencia visual del blog: {len(scores)} posts modernos, "
        f"promedio {average:.1f}/10 y mínimo {min(scores) if scores else 0}/10."
    )


if __name__ == "__main__":
    main()
