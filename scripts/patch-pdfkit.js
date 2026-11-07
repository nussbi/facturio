#!/usr/bin/env node
// Patch pdfkit's JS bundles to embed the built-in AFM/ICC data as literals
// so it works on Cloudflare Workers (no filesystem access).
// Patches ALL shipped bundles (pdfkit.js is the `main` entry loaded at runtime).
const fs = require("fs");
const path = require("path");

const pdfkitDir = path.join(process.cwd(), "node_modules", "pdfkit");
const dataDir = path.join(pdfkitDir, "js", "data");
const bundles = ["pdfkit.js", "pdfkit.es.js", "pdfkit.es5.js", "pdfkit.esnext.js"];

let total = 0;
for (const file of bundles) {
  const p = path.join(pdfkitDir, "js", file);
  if (!fs.existsSync(p)) continue;
  let src = fs.readFileSync(p, "utf8");
  let count = 0;

  // 1) AFM font metrics: fs.readFileSync(__dirname + '/data/Helvetica.afm', 'utf8')
  src = src.replace(
    /fs\.readFileSync\(__dirname \+ '\/data\/([^']+\.afm)', 'utf8'\)/g,
    (m, f) => {
      const data = fs.readFileSync(path.join(dataDir, f), "utf8");
      count++;
      return JSON.stringify(data);
    }
  );

  // 2) ICC profile, string-concat form: fs.readFileSync(__dirname + '/data/sRGB_IEC61966_2_1.icc')
  src = src.replace(
    /fs\.readFileSync\(__dirname \+ '\/data\/(sRGB_IEC61966_2_1\.icc)'\)/g,
    (m, f) => {
      const data = fs.readFileSync(path.join(dataDir, f));
      count++;
      return `Buffer.from(${JSON.stringify(data.toString("base64"))}, "base64")`;
    }
  );

  // 3) ICC profile, template-literal form (ESM): fs.readFileSync(`${__dirname}/data/sRGB_IEC61966_2_1.icc`)
  src = src.replace(
    /fs\.readFileSync\(`\$\{__dirname\}\/data\/(sRGB_IEC61966_2_1\.icc)`\)/g,
    (m, f) => {
      const data = fs.readFileSync(path.join(dataDir, f));
      count++;
      return `Buffer.from(${JSON.stringify(data.toString("base64"))}, "base64")`;
    }
  );

  if (count > 0) {
    fs.writeFileSync(p, src);
    console.log(`  ${file}: embedded ${count} data files`);
  }
  total += count;
}
console.log(`pdfkit patch complete: ${total} data files embedded across bundles`);
