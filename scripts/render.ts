/**
 * What the dev-only render scripts share (`render-link-preview.ts`,
 * `render-icons.ts`): the app's fonts, inlined for a page set from a string,
 * and screenshots in the Chromium the e2e journeys use.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

export const root = join(import.meta.dirname, "..");

/** An @fontsource woff2 as a data: URL, since a page set from a string can't load file:// fonts. */
const fontUrl = (file: string) =>
  `data:font/woff2;base64,${readFileSync(join(root, "node_modules/@fontsource", file)).toString("base64")}`;

/** The @font-face rules for the Cinzel and Inter weights the artwork uses. */
export const FONT_FACES = `
  @font-face { font-family: "Cinzel"; font-weight: 800; src: url("${fontUrl("cinzel/files/cinzel-latin-800-normal.woff2")}"); }
  @font-face { font-family: "Inter"; font-weight: 700; src: url("${fontUrl("inter/files/inter-latin-700-normal.woff2")}"); }
`;

/** An SVG from `assets/`, as text to put in a page. */
export const asset = (file: string) => readFileSync(join(root, "assets", file), "utf8");

export interface Shot {
  html: string;
  width: number;
  height: number;
  /** Keep the page's see-through pixels instead of painting them white. */
  transparent?: boolean;
}

/** Screenshots each page once its fonts have loaded, as PNGs. */
export async function screenshots(shots: Shot[]): Promise<Buffer[]> {
  const browser = await chromium.launch();
  try {
    const out: Buffer[] = [];
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
      await page.setContent(shot.html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      out.push(await page.screenshot({ omitBackground: shot.transparent ?? false }));
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}
