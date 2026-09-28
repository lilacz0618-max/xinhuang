/* Build the conference deck: "Research on Urban–Rural Public Transport in Xinhuang County"
 * Run from repo root:  NODE_PATH=<dir with pptxgenjs> node deck/build_deck.js
 * Inputs: deck/figures/*.png, deck/figures/fig_numbers.json. Output: deck/Xinhuang_Rural_Transit_Conference.pptx
 * Content source of truth: v5 package (2026-09-27) documents 1–6 and Annex G. SYNTHETIC results are labelled.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.join(__dirname);
// ---------------------------------------------------------------- language layer
// LANG=en (default) builds the English deck. LANG=zh builds the Chinese deck from the SAME layout code:
// every string handed to addText / addTable / addChart / addNotes is looked up in deck/i18n/zh.json, so
// positions, sizes and styles are identical by construction. LANG=collect writes all strings to i18n/strings.json.
const LANG = process.env.LANG_DECK || "en";
const I18N = LANG === "zh" ? JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", "zh.json"), "utf8")) : {};
const SEEN = new Set(), MISSING = new Set();
function tr(s) {
  if (typeof s !== "string" || s === "") return s;
  SEEN.add(s);
  if (LANG !== "zh") return s;
  if (Object.prototype.hasOwnProperty.call(I18N, s)) return I18N[s];
  if (!/[a-z]{3,}/.test(s)) return s; // codes, numbers, markers ("R1", "0.10", " [1–3]", "km")
  MISSING.add(s);
  return s;
}
const FIG = (f) => path.join(ROOT, LANG === "zh" ? "figures_zh" : "figures", f);
const NUM = JSON.parse(fs.readFileSync(path.join(ROOT, "figures", "fig_numbers.json"), "utf8"));

// ---------------------------------------------------------------- design tokens
const C = {
  ink: "1F2937", ink2: "4B5563", muted: "8B95A1", rule: "D6DBE1", tint: "F3F5F8", tint2: "E9EEF4",
  primary: "1C4E80", primaryLight: "E3ECF6", accent: "C2410C", accentLight: "FBEDE5", white: "FFFFFF",
  s1: "2A78D6", s2: "EB6834", green: "3F8F5B",
};
const HF = "Cambria"; // headings
const BF = "Calibri"; // body
const W = 13.333, H = 7.5, MX = 0.6, CW = W - 2 * MX;
const FOOT = "Lilac · National University of Singapore · Urban–rural public transport in Xinhuang County";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Lilac";
pres.company = "National University of Singapore";
pres.title = tr("Research on Urban–Rural Public Transport in Xinhuang County");
pres.subject = tr("Research design and next steps (work in progress)");
// wrap slide methods so every visible string passes through tr()
const trRuns = (t) => (Array.isArray(t) ? t.map((r) => (r && typeof r === "object" ? Object.assign({}, r, { text: tr(r.text) }) : tr(r))) : tr(t));
const trCell = (c) => (c && typeof c === "object" ? Object.assign({}, c, { text: trRuns(c.text) }) : tr(c));
const _addSlide = pres.addSlide.bind(pres);
pres.addSlide = function (...a) {
  const sl = _addSlide(...a);
  const at = sl.addText.bind(sl), ab = sl.addTable.bind(sl), ac = sl.addChart.bind(sl), an = sl.addNotes.bind(sl), ai = sl.addImage.bind(sl);
  sl.addText = (t, o) => at(trRuns(t), o);
  sl.addTable = (rows, o) => ab(rows.map((r) => r.map(trCell)), o);
  sl.addChart = (type, data, o = {}) => {
    const d = data.map((x) => Object.assign({}, x, { name: tr(x.name), labels: x.labels ? x.labels.map(tr) : x.labels }));
    const oo = Object.assign({}, o);
    ["title", "valAxisTitle", "catAxisTitle"].forEach((k) => { if (oo[k]) oo[k] = tr(oo[k]); });
    return ac(type, d, oo);
  };
  sl.addNotes = (t) => an(tr(t));
  sl.addImage = (o) => ai(Object.assign({}, o, o.altText ? { altText: tr(o.altText) } : {}));
  return sl;
};

let SLIDE_NO = 0;
const TOTAL_MAIN = 39; // numbered main-deck slides (appendix numbered A1...)

// ---------------------------------------------------------------- helpers
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function img(slide, file, x, y, w, h, opts = {}) {
  // fit inside (w,h) keeping aspect ratio; align centre unless told otherwise
  const s = pngSize(FIG(file));
  const r = s.w / s.h;
  let iw = w, ih = w / r;
  if (ih > h) { ih = h; iw = h * r; }
  const ix = opts.alignX === "left" ? x : opts.alignX === "right" ? x + w - iw : x + (w - iw) / 2;
  const iy = opts.alignY === "top" ? y : y + (h - ih) / 2;
  slide.addImage({ path: FIG(file), x: ix, y: iy, w: iw, h: ih, altText: opts.alt || file });
  return { x: ix, y: iy, w: iw, h: ih };
}
function T(slide, text, o) {
  const base = { fontFace: BF, fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true };
  slide.addText(text, Object.assign(base, o));
}
// paragraph builder: runs = string | [[text, runOpts], ...]
function P(runs, popts = {}) {
  if (typeof runs === "string") runs = [[runs, {}]];
  const out = runs.map(([t, o], i) => ({ text: t, options: Object.assign({}, o) }));
  Object.assign(out[0].options, popts);
  out[out.length - 1].options.breakLine = true;
  return out;
}
function B(runs, lvl = 0, extra = {}) { // bullet paragraph
  return P(runs, Object.assign({ bullet: { indent: 13 }, indentLevel: lvl, paraSpaceAfter: 4 }, extra));
}
function flat(arr) {
  const out = [].concat(...arr);
  if (out.length) delete out[out.length - 1].options.breakLine;
  return out;
}
const ref = (s) => [" [" + s + "]", { color: C.muted, fontSize: 9.5 }];
const bold = (s, o = {}) => [s, Object.assign({ bold: true }, o)];
const plain = (s, o = {}) => [s, o];

function header(slide, kicker, title, opts = {}) {
  SLIDE_NO += 1;
  slide.background = { color: C.white };
  if (kicker) T(slide, kicker.toUpperCase(), { x: MX, y: 0.34, w: 9.5, h: 0.26, fontSize: 10, bold: true, color: C.primary, charSpacing: 1.2 });
  T(slide, title, { x: MX, y: 0.6, w: CW, h: 0.62, fontFace: HF, fontSize: opts.titleSize || 25, color: C.ink, valign: "middle", fit: "shrink" });
  T(slide, FOOT, { x: MX, y: 7.08, w: 9, h: 0.24, fontSize: 8.5, color: C.muted });
  const num = opts.appendix ? opts.appendix : `${SLIDE_NO} / ${TOTAL_MAIN}`;
  T(slide, num, { x: W - MX - 1.5, y: 7.08, w: 1.5, h: 0.24, fontSize: 8.5, color: C.muted, align: "right" });
}
function panel(slide, x, y, w, h, fill = C.tint) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 } });
}
function badge(slide, x, y, text = "SYNTHETIC DATA · tests the method, not Xinhuang ridership", w = 4.3) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.28, rectRadius: 0.06, fill: { color: C.white }, line: { color: "7C5CA8", width: 0.9 } });
  T(slide, text, { x, y, w, h: 0.28, fontSize: 9, bold: true, color: "6B4A99", align: "center", valign: "middle" });
}
function label(slide, text, x, y, w, color = C.primary, size = 10) {
  T(slide, text.toUpperCase(), { x, y, w, h: 0.24, fontSize: size, bold: true, color, charSpacing: 0.8 });
}
function arrow(slide, x1, y1, x2, y2, color = C.ink2, width = 1.25, dash = null) {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    line: { color, width, endArrowType: "triangle" }, flipH: x2 < x1, flipV: y2 < y1 };
  if (dash) o.line.dashType = dash;
  slide.addShape(pres.shapes.LINE, o);
}
function box(slide, x, y, w, h, o = {}) {
  slide.addShape(o.round === false ? pres.shapes.RECTANGLE : pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.r || 0.08, fill: { color: o.fill || C.white },
    line: { color: o.line || C.rule, width: o.lw === undefined ? 1 : o.lw, dashType: o.dash || "solid" },
  });
  if (o.text) T(slide, o.text, Object.assign({ x: x + 0.1, y: y + 0.05, w: w - 0.2, h: h - 0.1, fontSize: o.fs || 11, align: o.align || "center", valign: o.valign || "middle", color: o.color || C.ink }, o.textOpts || {}));
}
const th = (t, o = {}) => ({ text: t, options: Object.assign({ bold: true, color: C.white, fill: { color: C.primary }, fontSize: 10.5, valign: "middle" }, o) });
const td = (t, o = {}) => ({ text: t, options: Object.assign({ color: C.ink, fontSize: 10.5, valign: "middle" }, o) });
function table(slide, rows, x, y, w, colW, o = {}) {
  slide.addTable(rows, Object.assign({ x, y, w, colW, fontFace: BF, fontSize: 10.5, color: C.ink,
    border: { type: "solid", pt: 0.6, color: C.rule }, margin: [3, 5, 3, 5], valign: "middle", autoPage: false }, o));
}
function notes(slide, text) { slide.addNotes(text); }

// ---------------------------------------------------------------- literature slide template
function litSlide(d) {
  const s = pres.addSlide();
  header(s, d.kicker, d.title);
  // left synthesis
  const L = [];
  const block = (lab, items) => {
    L.push(P([[lab.toUpperCase(), { bold: true, color: C.primary, fontSize: 9.5, charSpacing: 0.8 }]], { paraSpaceAfter: 2, paraSpaceBefore: 5 }));
    items.forEach((it) => L.push(B(it.map((r) => (typeof r === "string" ? plain(r) : r)), 0, { paraSpaceAfter: 3 })));
  };
  block("What is established", d.consensus);
  block("Methods in use", d.methods);
  block("Limitations and unresolved problems", d.limits);
  T(s, flat(L), { x: MX, y: 1.38, w: 7.45, h: d.leftH || 4.0, fontSize: d.fs || 12.5, color: C.ink, lineSpacingMultiple: 0.98 });
  // implication box
  const iy = 1.38 + (d.leftH || 4.0) + 0.12, ih = 6.88 - iy;
  panel(s, MX, iy, 7.45, ih, C.accentLight);
  T(s, "→ HOW THIS STUDY RESPONDS", { x: MX + 0.15, y: iy + 0.09, w: 7.1, h: 0.22, fontSize: 9.5, bold: true, color: C.accent, charSpacing: 0.8 });
  T(s, d.implication, { x: MX + 0.15, y: iy + 0.34, w: 7.15, h: ih - 0.42, fontSize: d.ifs || 12, color: C.ink });
  // right: literature
  const rx = 8.3, rw = W - MX - rx;
  panel(s, rx, 1.38, rw, 5.5);
  T(s, "KEY STUDIES BEHIND THE SYNTHESIS", { x: rx + 0.18, y: 1.5, w: rw - 0.3, h: 0.22, fontSize: 9.5, bold: true, color: C.primary, charSpacing: 0.8 });
  const R = [];
  d.refs.forEach((r, i) => {
    R.push(P([[`[${i + 1}] `, { bold: true, color: C.primary }], [r[0], { bold: true }], ["  " + r[1], { color: C.muted, italic: true }]], { paraSpaceBefore: i ? 4.5 : 0 }));
    R.push(P([[r[2], { color: C.ink2 }]], {}));
  });
  T(s, flat(R), { x: rx + 0.18, y: 1.8, w: rw - 0.32, h: 5.0, fontSize: d.rfs || 10.2, color: C.ink, lineSpacingMultiple: 0.95 });
  notes(s, d.notes);
  return s;
}

// =================================================================== SLIDES
// 1 ---------------------------------------------------------------- title
{
  const s = pres.addSlide();
  SLIDE_NO += 1;
  s.background = { color: C.white };
  panel(s, 7.05, 0, W - 7.05, H, C.tint);
  img(s, "map_title.png", 7.25, 0.9, 5.85, 5.3, { alt: "Xinhuang County with its seven urban–rural bus routes" });
  T(s, "Seven urban–rural bus routes radiating from the county bus station (■), on terrain from Copernicus GLO-30 DEM",
    { x: 7.4, y: 6.45, w: 5.6, h: 0.45, fontSize: 9, color: C.muted, italic: true });
  T(s, "WORK IN PROGRESS · RESEARCH DESIGN", { x: MX, y: 1.2, w: 6, h: 0.3, fontSize: 10.5, bold: true, color: C.primary, charSpacing: 1.5 });
  T(s, "Research on Urban–Rural Public Transport in Xinhuang County", { x: MX, y: 1.6, w: 6.1, h: 2.0, fontFace: HF, fontSize: 36, color: C.ink, valign: "top" });
  T(s, "Run-level demand, overlapping calendar rhythms, and forecast-informed service planning in a mountainous county of western Hunan, China",
    { x: MX, y: 3.75, w: 5.9, h: 1.0, fontSize: 15.5, color: C.ink2 });
  T(s, [
    { text: "Lilac", options: { bold: true, fontSize: 16, color: C.ink, breakLine: true } },
    { text: "National University of Singapore", options: { fontSize: 13.5, color: C.ink2 } },
  ], { x: MX, y: 5.35, w: 5.9, h: 0.8 });
  notes(s, "Opening (≈30 s). This talk presents a research design, not results. I will first show the county and the data I have, then what the literature establishes and where it stops, and finally the framework and next steps. All model outputs you will see are synthetic tests of the method; real ledger results come after the methods are frozen on 1 January 2027.");
}

// 2 ---------------------------------------------------------------- outline
{
  const s = pres.addSlide();
  header(s, "Overview", "From a local service problem to a testable research design");
  const cols = [
    ["I", "Study area and data", ["Xinhuang's seven radial bus routes", "Terrain, periodic markets and access", "Data in hand, data structure, public calendars"]],
    ["II", "What prior research tells us", ["Six themes: consensus, methods, limitations", "From prior practice to design choices", "Five gaps → four research questions"]],
    ["III", "Framework and next steps", ["Five-step research logic and how it evolved", "Surveys, calendar factors, run-level model", "Forecasting, service planning, timeline"]],
  ];
  cols.forEach((c, i) => {
    const x = MX + i * 4.12, w = 3.85;
    box(s, x, 1.55, w, 3.55, { fill: i === 2 ? C.primaryLight : C.tint, line: i === 2 ? C.primaryLight : C.tint, lw: 0 });
    T(s, c[0], { x: x + 0.25, y: 1.72, w: 1, h: 0.7, fontFace: HF, fontSize: 36, color: C.primary });
    T(s, c[1], { x: x + 0.25, y: 2.45, w: w - 0.5, h: 0.45, fontFace: HF, fontSize: 17.5, color: C.ink });
    T(s, flat(c[2].map((t) => B(t, 0, { paraSpaceAfter: 6 }))), { x: x + 0.25, y: 3.05, w: w - 0.45, h: 1.9, fontSize: 13, color: C.ink2 });
  });
  // guiding questions
  T(s, [
    { text: "Guiding question  ", options: { bold: true, color: C.primary } },
    { text: "When rural calendar rhythms (school weeks, work weeks, holidays, Spring Festival) overlap, how much demand does each add to a single bus run — and how can forecasts of that demand make a fixed rural timetable more responsive?", options: { color: C.ink } },
  ], { x: MX, y: 5.35, w: CW, h: 0.75, fontSize: 14 });
  box(s, MX, 6.25, CW, 0.52, { fill: C.white, line: "7C5CA8", lw: 0.9, text: "Status: design stage. Every model result shown is a SYNTHETIC test of whether the method recovers known effects; no Xinhuang ridership results are reported yet.", fs: 11.5, color: "5B3F86" });
  notes(s, "Roadmap. Part I sets the empirical scene; Part II is the literature review organised by themes, each ending with how this study responds; Part III explains the framework, the reasoning behind it, and the work plan. Emphasise the status box: design stage, synthetic tests only.");
}

// divider helper
function divider(numeral, title, sub, active) {
  const s = pres.addSlide();
  SLIDE_NO += 1;
  s.background = { color: C.white };
  T(s, numeral, { x: MX, y: 1.6, w: 2.5, h: 1.3, fontFace: HF, fontSize: 80, color: C.primary });
  T(s, title, { x: MX, y: 3.05, w: 9, h: 0.9, fontFace: HF, fontSize: 36, color: C.ink });
  T(s, sub, { x: MX, y: 4.0, w: 8.5, h: 1.0, fontSize: 16, color: C.ink2 });
  const parts = ["I  Study area and data", "II  What prior research tells us", "III  Framework and next steps"];
  parts.forEach((p, i) => T(s, p, { x: 9.3, y: 2.2 + i * 0.5, w: 3.5, h: 0.4, fontSize: 13, bold: i === active, color: i === active ? C.primary : C.muted }));
  T(s, `${SLIDE_NO} / ${TOTAL_MAIN}`, { x: W - MX - 1.5, y: 7.08, w: 1.5, h: 0.24, fontSize: 8.5, color: C.muted, align: "right" });
  return s;
}

// 3 ---------------------------------------------------------------- divider I
notes(divider("I", "Study area and data", "Where the problem sits: a mountainous border county, seven radial routes, and the data assembled so far.", 0),
  "Part I: the county, its bus service, spatial access, and the data in hand.");

// 4 ---------------------------------------------------------------- county map
{
  const s = pres.addSlide();
  header(s, "I · Study area", "Xinhuang: a mountainous border county served by seven radial routes");
  img(s, "map_study_area.png", MX - 0.1, 1.3, 7.55, 5.72, { alignX: "left", alt: "Study-area map of Xinhuang County with seven bus routes" });
  const facts = [
    ["≈1,500 km²", "Xinhuang Dong Autonomous County, western Hunan, bordering Guizhou"],
    ["11 + 1", "townships plus one forest farm; 145 administrative villages"],
    ["≈244,700", "residents (WorldPop 2020 model estimate — not a census count)"],
    ["7 routes", "all radiating from the county bus station in Huangzhou, 26–61 km long"],
    ["136 runs/day", "one-way scheduled runs; hail-and-ride, no stop-level counts"],
  ];
  let y = 1.45;
  facts.forEach((f) => {
    T(s, f[0], { x: 8.25, y, w: 4.5, h: 0.42, fontFace: HF, fontSize: 21, color: C.primary });
    T(s, f[1], { x: 8.25, y: y + 0.42, w: 4.5, h: 0.5, fontSize: 12, color: C.ink2 });
    y += 1.02;
  });
  notes(s, "The county sits on the Hunan–Guizhou border, on the Shanghai–Kunming high-speed railway and G60 expressway. All seven rural routes start at the county bus station in Huangzhou; R5 to Liangsan runs partly through Guizhou. Population is a WorldPop model estimate used only for sampling weights, not a census figure.");
}

// 5 ---------------------------------------------------------------- timetable & supply
{
  const s = pres.addSlide();
  header(s, "I · Current service", "A fixed timetable that thins out quickly beyond the trunk corridor");
  const rows = [[th("Route"), th("Terminus"), th("km", { align: "right" }), th("Drive min", { align: "right" }), th("Runs/day*", { align: "right" }), th("Outbound first–last"), th("Inbound first–last")]];
  const R = [["R1", "Fuluo", 33, 45, 13, "7:00–17:00", "7:00–17:00"], ["R2", "Gongxi", 45, 58, 10, "6:50–16:30", "7:00–16:00"],
    ["R3", "Butoujiang", 46, 74, 6, "8:00–16:00", "6:30–14:30"], ["R4", "Mibei", 50, 79, 12, "7:00–16:00", "6:10–15:00"],
    ["R5", "Liangsan", 61, 95, 10, "7:10–16:20", "6:30–15:00"], ["R6", "Yanjia", 27, 47, 2, "10:30–15:30", "6:50–12:30"],
    ["R7", "Xindianping", 26, 34, 15, "6:40–16:30", "7:00–17:00"]];
  R.forEach((r, i) => {
    const early = ["R3", "R4", "R5", "R6"].includes(r[0]);
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(r[0], Object.assign({ bold: true }, f)), td(r[1], f), td(String(r[2]), Object.assign({ align: "right" }, f)), td(String(r[3]), Object.assign({ align: "right" }, f)),
      td(String(r[4]), Object.assign({ align: "right" }, f)), td(r[5], f), td(r[6], Object.assign(early ? { color: C.accent, bold: true } : {}, f))]);
  });
  table(s, rows, MX, 1.42, 7.35, [0.62, 1.28, 0.55, 0.9, 0.95, 1.55, 1.5], { rowH: 0.3 });
  T(s, "* one-way runs per day in each direction. km and drive time from Gaode Maps; timetable from the operator's route document.", { x: MX, y: 3.92, w: 7.35, h: 0.3, fontSize: 9, color: C.muted });
  label(s, "What the timetable already shows (to be verified in surveys)", MX, 4.35, 7.35);
  T(s, flat([
    B([bold("Supply is concentrated: "), plain("the 17-km Huangzhou–Hetan trunk carries 41 runs/day (R1–R4 overlap); branch ends see 2–10.")]),
    B([bold("Early last buses into town: "), plain("on 4 of 7 routes the last inbound run leaves by 15:00 (R6 by 12:30), so an afternoon trip to the county town is impossible.")]),
    B([bold("Same-day round trips are constrained "), plain("by outbound last runs at 15:30–17:00.")]),
    B([bold("Data grain: "), plain("the ledger records total boardings per one-way run — no stop-level boardings, no origin–destination.")]),
  ]), { x: MX, y: 4.65, w: 7.35, h: 2.25, fontSize: 12, color: C.ink });
  const im5 = img(s, "map_supply.png", 8.2, 1.42, 4.55, 4.9, { alignY: "top", alt: "Scheduled one-way runs per road segment" });
  T(s, "Scheduled one-way runs per road segment. This is supply, not demand: who fills these runs, and when, is what the ledger and surveys must reveal.", { x: 8.2, y: im5.y + im5.h + 0.12, w: 4.55, h: 0.6, fontSize: 10, color: C.muted, italic: true });
  notes(s, "Read the table right to left: the red inbound last-run times are the most visible service gap. The map shows segment supply: the shared trunk to Hetan has 41 runs a day, while branch ends such as Yanjia have two. This is supply, not demand; the ledger and surveys tell us who fills these runs and when.");
}

// 6 ---------------------------------------------------------------- terrain & markets
{
  const s = pres.addSlide();
  header(s, "I · Spatial context", "Terrain and periodic markets shape when and how villagers travel");
  img(s, "map_markets.png", MX - 0.05, 1.38, 5.55, 4.6, { alignX: "left", alt: "Periodic markets by lunar cycle" });
  label(s, "17 markets on a 5-day lunar cycle", MX, 6.05, 5.5);
  T(s, "Neighbouring markets are staggered, so on every lunar day some route has a market within 2 km (R2: all ten day-digits; R7: four). Market days therefore enter the model as a route-specific baseline control, not as a core driver.", { x: MX, y: 6.3, w: 5.5, h: 0.72, fontSize: 10.5, color: C.ink2 });
  img(s, "fig_profiles.png", 6.45, 1.38, 3.95, 4.85, { alt: "Elevation profiles of the seven routes" });
  const rows = [[th("Route", { fontSize: 9.5 }), th("Climb m", { fontSize: 9.5, align: "right" }), th("Curvy %", { fontSize: 9.5, align: "right" }), th("km/h", { fontSize: 9.5, align: "right" })]];
  [["R1", 419, 1, 44.0], ["R2", 613, 1, 46.6], ["R3", 672, 16, 37.3], ["R4", 762, 18, 38.0], ["R5", 667, 7, 38.5], ["R6", 576, 28, 34.5], ["R7", 191, 0, 45.9]]
    .forEach((r, i) => rows.push([td(r[0], { fontSize: 9.5, bold: true }), td(String(r[1]), { fontSize: 9.5, align: "right" }), td(String(r[2]), { fontSize: 9.5, align: "right", color: r[2] >= 16 ? C.accent : C.ink, bold: r[2] >= 16 }), td(r[3].toFixed(1), { fontSize: 9.5, align: "right" })]));
  table(s, rows, 10.55, 1.42, 2.2, [0.5, 0.6, 0.55, 0.55], { rowH: 0.27, margin: [2, 4, 2, 4] });
  T(s, "Cumulative climb, share of km in tight-curve sections, and navigation speed (v4 route analysis). Curvy, climbing routes are where on-board fieldwork observed motion sickness — now recorded per run (item Z4).", { x: 10.55, y: 3.72, w: 2.2, h: 2.6, fontSize: 9.5, color: C.ink2 });
  T(s, "Elevation along each route (Copernicus GLO-30 DEM, 200 m sampling)", { x: 6.45, y: 6.3, w: 3.95, h: 0.45, fontSize: 9.5, color: C.muted, italic: true });
  notes(s, "Two spatial rhythms. Left: 17 periodic markets meet on lunar days ending in a fixed pair of digits; neighbouring markets are staggered. Because some market is always open along some route, market days are modelled as a route-specific control. Right: R6 climbs to about 800 m and R3/R4 have many tight curves; summer fieldwork observed motion sickness on long routes, which the survey now records.");
}

// 7 ---------------------------------------------------------------- access
{
  const s = pres.addSlide();
  const st = NUM.strata;
  header(s, "I · Access", "Half of the modelled population lives >3 km by road from a recorded route");
  img(s, "map_access.png", MX - 0.1, 1.35, 8.35, 4.3, { alignX: "left", alt: "Population density and access strata of 145 villages" });
  const keys = Object.keys(st);
  let y = 1.5;
  keys.forEach((k, i) => {
    const pct = Math.round((100 * st[k][1]) / NUM.pop_total);
    T(s, `${pct}%`, { x: 8.75, y, w: 1.3, h: 0.55, fontFace: HF, fontSize: 26, color: [C.primary, "3987E5", C.ink2][i] });
    T(s, [{ text: k, options: { bold: true, breakLine: true } }, { text: `${st[k][0]} villages · ${Math.round(st[k][1] / 1000)}k people`, options: { color: C.ink2 } }],
      { x: 10.05, y: y + 0.02, w: 2.75, h: 0.6, fontSize: 11.5 });
    y += 0.78;
  });
  label(s, "Caveats built into the design", 8.75, 3.95, 4.0);
  T(s, flat([
    B("“Recorded routes” = alignments confirmed so far; the route list will be checked with the operator."),
    B("Network distance includes a snap segment, so strata lean “far”: 88% of villages keep their stratum without it, 69% with straight-line distance."),
    B("Sampling stays unbiased (known inclusion probabilities); access models will densify the road graph and report all three definitions."),
  ]), { x: 8.75, y: 4.25, w: 4.0, h: 2.6, fontSize: 10.5, color: C.ink2 });
  T(s, "Villages are the 2024 Hunan administrative-village polygons (145). Population: WorldPop 2020, 1 km, UN-adjusted, summed per village.", { x: MX, y: 5.8, w: 7.9, h: 0.45, fontSize: 9.5, color: C.muted, italic: true });
  box(s, MX, 6.3, 7.9, 0.55, { fill: C.primaryLight, line: C.primaryLight, lw: 0, align: "left", fs: 11.5, text: "Implication: much rural demand never reaches the ledger. Unmet demand must be measured in villages, stratified by access." });
  notes(s, "Left: density is concentrated in Huangzhou. Right: 91 of 145 villages, about half of the modelled population, are more than 3 km by road from a recorded route. The distance definition matters, and I report its sensitivity. The household survey is designed around these three access strata.");
}

// 8 ---------------------------------------------------------------- data inventory
{
  const s = pres.addSlide();
  header(s, "I · Data", "Data assembled so far — and what each source can and cannot tell us");
  const hdr = [th("Source"), th("Content and grain"), th("Coverage / status"), th("Role")];
  const r = [
    ["Run-level ridership ledger (county bus station)", "Total boardings per one-way run: date × route × direction × departure. No stop-level or OD data.", "Exploration: 1 Jun 2024–30 Sep 2026 (852 days). Sealed test: Oct 2026–Feb 2027, released only after methods are frozen.", "Outcome for S2–S5"],
    ["Timetable and seat capacity", "7 routes, 136 one-way runs/day → 115,872 run slots on the real calendar", "Timetable in hand; per-run seat counts to be confirmed", "Sampling frame; censoring threshold"],
    ["Public calendar", "Holidays & make-up workdays, lunar calendar, Spring Festival window, school terms, gaokao", "Daily, Jun 2024–Feb 2027; each date graded by source reliability", "Five calendar factors + controls"],
    ["Weather", "Precipitation and max. temperature in each run's time window; forecasts", "Public reanalysis / station data", "Control; forecast input"],
    ["GIS", "145 village polygons (2024), WorldPop 2020, OSM roads & facilities, GLO-30 DEM", "Assessed file by file; townships rebuilt from villages", "Sampling frame, access, maps"],
    ["Summer on-board survey", "Passengers aged ≥16 on sampled runs", "Completed 15 Jul–31 Aug 2026", "RQ1; linked to runs"],
    ["Survey instruments (next waves)", "4 questionnaires from a 47-item bank in 13 indicator groups", "Designed (v5); pre-test pending", "RQ1, RQ4, diagnostics"],
    ["Literature base", "250 English studies (incl. 25 method papers); 10 verified Chinese journal papers", "Screened and depth-coded; CNKI search pending", "Part II"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ bold: true, fontSize: 11 }, f)), td(x[1], Object.assign({ fontSize: 11 }, f)), td(x[2], Object.assign({ fontSize: 11 }, f)), td(x[3], Object.assign({ fontSize: 11, color: C.primary, bold: true }, f))]);
  });
  table(s, rows, MX, 1.4, CW, [2.6, 4.05, 3.6, 1.88], { rowH: [0.34, 0.7, 0.5, 0.5, 0.5, 0.5, 0.42, 0.5, 0.5] });
  box(s, MX, 6.28, CW, 0.58, { fill: C.tint, line: C.tint, lw: 0, align: "left", fs: 11, text: "Deliberately excluded: industrial-park shift rosters, hospital clinic schedules and macro market cycles — they cannot be obtained reliably day by day. If they matter, their effect falls into weekday or residual terms (a stated limitation)." });
  notes(s, "The ledger is the backbone: one row per one-way run with the total number of people who boarded. Note the split into an exploration period and a sealed test period that I will not open until the methods are frozen. Every other source either explains runs (calendar, weather), frames sampling (GIS), or measures what the ledger cannot see (surveys).");
}

// 9 ---------------------------------------------------------------- data linkage
{
  const s = pres.addSlide();
  header(s, "I · Data structure", "Three keys link every source: run key, date, and village code");
  // hubs
  const hub = (x, y, w, t1, t2, col) => {
    box(s, x, y, w, 0.95, { fill: col, line: col, lw: 0 });
    T(s, [{ text: t1, options: { bold: true, fontSize: 13, color: C.white, breakLine: true } }, { text: t2, options: { fontSize: 10.5, color: C.white } }], { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.78, align: "center", valign: "middle" });
  };
  hub(4.55, 1.55, 4.2, "RUN KEY", "date × route × direction × scheduled departure", C.primary);
  hub(4.55, 3.6, 4.2, "DATE", "one row per calendar day", "3B6E9A");
  hub(4.55, 5.55, 4.2, "VILLAGE CODE", "statistical division code of 145 villages", C.accent);
  const node = (x, y, t1, t2) => box(s, x, y, 3.55, 0.78, { fill: C.tint, line: C.tint, lw: 0, align: "left", text: [
    { text: t1, options: { bold: true, fontSize: 11.5, color: C.ink, breakLine: true } }, { text: t2, options: { fontSize: 10, color: C.ink2 } }] });
  node(MX, 1.3, "Ridership ledger", "one row = one one-way run (y = total boardings)");
  node(MX, 2.2, "Timetable & seat capacity", "run slots; effective capacity C = κ × seats");
  node(9.18, 1.3, "On-board questionnaires", "item Z1 records the run key; rider type (A3)");
  node(9.18, 2.2, "Boarding/alighting tally sheet", "turnover κ, full-bus denials, under-16 counts");
  node(MX, 3.7, "Calendar factors", "S, W, T, R, CY + weekday, market day");
  node(9.18, 3.7, "Weather", "precipitation in run window; forecasts");
  node(MX, 5.35, "Household survey (H0)", "30 sampled villages; unmet demand, reasons");
  node(MX, 6.2, "Online survey (O2)", "home village; holiday return timing");
  node(9.18, 5.35, "GIS village frame", "population, network distance, access stratum");
  node(9.18, 6.2, "Boarding places (A1, A12)", "place names matched to village codes");
  // connectors
  arrow(s, 4.15, 1.69, 4.55, 1.95, C.ink2); arrow(s, 4.15, 2.59, 4.55, 2.25, C.ink2);
  arrow(s, 9.18, 1.69, 8.75, 1.95, C.ink2); arrow(s, 9.18, 2.59, 8.75, 2.25, C.ink2);
  arrow(s, 4.15, 4.09, 4.55, 4.07, C.ink2); arrow(s, 9.18, 4.09, 8.75, 4.07, C.ink2);
  arrow(s, 4.15, 5.74, 4.55, 5.92, C.ink2); arrow(s, 4.15, 6.59, 4.55, 6.2, C.ink2);
  arrow(s, 9.18, 5.74, 8.75, 5.92, C.ink2); arrow(s, 9.18, 6.59, 8.75, 6.2, C.ink2);
  arrow(s, 6.65, 3.6, 6.65, 2.5, C.muted, 1, "dash");
  T(s, "run date", { x: 6.75, y: 2.85, w: 1.2, h: 0.3, fontSize: 9.5, color: C.muted, italic: true });
  arrow(s, 6.65, 4.55, 6.65, 5.55, C.muted, 1, "dash");
  T(s, "survey dates (H2–H4, O5–O6)", { x: 6.75, y: 4.9, w: 2.0, h: 0.3, fontSize: 9.5, color: C.muted, italic: true });
  notes(s, "The data model is deliberately simple. Everything about a bus run joins through the run key; everything about days through the date; everything about places through the village code. No personal identifiers are used for linkage. Summer 2026 questionnaires without departure times are matched to the nearest scheduled run within ±15 minutes, otherwise used at route × day level.");
}

// 10 --------------------------------------------------------------- calendar
{
  const s = pres.addSlide();
  header(s, "I · Public calendars", "Most demand drivers can be known days in advance from public calendars");
  img(s, "fig_calendar.png", MX - 0.05, 1.4, CW + 0.1, 3.75, { alt: "Daily calendar factors 2024–2027 by source reliability" });
  const cols = [
    ["Reliable by rule", "Statutory holidays and make-up workdays (State Council notices), lunar calendar, Spring Festival travel window, gaokao dates."],
    ["Needs verification", "School terms before December 2025 are presumed from provincial practice and must be confirmed with the county education bureau and the three county-town secondary schools."],
    ["Not yet published", "2027 winter-vacation and holiday dates. Winter survey strata are drawn now for planning and re-drawn with the same random seed once dates are announced."],
  ];
  cols.forEach((c, i) => {
    const x = MX + i * 4.12;
    label(s, c[0], x, 5.35, 3.9, [C.primary, "B7791F", C.muted][i]);
    T(s, c[1], { x, y: 5.63, w: 3.85, h: 1.25, fontSize: 11.5, color: C.ink2 });
  });
  notes(s, "This is the real calendar, not synthetic. Blue items are fixed by regulation or algorithm; green school terms are verified from official notices; orange ones are presumed and flagged for verification. Because the drivers are known ahead, the same variables serve both explanation and 1–7 day forecasting.");
}

// 11 --------------------------------------------------------------- divider II
notes(divider("II", "What prior research tells us", "Six themes. For each: what is established, which methods are used, what remains unresolved — and how this study responds.", 1),
  "Part II. The literature is organised in six themes that follow the research chain: riders and surveys, drivers, unit of analysis, overlapping factors, forecasting, and service design.");

// 12 --------------------------------------------------------------- review approach
{
  const s = pres.addSlide();
  header(s, "II · Evidence base", "How the evidence base was built");
  label(s, "English literature (OpenAlex, 26 Sep 2026)", MX, 1.42, 7.2);
  const steps = [
    ["33 structured queries across four themes", "1,650 records"],
    ["De-duplication", "1,423 records"],
    ["+ 84 previously read core studies", "1,507 screened (301 without abstracts)"],
    ["Rule-based pre-screen → full manual review; 378 relaxed-rule recalls re-read, 86 kept", ""],
    ["Included (25 of them method papers retrieved separately)", "250 studies"],
  ];
  steps.forEach((st, i) => {
    const y = 1.78 + i * 0.72;
    const last = i === steps.length - 1;
    box(s, MX, y, 4.3, 0.56, { fill: last ? C.primary : C.tint, line: last ? C.primary : C.tint, lw: 0, align: "left", fs: 11, color: last ? C.white : C.ink, text: st[0] });
    if (st[1]) T(s, st[1], { x: 5.05, y: y + 0.13, w: 2.7, h: 0.32, fontSize: 12.5, bold: true, color: last ? C.primary : C.ink });
    if (i < steps.length - 1) arrow(s, MX + 2.15, y + 0.56, MX + 2.15, y + 0.72, C.muted, 1);
  });
  T(s, flat([
    B([bold("By theme: "), plain("surveys & rider groups 48 · drivers 44 · forecasting 68 · service design 90; 60 explicitly rural or low-demand.")]),
    B([bold("Rule vs. manual agreement was low "), plain("(Cohen's κ = 0.41, recall 0.46), so rules only narrowed reading; inclusion was decided manually.")]),
  ]), { x: MX, y: 5.45, w: 7.2, h: 1.35, fontSize: 11.5, color: C.ink2 });
  // right: Chinese supplement
  panel(s, 8.1, 1.38, W - MX - 8.1, 5.5);
  label(s, "Chinese-language supplement", 8.3, 1.5, 4.2);
  T(s, flat([
    B([bold("7 compliant retrieval routes "), plain("(no access controls bypassed): OpenAlex 16,448 + Crossref 8,800 records → 12,565 unique.")]),
    B([bold("Concept tagging "), plain("(bus · rural · calendar time · method): 140 A-tier, 284 B-tier; 21 in core journals.")]),
    B([bold("10 papers verified "), plain("against publisher pages (e.g., Progress in Geography, Human Geography, J. Highway & Transportation R&D).")]),
    B([bold("Finding: "), plain("none studies run-level ridership of county urban–rural buses — within publicly reachable sources.")]),
    B([bold("Pending: "), plain("seven CNKI search strings, run under an institutional account, before conclusions are final.")]),
  ]), { x: 8.3, y: 1.85, w: W - MX - 8.45, h: 3.6, fontSize: 11, color: C.ink });
  label(s, "Method sources", 8.3, 5.5, 4.2);
  T(s, "Traced to originals and DOI-checked: interaction scale, GA2M, boosting, ridge, demand unconstraining, GAMLSS, forecast reconciliation, chance constraints, SAA, integrated population models.", { x: 8.3, y: 5.78, w: W - MX - 8.45, h: 1.0, fontSize: 10.5, color: C.ink2 });
  notes(s, "Transparency about the evidence base. The English corpus came from OpenAlex with manual screening; rules were too weak to trust alone. The Chinese supplement used only compliant routes; the honest conclusion is limited to what is publicly reachable, and a CNKI search is still required.");
}

// 13–18 ------------------------------------------------------------- six themes
litSlide({
  kicker: "II · Theme 1 of 6 · riders and surveys", title: "Who rides rural buses — and what surveys can and cannot see",
  consensus: [
    ["Rural riders are concentrated among older adults, students, car-less and low-income households; trips serve health care, shopping, school and errands.", ref("1–3")],
    ["Survey mode decides who is visible: household surveys reach non-riders; on-board surveys tie answers to a specific run.", ref("4")],
    ["Non-response is selective (frequent travellers are hard to reach) but can be partly corrected by calibration weighting / raking.", ref("5, 6")],
  ],
  methods: [
    ["On-board intercept, household and online surveys; mixed-mode designs need checks for mode effects.", ref("4, 6")],
    ["Rider typologies from smart-card regularities or latent-class analysis; satisfaction and service-quality scales.", ref("7")],
  ],
  limits: [
    ["Surveys are used to describe riders; their results rarely enter ridership models, and counts rarely calibrate surveys."],
    ["Suppressed demand — trips not made for lack of a suitable bus — is invisible in boarding data.", ref("8")],
    ["Long attitude batteries overload older respondents on moving, winding buses (satisficing).", ref("9")],
  ],
  implication: "Surveys and ledger share a run key. On-board rider-type counts enter the joint model as a multinomial likelihood — used to diagnose the model's decomposition (idea borrowed from integrated population models [10]). Household surveys measure non-riders' unmet demand. Behaviour questions replace Likert batteries; on-board interviews are capped at 5 minutes.",
  refs: [
    ["Pucher & Renne (2005)", "Transportation", "Rural mobility and mode choice from the 2001 US NHTS: rural households are highly car-dependent; those without cars are disadvantaged."],
    ["Berg & Ihlström (2019)", "Social Sciences", "Public transport matters for everyday activities of rural residents without car access (Sweden)."],
    ["Yang & Cherry (2016); Espeland & Rowangould (2024)", "TPT; JTG", "Rural riders skew older and lower-income; rural travel burdens and unmet need in the US."],
    ["Stopher & Greaves (2007); Newmark (2014)", "TR-A; JPT", "Household vs. transit-agency (on-board) survey practice and coverage."],
    ["Kuhnimhof, Chlond & Zumkeller (2006)", "TRR", "Non-response and selectivity bias in travel surveys."],
    ["Deville & Särndal (1992); Kolenikov (2014)", "JASA; Stata J.", "Calibration estimators; raking (iterative proportional fitting)."],
    ["Kieu, Bhaskar & Chung (2014)", "QUT ePrints", "Passenger segmentation by travel regularity from smart-card data."],
    ["Church, Frost & Sullivan (2000); Lucas (2012)", "Transport Policy", "Transport and social exclusion: activities forgone for lack of transport."],
    ["Krosnick (1991)", "Appl. Cognitive Psychology", "Satisficing under cognitive burden degrades survey answers."],
    ["Schaub & Abadi (2011)", "J. Ornithology", "Integrated population models: counts and individual data share one likelihood."],
  ],
  notes: "Theme 1. Consensus on who rides and on survey modes is strong. The gap is the disconnect: surveys describe, ledgers count, and the two rarely meet. My response is to join them by the run key and to reserve the household survey for what no ledger can see: trips that never happened.",
});

litSlide({
  kicker: "II · Theme 2 of 6 · demand drivers", title: "What drives ridership: weather, seasons, holidays — and rural rhythms",
  consensus: [
    ["Weather is the best-studied driver: rain and cold reduce ridership, non-linearly, varying by place, season and trip purpose; non-urban evidence is scarce.", ref("1–5")],
    ["Ridership carries layered seasonality — weekly, annual and holiday cycles superimposed.", ref("6")],
    ["Holidays and the Spring Festival reshape mobility strongly, with clear spatio-temporal structure — measured at inter-provincial, inter-city or metro scale.", ref("7–9")],
  ],
  methods: [
    ["Holiday dummies in regression; group-mean comparisons; seasonal decomposition; day-of-week effects.", ref("1, 6")],
  ],
  limits: [
    ["One holiday dummy treats a 3-day Qingming break like the 8-day National Day break, and ignores direction (out before, back after)."],
    ["Weekly commuting is absorbed by day-of-week dummies: the model fits “Friday”, not “students going home”, and fails when school is out."],
    ["Periodic markets are studied for trip satisfaction, not run-level ridership; weekly student and worker commuting is not studied as a driver.", ref("10, 11")],
  ],
  implication: "Encode drivers as explicit, directional calendar factors built from public sources: boarding-student weekly commute (S), worker weekly commute (W), term start/end surges (T), holiday return trips graded by cultural importance × length (R) and Spring Festival travel (CY). Weather, weekday and market day stay as baseline controls.",
  refs: [
    ["Guo, Wilson & Rahbee (2007)", "TRR", "Weather and Chicago bus/rail ridership; weekends and off-peak react more."],
    ["Singhal, Kamga & Yazici (2014)", "TR-A", "Hourly subway ridership in New York: weather effects differ by time of day and day type."],
    ["Arana, Cabezudo & Peñalba (2014)", "TR-A", "Smart-card study: rain and wind cut trips, especially leisure trips."],
    ["Wei (2021); Wei & Liu (2022)", "JTG; TBS", "Non-linear, threshold-like rainfall effects (“how wet is too wet?”)."],
    ["Stover & McCormack (2012)", "JPT", "One of few non-urban studies: weather and bus ridership in Pierce County, WA."],
    ["Kashfi, Bunker & Yiğitcanlar (2015, 2016)", "JTG", "Complex seasonality plus weather in suburban daily ridership."],
    ["Liu, Shi & Chen (2020); Huang, Liu & Zhao (2019)", "IJGI", "Spring Festival changes metro, bus and taxi use in Shenzhen."],
    ["Li et al. (2016); Wang et al. (2014); Zhou et al. (2020)", "Sustainability; arXiv; IJGI", "National Spring Festival migration traced with big data."],
    ["Zhao Z. et al. (2017, 2022)", "Progr. Geography; Human Geography (in Chinese)", "Inter-provincial Spring Festival flows; festival inter-city travel."],
    ["Hong, Liang & Zhu (2024)", "Front. Public Health", "Rural periodic-market trips: satisfaction and road environment."],
    ["Schönfelder & Axhausen (2010)", "Ashgate", "Stable weekly and annual travel rhythms that differ between groups."],
  ],
  rfs: 9.4, fs: 12, leftH: 4.05, ifs: 11.5,
  notes: "Theme 2. Weather and seasonality are well studied in cities; Spring Festival studies are about national migration or metro systems. What is missing for a county like Xinhuang are the recurring, directional rhythms — boarding students and weekly commuters — and a finer treatment of holidays by importance and length.",
});

litSlide({
  kicker: "II · Theme 3 of 6 · unit of analysis", title: "Days and stations dominate the evidence; decisions are made per run",
  consensus: [
    ["Most ridership studies analyse network or line daily totals, station counts or cross-section loads.", ref("1–4")],
    ["Short-term forecasting targets urban metro or bus stations at minute-to-hour resolution with LSTM-type models, in China as elsewhere.", ref("1–5")],
    ["Station or section counts cannot simply be converted to whole-run totals; smart cards enable urban OD and segmentation.", ref("6, 7")],
    ["Rural demand estimates are mostly annual or cross-sectional, driven by population and land use.", ref("8")],
  ],
  methods: [
    ["Count regression (Poisson, negative binomial) for small, over-dispersed counts; demand unconstraining when capacity censors observations.", ref("9, 10")],
  ],
  limits: [
    ["Daily totals hide within-day contrasts: a full Friday-afternoon run and an empty morning run average out."],
    ["Supplementary runs are decided per run, yet evidence comes per day or per stop."],
    ["Moving to runs brings small counts and censoring: a full bus records its capacity, not its demand."],
  ],
  implication: "Unit = total boardings on one one-way run. Negative binomial counts with a censored likelihood (full bus ⇒ demand ≥ seats × turnover κ); daily totals are sums of runs. Real calendar evidence: boarding-student and worker commutes share 189 days but zero runs, so run-level VIFs are 1.28 versus 3.7 and 5.9 for daily totals.",
  refs: [
    ["Zhang, Chen & Shen (2019)", "IEEE Access", "Cluster-based LSTM for short-term metro passenger flow."],
    ["Han, Wang & Ren (2019)", "IJGI", "Hybrid optimised LSTM for short-term bus passenger flow."],
    ["Liyanage, Abduljabbar & Dia (2022)", "J. Urban Management", "Neural networks for bus demand from smart-card data."],
    ["Alexandre, Bernardini & Viterbo (2023)", "TRR", "Systematic review of machine learning for bus transport."],
    ["Xie et al. (2018); Li G. et al. (2019)", "in Chinese", "IC-card and LSTM station-level forecasting in Chinese cities."],
    ["Ma, Ai & Zhang (2018)", "J. Highway & Transp. R&D (in Chinese)", "Estimating bus cross-section flows under incomplete information."],
    ["Egu & Bonnel (2020)", "TR-A", "OD matrices from fare data vs. surveys in Lyon."],
    ["Painter et al. (2007); TRB (2013)", "TRR; TCRP Report 161", "Rural demand forecasting from population and land use."],
    ["Jang (2005)", "J. Transportation Engineering", "Count-data models for trip generation."],
    ["Weatherford & Pölt (2002)", "J. Revenue & Pricing Mgmt", "Unconstraining censored demand improves forecasts and revenue."],
  ],
  notes: "Theme 3. The literature is rich at the level of days and stations but the operator's decision is a run. That choice creates two statistical problems — small counts and censoring — which have established tools. And the real calendar shows why the run level matters: two commuting groups that are inseparable in daily totals are perfectly separated by direction.",
});

litSlide({
  kicker: "II · Theme 4 of 6 · overlapping factors", title: "When peaks coincide: interaction, scale and identifiability",
  consensus: [
    ["Calendar effects are usually estimated one factor at a time; co-occurring factors are treated as controls. Whether two peaks add, amplify or offset is rarely an estimand in transport research."],
    ["Whether an interaction exists depends on the scale: no interaction on the multiplicative (log) scale implies interaction on the additive scale, and vice versa.", ref("1")],
  ],
  methods: [
    ["Log-linear count models with interaction terms: coefficients live on the ratio scale.", ref("2")],
    ["Additive (passenger-count) models: directly operational, but need non-negativity and are harder to fit."],
    ["Gradient boosting + SHAP; explainable boosting (GA2M) with pairwise shape functions.", ref("3–5")],
    ["Shrinkage (ridge) and distributional regression (GAMLSS) for many or unstable parameters.", ref("6, 7")],
  ],
  limits: [
    ["A main-effects log model assumes effects multiply, which itself creates additive-scale interaction."],
    ["SHAP splits effects arbitrarily among correlated factors and gives no intervals; GA2M ignores censoring and collinearity."],
    ["No approach first checks whether the data can identify an interaction at all."],
  ],
  implication: "Define effects by counterfactual switches in passengers per run: independent effect, combined effect, and overlap = combined − Σ independent. Screen identifiability first (≥200 shared runs and ≥200 solo runs per factor). Choose among 12 candidate estimators by synthetic backtesting against known truth, not by preference.",
  refs: [
    ["VanderWeele & Knol (2014)", "Epidemiologic Methods", "Tutorial on interaction: additive vs. multiplicative scales."],
    ["Jang (2005)", "J. Transportation Engineering", "Poisson / negative binomial models for trip counts."],
    ["Friedman (2001)", "Annals of Statistics", "Gradient boosting machine."],
    ["Ke et al. (2017)", "NeurIPS", "LightGBM: efficient gradient-boosted trees."],
    ["Lou, Caruana, Gehrke & Hooker (2013)", "KDD", "GA2M: intelligible models with pairwise interactions."],
    ["Hoerl & Kennard (1970)", "Technometrics", "Ridge regression for non-orthogonal problems."],
    ["Rigby & Stasinopoulos (2005)", "JRSS-C", "GAMLSS: covariates for location, scale and shape."],
    ["Weatherford & Pölt (2002)", "J. Revenue & Pricing Mgmt", "Unconstraining capacity-censored demand."],
  ],
  rfs: 10.8,
  notes: "Theme 4 is the methodological heart. The epidemiology literature tells us interaction is scale-dependent; operators care about extra passengers, which is the additive scale. None of the common tools asks first whether an interaction is even identifiable from the calendar. That is the step I add.",
});

litSlide({
  kicker: "II · Theme 5 of 6 · forecasting", title: "Forecasting for decisions: distributions, calibration and fair evaluation",
  consensus: [
    ["Decisions need predictive distributions: maximise sharpness subject to calibration, and evaluate with strictly proper scores (CRPS, log score); randomised PIT for counts.", ref("1–3")],
    ["Complex models do not reliably beat simple baselines; evaluation must roll forward in time to avoid leakage.", ref("4, 5")],
  ],
  methods: [
    ["Intermittent-demand methods (Croston-type) for sparse series.", ref("6")],
    ["Conformal intervals around any point model, including adaptive versions for drifting series.", ref("7, 8")],
    ["Deep probabilistic models for many related series; hierarchical reconciliation for coherent totals.", ref("9, 10")],
  ],
  limits: [
    ["Transit forecasting is dominated by urban, short-term point forecasts; rural run-level distributions are rare."],
    ["Run and daily forecasts are built separately and do not add up; daily intervals are too narrow because runs share county-wide shocks."],
    ["Deep models need far more data than a county ledger provides."],
  ],
  implication: "One run-level model with a county-wide day shock: daily totals are sums of run-level forecast samples, so their intervals carry the correlation between runs. Evaluate CRPS and 90% coverage overall and by route, time and event against seasonal-naïve and pipeline baselines — on rolling origins and one sealed winter.",
  refs: [
    ["Gneiting, Balabdaoui & Raftery (2007)", "JRSS-B", "Probabilistic forecasts: calibration and sharpness."],
    ["Gneiting & Raftery (2007)", "JASA", "Strictly proper scoring rules (CRPS, log score)."],
    ["Czado, Gneiting & Held (2009)", "Biometrics", "Predictive model assessment for count data (PIT)."],
    ["Makridakis, Spiliotis & Assimakopoulos (2019)", "IJF", "M4 competition: complexity does not guarantee accuracy."],
    ["Hewamalage, Ackermann & Bergmeir (2022)", "DMKD", "Forecast-evaluation pitfalls and best practice."],
    ["Croston (1972); Petropoulos et al. (2013)", "JORS; IMDS", "Forecasting intermittent demand."],
    ["Lei et al. (2017); Romano et al. (2019); Angelopoulos & Bates (2023)", "JASA; NeurIPS; FnT ML", "Distribution-free conformal prediction."],
    ["Gibbs & Candès (2021); Barber et al. (2023)", "NeurIPS; Ann. Stat.", "Conformal inference under distribution shift."],
    ["Salinas, Flunkert & Gasthaus (2019)", "IJF", "DeepAR: autoregressive recurrent probabilistic forecasts."],
    ["Wickramasuriya, Athanasopoulos & Hyndman (2019)", "JASA", "Optimal reconciliation (MinT) needs the error covariance."],
  ],
  rfs: 9.8,
  notes: "Theme 5. Forecasting theory is mature; the gap is application to rural runs and, crucially, coherence between run forecasts and daily totals. The day-shock design is my answer: it is what makes the daily interval honest.",
});

litSlide({
  kicker: "II · Theme 6 of 6 · service design", title: "Fixed, flexible or hybrid service under uncertain demand",
  consensus: [
    ["Classical planning sets frequencies and timetables to balance ridership and cost; newer work adds robust or stochastic demand.", ref("1–4")],
    ["Rural demand-responsive transport (DRT) is widely trialled, but many schemes fail on cost and low use; there is an efficiency–equity dilemma, and older users struggle with booking.", ref("5–8")],
    ["Research is moving toward hybrid fixed + flexible designs.", ref("9, 10")],
  ],
  methods: [
    ["Frequency-setting and timetabling optimisation; chance-constrained programming solved by sample average approximation; simulation.", ref("1, 11")],
  ],
  limits: [
    ["Hybrid designs usually assume idealised or urban demand rather than actual probabilistic forecasts."],
    ["Rural DRT evidence is mostly European; demography, roads and operating institutions differ from a Chinese mountain county run by a single bus station."],
    ["Point forecasts fed into optimisation ignore risk on high-demand days."],
  ],
  implication: "Keep a fixed core timetable (no booking needed). Add a day-ahead reserve sized from the daily-total forecast, and forecast-triggered supplementary runs when Pr(demand > effective capacity) > α. Report a cost–denied-boarding frontier instead of one “optimal” plan; triggers come from calendar information known days ahead, not from bookings.",
  refs: [
    ["Newell (1971); Ceder (1984)", "Transp. Science; TR-A", "Dispatching policies; frequency setting from passenger counts."],
    ["Hadas & Shnaiderman (2012)", "TR-B", "Minimum-cost frequencies with stochastic demand and travel time."],
    ["Durán-Micco & Vansteenwegen (2021)", "Public Transport", "Survey of network design and frequency setting."],
    ["Gkiotsalitis et al. (2021); Xia et al. (2023)", "TR-C", "Frequencies and timetables under demand uncertainty."],
    ["Mageean & Nelson (2003); Laws et al. (2009); Vansteenwegen et al. (2022)", "JTG; JPT; TR-C", "DRT evaluations and review."],
    ["Currie & Fournier (2020)", "Res. Transp. Economics", "Why most DRT / micro-transit schemes fail."],
    ["Schasché, Sposato & Hampl (2022)", "Transport Policy", "Rural DRT: conflicting expectations, weak acceptance."],
    ["Jittrapirom et al. (2019); Knierim & Schlüter (2021)", "RTBM; JTG", "Older and less-mobile people's attitudes to DRT."],
    ["Nourbakhsh & Ouyang (2011); Zhao, Sun & Cats (2021); Calabrò et al. (2023)", "TR-B; Transportmetrica A; TR-A", "Structured flexible and joint fixed + DRT designs."],
    ["Sörensen et al. (2020)", "Transport Policy", "How much flexibility does rural public transport need?"],
    ["Charnes & Cooper (1959); Kleywegt et al. (2002)", "Mgmt Science; SIAM J. Optim.", "Chance constraints; sample average approximation."],
  ],
  rfs: 9.3, fs: 12.2, ifs: 11.5,
  notes: "Theme 6 connects to my step 5. The evidence against pure DRT in rural areas is sobering, and older riders do not book. Hybrid designs are promising but rarely driven by real probabilistic forecasts. In Xinhuang the key drivers are knowable days ahead, which allows supplementary service without a booking system.",
});

// 19 --------------------------------------------------------------- lineage table
{
  const s = pres.addSlide();
  header(s, "II · Synthesis", "From prior practice to this study's design choices");
  const hdr = [th("Prior practice"), th("Why it falls short for Xinhuang"), th("Design choice in this study")];
  const r = [
    ["Daily or station totals", "Opposite-direction flows on the same day blur together; decisions are per run", "Run-level unit: total boardings per one-way run"],
    ["One holiday dummy", "3-day and 8-day holidays differ in return-trip volume and direction", "Holiday intensity by type × length (hierarchical type effect)"],
    ["Day-of-week dummies", "Fit “Friday”, not “students going home”; break down in vacations", "Directional student (S) and worker (W) factors switched by the school calendar"],
    ["Log-scale interaction terms", "Answer a ratio-scale question; operators need extra passengers", "Passenger-scale overlaps; scale chosen by likelihood"],
    ["All interactions / ML + SHAP", "Unidentifiable pairs; arbitrary attribution; no intervals", "Identifiability screen (≥200 runs) before estimation"],
    ["Full buses read as demand", "Peaks underestimated (−14% in synthetic tests)", "Censored likelihood; capacity = seats × turnover κ"],
    ["Pipeline: effects → point forecast → optimisation", "Uncertainty lost between steps; daily intervals too narrow", "One joint model; decisions drawn from forecast samples"],
    ["Surveys as description only", "Never checked against ridership; unmet demand unseen", "Composition likelihood as diagnostic; household survey for unmet demand"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ bold: true }, f)), td(x[1], Object.assign({ color: C.ink2 }, f)), td(x[2], Object.assign({ color: C.primary, bold: true }, f))]);
  });
  table(s, rows, MX, 1.42, CW, [3.1, 4.6, 4.43], { rowH: 0.6, fontSize: 11 });
  notes(s, "This table is the bridge between Parts II and III: each row is a common practice, why it does not fit Xinhuang's data and decisions, and the concrete design choice I make instead. The −14% refers to the synthetic backtest in step 3.");
}

// 20 --------------------------------------------------------------- gap evidence
{
  const s = pres.addSlide();
  header(s, "II · Gap evidence", "Are these gaps real? A three-step check beyond keyword counts");
  const steps = [
    ["1  Correct hit counts for precision", "“Transit ridership forecasting”: ≈1,602 relevant studies (95% CI 1,220–1,919). “Rural transit × ridership forecasting”: ≈16 (11–23). “Rural transit × probabilistic forecasting”: 1 hit, not relevant."],
    ["2  Read narrow searches in full", "Holidays or Spring Festival × ridership: 6 relevant, all rail or urban. Rural DRT demand forecasting: 3, all cross-sectional. Market days × buses: 4, none on run-level ridership."],
    ["3  Code research depth, not mentions", "72 stratified studies scored 0–2 on six dimensions (rider surveys, driver effects, time grain, uncertainty, link to operations, rural setting)."],
  ];
  steps.forEach((st, i) => {
    const y = 1.45 + i * 1.28;
    T(s, st[0], { x: MX, y, w: 5.9, h: 0.3, fontSize: 14, bold: true, color: C.primary });
    T(s, st[1], { x: MX, y: y + 0.35, w: 5.9, h: 0.9, fontSize: 12.5, color: C.ink2 });
  });
  box(s, MX, 5.45, 5.9, 1.4, { fill: C.tint, line: C.tint, lw: 0, align: "left", valign: "middle", fs: 12, text: [
    { text: "What can — and cannot — be concluded. ", options: { bold: true, color: C.ink } },
    { text: "Each theme is well developed, but deep links between adjacent steps are rare. This is not a claim that “no study exists”: the CNKI search is pending and depth coding had one coder (a second coder will check a sample).", options: { color: C.ink2 } }] });
  const labels = ["Run-level data + uncertainty quantified", "Driver effects estimated + non-urban setting", "Uncertainty quantified + fed into operations", "Primary survey of rider groups + drivers", "Explicitly rural + ridership time series"];
  const vals = [1.4, 6.9, 4.2, 1.4, 1.4];
  s.addChart(pres.charts.BAR, [{ name: "Share of coded studies (%)", labels: labels.slice().reverse(), values: vals.slice().reverse() }], {
    x: 6.85, y: 1.4, w: 5.9, h: 4.55, barDir: "bar", titleFontFace: BF, catAxisLabelFontFace: BF, dataLabelFontFace: BF, chartColors: [C.primary], barGapWidthPct: 55,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"%\"", dataLabelFontSize: 11, dataLabelColor: C.ink,
    catAxisLabelFontSize: 11, catAxisLabelColor: C.ink, catAxisLabelFontFace: BF, valAxisHidden: true, valAxisMaxVal: 9, valAxisMinVal: 0,
    valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
    showTitle: true, title: "Studies reaching depth on two linked dimensions (n = 72)", titleFontSize: 12, titleColor: C.ink, titleFontFace: BF,
  });
  T(s, "95% Wilson intervals: 1.4% (0.2–7.5) · 6.9% (3.0–15.2) · 4.2% (1.4–11.5).", { x: 6.85, y: 6.05, w: 5.9, h: 0.3, fontSize: 10, color: C.muted, italic: true });
  notes(s, "Keyword co-occurrence alone is weak evidence of a gap, so I used three steps: precision-corrected counts, full reading of narrow searches, and depth coding. The pattern is consistent: each topic is mature, but the combinations this study needs are rare. I state explicitly what cannot be claimed.");
}

// 21 --------------------------------------------------------------- gaps -> RQs
{
  const s = pres.addSlide();
  header(s, "II · Research questions", "Five gaps lead to four research questions");
  const gaps = [
    ["G1", "Unit stuck at day or station; no whole-run measure"],
    ["G2", "Drivers dominated by weather; predictable rural calendar rhythms understudied"],
    ["G3", "Single-factor estimates; independent vs. combined effects of overlapping factors not separated"],
    ["G4", "Stages modelled separately; uncertainty not passed downstream"],
    ["G5", "Surveys disconnected from ridership records"],
  ];
  const map = { G1: [0, 1, 1, 0], G2: [1, 1, 0, 0], G3: [0, 1, 0, 0], G4: [0, 0, 1, 1], G5: [1, 1, 0, 0] };
  const rows = [[th("Gap"), th(""), th("RQ1", { align: "center" }), th("RQ2", { align: "center" }), th("RQ3", { align: "center" }), th("RQ4", { align: "center" })]];
  gaps.forEach((g) => {
    rows.push([td(g[0], { bold: true, color: C.primary, fontSize: 12 }), td(g[1], { fontSize: 11.5, color: C.ink2 })].concat(map[g[0]].map((v) => td(v ? "●" : "", { align: "center", fontSize: 14, color: C.primary, fill: { color: v ? C.primaryLight : C.white } }))));
  });
  table(s, rows, MX, 1.45, 6.6, [0.55, 3.65, 0.6, 0.6, 0.6, 0.6], { rowH: [0.36, 0.74, 0.74, 0.74, 0.74, 0.74], fontSize: 12 });
  const rq = [
    ["RQ1 · S1", "Which rider groups use the county's urban–rural buses, and where does the current timetable leave demand unmet — by group and by village?"],
    ["RQ2 · S2–S3", "When predictable rural calendar factors overlap, how large are their independent and combined effects on a single run — additive, amplifying or offsetting?"],
    ["RQ3 · S4", "Can run-level predictive distributions be well calibrated, and stay calibrated when summed to daily totals?"],
    ["RQ4 · S5", "With capacity-censored demand, how should forecast distributions set chance-constrained supplementary runs, trading cost against denied boardings?"],
  ];
  rq.forEach((q, i) => {
    const y = 1.45 + i * 1.33;
    box(s, 7.55, y, 5.2, 1.18, { fill: i === 1 ? C.primaryLight : C.tint, line: i === 1 ? C.primaryLight : C.tint, lw: 0 });
    T(s, q[0], { x: 7.72, y: y + 0.1, w: 4.9, h: 0.26, fontSize: 11, bold: true, color: C.primary });
    T(s, q[1], { x: 7.72, y: y + 0.38, w: 4.9, h: 0.78, fontSize: 11.5, color: C.ink });
  });
  T(s, "The questions chain: RQ1's rider groups explain RQ2's effects; RQ2's effects drive RQ3's forecasts; RQ3's distributions are RQ4's inputs.", { x: MX, y: 5.9, w: 6.6, h: 0.8, fontSize: 12.5, color: C.ink2, italic: true });
  notes(s, "The questions are derived, not assumed. G3 is the core methodological gap and maps to RQ2, which is highlighted. Stages S1–S5 are the uses of a single model, as Part III shows.");
}

// 22 --------------------------------------------------------------- divider III
notes(divider("III", "Research framework and next steps", "Five linked steps — from surveys to service planning — implemented as one run-level model, with methods chosen by backtest and frozen before testing.", 2),
  "Part III. I will show the research logic, how the framework evolved, the integrated model, and then each step in turn, ending with the timeline.");

// 23 --------------------------------------------------------------- research logic
{
  const s = pres.addSlide();
  header(s, "III · Research logic", "Five linked steps from surveys to service planning");
  const st = [
    ["1", "Observe", "S1 · RQ1", "Who rides on which days? Do volumes and rider groups differ by day type in recurring ways? What problems do riders and non-riders report?", "On-board (summer, fall weekends, winter), household and online surveys; tally sheets", "Rider groups by day type; problem ranking; unmet demand; turnover κ"],
    ["2", "Explain", "S2 · RQ2", "Do market days, weather, public and lunar holidays, and school vacations change demand — and by how much?", "Public calendars, school terms, weather, timetable", "Daily factor calendar; identifiability table"],
    ["3", "Quantify", "S3 · RQ2", "Which factors move demand on an individual run, and how large are independent and combined effects?", "Run ledger + factors; censored count model, passenger scale", "Independent, combined and overlap effects with intervals"],
    ["4", "Forecast", "S4 · RQ3", "Can tomorrow's factors predict each run's demand 1–7 days ahead — with honest uncertainty?", "Fitted model + calendar and weather forecasts", "Run and daily-total predictive distributions"],
    ["5", "Plan", "S5 · RQ4", "How should service adapt: fixed core plus flexible runs scaled to the day's forecast and to survey-identified problems?", "Forecast samples, seats, costs, survey preferences", "Reserve and triggered-run rules; cost–denial frontier"],
  ];
  const w = 2.3, gap = 0.157;
  st.forEach((d, i) => {
    const x = MX + i * (w + gap);
    s.addShape(pres.shapes.CHEVRON, { x, y: 1.5, w: w + 0.12, h: 0.62, fill: { color: i === 2 ? C.primary : "3B6E9A" }, line: { color: C.white, width: 0 } });
    T(s, `${d[0]}  ${d[1]}`, { x: x + 0.42, y: 1.5, w: w - 0.5, h: 0.62, fontSize: 15, bold: true, color: C.white, valign: "middle" });
    T(s, d[2], { x, y: 2.28, w, h: 0.28, fontSize: 11, bold: true, color: C.primary });
    T(s, d[3], { x, y: 2.6, w, h: 1.55, fontSize: 12, color: C.ink });
    panel(s, x, 4.2, w, 0.95, C.tint);
    T(s, [{ text: "DATA · METHOD", options: { bold: true, fontSize: 8.5, color: C.muted, charSpacing: 0.6, breakLine: true } }, { text: d[4], options: { fontSize: 10.5, color: C.ink2 } }], { x: x + 0.1, y: 4.26, w: w - 0.2, h: 0.85, valign: "top" });
    panel(s, x, 5.22, w, 0.95, C.primaryLight);
    T(s, [{ text: "OUTPUT", options: { bold: true, fontSize: 8.5, color: C.primary, charSpacing: 0.6, breakLine: true } }, { text: d[5], options: { fontSize: 10.5, color: C.ink } }], { x: x + 0.1, y: 5.28, w: w - 0.2, h: 0.85, valign: "top" });
  });
  arrow(s, 12.2, 6.35, 1.2, 6.35, C.muted, 1, "dash");
  T(s, "Feedback: supplementary-run results decide where the next survey wave samples more densely and which ledger fields are added (e.g., full-bus denials).", { x: 1.2, y: 6.43, w: 11, h: 0.4, fontSize: 10.5, color: C.muted, italic: true, align: "center" });
  notes(s, "This is the research logic as I originally framed it, now mapped to stages S1–S5 and research questions. Step 2 includes all the factors I started with — market days, weather, Gregorian and lunar holidays, and school vacations — but, as the next slides show, they are encoded more precisely and some serve as controls.");
}

// 24 --------------------------------------------------------------- evolution
{
  const s = pres.addSlide();
  header(s, "III · Reasoning", "How the design evolved: six revisions and the evidence behind them");
  const hdr = [th("Earlier design"), th("Current design"), th("Why the change")];
  const r = [
    ["Stages 2–5 as a sequential pipeline", "One run-level joint model; stages are its uses", "Pipelines drop uncertainty. Synthetic test: daily 90% intervals cover 0.39 (pipeline) vs 0.87 (joint)"],
    ["Drivers incl. industrial-park shifts and clinic schedules", "Only reliably obtainable variables (21 kept, 3 dropped); worker weekly commute added", "Rosters cannot be obtained day by day; the commute of park and township staff can be encoded from calendars"],
    ["Market day as a core driver", "Market day as a baseline control", "Advisory review; the survey's shopping/market purpose checks whether a control is enough"],
    ["“Which factors matter?”", "“How large are independent and combined effects when factors overlap?”", "The real timetable × calendar shows heavy overlap by day but separation by run and direction"],
    ["Worker commute coded in the students' direction", "Workers leave town Sunday p.m., return Friday p.m. / Saturday a.m.", "Correction raised student-only runs from 33 to 5,104; the earlier “inseparable” conclusion was withdrawn"],
    ["Surveys as the main source for effects", "Surveys for description, diagnosis and external constraints", "Synthetic test: adding 400–600 questionnaires left overlap-effect error unchanged (0.038 → 0.038); ≈5,500 would be needed to detect misspecification"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ color: C.ink2 }, f)), td(x[1], Object.assign({ bold: true, color: C.primary }, f)), td(x[2], Object.assign({}, f))]);
  });
  table(s, rows, MX, 1.42, CW, [3.0, 3.85, 5.28], { rowH: [0.34, 0.66, 0.66, 0.6, 0.62, 0.66, 0.72], fontSize: 11 });
  T(s, "Lesson from the direction error: a mis-coded factor still fits well — it just assigns effects to the wrong group. Encodings are therefore checked against survey-reported departure times and dispatcher experience before estimation.", { x: MX, y: 6.08, w: CW, h: 0.72, fontSize: 11.5, color: C.accent, italic: true });
  notes(s, "This slide shows the reasoning process. Each revision came from evidence: synthetic validation, data availability, advisory review, or an error I found and corrected. The direction error is worth dwelling on: the model fitted well while being wrong, which is why the survey now includes 'which bus do you usually take out and back'.");
}

// 25 --------------------------------------------------------------- framework
{
  const s = pres.addSlide();
  header(s, "III · Framework", "One run-level model links effects, forecasts and decisions");
  T(s, "DATA KNOWN IN ADVANCE", { x: MX, y: 1.38, w: 3.2, h: 0.24, fontSize: 10, bold: true, color: C.muted, charSpacing: 0.8 });
  T(s, "ONE JOINT RUN-LEVEL MODEL", { x: 4.35, y: 1.38, w: 4.4, h: 0.24, fontSize: 10, bold: true, color: C.primary, charSpacing: 0.8 });
  T(s, "FORECASTS AND DECISIONS", { x: 9.35, y: 1.38, w: 3.4, h: 0.24, fontSize: 10, bold: true, color: C.muted, charSpacing: 0.8 });
  const din = [["Run ledger", "total boardings per one-way run"], ["Timetable & seats", "run slots, seat capacity"], ["Calendar", "school terms, holidays, make-up days, Spring Festival, market days"], ["Weather", "history for fitting; forecasts for prediction"]];
  din.forEach((d, i) => {
    const y = 1.72 + i * 0.93;
    box(s, MX, y, 3.25, 0.78, { fill: C.white, line: C.ink2, lw: 1, align: "left", text: [{ text: d[0], options: { bold: true, fontSize: 11.5, breakLine: true } }, { text: d[1], options: { fontSize: 9.5, color: C.ink2 } }] });
    arrow(s, 3.85, y + 0.39, 4.3, y + 0.39, C.ink2);
  });
  panel(s, 4.3, 1.68, 4.5, 3.75, C.primaryLight);
  box(s, 4.5, 1.85, 4.1, 1.05, { fill: C.white, line: C.primary, lw: 1.2, text: [{ text: "S3  Effect decomposition", options: { bold: true, fontSize: 12, breakLine: true, color: C.primary } }, { text: "independent · combined · overlap (add / amplify / offset)", options: { fontSize: 10.5 } }] });
  box(s, 4.5, 3.03, 4.1, 1.15, { fill: C.white, line: C.ink, lw: 1.2, text: [{ text: "Shared structure", options: { bold: true, fontSize: 12, breakLine: true } }, { text: "negative binomial counts + seat-capacity censoring + route × direction × period intercepts + county-wide day shock", options: { fontSize: 10.5 } }] });
  box(s, 4.5, 4.31, 4.1, 0.95, { fill: C.white, line: C.primary, lw: 1.2, text: [{ text: "S2  Daily totals", options: { bold: true, fontSize: 12, breakLine: true, color: C.primary } }, { text: "= sums of run forecasts (not modelled separately)", options: { fontSize: 10.5 } }] });
  box(s, 9.35, 1.75, 3.4, 1.45, { fill: C.white, line: C.primary, lw: 1.2, text: [{ text: "S4  Run-level forecasts", options: { bold: true, fontSize: 12, breakLine: true, color: C.primary } }, { text: "1–7 days ahead, drawn run by run; daily intervals from the same draws", options: { fontSize: 10.5 } }] });
  box(s, 9.35, 3.6, 3.4, 1.8, { fill: C.white, line: C.primary, lw: 1.2, text: [{ text: "S5  Supplementary runs", options: { bold: true, fontSize: 12, breakLine: true, color: C.primary } }, { text: "(1) day-ahead reserve of buses and drivers; (2) add a run if Pr(demand > capacity) > α; α chosen on the cost–denial frontier", options: { fontSize: 10.5 } }] });
  arrow(s, 8.8, 2.5, 9.35, 2.48, C.primary, 1.5);
  arrow(s, 11.05, 3.2, 11.05, 3.6, C.primary, 1.5);
  // survey path
  box(s, MX, 5.6, 3.25, 1.25, { fill: C.accentLight, line: C.accent, lw: 1.2, text: [{ text: "S1  Surveys", options: { bold: true, fontSize: 12, color: C.accent, breakLine: true } }, { text: "on-board (boarding points, rider type), household (trips not made and why), online", options: { fontSize: 10 } }] });
  box(s, 4.3, 5.75, 4.5, 1.05, { fill: C.white, line: C.accent, lw: 1.2, text: [{ text: "Effective capacity = seats × turnover κ", options: { bold: true, fontSize: 11, breakLine: true } }, { text: "rider-group composition likelihood (model vs. survey)", options: { fontSize: 10.5 } }] });
  arrow(s, 3.85, 6.25, 4.3, 6.25, C.accent, 1.5);
  arrow(s, 6.55, 5.75, 6.55, 5.43, C.accent, 1.5);
  T(s, "sets censoring point; checks group decomposition", { x: 6.65, y: 5.43, w: 2.2, h: 0.32, fontSize: 9, color: C.accent, italic: true });
  s.addShape(pres.shapes.LINE, { x: 11.05, y: 5.4, w: 0, h: 0.95, line: { color: C.muted, width: 1, dashType: "dash" } });
  arrow(s, 11.05, 6.35, 8.8, 6.35, C.muted, 1, "dash");
  T(s, "feedback: next survey windows; new ledger field (full-bus denials)", { x: 11.15, y: 5.55, w: 1.65, h: 0.75, fontSize: 9, color: C.muted, italic: true });
  notes(s, "The integrated framework. Left: all inputs are known in advance. Centre: one model whose parameters are the effects (S3) and whose sums are the daily totals (S2). Right: its predictive distribution is the forecast (S4), and decisions (S5) are computed directly on forecast samples, so uncertainty flows from parameters to decisions. The surveys supply the censoring point through the turnover coefficient and check the rider-group decomposition.");
}

// 26 --------------------------------------------------------------- step 1 surveys
{
  const s = pres.addSlide();
  header(s, "III · Step 1 · Observe", "Four surveys, each assigned a job the ledger cannot do");
  const hdr = [th("Survey"), th("Sample design"), th("Window"), th("Planned n", { align: "right" }), th("Main job")];
  const r = [
    ["On-board, summer 2026", "Passengers ≥16 on sampled runs (legacy instrument)", "15 Jul–31 Aug 2026 · done", "collected", "RQ1; linked to runs by bridging rules"],
    ["On-board, fall-term weekends", "6 strata: calendar factor × direction (A1–A6), 30 runs, systematic sampling", "16 Oct–20 Dec 2026", "240", "Test student vs. worker encodings"],
    ["On-board, winter & Spring Festival travel", "5 strata (B1–B5), 129 runs; re-drawn when 2027 dates are published", "1 Jan–28 Feb 2027", "≈1,030", "Composition check; holiday timing"],
    ["Household (village)", "3 access strata; PPS villages (30 + 6 reserve); 15 addresses per village; no substitution", "With the fall wave", "360 households", "Non-riders; unmet demand; reasons"],
    ["Online", "Out-migrant workers, students' parents; channel quotas (non-probability)", "Around holidays", "per quota", "Return timing; cross-checks"],
    ["On-board, summer 2027", "Redesigned instrument, factor strata", "Jul–Aug 2027", "per design", "Robustness"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ bold: true }, f)), td(x[1], Object.assign({ color: C.ink2 }, f)), td(x[2], f), td(x[3], Object.assign({ align: "right" }, f)), td(x[4], Object.assign({ color: C.primary }, f))]);
  });
  table(s, rows, MX, 1.42, CW, [2.45, 4.35, 2.05, 1.2, 2.08], { rowH: 0.56, fontSize: 11.5 });
  const cards = [
    ["Tally sheet on every sampled run", "Stop-by-stop boardings and alightings give turnover κ, full-bus denials, and counts of under-16 students who are not interviewed."],
    ["Short, behaviour-based instruments", "56 respondent items from a 47-item bank in 13 groups. Rule-based length: on-board 4.8 / 4.7 min (cap 5), household 5.7 (cap 15), online 3.5 (cap 10)."],
    ["Every item earns its place", "Each item must enter a stage and serve an RQ: of 53 earlier items, 33 kept or rewritten, 11 merged, 9 dropped; 10 added."],
  ];
  cards.forEach((c, i) => {
    const x = MX + i * 4.12;
    label(s, c[0], x, 5.5, 3.95);
    T(s, c[1], { x, y: 5.8, w: 3.9, h: 1.1, fontSize: 12, color: C.ink2 });
  });
  notes(s, "Each survey has one job. The fall weekend wave is targeted at the strata that distinguish students from workers, with a control stratum on Tuesday–Thursday afternoons. The winter wave covers Spring Festival travel, the hardest period to forecast. The household survey is the only way to see non-riders. The tally sheet is filled on every sampled run regardless of how many interviews are completed.");
}

// 27 --------------------------------------------------------------- step 1 problems + sampling
{
  const s = pres.addSlide();
  header(s, "III · Step 1 · Observe", "Identifying current problems — riders and non-riders, by village access");
  img(s, "map_sampling.png", MX - 0.1, 1.35, 5.75, 5.0, { alignX: "left", alt: "Household survey sample: 30 selected and 6 reserve villages in three access strata" });
  T(s, "Villages drawn by systematic PPS within access strata (seed 20261001); one certainty village (Shawan).", { x: MX, y: 6.4, w: 5.6, h: 0.45, fontSize: 9.5, color: C.muted, italic: true });
  label(s, "Same problem question in all three surveys", 6.6, 1.45, 6.1);
  T(s, "“Which one of these affects your bus use most?” — forced single choice replaces an 11-item Likert battery:", { x: 6.6, y: 1.75, w: 6.1, h: 0.5, fontSize: 11.5, color: C.ink });
  const opts = ["Too few runs", "Last bus too early", "First bus too late", "Don't know when the bus comes", "Bus full, could not board", "Long, winding ride / motion sickness", "Home too far from the boarding point", "No obvious problem"];
  opts.forEach((o, i) => {
    const x = 6.6 + (i % 2) * 3.07, y = 2.35 + Math.floor(i / 2) * 0.45;
    box(s, x, y, 2.95, 0.37, { fill: C.tint, line: C.tint, lw: 0, text: o, fs: 10.5, align: "left" });
  });
  label(s, "Unmet demand, measured as behaviour", 6.6, 4.3, 6.1);
  T(s, flat([
    B([bold("On-board: "), plain("trips given up or postponed in the past month; what you would do if this run did not operate.")]),
    B([bold("Household: "), plain("household bus trips in the past 7 days; reasons for rarely riding; trips not made for lack of a bus.")]),
    B([bold("Online: "), plain("arrived in the county town but no bus home; preferred departure times around holidays.")]),
  ]), { x: 6.6, y: 4.58, w: 6.1, h: 1.45, fontSize: 11, color: C.ink2 });
  box(s, 6.6, 6.1, 6.1, 0.75, { fill: C.primaryLight, line: C.primaryLight, lw: 0, align: "left", fs: 10.5, text: "Pre-registered checks: boarding-student share on in-term Friday/Sunday runs exceeds vacation runs; far villages report higher unmet demand. County-wide 95% CI half-width ≈ 6.3 pp (p = 30%, ICC 0.05)." });
  notes(s, "Problem identification uses the same forced-choice question in all three surveys so riders and non-riders can be compared, and unmet demand is measured as behaviour in a recall window, which can be checked against ledgers. The household sample is stratified by the access strata shown in Part I, with more villages near routes than proportional allocation would give, so each stratum can be estimated.");
}

// 28 --------------------------------------------------------------- step 2 factors
{
  const s = pres.addSlide();
  header(s, "III · Step 2 · Explain", "Turning holidays, school calendars, markets and weather into run-level factors");
  const hdr = [th("Driver in the original plan"), th("Encoding on each run (date × time × direction)"), th("Role")];
  const r = [
    ["School term: boarding students' weekly trip", "S — Sunday p.m. inbound (back to school); last school day p.m. outbound (home); zero in vacations", "Core factor"],
    ["Weekly commute of park and township workers", "W — Sunday p.m. outbound; Friday p.m. inbound; first rest day a.m. inbound (weight 0.5); not tied to school terms", "Core factor"],
    ["Winter and summer vacations: start and end", "T — eve of term inbound, first vacation day outbound (next day 0.4–0.5); vacations also switch S off", "Core factor"],
    ["Gregorian holidays (New Year, Qingming, Labour Day, National Day) and lunar holidays (Dragon Boat, Mid-Autumn)", "R — out before, back after; intensity by holiday type × √(days / 7), estimated with a hierarchical type effect", "Core factor"],
    ["Spring Festival (lunar new year)", "CY — days −20…0 and +2…+20; bell-shaped peaks 3 days before and around day 7", "Core factor"],
    ["Market days (lunar 5-day cycle)", "Market-day indicator for towns along the route", "Control"],
    ["Weather", "Precipitation in the run window, max. temperature, extreme-weather flag", "Control"],
    ["Weekday, make-up workdays, year", "Day-of-week and adjusted-workday indicators; year terms", "Control"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const core = x[2] === "Core factor";
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ bold: true, fontSize: 11.2 }, f)), td(x[1], Object.assign({ fontSize: 11.2, color: C.ink2 }, f)), td(x[2], Object.assign({ fontSize: 11.2, bold: true, color: core ? C.primary : C.muted }, f))]);
  });
  table(s, rows, MX, 1.42, 8.3, [2.85, 4.4, 1.05], { rowH: [0.34, 0.66, 0.66, 0.66, 0.84, 0.6, 0.46, 0.46, 0.46] });
  // direction schematic
  const X = 9.3;
  label(s, "Opposite directions on the same days", X, 1.45, 3.5);
  const lane = (y, day, stu, wrk) => {
    T(s, day, { x: X, y, w: 3.45, h: 0.28, fontSize: 11.5, bold: true, color: C.ink });
    T(s, "Town", { x: X, y: y + 0.36, w: 0.7, h: 0.3, fontSize: 10, color: C.ink2 });
    T(s, "Village", { x: X + 2.75, y: y + 0.36, w: 0.8, h: 0.3, fontSize: 10, color: C.ink2, align: "right" });
    if (stu === "out") arrow(s, X + 0.7, y + 0.78, X + 2.75, y + 0.78, C.s1, 2.2); else arrow(s, X + 2.75, y + 0.78, X + 0.7, y + 0.78, C.s1, 2.2);
    T(s, "students", { x: X + 1.2, y: y + 0.5, w: 1.1, h: 0.25, fontSize: 9.5, color: C.s1, align: "center" });
    if (wrk === "out") arrow(s, X + 0.7, y + 1.16, X + 2.75, y + 1.16, C.s2, 2.2); else arrow(s, X + 2.75, y + 1.16, X + 0.7, y + 1.16, C.s2, 2.2);
    T(s, "workers", { x: X + 1.2, y: y + 1.2, w: 1.1, h: 0.25, fontSize: 9.5, color: C.s2, align: "center" });
  };
  lane(1.85, "Friday afternoon", "out", "in");
  lane(3.55, "Sunday afternoon", "in", "out");
  T(s, "Same day, opposite buses: the two commuting groups share 189 days but never the same run — the key to separating their effects.", { x: X, y: 5.25, w: 3.45, h: 1.1, fontSize: 11, color: C.ink2, italic: true });
  notes(s, "This is how the five temporal drivers I started with are operationalised. Holidays are split by importance and length; the Spring Festival has its own factor; vacations switch the student factor off and create term start/end surges. Market days and weather remain in the model as controls, so their effects are still estimated. The schematic shows why directions matter: students go home on Friday afternoon while workers come back to town.");
}

// 29 --------------------------------------------------------------- identifiability
{
  const s = pres.addSlide();
  header(s, "III · Step 2 · Explain", "Real timetable × calendar: factors overlap by day but separate by run");
  const F = ["S", "W", "R", "CY", "T"];
  const run = [[6210, 0, 845, 229, 32], [0, 12286, 69, 437, 298], [845, 69, 3536, 0, 0], [229, 437, 0, 5440, 816], [32, 298, 0, 816, 2040]];
  const day = [[191, 189, 26, 12, 6], [189, 354, 38, 30, 16], [26, 38, 51, 0, 0], [12, 30, 0, 80, 12], [6, 16, 0, 12, 30]];
  const ramp = ["F4F8FD", "DCE9F8", "B7D3F6", "86B6EF", "3987E5", "1C5CAB", "104281"];
  const heat = (M, x, y, ttl, max) => {
    T(s, ttl, { x, y, w: 3.8, h: 0.3, fontSize: 11.5, bold: true, color: C.ink });
    const rows = [[td("", { fill: { color: C.white } })].concat(F.map((f) => td(f, { bold: true, align: "center", fill: { color: C.white } })))];
    M.forEach((row, i) => rows.push([td(F[i], { bold: true, fill: { color: C.white } })].concat(row.map((v) => {
      const k = v === 0 ? 0 : Math.min(6, Math.max(1, Math.round((Math.log10(v) / Math.log10(max)) * 6)));
      return td(v.toLocaleString("en-US"), { align: "center", fontSize: 11, color: k >= 4 ? C.white : C.ink, fill: { color: ramp[k] } });
    }))));
    table(s, rows, x, y + 0.35, 3.8, [0.55, 0.65, 0.65, 0.65, 0.65, 0.65], { rowH: 0.45, fontSize: 11, border: { type: "solid", pt: 1, color: C.white } });
  };
  heat(run, MX, 1.45, "a  Runs affected by both factors", 12286);
  heat(day, 4.65, 1.45, "b  Days on which both occur", 354);
  s.addChart(pres.charts.BAR, [
    { name: "Run level", labels: ["S students", "W workers", "R holidays", "CY Spring Fest.", "T term start/end"], values: [1.28, 1.28, 1.02, 1.01, 1.02] },
    { name: "Daily total", labels: ["S students", "W workers", "R holidays", "CY Spring Fest.", "T term start/end"], values: [3.69, 5.87, 1.24, 2.2, 1.08] },
  ], { x: 8.75, y: 1.4, w: 4.0, h: 3.35, barDir: "bar", titleFontFace: BF, catAxisLabelFontFace: BF, legendFontFace: BF, dataLabelFontFace: BF, barGrouping: "clustered", chartColors: [C.s1, C.s2], barGapWidthPct: 60,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 9, dataLabelColor: C.ink, dataLabelFormatCode: "0.0#",
    catAxisLabelFontSize: 10, catAxisLabelColor: C.ink, catAxisOrientation: "maxMin", valAxisHidden: true, valAxisMaxVal: 7.2, valAxisMinVal: 0,
    valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontSize: 10,
    showTitle: true, title: "c  Variance inflation (main-effects model)", titleFontSize: 11.5, titleColor: C.ink });
  const pts = [
    ["Separated by direction.", " Students and workers co-occur on 189 of 191 student-commute days but on 0 runs; VIF drops from 3.7 / 5.9 (daily) to 1.28 (run)."],
    ["Some pairs never meet.", " Holiday returns never coincide with Spring Festival travel or term surges: no interaction exists to estimate."],
    ["Support screen before estimation.", " A pair gets an overlap term only with ≥200 shared runs and ≥200 solo runs each: 5 of 10 pairs pass (S×R, S×CY, W×CY, W×T, CY×T); the rest are reported as sums of main effects, flagged “low support”."],
  ];
  T(s, flat(pts.map((p) => B([bold(p[0]), plain(p[1])], 0, { paraSpaceAfter: 6 }))), { x: MX, y: 4.95, w: CW, h: 1.9, fontSize: 12.5, color: C.ink2 });
  notes(s, "This evidence uses only the real timetable and calendar — no ridership numbers, so it does not depend on synthetic data. It justifies both the run-level unit and the identifiability screen. S = boarding students, W = workers, R = holiday returns, CY = Spring Festival travel, T = term start and end.");
}

// 30 --------------------------------------------------------------- step 3 model
{
  const s = pres.addSlide();
  header(s, "III · Step 3 · Quantify", "A censored count model on the passenger scale");
  panel(s, MX, 1.42, 7.3, 1.75, C.tint);
  const sub = (t) => ({ text: t, options: { subscript: true } });
  const n = (t, o = {}) => ({ text: t, options: o });
  T(s, [
    n("Y", { italic: true }), sub("i"), n(" ~ NegBin(μ"), sub("i"), n(", θ),    y"), sub("i"), n(" = min(Y"), sub("i"), n(", C"), sub("i"), n("),    C"), sub("i"), n(" = κ"), sub("r"), n(" × seats"), sub("i"), n("", { breakLine: true }),
    n(" ", { breakLine: true, fontSize: 5 }),
    n("μ"), sub("i"), n(" = exp(α"), sub("r×dir×period"), n(" + γx"), sub("i"), n(" + u"), sub("d"), n(") × [1 + Σ ρ"), sub("g"), n("f"), sub("gi"), n(" + Σ"), sub("Π"), n(" δ"), sub("pq"), n("f"), sub("pi"), n("f"), sub("qi"), n(" + Σ ρ"), sub("gt"), n("f"), sub("gi"), n("1"), sub("year=t"), n("]"),
  ], { x: MX + 0.2, y: 1.58, w: 7.0, h: 1.45, fontFace: HF, fontSize: 15, color: C.ink, valign: "middle" });
  T(s, flat([
    B([bold("Baseline: "), plain("hierarchical route × direction × period intercepts; controls x (weekday, market day, weather, year); county-wide day shock u"), ["d", { subscript: true }], plain(" ~ N(0, σ²).")]),
    B([bold("ρ"), ["g", { subscript: true, bold: true }], plain(": extra passengers, as a share of baseline, when group g's factor is fully on; "), bold("δ"), ["pq", { subscript: true, bold: true }], plain(": overlap, only for screened pairs Π; "), bold("ρ"), ["gt", { subscript: true, bold: true }], plain(": ridge-shrunk drift for 2025–26.")]),
    B([bold("Full buses "), plain("contribute Pr(Y ≥ C) to the likelihood; turnover κ comes from tally sheets and is resampled in every draw.")]),
  ]), { x: MX, y: 3.35, w: 7.3, h: 2.35, fontSize: 12.5, color: C.ink2, paraSpaceAfter: 5 });
  T(s, "Why the passenger scale: each term is “an extra group of people”, maps one-to-one to survey rider types, and is what supplementary-run decisions need. Ratio-scale results are reported alongside.", { x: MX, y: 5.9, w: 7.3, h: 0.9, fontSize: 12, color: C.accent, italic: true });
  // counterfactual switches illustration
  const X = 8.35;
  label(s, "Effects as counterfactual switches", X, 1.45, 4.4);
  T(s, "(illustrative, passengers per run above baseline)", { x: X, y: 1.72, w: 4.4, h: 0.26, fontSize: 9.5, color: C.muted, italic: true });
  const base = 5.3, sc = 0.24;
  const bars = [["S only", 6, C.s1], ["R only", 5, C.s2], ["Sum", 11, null], ["S + R on", 9, C.primary]];
  bars.forEach((b, i) => {
    const x = X + 0.2 + i * 1.07, hgt = b[1] * sc;
    if (b[0] === "Sum") {
      s.addShape(pres.shapes.RECTANGLE, { x, y: base - 6 * sc, w: 0.7, h: 6 * sc, fill: { color: C.s1 }, line: { color: C.white, width: 1 } });
      s.addShape(pres.shapes.RECTANGLE, { x, y: base - 11 * sc, w: 0.7, h: 5 * sc, fill: { color: C.s2 }, line: { color: C.white, width: 1 } });
    } else {
      s.addShape(pres.shapes.RECTANGLE, { x, y: base - hgt, w: 0.7, h: hgt, fill: { color: b[2] }, line: { color: C.white, width: 0 } });
    }
    T(s, b[0], { x: x - 0.2, y: base + 0.06, w: 1.1, h: 0.28, fontSize: 10, color: C.ink, align: "center" });
  });
  s.addShape(pres.shapes.LINE, { x: X + 0.1, y: base, w: 4.25, h: 0, line: { color: C.ink2, width: 0.8 } });
  s.addShape(pres.shapes.LINE, { x: X + 3.35, y: base - 11 * sc, w: 1.0, h: 0, line: { color: C.accent, width: 1, dashType: "dash" } });
  T(s, "overlap < 0 (offset)", { x: X + 3.3, y: base - 11 * sc + 0.05, w: 1.15, h: 0.4, fontSize: 9, color: C.accent, bold: true, align: "center", valign: "middle" });
  T(s, flat([
    B([bold("Independent: "), plain("switch on one factor only.")]),
    B([bold("Combined: "), plain("switch on all factors in an overlap cell.")]),
    B([bold("Overlap = combined − Σ independent: "), plain(">0 amplify; <0 offset (e.g., students ride once on a holiday Sunday); ≈0 additive.")]),
  ]), { x: X, y: 5.75, w: 4.4, h: 1.15, fontSize: 10.5, color: C.ink2 });
  notes(s, "The model in one line: a negative binomial for latent demand, censored at effective capacity, with a multiplicative baseline and an additive bracket of calendar effects. Effects are defined by switching factors on and off, so they are comparable across methods. Every effect is reported per cell with a 95% interval and the number of runs; cells below 200 runs are flagged low support.");
}

// 31 --------------------------------------------------------------- backtest
{
  const s = pres.addSlide();
  header(s, "III · Step 3 · Quantify", "Choosing the estimator by synthetic backtest, not by preference");
  badge(s, W - MX - 4.3, 0.36);
  const M = [
    ["M1 Log · main effects", [0.10, 0.08, 0.16, 0.10], [0.21, 0.06, 0.20, 0.21]],
    ["M2 Count · main effects", [0.06, 0.14, 0.12, 0.05], [0.08, 0.11, 0.08, 0.08]],
    ["M3 Log · interactions", [0.08, 0.10, 0.11, 0.08], [0.16, 0.06, 0.16, 0.16]],
    ["M4 Count · overlaps", [0.06, 0.11, 0.10, 0.06], [0.08, 0.09, 0.07, 0.07]],
    ["M5 Log · inter. · censored", [0.05, 0.07, 0.06, 0.06], [0.12, 0.04, 0.12, 0.11]],
    ["M6 Count · overl. · censored", [0.05, 0.09, 0.09, 0.06], [0.03, 0.13, 0.03, 0.04]],
    ["M7 Gradient boosting", [0.15, 0.18, 0.14, 0.15], [0.14, 0.18, 0.15, 0.15]],
    ["M8 GA2M (EBM)", [0.15, 0.18, 0.15, 0.16], [0.11, 0.12, 0.11, 0.12]],
    ["M9 M6 + yearly drift", [0.05, 0.09, 0.09, 0.05], [0.04, 0.13, 0.04, 0.04]],
    ["M10 M9 + screen (penalised)", [0.05, 0.09, 0.09, 0.05], [0.04, 0.13, 0.04, 0.04]],
    ["M11/12 Screened, unpenalised", [0.07, 0.09, 0.06, 0.07], [0.04, 0.05, 0.04, 0.04]],
  ];
  const ramp = ["FEF3E8", "FCDDBF", "F8BF8E", "F09A5B", "DD6F2E", "B4481A"];
  const col = (v) => ramp[Math.min(5, Math.floor((v - 0.02) / 0.035))];
  const rows = [[th("Method", { fontSize: 9.5 }), th("Combined-effect error", { fontSize: 9.5, colspan: 4, align: "center" }), th("Independent-effect error", { fontSize: 9.5, colspan: 4, align: "center" })],
    [td("", { fontSize: 9, fill: { color: C.tint } })].concat(["A", "B", "C", "D", "A", "B", "C", "D"].map((k) => td(k, { fontSize: 9, bold: true, align: "center", fill: { color: C.tint } })))];
  M.forEach((m) => {
    const sel = m[0].startsWith("M11");
    rows.push([td(m[0], { fontSize: 9.5, bold: sel, color: sel ? C.primary : C.ink })].concat(m[1].concat(m[2]).map((v) => td(v.toFixed(2), { fontSize: 9.5, align: "center", bold: sel, color: v >= 0.13 ? C.white : C.ink, fill: { color: col(v) } }))));
  });
  table(s, rows, MX, 1.42, 7.4, [2.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], { rowH: 0.34, border: { type: "solid", pt: 1, color: C.white } });
  T(s, "Relative RMSE on two-factor cells; 50 synthetic ledgers per world on the real timetable × calendar (115,872 runs). Worlds: A additive with absorption · B log-scale synergy · C sparse-cell synergy · D effects drift by year. M11/12 = identifiability screen, unpenalised overlaps, censoring, yearly drift, scale chosen by likelihood.", { x: MX, y: 6.02, w: 7.4, h: 0.82, fontSize: 9.5, color: C.muted, italic: true });
  const f = [
    ["Forecast scores cannot pick the method: ", "CRPS differs by ≤1% across count models, yet effect estimates differ several-fold."],
    ["Right scale beats more interactions: ", "independent-effect error 0.034 (count scale) vs 0.117 (log scale) in world A."],
    ["Censoring removes bias: ", "Spring Festival cell −14.2% → −0.8%."],
    ["Penalising overlaps hides real absorption: ", "combined-effect bias +7.1% vs −0.5% unpenalised."],
  ];
  T(s, flat(f.map((x) => B([bold(x[0]), plain(x[1])], 0, { paraSpaceAfter: 6 }))), { x: 8.3, y: 1.45, w: 4.45, h: 3.1, fontSize: 12, color: C.ink2 });
  box(s, 8.3, 4.65, 4.45, 2.2, { fill: C.primaryLight, line: C.primaryLight, lw: 0, align: "left", valign: "top", fs: 12, text: [
    { text: "Frozen choice (1 Jan 2027): M11/12", options: { bold: true, color: C.primary, breakLine: true } },
    { text: "Best worst case on both criteria (≤0.09 combined, ≤0.05 independent). Intervals widened ×2.3 after backtest; leave-one-world-out coverage ≥0.93. M10, M6 and M2 kept as sensitivity checks. Testing also exposed a worker-direction coding error (slide 24).", options: { color: C.ink } }] });
  notes(s, "Synthetic backtest: I generate ridership on the real timetable and calendar with known effects, under four different 'true worlds', and ask which estimator recovers them. The main lessons: predictive scores cannot choose among methods; the scale matters most; censoring matters; and penalising overlap terms shrinks real absorption. The choice is frozen before any real test data are opened.");
}

// 32 --------------------------------------------------------------- forecasting
{
  const s = pres.addSlide();
  header(s, "III · Step 4 · Forecast", "Forecasting every run 1–7 days ahead — and keeping daily totals honest");
  badge(s, W - MX - 4.3, 0.36);
  label(s, "How a forecast is drawn (repeated 300 times)", MX, 1.45, 6.4);
  const st = ["Draw model parameters", "Draw one county-wide shock per forecast day", "Draw turnover κ per route", "Draw each run's latent demand; cap at capacity", "Sum runs within the same draw → daily total"];
  st.forEach((t, i) => {
    const y = 1.8 + i * 0.56;
    box(s, MX, y, 0.42, 0.42, { fill: C.primary, line: C.primary, lw: 0, text: String(i + 1), fs: 12, color: C.white, textOpts: { bold: true } });
    T(s, t, { x: MX + 0.6, y: y + 0.06, w: 5.8, h: 0.34, fontSize: 12, color: C.ink });
  });
  label(s, "Evaluation", MX, 4.7, 6.4);
  T(s, flat([
    B("Rolling origins on exploration data (Jun 2025, Dec 2025, Jun 2026); CRPS, 90% coverage overall and by route, time of day and event; daily-total MAPE."),
    B("Baselines: seasonal naïve (same weekday and run, past four weeks) and the separate-stage pipeline."),
    B("One sealed test: the Oct 2026–Feb 2027 ledger (incl. Spring Festival 2027) is opened once, after freezing."),
  ]), { x: MX, y: 5.0, w: 6.4, h: 1.9, fontSize: 11, color: C.ink2 });
  s.addChart(pres.charts.BAR, [
    { name: "Joint model", labels: ["Single runs", "Daily totals"], values: [0.927, 0.874] },
    { name: "Separate pipeline", labels: ["Single runs", "Daily totals"], values: [0.916, 0.389] },
  ], { x: 7.35, y: 1.45, w: 5.4, h: 4.15, barDir: "col", titleFontFace: BF, catAxisLabelFontFace: BF, valAxisLabelFontFace: BF, legendFontFace: BF, dataLabelFontFace: BF, barGrouping: "clustered", chartColors: [C.primary, "9AA3AD"], barGapWidthPct: 70,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 12, dataLabelColor: C.ink, dataLabelFormatCode: "0.00",
    catAxisLabelFontSize: 12, catAxisLabelColor: C.ink, valAxisMinVal: 0, valAxisMaxVal: 1, valAxisMajorUnit: 0.1, valAxisLabelFontSize: 10, valAxisLabelColor: C.muted,
    valAxisLabelFormatCode: "0.0", valGridLine: { color: "E5E7EB", size: 0.5 }, catGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontSize: 11,
    showTitle: true, title: "Actual coverage of 90% prediction intervals (target 0.90)", titleFontSize: 12, titleColor: C.ink });
  T(s, "World A, 8 replicates. Daily intervals average 566 passengers (joint) vs 194 (pipeline): the pipeline's narrower interval is wrong, because runs on the same day share shocks. Run-level CRPS is almost identical (2.82 vs 2.84).", { x: 7.35, y: 5.72, w: 5.4, h: 1.1, fontSize: 10.5, color: C.ink2 });
  notes(s, "The forecast is a set of simulated futures. Because all runs on a day share one county shock in each draw, the daily total automatically carries their correlation. In the synthetic test both approaches forecast single runs equally well; only the joint model gives daily intervals that are close to their nominal coverage — which is what the day-ahead reserve decision needs.");
}

// 33 --------------------------------------------------------------- planning
{
  const s = pres.addSlide();
  header(s, "III · Step 5 · Plan", "From forecasts to a fixed-core, flexible-supplement service");
  badge(s, W - MX - 4.3, 0.36);
  const layers = [
    ["Fixed core timetable", "Stable, no booking; guarantees basic service on every route — essential for older riders.", "9AA3AD"],
    ["Day-ahead reserve", "Buses and drivers held for tomorrow, sized from an upper quantile (e.g., 90%) of the daily-total forecast beyond core capacity.", "3B6E9A"],
    ["Forecast-triggered runs", "Add a run next to scheduled run i if Pr(demand > κ × seats) > α — a chance constraint solved on forecast samples.", C.primary],
  ];
  label(s, "Three service layers (top layers vary day by day)", MX, 1.45, 6.2);
  layers.forEach((l, i) => {
    const y = 4.3 - i * 1.3;
    box(s, MX, y, 6.2, 1.16, { fill: l[2], line: l[2], lw: 0, round: false });
    T(s, [{ text: l[0], options: { bold: true, fontSize: 14, breakLine: true } }, { text: l[1], options: { fontSize: 11.5 } }], { x: MX + 0.2, y: y + 0.06, w: 5.8, h: 1.05, color: C.white, valign: "middle" });
  });
  label(s, "Survey inputs to the plan", MX, 5.6, 6.2, C.accent);
  T(s, "Preferred departure times (schedule delay) · what denied riders do — wait, switch mode, give up — which weights the cost of denial · how riders learn of extra runs (village WeChat groups, notices, drivers).", { x: MX, y: 5.88, w: 6.2, h: 0.95, fontSize: 11.5, color: C.ink2 });
  const A = { j: [[898, 231.6], [564.6, 370.7], [300.4, 653.7], [170.5, 962.6], [54.4, 1400.8]], p: [[659.2, 346.3], [409.7, 530.9], [209.7, 872], [110.2, 1172.3], [34.8, 1515.9]] };
  const xs = A.j.map((d) => d[0]).concat(A.p.map((d) => d[0]));
  const yj = A.j.map((d) => d[1]).concat(A.p.map(() => null));
  const yp = A.j.map(() => null).concat(A.p.map((d) => d[1]));
  s.addChart(pres.charts.SCATTER, [
    { name: "X", values: xs },
    { name: "Joint model", values: yj },
    { name: "Separate pipeline", values: yp },
  ], { x: 7.2, y: 1.45, w: 5.55, h: 4.1, titleFontFace: BF, catAxisLabelFontFace: BF, valAxisLabelFontFace: BF, legendFontFace: BF, catAxisTitleFontFace: BF, valAxisTitleFontFace: BF, chartColors: [C.primary, "9AA3AD"], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 8,
    displayBlanksAs: "span", valAxisTitle: "Denied boardings", showValAxisTitle: true, catAxisTitle: "Supplementary runs added", showCatAxisTitle: true,
    valAxisTitleFontSize: 11, catAxisTitleFontSize: 11, valAxisLabelFontSize: 10, catAxisLabelFontSize: 10, valAxisLabelColor: C.muted, catAxisLabelColor: C.muted,
    valAxisMinVal: 0, valAxisMaxVal: 1600, catAxisMinVal: 0, catAxisMaxVal: 1000, valGridLine: { color: "E5E7EB", size: 0.5 }, catGridLine: { style: "none" },
    showLegend: true, legendPos: "b", legendFontSize: 11, showTitle: true, title: "Cost–denial frontier (α from 0.5 to 0.05, left to right)", titleFontSize: 12, titleColor: C.ink });
  T(s, "Both approaches lie on nearly the same frontier; at equal α the joint model adds more runs and catches more overloads (α = 0.05: 85% vs 76%). Its real advantage is a trustworthy α and a calibrated reserve. The county chooses α from the cost of an extra run vs. the social cost of a denied rider. Plans are compared with the current timetable and a simple calendar rule.", { x: 7.2, y: 5.65, w: 5.55, h: 1.25, fontSize: 10.2, color: C.ink2 });
  notes(s, "Service planning keeps the fixed timetable as the base layer because older riders do not book. On top of it: a reserve decided the day before from the daily-total forecast, and supplementary runs triggered where the forecast says the run is likely to overflow. I do not claim one optimal plan; I give the transport bureau a frontier and let the cost ratio decide. Synthetic results, world A.");
}

// 34 --------------------------------------------------------------- hypotheses
{
  const s = pres.addSlide();
  header(s, "III · Pre-registration", "Hypotheses and how results will be read — written before the data");
  const hdr = [th("Hypothesis"), th("If supported"), th("If not supported")];
  const r = [
    ["H1 (RQ1) Boarding students and weekly workers dominate in-term weekend runs; far villages give up more trips", "Design core runs and triggers around these groups; prioritise far villages", "Revise rider groups and encodings; unmet demand has other causes"],
    ["H2 (RQ2) All five factors have positive independent effects, separable at run level", "Group-, direction- and time-specific supplementary rules", "Group small or shifted to other modes — explained with surveys"],
    ["H3 (RQ2) S×R and CY×T overlaps are negative (the same people travel once)", "Do not add factor effects on overlap days", "Positive: extra capacity needed; ≈0: add effects"],
    ["H4 (RQ2) Holiday returns grow with holiday length; type effects follow prior importance", "Tier holiday supplements by type × length", "Use data-estimated type effects"],
    ["H5 (RQ3) Run and daily 90% coverage ≈0.90; CRPS beats seasonal naïve", "Forecasts usable 1–7 days ahead for both layers", "Add route-level shocks; else calendar rules only"],
    ["H6 (RQ4) At equal extra runs, the two-layer plan denies fewer riders than the current timetable", "Recommend fixed core + reserve + triggered runs", "Recommend the simple calendar rule; report limited value"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({}, f)), td(x[1], Object.assign({ color: C.primary }, f)), td(x[2], Object.assign({ color: C.ink2 }, f))]);
  });
  table(s, rows, MX, 1.42, CW, [5.3, 3.5, 3.33], { rowH: [0.36, 0.7, 0.66, 0.62, 0.66, 0.62, 0.7], fontSize: 12 });
  T(s, "Rules: report null and non-significant results with intervals; distinguish “no effect” (narrow interval around zero) from “not identifiable” (wide interval, low support); if main and sensitivity methods disagree, report both.", { x: MX, y: 5.95, w: CW, h: 0.85, fontSize: 11.5, color: C.ink2, italic: true });
  notes(s, "Hypotheses and interpretation rules are written down before the data are analysed, and will be time-stamped with the frozen methods, so the results cannot be reinterpreted after the fact.");
}

// 35 --------------------------------------------------------------- timeline (native Gantt)
{
  const s = pres.addSlide();
  header(s, "III · Work plan", "Timeline: October 2026 – April 2028");
  const X0 = 3.55, X1 = W - MX, M0 = new Date(2026, 9, 1), M1 = new Date(2028, 4, 1);
  const span = (M1 - M0);
  const xOf = (d) => X0 + ((d - M0) / span) * (X1 - X0);
  const tasks = [
    ["Preparation", "9AA3AD", [["Ethics review, consent forms", "2026-10-01", "2026-10-16"], ["Ledger, seats, timetable changes", "2026-10-01", "2026-11-01"], ["Calendars, holiday notices, weather archive", "2026-10-01", "2026-11-15"], ["Pre-test and enumerator training", "2026-10-05", "2026-10-17"], ["Re-draw winter strata when dates published", "2026-12-01", "2026-12-21"]]],
    ["Surveys", C.primary, [["Fall-term weekend on-board", "2026-10-16", "2026-12-20"], ["Household (village) survey", "2026-10-19", "2026-12-18"], ["Online survey (around holidays)", "2026-12-13", "2027-02-28"], ["Winter & Spring Festival on-board", "2027-01-01", "2027-02-28"], ["Summer on-board (redesigned)", "2027-07-11", "2027-08-31"]]],
    ["Analysis", "D08A3B", [["Real ledger replaces synthetic; S2–S5 end-to-end", "2026-10-15", "2026-12-31"], ["S1 rider groups, κ, unmet demand", "2027-03-01", "2027-04-30"], ["S2–S3 calendar effects", "2027-03-01", "2027-06-30"], ["S4 rolling-origin forecasting", "2027-05-01", "2027-08-31"], ["S5 supplementary plans, frontier", "2027-07-01", "2027-09-30"], ["Summer re-check, robustness", "2027-09-01", "2027-10-31"]]],
    ["Writing", C.green, [["Paper 1 (RQ1–RQ2)", "2027-06-01", "2027-10-31"], ["Paper 2 (RQ3–RQ4)", "2027-09-01", "2028-01-31"], ["Dissertation", "2027-10-01", "2028-04-30"]]],
  ];
  const rowH = 0.2;
  const yTop = 1.95;
  let y = yTop;
  // milestone labels (top) and month grid
  const ms = [["2027-01-01", "1 Jan 2027: methods & rules frozen"], ["2027-06-30", "30 Jun 2027: RQ2 results frozen"], ["2027-12-31", "31 Dec 2027: analyses complete"]];
  ms.forEach((m) => {
    const x = xOf(new Date(m[0]));
    T(s, m[1], { x: x - 1.25, y: 1.3, w: 2.5, h: 0.24, fontSize: 9.5, bold: true, color: C.accent, align: "center" });
  });
  ["Oct 2026", "Jan 2027", "Apr 2027", "Jul 2027", "Oct 2027", "Jan 2028", "Apr 2028"].forEach((m, i) => {
    const d = new Date(2026, 9 + 3 * i, 1), x = xOf(d);
    s.addShape(pres.shapes.LINE, { x, y: 1.85, w: 0, h: 4.95, line: { color: "E5E7EB", width: 0.75 } });
    T(s, m, { x: x - 0.5, y: 1.58, w: 1.0, h: 0.24, fontSize: 9.5, color: C.muted, align: "center" });
  });
  ms.forEach((m) => {
    const x = xOf(new Date(m[0]));
    s.addShape(pres.shapes.LINE, { x, y: 1.55, w: 0, h: 5.25, line: { color: C.accent, width: 1.25, dashType: "dash" } });
  });
  tasks.forEach((g) => {
    T(s, g[0].toUpperCase(), { x: MX, y, w: 2.9, h: rowH, fontSize: 8.5, bold: true, color: g[1], charSpacing: 0.6, valign: "middle" });
    y += rowH;
    g[2].forEach((t) => {
      T(s, t[0], { x: MX, y, w: 2.9, h: rowH, fontSize: 9.5, color: C.ink, valign: "middle" });
      const a = xOf(new Date(t[1])), b = xOf(new Date(t[2]));
      s.addShape(pres.shapes.RECTANGLE, { x: a, y: y + 0.03, w: Math.max(0.06, b - a), h: rowH - 0.06, fill: { color: g[1] }, line: { color: g[1], width: 0 } });
      y += rowH;
    });
    y += 0.05;
  });
  notes(s, "Two hard constraints drive the plan: seasonal windows (the fall term is the only in-term window for testing student and worker encodings before winter; winter/Spring Festival cannot be postponed without losing a year) and freeze-then-test (methods and interpretation rules are frozen on 1 January 2027 before the sealed data are opened).");
}

// 36 --------------------------------------------------------------- next steps & risks
{
  const s = pres.addSlide();
  header(s, "III · Next steps", "Immediate next steps (Oct–Dec 2026) and main risks");
  label(s, "Checklist", MX, 1.45, 5.6);
  const items = [
    "Confirm ledger fields with the county bus station; obtain exploration-period ledger and per-run seat counts; add a “full bus, riders left behind” tick box",
    "Submit ethics review; prepare consent script and enumerator manual",
    "Pre-test each instrument on 1–2 routes (20–30 each): comprehension, timing, skip logic",
    "Run the fall-term weekend on-board wave and the village household survey",
    "Swap synthetic for real ledger; run S2–S5 end-to-end; confirm the frozen method",
    "Re-draw winter strata once 2027 holiday dates are published",
    "Freeze methods and interpretation rules by 31 Dec 2026 with a time-stamped registration",
  ];
  T(s, items.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, paraSpaceAfter: 5, breakLine: i < items.length - 1 } })), { x: MX, y: 1.75, w: 5.7, h: 5.05, fontSize: 13, color: C.ink });
  const hdr = [th("Risk"), th("Consequence"), th("Mitigation")];
  const r = [
    ["Ledger only as daily totals", "RQ2–RQ4 cannot be answered per run", "Secure first; else daily model, run level as scenarios"],
    ["2027 winter dates announced late", "Winter strata drawn on assumed dates", "Re-draw with the same seed; non-winter strata unchanged"],
    ["Too few enumerators in the Spring Festival peak", "Peak strata under-sampled", "Peak strata first; adjust weights"],
    ["Poor tally-sheet quality", "κ wrong → censoring and decisions wrong", "Daily balance checks; κ at 10th/90th percentiles"],
    ["Sealed test disappoints", "H5 not supported", "Report by pre-set rules; no re-testing on the same data"],
    ["Costs and spare buses unverifiable", "S5 plans not implementable", "Frontier under two cost scenarios"],
  ];
  const rows = [hdr];
  r.forEach((x, i) => {
    const f = i % 2 ? { fill: { color: C.tint } } : {};
    rows.push([td(x[0], Object.assign({ bold: true, fontSize: 11 }, f)), td(x[1], Object.assign({ fontSize: 11, color: C.ink2 }, f)), td(x[2], Object.assign({ fontSize: 11, color: C.primary }, f))]);
  });
  table(s, rows, 6.65, 1.45, W - MX - 6.65, [1.85, 1.85, 2.38], { rowH: [0.34, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8] });
  notes(s, "The immediate critical path is the ledger: without run-level records, RQ2 to RQ4 fall back to daily models. Everything else has a fallback written down in advance.");
}

// 37 --------------------------------------------------------------- contributions
{
  const s = pres.addSlide();
  header(s, "III · Contributions", "Expected contributions and outputs");
  const cols = [
    ["Substantive", ["First run-level evidence on how rural calendar rhythms — boarding-student and worker weekly trips, term surges, holiday returns, Spring Festival — shape county bus demand.", "Where and for whom the fixed timetable leaves demand unmet, by village accessibility."]],
    ["Methodological", ["Identifiability-screened estimation of independent vs. combined effects on the passenger scale, with capacity censoring.", "A joint model whose run forecasts add up to calibrated daily totals.", "Estimator chosen by synthetic backtest and frozen before testing."]],
    ["Practical", ["A fixed-core + reserve + forecast-triggered rule with a cost–denial frontier for the county transport bureau.", "Reproducible code and data pipeline that other counties can adapt."]],
  ];
  cols.forEach((c, i) => {
    const x = MX + i * 4.12;
    T(s, c[0], { x, y: 1.5, w: 3.85, h: 0.4, fontFace: HF, fontSize: 19, color: C.primary });
    T(s, flat(c[1].map((t) => B(t, 0, { paraSpaceAfter: 8 }))), { x, y: 2.05, w: 3.85, h: 2.9, fontSize: 13.5, color: C.ink });
  });
  panel(s, MX, 5.1, CW, 1.75, C.tint);
  label(s, "Planned outputs", MX + 0.2, 5.22, 5);
  T(s, flat([
    B([bold("Paper 1 (RQ1–RQ2): "), plain("independent and overlap effects of calendar rhythms on rural bus runs — Journal of Transport Geography / Travel Behaviour and Society / Transportation Research Part A.")]),
    B([bold("Paper 2 (RQ3–RQ4): "), plain("run-level probabilistic forecasting and chance-constrained supplementary runs — Public Transport / Transportation Research Record / TR Part A.")]),
    B([bold("Dissertation: "), plain("nine chapters, including the full method comparison and failures.")]),
  ]), { x: MX + 0.2, y: 5.5, w: CW - 0.4, h: 1.3, fontSize: 12, color: C.ink2 });
  notes(s, "Three kinds of contribution. The two papers use the same data and model but answer different questions: paper 1 reports parameters (effects), paper 2 reports their use (forecasts and decisions).");
}

// 38 --------------------------------------------------------------- limitations & discussion
{
  const s = pres.addSlide();
  header(s, "Discussion", "Limitations — and questions I would value your input on");
  label(s, "Known limitations", MX, 1.45, 5.8);
  T(s, flat([
    B("Synthetic results show that the method recovers known truth; they are not findings about Xinhuang."),
    B("Three years of calendar give limited support for some overlaps (W×R: 69 runs); only a longer ledger fixes this."),
    B("Turnover κ from sampled tally sheets propagates into censoring and decisions."),
    B("Unobtainable drivers (industrial shifts, clinic rosters) may leak into weekday or residual terms."),
    B("The sealed test contains one winter and one Spring Festival."),
    B("Chinese literature: the systematic CNKI search is still to be run."),
  ]), { x: MX, y: 1.8, w: 5.9, h: 5.0, fontSize: 14, color: C.ink2, paraSpaceAfter: 6 });
  panel(s, 6.85, 1.38, W - MX - 6.85, 5.5, C.primaryLight);
  label(s, "Questions for the audience", 7.05, 1.52, 5.4);
  const q = [
    "Is the passenger (additive) scale the right primary estimand for operators, with the ratio scale as secondary?",
    "Is ≥200 runs a sensible identifiability threshold — or should support be judged by interval width?",
    "Beyond forecast-triggered extra runs, which supplementary service types (route deviation to far villages, scheduled on-call runs) merit testing in a Chinese mountain county?",
    "How can latent demand be validated when denied boardings are only partly recorded?",
  ];
  T(s, q.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, paraSpaceAfter: 9, breakLine: i < q.length - 1 } })), { x: 7.05, y: 1.9, w: 5.5, h: 4.9, fontSize: 15, color: C.ink });
  notes(s, "I close with the limitations I already know and four questions where the audience's experience would help most, especially on supplementary service types beyond extra runs.");
}

// 39 --------------------------------------------------------------- thank you
{
  const s = pres.addSlide();
  SLIDE_NO += 1;
  s.background = { color: C.white };
  panel(s, 7.05, 0, W - 7.05, H, C.tint);
  img(s, "map_title.png", 7.25, 0.9, 5.85, 5.3, { alt: "Xinhuang County routes" });
  T(s, "Thank you", { x: MX, y: 1.5, w: 6, h: 1.0, fontFace: HF, fontSize: 40, color: C.ink });
  T(s, flat([
    B("Run-level, direction-aware calendar factors separate rider groups that daily totals conflate."),
    B("Overlapping effects are estimated only where the calendar can identify them, on the passenger scale, with censoring."),
    B("One joint model turns effects into calibrated forecasts and a transparent cost–denial choice for supplementary service."),
  ]), { x: MX, y: 2.75, w: 6.0, h: 2.6, fontSize: 14, color: C.ink2 });
  T(s, [{ text: "Lilac", options: { bold: true, fontSize: 16, color: C.ink, breakLine: true } }, { text: "National University of Singapore", options: { fontSize: 13.5, color: C.ink2 } }], { x: MX, y: 5.6, w: 5.9, h: 0.8 });
  notes(s, "Three take-aways, then open for questions. Appendix slides hold the questionnaire structure, the sampling strata and full references.");
}

// ================================================================== APPENDIX
{
  const s = pres.addSlide();
  header(s, "Appendix", "A1 · Questionnaire indicator groups and the questions they serve", { appendix: "A1" });
  const r = [
    ["G0", "Run key and non-response record", "Z1–Z4, H0", "RQ1, RQ2"], ["G1", "Trip origin–destination and trip chain", "A1, A2, A5, H7, O8", "RQ1, RQ4"],
    ["G2", "Rider type and periodic rhythm (maps to S, W, T, R/CY)", "A3", "RQ2"], ["G3", "Trip purpose", "A4", "RQ1"],
    ["G4", "Time constraints and preferred departure", "A6, H11, O10", "RQ4"], ["G5", "Dependence and alternatives", "A8, H8", "RQ4"],
    ["G6", "Unmet demand", "A9, H6, H9, H10, O9", "RQ1, RQ4"], ["G7", "Service-gap priority (forced choice)", "A10, H12, O12", "RQ1"],
    ["G8", "Demographics and weights", "A7, A11–A13, H14, O2, O3", "RQ1, RQ2"], ["G9", "Household structure and group exposure", "H1–H5", "RQ2"],
    ["G10", "Holiday return timing", "S15, W15, O4–O7", "RQ2, RQ3"], ["G11", "Acceptance of extra runs; information channels", "A14, H13, O11", "RQ4"],
    ["G12", "Channel and duplicate responses", "O1", "RQ1"],
  ];
  const rows = [[th("Group"), th("Indicator group"), th("Items"), th("Serves")]];
  r.forEach((x, i) => { const f = i % 2 ? { fill: { color: C.tint } } : {}; rows.push([td(x[0], Object.assign({ bold: true }, f)), td(x[1], f), td(x[2], Object.assign({ color: C.ink2 }, f)), td(x[3], Object.assign({ color: C.primary }, f))]); });
  table(s, rows, MX, 1.42, 8.4, [0.75, 4.2, 2.35, 1.1], { rowH: 0.38, fontSize: 11 });
  T(s, flat([
    B("Prefixes: A on-board, H household, O online, S/W summer/winter on-board, Z enumerator record."),
    B("Not included, with reasons: theory-of-planned-behaviour scales (no RQ needs intentions; behaviour is observed directly), SERVPERF batteries (burden), shift and clinic rosters (unobtainable), waiting time (reflects departure choice on hail-and-ride routes)."),
    B("Reliability and validity without multi-item scales: test–retest κ ≥ 0.6 on A3, A4, A7; inter-coder κ on field-coded items; tally-sheet totals vs. ledger; pre-registered construct checks."),
  ]), { x: 9.3, y: 1.45, w: W - MX - 9.3, h: 5.3, fontSize: 11.5, color: C.ink2, paraSpaceAfter: 6 });
  notes(s, "Appendix A1: how the 47-item bank is organised.");
}
{
  const s = pres.addSlide();
  header(s, "Appendix", "A2 · On-board sampling strata (runs, days and planned questionnaires)", { appendix: "A2" });
  const r = [
    ["Fall 2026", "A1 Last school day p.m. · outbound (students home)", 330, 10, 5, 40], ["Fall 2026", "A2 Last workday p.m. · inbound (workers to town)", 320, 10, 5, 40],
    ["Fall 2026", "A3 Eve of school week p.m. · inbound (students back)", 320, 10, 5, 40], ["Fall 2026", "A4 Eve of work week p.m. · outbound (workers out)", 330, 10, 5, 40],
    ["Fall 2026", "A5 First rest day a.m. · inbound (workers to town)", 360, 10, 5, 40], ["Fall 2026", "A6 Tue–Thu p.m. · both directions (control)", 1755, 27, 5, 40],
    ["Winter 2027", "B1 Spring Festival pre-peak · outbound (going home)", 680, 10, 39, 312], ["Winter 2027", "B2 Spring Festival post-peak · inbound (returning)", 816, 12, 39, 312],
    ["Winter 2027", "B3 New Year holiday first/last days · both", 204, 3, 13, 104], ["Winter 2027", "B4 Weekly-commute windows outside Spring Festival · both", 675, 18, 23, 184],
    ["Winter 2027", "B5 Tue–Thu p.m. · both directions (control)", 943, 23, 15, 120],
  ];
  const rows = [[th("Wave"), th("Stratum"), th("Runs in stratum", { align: "right" }), th("Days", { align: "right" }), th("Sampled runs", { align: "right" }), th("Planned questionnaires", { align: "right" })]];
  r.forEach((x, i) => { const f = i % 2 ? { fill: { color: C.tint } } : {}; rows.push([td(x[0], f), td(x[1], Object.assign({ bold: true }, f))].concat(x.slice(2).map((v) => td(v.toLocaleString("en-US"), Object.assign({ align: "right" }, f))))); });
  table(s, rows, MX, 1.42, CW, [1.3, 5.5, 1.45, 0.85, 1.35, 1.68], { rowH: 0.36, fontSize: 10.5 });
  T(s, "Equal allocation across fall strata (each is a separate check); winter allocation follows research priority (Spring Festival peaks 30% each). About 8 questionnaires per run is an assumption to be checked in the pre-test. 98 of 129 winter runs fall on dates marked unverified and will be re-drawn.", { x: MX, y: 6.0, w: CW, h: 0.8, fontSize: 10.5, color: C.ink2 });
  notes(s, "Appendix A2: on-board strata for the fall and winter waves, from the v5 sampling workbook.");
}

// references
const REFS = [
  "Alexandre, T. d. S., Bernardini, F., & Viterbo, J. (2023). Machine learning applied to public transportation by bus: A systematic literature review. Transportation Research Record.",
  "Angelopoulos, A. N., & Bates, S. (2023). Conformal prediction: A gentle introduction. Foundations and Trends in Machine Learning, 16(4), 494–591.",
  "Arana, P., Cabezudo, S., & Peñalba, M. (2014). Influence of weather conditions on transit ridership: A statistical study using data from smartcards. Transportation Research Part A, 59, 1–12.",
  "Barber, R. F., Candès, E. J., Ramdas, A., & Tibshirani, R. J. (2023). Conformal prediction beyond exchangeability. Annals of Statistics, 51(2).",
  "Berg, J., & Ihlström, J. (2019). The importance of public transport for mobility and everyday activities among rural residents. Social Sciences, 8(2), 58.",
  "Calabrò, G., Araldo, A., Oh, S., et al. (2023). Adaptive transit design: Optimizing fixed and demand responsive multi-modal transportation via continuous approximation. Transportation Research Part A.",
  "Ceder, A. (1984). Bus frequency determination using passenger count data. Transportation Research Part A, 18(5–6), 439–453.",
  "Charnes, A., & Cooper, W. W. (1959). Chance-constrained programming. Management Science, 6(1), 73–79.",
  "Church, A., Frost, M., & Sullivan, K. (2000). Transport and social exclusion in London. Transport Policy, 7(3), 195–205.",
  "Croston, J. D. (1972). Forecasting and stock control for intermittent demands. Journal of the Operational Research Society, 23(3), 289–303.",
  "Currie, G., & Fournier, N. (2020). Why most DRT/micro-transits fail — What the survivors tell us about progress. Research in Transportation Economics, 83, 100895.",
  "Czado, C., Gneiting, T., & Held, L. (2009). Predictive model assessment for count data. Biometrics, 65(4), 1254–1261.",
  "Deville, J.-C., & Särndal, C.-E. (1992). Calibration estimators in survey sampling. Journal of the American Statistical Association, 87(418), 376–382.",
  "Durán-Micco, J., & Vansteenwegen, P. (2021). A survey on the transit network design and frequency setting problem. Public Transport.",
  "Egu, O., & Bonnel, P. (2020). How comparable are origin–destination matrices estimated from automatic fare collection, OD surveys and household travel survey? Transportation Research Part A.",
  "Espeland, S., & Rowangould, D. (2024). Rural travel burdens in the United States: Unmet need and travel costs. Journal of Transport Geography, 104016.",
  "Friedman, J. H. (2001). Greedy function approximation: A gradient boosting machine. Annals of Statistics, 29(5), 1189–1232.",
  "Gibbs, I., & Candès, E. J. (2021). Adaptive conformal inference under distribution shift. NeurIPS 34.",
  "Gkiotsalitis, K., Schmidt, M. E., & van der Hurk, E. (2021). Subline frequency setting for autonomous minibusses under demand uncertainty. Transportation Research Part C.",
  "Gneiting, T., Balabdaoui, F., & Raftery, A. E. (2007). Probabilistic forecasts, calibration and sharpness. JRSS Series B, 69(2), 243–268.",
  "Gneiting, T., & Raftery, A. E. (2007). Strictly proper scoring rules, prediction, and estimation. JASA, 102(477), 359–378.",
  "Guo, Z., Wilson, N. H. M., & Rahbee, A. B. (2007). Impact of weather on transit ridership in Chicago, Illinois. Transportation Research Record, 2034.",
  "Hadas, Y., & Shnaiderman, M. (2012). Public-transit frequency setting using minimum-cost approach with stochastic demand and travel time. Transportation Research Part B, 46(8), 1068–1084.",
  "Han, Y., Wang, C., Ren, Y., et al. (2019). Short-term prediction of bus passenger flow based on a hybrid optimized LSTM network. ISPRS Int. J. Geo-Information, 8(9), 366.",
  "Hewamalage, H., Ackermann, K., & Bergmeir, C. (2022). Forecast evaluation for data scientists: Common pitfalls and best practices. Data Mining and Knowledge Discovery.",
  "Hoerl, A. E., & Kennard, R. W. (1970). Ridge regression: Biased estimation for nonorthogonal problems. Technometrics, 12(1), 55–67.",
  "Hong, X., Liang, P., & Zhu, H. (2024). The impact of road environments on rural periodic market travel satisfaction. Frontiers in Public Health.",
  "Huang, J. W., Liu, X., & Zhao, P. (2019). Interactions between bus, metro, and taxi use before and after the Chinese Spring Festival. ISPRS Int. J. Geo-Information, 8(10), 445.",
  "Jang, T. Y. (2005). Count data models for trip generation. Journal of Transportation Engineering, 131(6), 444–450.",
  "Jittrapirom, P., van Neerven, W., Martens, K., et al. (2019). The Dutch elderly's preferences toward a smart demand-responsive transport service. Research in Transportation Business & Management.",
  "Kashfi, S. A., Bunker, J. M., & Yiğitcanlar, T. (2015). Understanding the effects of complex seasonality on suburban daily transit ridership. Journal of Transport Geography.",
  "Kashfi, S. A., Bunker, J. M., & Yiğitcanlar, T. (2016). Modelling and analysing effects of complex seasonality and weather on an area's daily transit ridership rate. Journal of Transport Geography.",
  "Ke, G., Meng, Q., Finley, T., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. NeurIPS 30, 3146–3154.",
  "Kieu, L. M., Bhaskar, A., & Chung, E. (2014). Transit passenger segmentation using travel regularity mined from smart card transactions data. QUT ePrints.",
  "Kleywegt, A. J., Shapiro, A., & Homem-de-Mello, T. (2002). The sample average approximation method for stochastic discrete optimization. SIAM Journal on Optimization, 12(2), 479–502.",
  "Knierim, L., & Schlüter, J. (2021). The attitude of potentially less mobile people towards demand responsive transport in a rural area in central Germany. Journal of Transport Geography.",
  "Kolenikov, S. (2014). Calibrating survey data using iterative proportional fitting (raking). The Stata Journal, 14(1), 22–59.",
  "Krosnick, J. A. (1991). Response strategies for coping with the cognitive demands of attitude measures in surveys. Applied Cognitive Psychology, 5(3), 213–236.",
  "Kuhnimhof, T., Chlond, B., & Zumkeller, D. (2006). Nonresponse, selectivity, and data quality in travel surveys. Transportation Research Record, 1972, 29–37.",
  "Laws, R., Enoch, M., Ison, S., et al. (2009). Demand responsive transport: A review of schemes in England and Wales. Journal of Public Transportation, 12(1).",
  "Lei, J., G'Sell, M., Rinaldo, A., et al. (2017). Distribution-free predictive inference for regression. JASA, 113(523), 1094–1111.",
  "Li, G., Peng, L., Li, X., et al. (2019). Short-term passenger flow prediction at urban bus stops based on LSTM [in Chinese]. Journal of Highway and Transportation Research and Development, 36(2), 128–135.",
  "Li, J., Ye, Q., Deng, X., et al. (2016). Spatial-temporal analysis on Spring Festival travel rush in China based on multisource big data. Sustainability, 8(11), 1184.",
  "Liu, J., Shi, W., & Chen, P. (2020). Exploring travel patterns during the holiday season — Shenzhen Metro during the Chinese Spring Festival. ISPRS Int. J. Geo-Information, 9(11), 651.",
  "Liyanage, S., Abduljabbar, R., Dia, H., et al. (2022). AI-based neural network models for bus passenger demand forecasting using smart card data. Journal of Urban Management.",
  "Lou, Y., Caruana, R., Gehrke, J., & Hooker, G. (2013). Accurate intelligible models with pairwise interactions. Proc. 19th ACM SIGKDD, 623–631.",
  "Lucas, K. (2012). Transport and social exclusion: Where are we now? Transport Policy, 20, 105–113.",
  "Ma, C., Ai, Q., & Zhang, J. (2018). Estimation model of bus cross-section passenger flow under incomplete information [in Chinese]. Journal of Highway and Transportation Research and Development, 35(5), 121–127.",
  "Mageean, J., & Nelson, J. D. (2003). The evaluation of demand responsive transport services in Europe. Journal of Transport Geography, 11(4).",
  "Makridakis, S., Spiliotis, E., & Assimakopoulos, V. (2019). The M4 Competition: 100,000 time series and 61 forecasting methods. International Journal of Forecasting.",
  "Mauz, E., Hoffmann, R., Houben, R., et al. (2018). Mode equivalence of health indicators between data collection modes and mixed-mode survey designs. Journal of Medical Internet Research.",
  "Newell, G. F. (1971). Dispatching policies for a transportation route. Transportation Science, 5(1), 91–105.",
  "Newmark, G. L. (2014). Conducting visitor travel surveys: A transit agency perspective. Journal of Public Transportation, 17(4).",
  "Nourbakhsh, S. M., & Ouyang, Y. (2011). A structured flexible transit system for low demand areas. Transportation Research Part B.",
  "Painter, K. M., Jessup, E., Gossard, M. H., et al. (2007). Demand forecasting for rural transit. Transportation Research Record, 1997, 35–40.",
  "Petropoulos, F., Nikolopoulos, K., Spithourakis, G. P., et al. (2013). Empirical heuristics for improving intermittent demand forecasting. Industrial Management & Data Systems.",
  "Pucher, J., & Renne, J. L. (2005). Rural mobility and mode choice: Evidence from the 2001 National Household Travel Survey. Transportation, 32.",
  "Rigby, R. A., & Stasinopoulos, D. M. (2005). Generalized additive models for location, scale and shape. JRSS Series C, 54(3), 507–554.",
  "Romano, Y., Patterson, E., & Candès, E. J. (2019). Conformalized quantile regression. NeurIPS 32, 3538–3548.",
  "Salinas, D., Flunkert, V., & Gasthaus, J. (2019). DeepAR: Probabilistic forecasting with autoregressive recurrent networks. International Journal of Forecasting.",
  "Schasché, S. E., Sposato, R. G., & Hampl, N. (2022). The dilemma of demand-responsive transport services in rural areas. Transport Policy.",
  "Schaub, M., & Abadi, F. (2011). Integrated population models: A novel analysis framework for deeper insights into population dynamics. Journal of Ornithology, 152(S1), 227–237.",
  "Schönfelder, S., & Axhausen, K. W. (2010). Urban rhythms and travel behaviour: Spatial and temporal phenomena of daily travel. Ashgate.",
  "Singhal, A., Kamga, C., & Yazici, A. (2014). Impact of weather on urban transit ridership. Transportation Research Part A.",
  "Sörensen, L., Bossert, A., Jokinen, J.-P., et al. (2020). How much flexibility does rural public transport need? Transport Policy.",
  "Stopher, P. R., & Greaves, S. P. (2007). Household travel surveys: Where are we going? Transportation Research Part A, 41(5), 367–381.",
  "Stover, V. W., & McCormack, E. D. (2012). The impact of weather on bus ridership in Pierce County, Washington. Journal of Public Transportation, 15(1).",
  "Transportation Research Board (2013). Methods for forecasting demand and quantifying need for rural passenger transportation (TCRP Report 161). National Academies Press.",
  "VanderWeele, T. J., & Knol, M. J. (2014). A tutorial on interaction. Epidemiologic Methods, 3(1), 33–72.",
  "Vansteenwegen, P., Melis, L., Aktaş, D., et al. (2022). A survey on demand-responsive public bus systems. Transportation Research Part C.",
  "Wang, X., Liu, C., Mao, W., et al. (2014). Tracing the largest seasonal migration on Earth. arXiv:1411.0983.",
  "Weatherford, L. R., & Pölt, S. (2002). Better unconstraining of airline demand data in revenue management systems. Journal of Revenue and Pricing Management, 1(3), 234–254.",
  "Wei, M. (2021). How does the weather affect public transit ridership? A model with weather-passenger variations. Journal of Transport Geography, 103242.",
  "Wei, M., & Liu, X. (2022). How wet is too wet? Modelling the influence of weather condition on urban transit ridership. Travel Behaviour and Society.",
  "Wickramasuriya, S. L., Athanasopoulos, G., & Hyndman, R. J. (2019). Optimal forecast reconciliation for hierarchical and grouped time series through trace minimization. JASA, 114(526), 804–819.",
  "Xia, D., Ma, J., & Sharif Azadeh, S. (2023). Data-driven distributionally robust timetabling and dynamic-capacity allocation for automated bus systems with modular vehicles. Transportation Research Part C.",
  "Xie, Z., Liu, X., Wu, J., et al. (2018). Passenger flow forecasting model based on bus IC-card data [in Chinese]. Journal of Guangdong University of Technology, 35(1), 16–22.",
  "Yang, H., & Cherry, C. (2016). Use characteristics and demographics of rural transit riders: A case study in Tennessee. Transportation Planning and Technology, 40(2), 213–227.",
  "Zhang, J., Chen, F., & Shen, Q. (2019). Cluster-based LSTM network for short-term passenger flow forecasting in urban rail transit. IEEE Access.",
  "Zhao, J., Sun, S., & Cats, O. (2021). Joint optimisation of regular and demand-responsive transit services. Transportmetrica A.",
  "Zhao, Z., Wei, Y., Pang, R., et al. (2017). Spatiotemporal and structural characteristics of interprovincial population flow during the Spring Festival travel rush in China [in Chinese]. Progress in Geography, 36(8), 952–964.",
  "Zhao, Z., Zhao, S., Han, Z., et al. (2022). Impact of COVID-19 on festival inter-city travel in China [in Chinese]. Human Geography, 37(2), 141–149.",
  "Zhou, T., Huang, B., Liu, X., et al. (2020). Spatiotemporal exploration of Chinese Spring Festival population flow patterns and their determinants. ISPRS Int. J. Geo-Information, 9(11), 670.",
];
{
  const per = 28;
  const pages = Math.ceil(REFS.length / per);
  for (let p = 0; p < pages; p++) {
    const s = pres.addSlide();
    header(s, "Appendix", `A${3 + p} · References cited on the slides (${p + 1} of ${pages})`, { appendix: `A${3 + p}` });
    const chunk = REFS.slice(p * per, (p + 1) * per);
    const half = Math.ceil(chunk.length / 2);
    [chunk.slice(0, half), chunk.slice(half)].forEach((col, j) => {
      T(s, col.map((r, i) => ({ text: r, options: { paraSpaceAfter: 4, breakLine: i < col.length - 1, indentLevel: 0 } })),
        { x: MX + j * 6.2, y: 1.42, w: 5.95, h: 5.5, fontSize: 9.4, color: C.ink2, lineSpacingMultiple: 0.95 });
    });
    notes(s, "Reference list (APA-style, abbreviated). Full GB/T 7714 entries with DOIs are in documents 1–5 of the v5 package.");
  }
}

// ---------------------------------------------------------------- write + OOXML clean-up
// pptxgenjs (4.0.x) emits one <a:pPr> per run, so a multi-run paragraph ends up with several <a:pPr>
// elements (schema allows one, before the first run): bullets disappear and PowerPoint may offer "repair".
// Keep only the first pPr of every paragraph.
function fixParagraphs(xml) {
  return xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (m, inner) => {
    const k = inner.search(/<a:(r|br|fld)[ >\/]/);
    if (k < 0) return m;
    const head = inner.slice(0, k);
    const tail = inner.slice(k).replace(/<a:pPr\b[^>]*\/>/g, "").replace(/<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, "");
    return "<a:p>" + head + tail + "</a:p>";
  });
}
if (LANG === "collect") {
  fs.mkdirSync(path.join(ROOT, "i18n"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "i18n", "strings.json"), JSON.stringify([...SEEN], null, 1));
  console.log("collected", SEEN.size, "strings");
  process.exit(0);
}
if (LANG === "zh" && MISSING.size) {
  fs.writeFileSync(path.join(ROOT, "i18n", "missing.json"), JSON.stringify([...MISSING], null, 1));
  console.error("missing translations:", MISSING.size, "(see deck/i18n/missing.json)");
  process.exit(1);
}
// East Asian font slots: Latin text keeps Calibri/Cambria; Chinese glyphs use YaHei (body) / SimSun (headings)
function cjkFonts(xml) {
  if (LANG !== "zh") return xml;
  return xml.replace(/<a:ea typeface="Calibri"/g, '<a:ea typeface="Microsoft YaHei"').replace(/<a:ea typeface="Cambria"/g, '<a:ea typeface="SimSun"');
}
const out = path.join(ROOT, LANG === "zh" ? "Xinhuang_Rural_Transit_Conference_ZH.pptx" : "Xinhuang_Rural_Transit_Conference.pptx");
const JSZip = require("jszip");
pres.write({ outputType: "nodebuffer" }).then(async (buf) => {
  const zip = await JSZip.loadAsync(buf);
  let fixed = 0;
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name).async("string");
    const nx = cjkFonts(fixParagraphs(xml));
    if (nx !== xml) { fixed += 1; zip.file(name, nx); }
  }
  const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(out, data);
  console.log("wrote", out, "slides:", SLIDE_NO, "paragraph fixes in", fixed, "slides");
});
