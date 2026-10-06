"""Deterministic, read-only-source contact sheets for independent visual review."""
import json
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


run = Path(sys.argv[1]).resolve()
report = json.loads((run / "evidence/browser-report.json").read_text())
shots = sorted(report["shots"], key=lambda shot: shot["path"])
assert len({shot["path"] for shot in shots}) == len(shots)
destination = run / "evidence/review"
destination.mkdir(exist_ok=True)
font = ImageFont.load_default(size=15)
tile_width, tile_height, columns, rows = 440, 550, 3, 4
inventory = []
for start in range(0, len(shots), columns * rows):
    group = shots[start:start + columns * rows]
    canvas = Image.new("RGB", (tile_width * columns, tile_height * rows), "#dedede")
    draw = ImageDraw.Draw(canvas)
    for position, shot in enumerate(group):
        source = run / shot["path"]
        with Image.open(source) as original:
            assert original.size == (shot["width"], shot["height"]), source
            thumb = original.convert("RGB")
            thumb.thumbnail((420, 480), Image.Resampling.LANCZOS)
        left = (position % columns) * tile_width
        top = (position // columns) * tile_height
        draw.rectangle((left + 3, top + 3, left + tile_width - 3, top + tile_height - 3), fill="white")
        label = f"{start + position + 1:03d}  {source.name}"
        for line_number, line in enumerate(textwrap.wrap(label, width=48)):
            draw.text((left + 10, top + 8 + 18 * line_number), line, fill="black", font=font)
        canvas.paste(thumb, (left + (tile_width - thumb.width) // 2, top + 62))
    sheet = destination / f"contact-{start // (columns * rows) + 1:02d}.png"
    canvas.save(sheet)
    inventory.append({"sheet": sheet.name, "shots": [shot["path"] for shot in group]})
(destination / "contact-sheet-index.json").write_text(json.dumps({"reviewer": "Codex independent reviewer — sprint_review_20261006", "count": len(shots), "sheets": inventory}, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"screenshots": len(shots), "contact_sheets": len(inventory)}))
