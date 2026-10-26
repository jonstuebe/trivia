/**
 * The Studio colours that code outside the stylesheet needs: the web app
 * manifest (`src/pwa.ts`) and the artwork drawn by the render scripts
 * (`scripts/render-icons.ts`, `scripts/render-link-preview.ts`).
 *
 * The same values are written out by hand where TypeScript can't reach:
 * `--bg` and `--spotlight` in `src/ui/studio.css`, and the theme-color
 * `<meta>` in `index.html`. Change them together.
 */

/** The Studio background (`--bg`): the splash screen, the browser bar and the spotlight's edge. */
export const STUDIO_BACKGROUND = "#05061a";

/** The spotlight's (`--spotlight`) inner colours, from its centre out; it fades into the background. */
export const SPOTLIGHT = { centre: "#2a2f9e", middle: "#0b0e3a" } as const;
