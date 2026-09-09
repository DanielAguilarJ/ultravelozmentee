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

def plan_paths() -> tuple[Path, ...]:
    """Descubre planes editoriales sin exigir registrar cada archivo a mano."""
    return tuple(sorted((ROOT / "reports" / "seo").glob("editorial-plan-*.json")))


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


def validate_post_shape(post: object) -> list[str]:
    """Valida el contrato mínimo antes de puntuar para evitar KeyError y falsos 10."""
    if not isinstance(post, dict):
        return ["el post no es un objeto JSON"]
    errors: list[str] = []
    scalar_fields = ("id", "slug", "description", "quick_answer")
    for field in scalar_fields:
        value = post.get(field)
        if value is None or isinstance(value, (dict, list)) or str(value).strip() == "":
            errors.append(f"campo {field} ausente o vacío")
    if not isinstance(post.get("lead"), list) or not all(isinstance(x, str) for x in post.get("lead", [])):
        errors.append("lead debe ser una lista de textos")
    sections = post.get("sections")
    if not isinstance(sections, list) or not sections:
        errors.append("sections debe ser una lista no vacía")
    else:
        for index, section in enumerate(sections, 1):
            if not isinstance(section, dict) or not str(section.get("heading", "")).strip():
                errors.append(f"sections[{index}] sin heading")
            if not isinstance(section.get("paragraphs"), list) or not section.get("paragraphs"):
                errors.append(f"sections[{index}] sin paragraphs")
    faq = post.get("faq")
    if not isinstance(faq, list):
        errors.append("faq debe ser una lista")
    elif not all(isinstance(x, dict) and str(x.get("question", "")).strip()
                 and str(x.get("answer", "")).strip() for x in faq):
        errors.append("cada FAQ necesita question y answer")
    cta = post.get("cta")
    if not isinstance(cta, dict) or not all(str(cta.get(k, "")).strip() for k in ("heading", "text", "label")):
        errors.append("cta necesita heading, text y label")
    return errors


