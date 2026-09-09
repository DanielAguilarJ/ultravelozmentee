#!/usr/bin/env python3
"""Revisor de calidad 0-10 para posts nuevos del blog.

Puntúa cada post de un batch contra el CONTENT_CONTRACT y las mejores
prácticas de SEO on-page del proyecto, con 10 comprobaciones objetivas y
reproducibles (1 punto cada una). Un post con < 5 se marca REVISAR: hay que
identificar qué falló y resolverlo antes de darlo por cerrado.

Uso:
    python3 tools/seo_content/review_post_quality.py content/posts/batch-mathekids-soroban-2026-09.json

El conteo de palabras usa EXACTAMENTE la misma fórmula que build_html.py
(word_count_of), así que el número que aquí se valida es el mismo que se
sirve. No escribe nada: solo mide y reporta.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).parents[2]
POSTS_DIR = ROOT / "content" / "posts"
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

# Superlativos / promesas prohibidas por el CONTENT_CONTRACT y el marketing
# de humo típico del nicho. Se buscan como frase, no como palabra suelta,
# para no castigar usos legítimos ("mejor concentración").
BANNED = [
    r"\bel mejor\b", r"\bla mejor\b", r"\blos mejores\b", r"\blas mejores\b",
    r"garantiz\w*", r"\bl[ií]der\b", r"\bdefinitiv\w*", r"\bn[uú]mero uno\b",
    r"\bmilagro\w*", r"\binsuperable\b", r"\bel [uú]nico\b",
    r"vuelve\w*\s+\w*\s*genio", r"convierte\w*\s+\w*\s*genio", r"\bgenios?\b",
    r"al 100\s*%", r"cerebro al 100",
]
# Marcadores de que un superlativo aparece para DESMENTIRLO o negarlo (post
# de mitos, FAQ que aclara): un hit dentro de una frase así no es violación.
NEGATION = ["no ", "mito", "sin ", "ning", "evita", "exager", "falso", "no existe",
            "no hay", "no es", "no son", "no puede", "tampoco", "irreal", "promet"]

# Frases que el gate real del proyecto (scripts/seo-audit.js) BLOQUEA de forma
# dura, sin excepción por contexto ni negación. Si aparecen literalmente, el
# commit se bloquea, así que aquí también cuestan el punto siempre.
HARD_FORBIDDEN = [
    r"resultados garantizados", r"garant[ií]a de aprobaci[oó]n",
    r"certificado oficial SEP", r"100\s*%\s*certificado",
    r"validez oficial al 100", r"simuladores?\s+id[eé]nticos?",
]

NUM_CLAIM = re.compile(r"\b\d+\s?%|\bestudios?\b|\bcient[ií]ficamente\b|\bcomprobad\w*\b")


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()


def word_count_of(post: dict) -> int:
    """Idéntico a build_html.word_count_of (incluye CTA)."""
    text = post["quick_answer"] + " " + " ".join(post["lead"])
    for s in post["sections"]:
        text += " " + s["heading"]
        text += " " + " ".join(s.get("paragraphs", []))
        text += " " + " ".join(s.get("bullets", []))
        text += " " + " ".join(s.get("steps", []))
    for f in post["faq"]:
        text += " " + f["question"] + " " + f["answer"]
    text += " " + post["cta"]["heading"] + " " + post["cta"]["text"]
    return len(text.split())


def all_text(post: dict) -> str:
    parts = [post["quick_answer"], *post["lead"], post["cta"]["heading"], post["cta"]["text"]]
    for s in post["sections"]:
        parts += [s["heading"], *s.get("paragraphs", []), *s.get("bullets", []), *s.get("steps", [])]
    for f in post["faq"]:
        parts += [f["question"], f["answer"]]
    return " ".join(parts)


def sentences(text: str) -> list[str]:
    return re.split(r"(?<=[\.\?\!])\s+", text)


def load_plan_index() -> tuple[dict[int, dict], set[str]]:
    metas: dict[int, dict] = {}
    slugs: set[str] = set()
    for p in PLANS:
        if not p.exists():
            continue
        for m in json.loads(p.read_text(encoding="utf-8"))["posts"]:
            if m.get("slug"):
                slugs.add(m["slug"])
                if m.get("title"):
                    metas[m["id"]] = m
    return metas, slugs


def existing_h2_by_course(course_url: str, exclude_slugs: set[str]) -> set[str]:
    """H2 (normalizados) de los HTML ya publicados del mismo curso, para
    detectar canibalización de ángulo."""
    metas, _ = load_plan_index()
    same = [m for m in metas.values()
            if m.get("course_url") == course_url and m["slug"] not in exclude_slugs]
    h2s: set[str] = set()
    for m in same:
        html = ROOT / f"blog-{m['slug']}.html"
        if not html.exists():
            continue
        for h in re.findall(r"<h2>([^<]+)</h2>", html.read_text(encoding="utf-8")):
            h2s.add(strip_accents(h.strip()))
    return h2s


def review(post: dict, plan_meta: dict, known_slugs: set[str],
           existing_h2: set[str]) -> tuple[int, list[str]]:
    checks: list[tuple[str, bool, str]] = []
    text_norm = strip_accents(all_text(post))
    kw = strip_accents(plan_meta["primary_keyword"])

    # 1. Conteo de palabras 1400-1800
    wc = word_count_of(post)
    checks.append(("Palabras 1400-1800", 1400 <= wc <= 1800, f"{wc} palabras"))

    # 2. 5-7 secciones H2
    ns = len(post["sections"])
    checks.append(("5-7 secciones H2", 5 <= ns <= 7, f"{ns} secciones"))

    # 3. 3-5 FAQ
    nf = len(post["faq"])
    checks.append(("3-5 FAQ", 3 <= nf <= 5, f"{nf} FAQ"))

    # 4. quick_answer 45-80 palabras
    qw = len(post["quick_answer"].split())
    checks.append(("quick_answer 45-80 palabras", 45 <= qw <= 80, f"{qw} palabras"))

    # 5. description 140-158 caracteres
    dl = len(post["description"])
    checks.append(("description 140-158 chars", 140 <= dl <= 158, f"{dl} chars"))

    # 6. Sin frases prohibidas del gate real + sin superlativos afirmativos
    #    (los que aparecen negados/desmentidos se toleran SOLO si no son
    #    frases de bloqueo duro del proyecto)
    full = all_text(post)
    hard = [p for p in HARD_FORBIDDEN if re.search(p, strip_accents(full))]
    violations = []
    for sent in sentences(full):
        sn = strip_accents(sent)
        if any(m in sn for m in NEGATION):
            continue
        for pat in BANNED:
            if re.search(pat, sn):
                violations.append(sent.strip()[:70])
                break
    ok6 = not violations and not hard
    detail6 = "ok"
    if hard:
        detail6 = f"FRASE PROHIBIDA (bloquea commit): {hard}"
    elif violations:
        detail6 = f"{len(violations)}: {violations[:2]}"
    checks.append(("Sin frases prohibidas ni superlativos", ok6, detail6))

    # 7. Prominencia de la keyword principal (en título o quick_answer, y en >=1 H2)
    in_title_or_qa = kw in strip_accents(plan_meta["title"]) or kw in strip_accents(post["quick_answer"])
    in_h2 = any(kw in strip_accents(s["heading"]) for s in post["sections"])
    # tolerancia: keyword parcial (raíz de >=2 palabras) también cuenta en H2
    root = " ".join(kw.split()[:2])
    in_h2 = in_h2 or any(root in strip_accents(s["heading"]) for s in post["sections"])
    checks.append(("Keyword en título/quick_answer + H2", in_title_or_qa and in_h2,
                   f"titulo/qa={in_title_or_qa} h2={in_h2}"))

    # 8. >=4 related que resuelven a slugs reales del plan
    related = post.get("related", [])
    resolved = [s for s in related if s in known_slugs]
    checks.append((">=4 related válidos", len(resolved) >= 4,
                   f"{len(resolved)}/{len(related)} resuelven"))

    # 9. sources presente (lista) y sin cifras/estudios sin fuente en el cuerpo
    has_sources_field = isinstance(post.get("sources"), list)
    body_num = NUM_CLAIM.search(all_text(post))
    ok_sources = has_sources_field and (post["sources"] or not body_num)
    detail = "lista ok" if has_sources_field else "FALTA campo sources"
    if has_sources_field and not post["sources"] and body_num:
        detail = f"afirmacion numerica/estudio sin fuente: '{body_num.group()}'"
    checks.append(("sources presente y sin cifras sin fuente", ok_sources, detail))

    # 10. Ángulo único: ningún H2 igual a un H2 ya publicado del mismo curso
    my_h2 = {strip_accents(s["heading"].strip()) for s in post["sections"]}
    dup = my_h2 & existing_h2
    checks.append(("Ángulo único (H2 no duplicados)", not dup,
                   "ok" if not dup else f"duplican: {list(dup)[:1]}"))

    score = sum(1 for _, ok, _ in checks if ok)
    lines = [f"    [{'x' if ok else ' '}] {name}: {detail}" for name, ok, detail in checks]
    return score, lines


def main() -> None:
    batch = Path(sys.argv[1]) if len(sys.argv) > 1 else \
        POSTS_DIR / "batch-mathekids-soroban-2026-09.json"
    posts = json.loads(batch.read_text(encoding="utf-8"))
    metas, known_slugs = load_plan_index()

    worst = 10
    print(f"== Revisión de calidad: {batch.name} ({len(posts)} posts) ==\n")
    for post in posts:
        meta = metas.get(post["id"])
        if not meta:
            print(f"id {post['id']}: SIN metadatos en el plan (no se puede revisar)\n")
            worst = 0
            continue
        existing_h2 = existing_h2_by_course(meta["course_url"], {meta["slug"]})
        score, lines = review(post, meta, known_slugs, existing_h2)
        worst = min(worst, score)
        verdict = "10/10" if score == 10 else (f"{score}/10 OK" if score >= 5 else f"{score}/10 REVISAR")
        print(f"id {post['id']} · {post['slug']} → {verdict}")
        print("\n".join(lines))
        print()

    print(f"== Peor puntuación del lote: {worst}/10 ==")
    if worst < 5:
        print("HAY POSTS POR DEBAJO DE 5: identificar qué faltó y resolver antes de cerrar.")
        sys.exit(1)
    if worst < 10:
        print("Todos aprueban (>=5), pero hay puntos mejorables. Subir a 10 donde sea posible.")
        sys.exit(2)
    print("Todos los posts 10/10.")


if __name__ == "__main__":
    main()
