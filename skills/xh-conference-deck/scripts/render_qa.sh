#!/bin/bash
# Rebuild the Xinhuang conference deck, validate it and render every slide to JPG for visual QA.
# Usage (from repo root):  bash skills/xh-conference-deck/scripts/render_qa.sh [fig]
#   fig   also re-run deck/figures/make_figures.py (set XH_DEM_DIR for hillshade)
# Env:    NODE_PATH  dir containing pptxgenjs + jszip (npm install pptxgenjs somewhere and point here)
#         PPTX_SKILL path to the Anthropic pptx skill (for validate.py and the soffice wrapper), optional
#         OUT        render directory (default: ./render_qa)   RES  jpg dpi (default 80)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="${OUT:-$ROOT/render_qa}"
DECK="$ROOT/deck/Xinhuang_Rural_Transit_Conference.pptx"
cd "$ROOT"
if [ "${1:-}" == "fig" ]; then python3 deck/figures/make_figures.py; fi
node deck/build_deck.js
# duplicate-pPr check (validate.py does not catch it)
python3 - "$DECK" <<'EOF'
import re, sys, zipfile
z = zipfile.ZipFile(sys.argv[1]); bad = 0
for n in z.namelist():
    if re.match(r"ppt/slides/slide\d+\.xml$", n):
        for p in re.findall(r"<a:p>(.*?)</a:p>", z.read(n).decode(), flags=re.S):
            bad += p.count("<a:pPr") > 1
print("paragraphs with >1 pPr:", bad)
EOF
if [ -n "${PPTX_SKILL:-}" ]; then python3 "$PPTX_SKILL/scripts/office/validate.py" "$DECK" | tail -2; fi
mkdir -p "$OUT" && rm -f "$OUT"/slide-*.jpg "$OUT"/deck.pdf && cp "$DECK" "$OUT/deck.pptx"
if [ -n "${PPTX_SKILL:-}" ]; then
  python3 "$PPTX_SKILL/scripts/office/soffice.py" --headless --convert-to pdf --outdir "$OUT" "$OUT/deck.pptx" >/dev/null 2>&1
else
  soffice --headless --convert-to pdf --outdir "$OUT" "$OUT/deck.pptx" >/dev/null 2>&1
fi
pdftoppm -jpeg -r "${RES:-80}" "$OUT/deck.pdf" "$OUT/slide"
ls "$OUT"/slide-*.jpg | wc -l
