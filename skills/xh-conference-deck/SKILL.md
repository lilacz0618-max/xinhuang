---
name: xh-conference-deck
description: Build, update and QA the English-language academic conference deck (editable .pptx) for the Xinhuang urban–rural bus study — design tokens, slide archetypes (title + map, section divider, literature slide with synthesis left / references right, native tables, framework diagram, native Gantt), English maps rendered from the project GeoPackages with a Copernicus DEM hillshade, a Chinese→English glossary, SYNTHETIC-labelling rules, a fix for pptxgenjs multi-run paragraphs, and a render-and-inspect QA loop. Use when making or revising any slide deck, poster or figure set that presents this research to an English-speaking audience.
---

# xh-conference-deck

Canonical implementation (in this repo):

| File | Role |
|---|---|
| `deck/build_deck.js` | pptxgenjs builder: design tokens, helpers, all slides, speaker notes, OOXML clean-up |
| `deck/figures/make_figures.py` | English maps and figures from `deck/data/*` (+ optional DEM) → `deck/figures/*.png`, `fig_numbers.json` |
| `deck/data/` | v5 GeoPackages, village frame, daily calendar, identifiability table, household sample |
| `skills/xh-conference-deck/scripts/render_qa.sh` | rebuild → validate → render every slide to JPG |
| `skills/xh-conference-deck/scripts/fix_pptxgenjs_paragraphs.js` | standalone post-processor for any pptxgenjs file |
| `skills/xh-conference-deck/glossary.md` | place names, factor codes and terms, Chinese → English |

## Why this is a full skill (project criteria, round-5 comment 7)
Repetition 3 (conference, defence, poster decks will recur) · importance 3 · error cost 3 (a mislabelled
synthetic number or a corrupt file is costly in public) · specialised knowledge 3 (glossary, v5 conventions) ·
reproducibility 3 → 15 ≥ 12 ⇒ full skill with code.

## Content rules (non-negotiable)
1. **Source of truth = the latest package** (currently v5, 2026-09-27). If an older package disagrees, v5 wins;
   say so in speaker notes when the user's own framing differs (e.g. market day and weather are *controls* in v5,
   not core drivers — present them as "estimated as baseline controls", never drop them silently).
2. **Every synthetic number is labelled.** Slides showing backtest / integrated-validation results carry the
   `badge()` "SYNTHETIC DATA · tests the method, not Xinhuang ridership". Real-data facts (timetable, calendar,
   identifiability counts, GIS) carry no badge. Never present synthetic results as findings about Xinhuang.
3. **No Chinese characters on slides** except inside the reference list when a title is untranslatable; Chinese
   papers are cited as "Author (Year) … (in Chinese)". Place names in pinyin per `glossary.md`.
4. Numbers come from the package documents / CSVs, never retyped from memory. Where a number comes from a v4
   figure (terrain table, segment supply), say "v4 route analysis".
5. Research questions, hypotheses and the method choice (M11/12, frozen 1 Jan 2027) are quoted, not re-derived.

## Design system (restrained academic)
- Layout `LAYOUT_WIDE` 13.333 × 7.5 in, margins 0.6 in. White background; `tint F3F5F8` panels.
- Fonts: headings **Cambria**, body **Calibri** (QA renders them with Caladea/Carlito — install
  `fonts-crosextra-carlito fonts-crosextra-caladea`, otherwise text-fit QA is meaningless).
- Colours: ink `1F2937`, secondary `4B5563`, muted `8B95A1`, primary `1C4E80`, primary-light `E3ECF6`,
  accent `C2410C` (only for "how this study responds", key warnings, milestones), accent-light `FBEDE5`.
- Header = small caps kicker (section · slide role) + Cambria 25 pt assertion title. No bars, no title underlines.
- Footer = presenter · affiliation · short title (8.5 pt muted) + "n / N". Appendix slides numbered A1…
- Route colours = validated categorical slots 1–7 (`2A78D6 EB6834 1BAF7A EDA100 E87BA4 008300 4A3AA7`),
  always with direct labels (7 hues cannot be told apart by colour alone).

## Slide archetypes (functions in `build_deck.js`)
- `header(slide, kicker, title)`; `divider(numeral, title, sub, activeIndex)`.
- `litSlide({kicker,title,consensus,methods,limits,implication,refs,fs,rfs,leftH,ifs,notes})` — left: "What is
  established / Methods in use / Limitations" with bracketed markers `[1–3]`; bottom-left accent box "→ How this
  study responds"; right: numbered "Key studies" (bold authors-year · italic venue · one-line finding).
  Keep ≤ 11 refs; defaults fs 12.5, rfs 10.2, leftH 4.0 — lower rfs/leftH when a theme has more refs.
- `table(slide, rows, x, y, w, colW, {rowH, fontSize})` with `th()`/`td()`; zebra rows via `fill: C.tint`.
- Heatmaps as native tables (cell fill from a ramp) — stays editable, unlike an image.
- Charts native (`addChart`): set `titleFontFace/catAxisLabelFontFace/... = "Calibri"` or they fall back to Arial.
  Scatter series with different x: pass the union of x values and `null`s, plus `displayBlanksAs: "span"`.
- Gantt built from rectangles on a month axis (`xOf(date)`), milestones as dashed accent lines with labels at top.

## pptxgenjs pitfalls found here
- **Multi-run paragraphs get several `<a:pPr>`** (one per run): bullets vanish and PowerPoint may offer repair.
  `build_deck.js` post-processes every slide (`fixParagraphs`) to keep only the first `<a:pPr>`; for other
  decks run `node scripts/fix_pptxgenjs_paragraphs.js deck.pptx`. Put paragraph options (bullet, spacing) on the
  **first** run of a paragraph (helpers `P()` / `B()` do this) and `breakLine` on its last run.
- `validate.py` passes files with the duplicate-`pPr` defect — do not rely on it for this; count `<a:pPr` per `<a:p>`.
- LibreOffice in the container may lack Impress: `apt-get install -y --no-install-recommends libreoffice-impress`
  (symptom: "source file could not be loaded" even for a one-slide deck).
- Use `≠`, `⇒`, Greek and subscripts sparingly; check they render in Carlito (≠ did not; write "is not").

## Maps (English) — `make_figures.py`
- Inputs: `deck/data/xinhuang_base.gpkg` (county, roads, expressways, railways, water, places, routes, markets,
  facilities; local TM CRS centred 109.1°E) and `xinhuang_villages_v5.gpkg` (145 villages with population,
  access strata). Townships are **dissolved from villages** (v5 rule), not taken from the 2024 township layer.
- Optional hillshade: Copernicus GLO-30 tiles N26/N27 × E108/E109 from
  `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM/<same>.tif`;
  set `XH_DEM_DIR`. Without it the maps render flat.
- Outputs: `map_study_area` (routes + inset + legend), `map_access` (density | strata), `map_sampling`
  (30 + 6 villages), `map_markets`, `map_supply` (runs per segment), `fig_profiles` (elevation), `fig_calendar`
  (source-graded calendar), `map_title` (clean, transparent).

## QA loop
```bash
bash skills/xh-conference-deck/scripts/render_qa.sh          # add "fig" to rebuild figures first
# then open every slide-XX.jpg; check overflow first, then overlaps, gaps, contrast
markitdown deck/Xinhuang_Rural_Transit_Conference.pptx | grep -iE "lorem|TODO|\[insert|xxx"   # must be empty
```
Checklist per round: SYNTHETIC badges present; no CJK in slide text; every slide has speaker notes; numbers
match the package; slide count in `TOTAL_MAIN` equals the numbered main slides.
