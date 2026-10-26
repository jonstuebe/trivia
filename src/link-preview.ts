import type { HtmlTagDescriptor, Plugin } from "vite";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "./site.ts";

/**
 * The link preview: one Open Graph card for the whole site, so a pasted link
 * shows the Studio logo disc with the name and tagline. There are no
 * per-Topic previews. Chat apps don't run scripts, so the tags go into
 * index.html at build time, with absolute URLs from the site address.
 */

/** The card image, in `public/`. `bun run render-link-preview` redraws it. */
export const LINK_PREVIEW_IMAGE = { path: "/link-preview.png", width: 1200, height: 630 };

const IMAGE_ALT = `The ${SITE_NAME} logo disc on a blue spotlight, with the tagline "${SITE_TAGLINE}"`;

/** The preview's tags: the description and Twitter card by `name`, Open Graph by `property`. */
function previewTags(): HtmlTagDescriptor[] {
  const image = `${SITE_URL}${LINK_PREVIEW_IMAGE.path}`;
  const named = {
    description: SITE_TAGLINE,
    "twitter:card": "summary_large_image",
    "twitter:title": SITE_NAME,
    "twitter:description": SITE_TAGLINE,
    "twitter:image": image,
    "twitter:image:alt": IMAGE_ALT,
  };
  const properties = {
    "og:type": "website",
    "og:site_name": SITE_NAME,
    "og:title": SITE_NAME,
    "og:description": SITE_TAGLINE,
    "og:url": `${SITE_URL}/`,
    "og:image": image,
    "og:image:width": String(LINK_PREVIEW_IMAGE.width),
    "og:image:height": String(LINK_PREVIEW_IMAGE.height),
    "og:image:alt": IMAGE_ALT,
  };
  return [
    ...Object.entries(named).map(([name, content]) => ({ name, content })),
    ...Object.entries(properties).map(([property, content]) => ({ property, content })),
  ].map((attrs) => ({ tag: "meta", attrs, injectTo: "head" }));
}

/** Adds the link preview's tags to the page, in dev and in every build. */
export function linkPreview(): Plugin {
  return {
    name: "trivia:link-preview",
    transformIndexHtml: () => previewTags(),
  };
}