def normalized_block(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", strip_accents(text))).strip()


def duplicate_long_blocks(post: dict, min_words: int = 20) -> list[str]:
    """Detecta relleno copiado dentro del mismo post, ignorando frases cortas."""
    seen: dict[str, str] = {}
    duplicates: list[str] = []
    blocks: list[tuple[str, str]] = [(f"lead[{i}]", text) for i, text in enumerate(post["lead"], 1)]
    for section_index, section in enumerate(post["sections"], 1):
        for field in ("paragraphs", "bullets", "steps"):
            blocks.extend((f"section[{section_index}].{field}[{i}]", text)
                          for i, text in enumerate(section.get(field, []), 1))
    for label, text in blocks:
        normalized = normalized_block(text)
        if len(normalized.split()) < min_words:
            continue
        if normalized in seen:
            duplicates.append(f"{seen[normalized]}={label}")
        else:
            seen[normalized] = label
    return duplicates


def load_plan_index() -> tuple[dict[int, dict], set[str]]:
    metas: dict[int, dict] = {}
    slugs: set[str] = set()
    for p in plan_paths():
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

    # 2. 5-7 secciones, con encabezados únicos
    ns = len(post["sections"])
    heading_norm = [normalized_block(section["heading"]) for section in post["sections"]]
    duplicated_headings = len(heading_norm) != len(set(heading_norm))
    checks.append(("5-7 secciones H2 únicas", 5 <= ns <= 7 and not duplicated_headings,
                   f"{ns} secciones; duplicados={'sí' if duplicated_headings else 'no'}"))

    # 3. 3-5 FAQ, preguntas únicas y respuestas sustanciales
    nf = len(post["faq"])
    faq_questions = [normalized_block(item["question"]) for item in post["faq"]]
    faq_words = [len(item["answer"].split()) for item in post["faq"]]
    faq_answers_ok = bool(faq_words) and all(35 <= count <= 90 for count in faq_words)
    faq_unique = len(faq_questions) == len(set(faq_questions))
    checks.append(("3-5 FAQ únicas con respuestas de 35-90 palabras",
                   3 <= nf <= 5 and faq_answers_ok and faq_unique,
                   f"{nf} FAQ; respuestas={min(faq_words, default=0)}-{max(faq_words, default=0)} palabras; "
                   f"duplicadas={'sí' if not faq_unique else 'no'}"))

    # 4. quick_answer citable y dos párrafos de introducción sustanciales
    qw = len(post["quick_answer"].split())
    lead_words = [len(paragraph.split()) for paragraph in post["lead"]]
    lead_ok = len(lead_words) == 2 and all(35 <= count <= 100 for count in lead_words)
    checks.append(("quick_answer 45-80 + lead 2x35-100 palabras",
                   45 <= qw <= 80 and lead_ok,
                   f"quick={qw}; lead={lead_words}"))

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

    # 8. >=4 related reales, únicos y sin enlazar al propio post
    related = post.get("related", [])
    related_is_list = isinstance(related, list) and all(isinstance(slug, str) for slug in related)
    unique_related = list(dict.fromkeys(related)) if related_is_list else []
    resolved = [slug for slug in unique_related if slug in known_slugs]
    has_self_link = plan_meta["slug"] in unique_related
    related_ok = (related_is_list and len(resolved) >= 4
                  and len(unique_related) == len(related) and not has_self_link)
    checks.append((">=4 related válidos, únicos y sin self-link", related_ok,
                   f"{len(resolved)}/{len(related) if related_is_list else 0} resuelven; "
                   f"duplicados={'sí' if related_is_list and len(unique_related) != len(related) else 'no'}; "
                   f"self={'sí' if has_self_link else 'no'}"))

    # 9. sources presente, con estructura válida, y claims sensibles respaldados
    has_sources_field = isinstance(post.get("sources"), list)
    sources = post.get("sources", []) if has_sources_field else []
    sources_valid = all(
        isinstance(source, dict)
        and str(source.get("name", "")).strip()
        and str(source.get("note", "")).strip()
        and re.match(r"^https://[^\s]+$", str(source.get("url", "")))
        for source in sources
    )
    body_num = NUM_CLAIM.search(all_text(post))
    ok_sources = has_sources_field and sources_valid and (sources or not body_num)
    detail = "lista ok" if has_sources_field and sources_valid else "FALTA sources o fuente inválida"
    if has_sources_field and sources_valid and not sources and body_num:
        detail = f"afirmacion numerica/estudio sin fuente: '{body_num.group()}'"
    checks.append(("sources válidas y claims sensibles respaldados", ok_sources, detail))

    # 10. Ángulo único y sin bloques largos copiados dentro del artículo
    my_h2 = {strip_accents(s["heading"].strip()) for s in post["sections"]}
    duplicated_h2 = my_h2 & existing_h2
    duplicated_blocks = duplicate_long_blocks(post)
    unique_ok = not duplicated_h2 and not duplicated_blocks
    detail10 = "ok"
    if duplicated_h2:
        detail10 = f"H2 duplicado: {list(duplicated_h2)[:1]}"
    elif duplicated_blocks:
        detail10 = f"bloques duplicados: {duplicated_blocks[:2]}"
    checks.append(("Ángulo único y sin bloques duplicados", unique_ok, detail10))

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
    metas, known_slugs = load_plan_index()

    worst = 10
    print(f"== Revisión de calidad: {batch.name} ({len(posts)} posts) ==\n")
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
            print(f"id {post['id']}: SIN metadatos en el plan (no se puede revisar)\n")
            worst = 0
            continue
        if post["slug"] != meta["slug"]:
            print(f"id {post['id']}: slug del contenido '{post['slug']}' no coincide con el plan '{meta['slug']}'\n")
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
