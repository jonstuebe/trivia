import type { VitePWAOptions } from "vite-plugin-pwa";
import { SITE_NAME, SITE_TAGLINE } from "./site.ts";
import { STUDIO_BACKGROUND } from "./ui/studio-colours.ts";

/**
 * The PWA: a web app manifest so the game installs on a phone, and a service
 * worker that downloads the whole app, every Topic file included, on the
 * first visit, so any Topic plays with no connection.
 *
 * Updates: a new deploy's worker installs in the background and waits. It
 * takes over only once every tab and installed window of the app is closed,
 * so the next open gets the new version and an open Game is never reloaded.
 * Nothing asks the player to update.
 *
 * Only `vite build` writes the worker (`sw.js`) and its registration script
 * (`registerSW.js`, a plain `<script>` in index.html, so no app code imports
 * it). The dev server and the unit tests never register one.
 */

/**
 * The app icons, all drawn from the logo disc by `bun run render-icons` into
 * `public/`. The maskable one sits the disc inside the safe zone on a
 * full-bleed background, for launchers that crop icons to their own shape.
 */
export const APP_ICONS = [
  { src: "/pwa-192x192.png", size: 192, purpose: "any" },
  { src: "/pwa-512x512.png", size: 512, purpose: "any" },
  { src: "/maskable-icon-512x512.png", size: 512, purpose: "maskable" },
] as const;

/** The home-screen icon iOS uses, which ignores the manifest's icons. */
export const APPLE_TOUCH_ICON = { src: "/apple-touch-icon-180x180.png", size: 180 } as const;

/** The tab icon: the disc with a "T", since the word can't be read at 16 to 48 pixels. */
export const FAVICON = { src: "/favicon.ico", sizes: [16, 32, 48] } as const;

export const PWA_OPTIONS: Partial<VitePWAOptions> = {
  // "prompt" leaves the worker's lifecycle alone: no skipWaiting, so a new
  // version waits for the next open. Nothing calls updateSW(), so no prompt.
  registerType: "prompt",
  injectRegister: "script",
  manifest: {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: STUDIO_BACKGROUND,
    background_color: STUDIO_BACKGROUND,
    lang: "en",
    icons: APP_ICONS.map(({ src, size, purpose }) => ({ src, sizes: `${size}x${size}`, type: "image/png", purpose })),
  },
  // The icons are in public/, so the glob below already takes them in.
  includeManifestIcons: false,
  workbox: {
    // Each Topic file is its own JS chunk, so "js" takes in every Topic,
    // played or not. The fonts are woff2 (every browser that runs a service
    // worker reads woff2, so the woff copies are skipped).
    globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg}"],
    globIgnores: [
      // The test build's analytics beacon stand-in: like Cloudflare's own
      // beacon (another origin, so never cached), it always goes to the network.
      "fixture-beacon.js",
      // The chat apps' link preview card: never shown in the app.
      "link-preview.png",
    ],
    // Every navigation gets the app, so /tv/<slug>, /privacy and the rest open offline.
    navigateFallback: "index.html",
    // Cloudflare's own paths, where Web Analytics can report visits.
    navigateFallbackDenylist: [/^\/cdn-cgi\//],
    skipWaiting: false,
    // Safe with skipWaiting off: a waiting worker only activates once no old
    // tab is left. It makes the first visit's tab controlled at once, so it
    // can go offline and still load Topics it hasn't opened.
    clientsClaim: true,
  },
};
