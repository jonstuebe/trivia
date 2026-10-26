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
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LINK_PREVIEW_IMAGE } from "../src/link-preview";
import { SITE_TAGLINE } from "../src/site";
import { SPOTLIGHT, STUDIO_BACKGROUND } from "../src/ui/studio-colours";
import { asset, compress, FONT_FACES, root, screenshots } from "./render";

const disc = asset("logo-disc.svg");
// "Fifteen questions." on one line, the million on the next, in gold.
const [lead, prize] = SITE_TAGLINE.split(/(?<=\.) /);

const card = `<!doctype html>
<html>
  <head>
    <style>
      ${FONT_FACES}
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
        background-color: ${STUDIO_BACKGROUND};
        background-image: radial-gradient(ellipse 70% 95% at 28% 50%, ${SPOTLIGHT.centre} 0%, ${SPOTLIGHT.middle} 50%, ${STUDIO_BACKGROUND} 85%);
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

const [png] = await screenshots([{ html: card, width: LINK_PREVIEW_IMAGE.width, height: LINK_PREVIEW_IMAGE.height }]);
const out = join(root, "public", LINK_PREVIEW_IMAGE.path);
writeFileSync(out, await compress(png!));
console.log(`Wrote ${out}`);
