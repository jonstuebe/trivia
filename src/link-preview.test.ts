import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { servedIndexHtml } from "../tests/support/served-page.ts";

const root = join(import.meta.dirname, "..");

/** The page's `<head>` as the app's Vite config serves and builds it. */
async function servedHead(): Promise<string> {
  const html = await servedIndexHtml();
  return html.slice(0, html.indexOf("</head>"));
}

/** The `content` of the `<meta>` whose `property` or `name` is `key`. */
function meta(head: string, key: string): string | undefined {
  const tag = head.match(new RegExp(`<meta[^>]*(?:property|name)="${key}"[^>]*>`))?.[0];
  return tag?.match(/content="([^"]*)"/)?.[1];
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const png = readFileSync(path);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("the link preview", () => {
  let head: string;
  beforeAll(async () => {
    head = await servedHead();
  }, 30_000);

  it("keeps the page title, with the tagline as the description", () => {
    expect(head).toContain("<title>Trivia</title>");
    expect(meta(head, "description")).toBe("Fifteen questions. One million imaginary dollars.");
  });

  it("has the Open Graph tags, built from the site address", () => {
    expect(meta(head, "og:type")).toBe("website");
    expect(meta(head, "og:site_name")).toBe("Trivia");
    expect(meta(head, "og:title")).toBe("Trivia");
    expect(meta(head, "og:description")).toBe("Fifteen questions. One million imaginary dollars.");
    expect(meta(head, "og:url")).toBe("https://trivia.jonstuebe.com/");
    expect(meta(head, "og:image")).toBe("https://trivia.jonstuebe.com/link-preview.png");
    expect(meta(head, "og:image:width")).toBe("1200");
    expect(meta(head, "og:image:height")).toBe("630");
    expect(meta(head, "og:image:alt")).toBeTruthy();
  });

  it("has a large-image Twitter card with the same image", () => {
    expect(meta(head, "twitter:card")).toBe("summary_large_image");
    expect(meta(head, "twitter:title")).toBe("Trivia");
    expect(meta(head, "twitter:description")).toBe("Fifteen questions. One million imaginary dollars.");
    expect(meta(head, "twitter:image")).toBe("https://trivia.jonstuebe.com/link-preview.png");
  });

  it("points at an absolute image URL", () => {
    for (const key of ["og:image", "og:url", "twitter:image"]) {
      expect(new URL(meta(head, key) ?? "").protocol, key).toBe("https:");
    }
  });

  it("ships the 1200×630 image it points at", () => {
    expect(pngSize(join(root, "public/link-preview.png"))).toEqual({ width: 1200, height: 630 });
  });
});
