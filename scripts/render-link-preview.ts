/**
 * Draws the link preview card, `public/link-preview.png`: the Studio logo disc
 * (`assets/logo-disc.svg`) on the blue spotlight, with the tagline from
 * `src/site.ts`. Dev only: the PNG is committed, so builds never run this.
 *
 *   bun run render-link-preview
 *
 * Re-run it after changing the disc, the tagline or the card below, look at
 * the PNG, and commit it. It renders in the Chromium the e2e journeys use, with
 * Cinzel and Inter from @fontsource, so the card matches the app's type.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { LINK_PREVIEW_IMAGE } from "../src/link-preview";
import { SITE_TAGLINE } from "../src/site";

const root = join(import.meta.dirname, "..");
// Inlined, since a page set from a string can't load file:// fonts.
const font = (file: string) =>
  `data:font/woff2;base64,${readFileSync(join(root, "node_modules/@fontsource", file)).toString("base64")}`;

const disc = readFileSync(join(root, "assets/logo-disc.svg"), "utf8");
// "Fifteen questions." on one line, the million on the next, in gold.
const [lead, prize] = SITE_TAGLINE.split(/(?<=\.) /);

const card = `<!doctype html>
<html>
  <head>
    <style>
      @font-face { font-family: "Cinzel"; font-weight: 800; src: url("${font("cinzel/files/cinzel-latin-800-normal.woff2")}"); }
      @font-face { font-family: "Inter"; font-weight: 700; src: url("${font("inter/files/inter-latin-700-normal.woff2")}"); }
      html, body { margin: 0; }
      body {
        width: ${LINK_PREVIEW_IMAGE.width}px;
        height: ${LINK_PREVIEW_IMAGE.height}px;
        box-sizing: border-box;
        padding: 0 80px 0 70px;
        display: flex;
        align-items: center;
        gap: 52px;
        /* The app's spotlight (src/ui/studio.css), centred on the disc. */
        background-color: #05061a;
        background-image: radial-gradient(ellipse 70% 95% at 28% 50%, #2a2f9e 0%, #0b0e3a 50%, #05061a 85%);
        font-family: "Inter", sans-serif;
        font-weight: 700;
      }
      svg { flex: none; width: 400px; height: 400px; }
      p { margin: 0; font-size: 60px; line-height: 1.12; letter-spacing: -0.01em; color: #eef1ff; }
      .prize { display: block; margin-top: 14px; color: #f5c542; }
    </style>
  </head>
  <body>
    ${disc}
    <p>${lead} <span class="prize">${prize}</span></p>
  </body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: LINK_PREVIEW_IMAGE.width, height: LINK_PREVIEW_IMAGE.height },
  });
  await page.setContent(card, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const out = join(root, "public", LINK_PREVIEW_IMAGE.path);
  // Recompressed losslessly: about a third the size, well under the limits
  // some chat apps put on preview images.
  await sharp(await page.screenshot()).png({ compressionLevel: 9, effort: 10 }).toFile(out);
  console.log(`Wrote ${out}`);
} finally {
  await browser.close();
}
