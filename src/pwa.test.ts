import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { getManifest } from "workbox-build";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { servedIndexHtml } from "../tests/support/served-page.ts";
import { PWA_OPTIONS } from "./pwa.ts";

const root = join(import.meta.dirname, "..");
const publicFile = (src: string) => join(root, "public", src);

/**
 * A build folder laid out like `vite build --mode fixtures` writes it: the
 * app, a Topic file per chunk (import.meta.glob turns each JSON into JS),
 * the fonts, the icons, the link preview card and the beacon stand-in. (The
 * worker itself is written after Workbox lists the files, so it isn't here.)
 */
const BUILD_FILES = [
  "index.html",
  "assets/index-BMNwsPRr.js",
  "assets/index-DFOp2Ara.css",
  "assets/privacy-aAekSbym.js",
  "assets/general-CMLl0dzZ.js",
  "assets/fixture-sitcom-eAGtbju9.js",
  "assets/fixture-saga-CCZ0KYBV.js",
  "assets/cinzel-latin-800-normal-CwkMVn6z.woff2",
  "assets/cinzel-latin-800-normal-69OYDlL6.woff",
  "favicon.ico",
  "apple-touch-icon-180x180.png",
  "pwa-192x192.png",
  "link-preview.png",
  "fixture-beacon.js",
  "registerSW.js",
];

describe("what the service worker downloads on the first visit", () => {
  let build: string;
  let cached: string[];
  beforeAll(async () => {
    build = mkdtempSync(join(tmpdir(), "trivia-pwa-"));
    for (const file of BUILD_FILES) {
      mkdirSync(dirname(join(build, file)), { recursive: true });
      writeFileSync(join(build, file), "x");
    }
    const { globPatterns, globIgnores } = PWA_OPTIONS.workbox!;
    const { manifestEntries } = await getManifest({ globDirectory: build, globPatterns, globIgnores });
    cached = (manifestEntries ?? []).map((entry) => entry.url).sort();
  });
  afterAll(() => rmSync(build, { recursive: true, force: true }));

  it("is the app, every Topic file, the fonts and the icons", () => {
    expect(cached).toEqual([
      "apple-touch-icon-180x180.png",
      "assets/cinzel-latin-800-normal-CwkMVn6z.woff2",
      "assets/fixture-saga-CCZ0KYBV.js",
      "assets/fixture-sitcom-eAGtbju9.js",
      "assets/general-CMLl0dzZ.js",
      "assets/index-BMNwsPRr.js",
      "assets/index-DFOp2Ara.css",
      "assets/privacy-aAekSbym.js",
      "favicon.ico",
      "index.html",
      "pwa-192x192.png",
      "registerSW.js",
    ]);
  });

  it("leaves out the analytics beacon's stand-in and the link preview card", () => {
    expect(cached).not.toContain("fixture-beacon.js");
    expect(cached).not.toContain("link-preview.png");
  });
});

describe("the service worker", () => {
  it("answers every navigation, so deep links open offline", () => {
    expect(PWA_OPTIONS.workbox?.navigateFallback).toBe("index.html");
  });

  it("keeps Cloudflare's own paths (the analytics beacon's) on the network", () => {
    const denylist = PWA_OPTIONS.workbox?.navigateFallbackDenylist ?? [];
    expect(denylist.some((pattern) => pattern.test("/cdn-cgi/rum"))).toBe(true);
    expect(denylist.some((pattern) => pattern.test("/tv/fixture-sitcom"))).toBe(false);
  });

  it("caches nothing at run time, so the beacon is never cached or queued", () => {
    expect(PWA_OPTIONS.workbox?.runtimeCaching).toBeUndefined();
  });

  it("waits for every tab to close before a new version takes over", () => {
    expect(PWA_OPTIONS.registerType).toBe("prompt");
    expect(PWA_OPTIONS.workbox?.skipWaiting).toBe(false);
  });

  it("isn't registered by the dev server", async () => {
    const html = await servedIndexHtml();
    expect(html).toContain("<title>Trivia</title>");
    // With dev registration on, the plugin adds a "vite-plugin-pwa:register-dev-sw"
    // script and the manifest link here.
    expect(html).not.toContain("vite-plugin-pwa");
    expect(html).not.toContain('rel="manifest"');
  }, 30_000);
});

describe("the web app manifest", () => {
  const manifest = PWA_OPTIONS.manifest || {};

  it("installs as Trivia, opening the Main menu full screen", () => {
    expect(manifest.name).toBe("Trivia");
    expect(manifest.short_name).toBe("Trivia");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("uses the Studio background for the splash screen and the browser bar", () => {
    const css = readFileSync(join(root, "src/ui/studio.css"), "utf8");
    const bg = css.match(/--bg:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(bg).toBe("#05061a");
    expect(manifest.theme_color).toBe(bg);
    expect(manifest.background_color).toBe(bg);
  });

  it("has a 192 and a 512 icon, and a maskable 512, each the size it says", async () => {
    const icons = manifest.icons ?? [];
    expect(icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
      "192x192 any",
      "512x512 any",
      "512x512 maskable",
    ]);
    for (const icon of icons) {
      const { width, height, format } = await sharp(publicFile(icon.src)).metadata();
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
      expect(format, icon.src).toBe("png");
    }
  });

  it("fills the maskable icon edge to edge, so no launcher shows a gap", async () => {
    const { isOpaque } = await sharp(publicFile("maskable-icon-512x512.png")).stats();
    expect(isOpaque).toBe(true);
  });
});

describe("the page's icons", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");

  it("has an opaque 180 Apple touch icon, since iOS fills see-through pixels with black", async () => {
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />');
    const image = sharp(publicFile("apple-touch-icon-180x180.png"));
    const { width, height } = await image.metadata();
    expect({ width, height }).toEqual({ width: 180, height: 180 });
    expect((await image.stats()).isOpaque).toBe(true);
  });

  it("has a favicon with 16, 32 and 48 pixel images", () => {
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />');
    const ico = readFileSync(publicFile("favicon.ico"));
    // ICONDIR: reserved 0, type 1 (icon), then the image count; each
    // 16-byte entry starts with its width (0 means 256).
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16));
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("colours the browser bar Studio blue", () => {
    expect(html).toContain('<meta name="theme-color" content="#05061a" />');
  });
});
