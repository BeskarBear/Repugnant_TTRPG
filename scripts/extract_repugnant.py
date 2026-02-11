#!/usr/bin/env python3
import json
import re
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
TEXT_PATH = ROOT / "data" / "Repugnant_ocr3.txt"
FALLBACK_PATH = ROOT / "data" / "Repugnant_ocr.txt"
OUT_JSON = ROOT / "data" / "repugnant_items.json"
OUT_DB = ROOT / "packs" / "repugnant-items.db"

ITEM_START_RE = re.compile(r"^\s*\[\]\s*([^:]{2,}):\s*(.*)$")
COST_RE = re.compile(r"\bCost\s*[:\.]+\s*([^\.\n]+)", re.IGNORECASE)
EFFECT_RE = re.compile(r"\bEffect\s*[:\.]+\s*([^\.\n]+)", re.IGNORECASE)


def normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = text.replace("\u2019", "'")
    return text.strip(" -\t\n\r")


def guess_type(text: str) -> str:
    low = text.lower()
    if "armor" in low:
        return "armor"
    if any(w in low for w in ["weapon", "mallet", "mace", "bow", "blade", "club"]):
        return "weapon"
    return "item"


def parse_items(lines):
    items = []
    current = None

    def flush():
        nonlocal current
        if not current:
            return
        full_text = normalize(" ".join(current["lines"]))
        cost = ""
        effect = ""
        m = COST_RE.search(full_text)
        if m:
            cost = normalize(m.group(1))
        m = EFFECT_RE.search(full_text)
        if m:
            effect = normalize(m.group(1))

        items.append(
            {
                "name": normalize(current["name"]),
                "type": guess_type(full_text),
                "description": full_text,
                "cost": cost,
                "effect": effect,
            }
        )
        current = None

    for line in lines:
        m = ITEM_START_RE.match(line)
        if m:
            flush()
            current = {"name": m.group(1), "lines": [m.group(2)]}
            continue
        if current:
            if not line.strip():
                flush()
                continue
            current["lines"].append(line)

    flush()
    return items


def main():
    path = TEXT_PATH if TEXT_PATH.exists() else FALLBACK_PATH
    if not path.exists():
        raise SystemExit(f"Missing OCR text: {path}")

    lines = path.read_text(errors="ignore").splitlines()
    items = parse_items(lines)

    OUT_JSON.write_text(json.dumps(items, indent=2))

    OUT_DB.parent.mkdir(parents=True, exist_ok=True)
    with OUT_DB.open("w", encoding="utf-8") as f:
        for item in items:
            doc = {
                "_id": uuid4().hex[:16],
                "name": item["name"],
                "type": item["type"],
                "img": "icons/svg/item-bag.svg",
                "system": {
                    "description": item["description"],
                    "cost": item["cost"],
                    "effect": item["effect"],
                    "tags": []
                }
            }
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")

    print(f"Extracted {len(items)} items -> {OUT_JSON} and {OUT_DB}")


if __name__ == "__main__":
    main()
