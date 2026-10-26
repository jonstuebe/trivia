/**
 * Draws the app icons into `public/` from the Studio logo disc
 * (`assets/logo-disc.svg`), and the favicon from its small cut
 * (`assets/favicon.svg`). Dev only: the icons are committed, so builds never
 * run this. The sizes and file names are the ones in `src/pwa.ts`.
 *
 *   bun run render-icons
 *
 * Re-run it after changing either SVG, look at the icons, and commit them.
 * The disc's word is real Cinzel text, so each icon is drawn at its own size
 * in Chromium with the font loaded (see `render.ts`), not scaled from one PNG.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ICONS, APPLE_TOUCH_ICON, FAVICON } from "../src/pwa";
import { SPOTLIGHT, STUDIO_BACKGROUND } from "../src/ui/studio-colours";
import { asset, compress, FONT_FACES, root, screenshots, type Shot } from "./render";

const disc = asset("logo-disc.svg");

/**
 * The disc on its own, `scale` of the square. With `tile`, it sits on the
 * app's spotlight, filling the square edge to edge.
 */
function icon(svg: string, size: number, { scale = 1, tile = false } = {}): Shot {
  const html = `<!doctype html>
<html>
  <head>
    <style>
      ${FONT_FACES}
      html, body { margin: 0; }
      body {
        width: ${size}px;
        height: ${size}px;
        display: grid;
        place-items: center;
        ${
          tile
            ? // The Main menu's spotlight (src/ui/studio.css), centred on the disc.
              `background-color: ${STUDIO_BACKGROUND};
        background-image: radial-gradient(circle at 50% 45%, ${SPOTLIGHT.centre} 0%, ${SPOTLIGHT.middle} 55%, ${STUDIO_BACKGROUND} 90%);`
            : "background: transparent;"
        }
      }
      svg { display: block; width: ${size * scale}px; height: ${size * scale}px; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
  return { html, width: size, height: size, transparent: !tile };
}

const shots: { file: string; shot: Shot }[] = [
  ...APP_ICONS.map((entry) => ({
    file: entry.src,
    // A maskable icon is cropped to the launcher's shape, keeping only the
    // centre circle (40% radius). The disc's ring reaches 46% of the square,
    // so at 80% it fits inside with room to spare.
    shot:
      entry.purpose === "maskable"
        ? icon(disc, entry.size, { scale: 0.8, tile: true })
        : icon(disc, entry.size),
  })),
  // iOS rounds the corners itself and paints see-through pixels black, so
  // the disc sits on the tile, a little in from the rounded corners.
  { file: APPLE_TOUCH_ICON.src, shot: icon(disc, APPLE_TOUCH_ICON.size, { scale: 0.86, tile: true }) },
  ...FAVICON.sizes.map((size) => ({ file: `favicon-${size}`, shot: icon(asset("favicon.svg"), size) })),
];

const pngs = await screenshots(shots.map(({ shot }) => shot));
const compressed = await Promise.all(pngs.map(compress));

const favicons: Buffer[] = [];
shots.forEach(({ file }, i) => {
  if (file.startsWith("favicon-")) {
    favicons.push(compressed[i]!);
    return;
  }
  const out = join(root, "public", file);
  writeFileSync(out, compressed[i]!);
  console.log(`Wrote ${out}`);
});

/**
 * An .ico holding PNG images, which every current browser reads:
 * a 6-byte header, a 16-byte entry per image, then the PNGs themselves.
 */
function ico(images: Buffer[], sizes: readonly number[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1: an icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(sizes[i]! % 256, entry); // width, 0 for 256
    header.writeUInt8(sizes[i]! % 256, entry + 1); // height
    header.writeUInt8(0, entry + 2); // no palette
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...images]);
}

const favicon = join(root, "public", FAVICON.src);
writeFileSync(favicon, ico(favicons, FAVICON.sizes));
console.log(`Wrote ${favicon}`);
