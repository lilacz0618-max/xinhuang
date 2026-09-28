# xinhuang

Research on urban–rural public transport in Xinhuang County (Hunan, China) — Lilac, National University of Singapore.

## Conference deck

| File | What it is |
|---|---|
| `deck/Xinhuang_Rural_Transit_Conference.pptx` | Editable PowerPoint (39 main slides + 5 appendix slides, speaker notes on every slide) |
| `deck/Xinhuang_Rural_Transit_Conference_preview.pdf` | Quick preview rendered with LibreOffice (font substitutes, so spacing differs slightly from PowerPoint) |
| `deck/build_deck.js` | pptxgenjs script that builds the deck (all text, tables, native charts and diagrams) |
| `deck/figures/make_figures.py` | English maps and figures made from `deck/data/` (+ optional Copernicus DEM for hillshade) |
| `deck/data/` | v5 GeoPackages, village sampling frame, daily calendar, identifiability table, household sample |

Structure: **I** study area and data → **II** literature in six themes (synthesis on the left, supporting studies
on the right), from prior practice to design choices, gap evidence, research questions → **III** five-step
research logic, how the design evolved, integrated model, each step, hypotheses, timeline, next steps, discussion.
Content follows the v5 package (2026-09-27); where the older package differs, v5 takes precedence. All model
results in the deck come from synthetic data and are labelled as such.

### Rebuild
```bash
npm install pptxgenjs            # anywhere; then point NODE_PATH at its node_modules
pip install geopandas matplotlib rasterio pyproj
XH_DEM_DIR=/path/to/copernicus_tiles python3 deck/figures/make_figures.py   # optional: maps
NODE_PATH=/path/to/node_modules node deck/build_deck.js
bash skills/xh-conference-deck/scripts/render_qa.sh                        # validate + render for QA
```

## Skills
- `skills/xh-conference-deck/` — new: design system, slide archetypes, glossary, pptxgenjs fix, QA loop for English decks on this study.
- `skills/xinhuang-gis/` — from the v5 package (unchanged); base-map, routing, sampling-frame helpers used for the maps.
