/**
 * The site address: the one place the app's public host lives. The Share
 * result's Topic link and the link preview's absolute URLs are built from it.
 *
 * It is the Worker's Custom Domain (see wrangler.jsonc). The workers.dev
 * preview still serves the game, but a result shared from it links here.
 */
export const SITE_HOST = "trivia.jonstuebe.com";

/** The site address as a full URL, for tags that need one (`og:image`, `og:url`). */
export const SITE_URL = `https://${SITE_HOST}`;

/** The game's name, as the page title and the link preview show it. */
export const SITE_NAME = "Trivia";

/** The tagline: under the Main menu's title, and the page's description and the link preview's text. */
export const SITE_TAGLINE = "Fifteen questions. One million imaginary dollars.";
