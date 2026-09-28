/* Keep only the first <a:pPr> in every <a:p> of every slide (pptxgenjs 4.0.x writes one per run).
 * Usage: node fix_pptxgenjs_paragraphs.js in.pptx [out.pptx]   (needs jszip on NODE_PATH; pptxgenjs ships it)
 */
const fs = require("fs");
const JSZip = require("jszip");

function fixParagraphs(xml) {
  return xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (m, inner) => {
    const k = inner.search(/<a:(r|br|fld)[ >\/]/);
    if (k < 0) return m;
    const head = inner.slice(0, k);
    const tail = inner.slice(k).replace(/<a:pPr\b[^>]*\/>/g, "").replace(/<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, "");
    return "<a:p>" + head + tail + "</a:p>";
  });
}

async function main() {
  const [inp, out = inp] = process.argv.slice(2);
  if (!inp) { console.error("usage: node fix_pptxgenjs_paragraphs.js in.pptx [out.pptx]"); process.exit(2); }
  const zip = await JSZip.loadAsync(fs.readFileSync(inp));
  let fixed = 0;
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name).async("string");
    const nx = fixParagraphs(xml);
    if (nx !== xml) { fixed += 1; zip.file(name, nx); }
  }
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`fixed paragraphs in ${fixed} slide(s) -> ${out}`);
}
if (require.main === module) main();
module.exports = { fixParagraphs };
