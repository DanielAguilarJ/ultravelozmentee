#!/usr/bin/env python3
"""Gate estricto para contenido moderno del blog (IDs >= 1025).

Los 317 posts históricos se produjeron bajo contratos distintos. El estándar de
10/10 comenzó en el ID 1025; desde ahí, todo post presente y futuro debe pasar
calidad + SEO on-page, integridad global y ausencia de contenido duplicado.
"""
from __future__ import annotations

from collections import defaultdict
import json
import sys
from pathlib import Path

import review_post_quality as quality
import review_seo_onpage as onpage

ROOT = Path(__file__).parents[2]
POSTS_DIR = ROOT / "content" / "posts"
STRICT_MIN_ID = 1025


def load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path.relative_to(ROOT)}: JSON inválido: {exc}") from exc


def strict_content() -> tuple[list[tuple[Path, dict]], list[str]]:
    records: list[tuple[Path, dict]] = []
    errors: list[str] = []
    for path in sorted(POSTS_DIR.glob("batch-*.json")):
        try:
            value = load_json(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if not isinstance(value, list):
            errors.append(f"{path.relative_to(ROOT)}: debe contener un arreglo")
            continue
        strict_batch = any(
            isinstance(post, dict)
            and isinstance(post.get("id"), int)
            and post["id"] >= STRICT_MIN_ID
            for post in value
        )
        if not strict_batch:
            continue
        for index, post in enumerate(value, 1):
            if not isinstance(post, dict):
                errors.append(f"{path.name} post #{index}: el post no es un objeto JSON")
                continue
            shape_errors = quality.validate_post_shape(post)
            errors.extend(f"{path.name} post #{index}: {error}" for error in shape_errors)
            post_id = post.get("id")
            if not isinstance(post_id, int) or post_id < STRICT_MIN_ID:
                errors.append(
                    f"{path.name} post #{index}: ID ausente o menor que {STRICT_MIN_ID} dentro de lote moderno"
                )
                continue
            records.append((path, post))
    return records, errors


def strict_plan_rows() -> tuple[dict[int, list[tuple[Path, dict]]], list[str]]:
    rows: dict[int, list[tuple[Path, dict]]] = defaultdict(list)
    errors: list[str] = []
    for path in quality.plan_paths():
        try:
            value = load_json(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if not isinstance(value, dict) or not isinstance(value.get("posts"), list):
            errors.append(f"{path.relative_to(ROOT)}: falta arreglo posts")
            continue
        for meta in value["posts"]:
            if not isinstance(meta, dict):
                continue
            post_id = meta.get("id")
            if isinstance(post_id, int) and post_id >= STRICT_MIN_ID and meta.get("title"):
                rows[post_id].append((path, meta))
    return rows, errors


def add_duplicate_errors(records: list[tuple[Path, dict]], plan_rows: dict[int, list[tuple[Path, dict]]],
                         errors: list[str]) -> None:
    content_ids: dict[int, list[str]] = defaultdict(list)
    content_slugs: dict[str, list[int]] = defaultdict(list)
    for path, post in records:
        content_ids[post["id"]].append(path.name)
        content_slugs[str(post["slug"])].append(post["id"])
    for post_id, paths in content_ids.items():
        if len(paths) > 1:
            errors.append(f"id de contenido duplicado {post_id}: {paths}")
    for slug, ids in content_slugs.items():
        if len(ids) > 1:
            errors.append(f"slug de contenido duplicado '{slug}': {ids}")

    for post_id, rows in plan_rows.items():
        if len(rows) > 1:
            errors.append(
                f"id de plan duplicado {post_id}: {[path.name for path, _ in rows]}"
            )


def add_unique_metadata_errors(records: list[tuple[Path, dict]], plan_rows: dict[int, list[tuple[Path, dict]]],
                               errors: list[str]) -> None:
    values: dict[str, dict[str, list[int]]] = {
        "slug": defaultdict(list),
        "title": defaultdict(list),
        "primary_keyword": defaultdict(list),
        "description": defaultdict(list),
    }
    for _, post in records:
        rows = plan_rows.get(post["id"], [])
        if len(rows) != 1:
            if not rows:
                errors.append(f"id {post['id']}: sin metadatos completos en un plan")
            continue
        _, meta = rows[0]
        if post["slug"] != meta.get("slug"):
            errors.append(
                f"id {post['id']}: slug contenido '{post['slug']}' != plan '{meta.get('slug')}'"
            )
        values["slug"][quality.normalized_block(str(meta.get("slug", "")))].append(post["id"])
        values["title"][quality.normalized_block(str(meta.get("title", "")))].append(post["id"])
        values["primary_keyword"][quality.normalized_block(str(meta.get("primary_keyword", "")))].append(post["id"])
        values["description"][quality.normalized_block(str(post.get("description", "")))].append(post["id"])

    for field, groups in values.items():
        for normalized, ids in groups.items():
            if normalized and len(ids) > 1:
                errors.append(f"{field} duplicado en IDs {ids}: '{normalized[:80]}'")


def add_cross_post_duplicate_errors(records: list[tuple[Path, dict]], errors: list[str]) -> None:
    seen: dict[str, tuple[int, str]] = {}
    for _, post in records:
        blocks: list[tuple[str, str]] = [
            (f"lead[{index}]", text) for index, text in enumerate(post["lead"], 1)
        ]
        for section_index, section in enumerate(post["sections"], 1):
            blocks.extend(
                (f"section[{section_index}].paragraphs[{index}]", text)
                for index, text in enumerate(section.get("paragraphs", []), 1)
            )
        for label, text in blocks:
            normalized = quality.normalized_block(text)
            if len(normalized.split()) < 20:
                continue
            previous = seen.get(normalized)
            if previous and previous[0] != post["id"]:
                errors.append(
                    f"bloque duplicado entre id {previous[0]} {previous[1]} "
                    f"e id {post['id']} {label}"
                )
            else:
                seen[normalized] = (post["id"], label)


def run_reviews(records: list[tuple[Path, dict]], errors: list[str]) -> None:
    metas, known_slugs = quality.load_plan_index()
    for _, post in sorted(records, key=lambda item: item[1]["id"]):
        meta = metas.get(post["id"])
        if not meta:
            continue
        existing_h2 = quality.existing_h2_by_course(meta["course_url"], {meta["slug"]})
        quality_score, quality_lines = quality.review(post, meta, known_slugs, existing_h2)
        seo_score, seo_lines = onpage.review(post, meta)
        if quality_score != 10:
            failed = [line.strip() for line in quality_lines if "[ ]" in line]
            errors.append(f"id {post['id']}: calidad {quality_score}/10: {'; '.join(failed)}")
        if seo_score != 10:
            failed = [line.strip() for line in seo_lines if "[ ]" in line]
            errors.append(f"id {post['id']}: SEO {seo_score}/10: {'; '.join(failed)}")


def main() -> None:
    records, errors = strict_content()
    plan_rows, plan_errors = strict_plan_rows()
    errors.extend(plan_errors)
    if not records:
        errors.append(f"no hay contenido estricto con id >= {STRICT_MIN_ID}")

    add_duplicate_errors(records, plan_rows, errors)
    add_unique_metadata_errors(records, plan_rows, errors)
    add_cross_post_duplicate_errors(records, errors)
    if not errors:
        run_reviews(records, errors)

    if errors:
        print("❌ Gate editorial estricto:")
        for error in errors[:30]:
            print(f"  - {error}")
        if len(errors) > 30:
            print(f"  ... y {len(errors) - 30} errores más")
        sys.exit(1)

    ids = sorted(post["id"] for _, post in records)
    print(
        f"✅ Gate editorial estricto: {len(records)} posts, "
        f"IDs {ids[0]}-{ids[-1]}, calidad y SEO 10/10."
    )


if __name__ == "__main__":
    main()
