
/**
 * The Cloudflare Web Analytics site token. Empty, so the beacon is off.
 *
 * To turn the beacon on, paste the site's token here. Get it from the
 * Cloudflare dashboard: Web Analytics → Add a site → enter the site address
 * (see `src/site.ts`) → JS snippet, and copy the `token` value out of the
 * snippet's `data-cf-beacon` attribute. Don't use the automatic setup: it
 * injects the beacon into every page itself, which skips the privacy-signal
 * check below. The token isn't secret; it only says which site a visit is for.
 *
 * The deployed site serves the real build (see wrangler.jsonc), so visits
 * are counted once the token is set. The test build always uses the
 * stand-in token and script below instead.
 */
export const SITE_TOKEN = "";

/** Cloudflare's beacon script, as its JS snippet loads it. */
export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/**
 * The test build (`vite build --mode fixtures`) sets a stand-in token and loads
 * an empty same-origin script instead of Cloudflare's, so the e2e journeys can
 * watch the load decision without sending anything to Cloudflare. The file is
 * emitted by `fixtureBeacon()` in `fixture-beacon.ts`.
 *
 * The mode is written out rather than imported as `FIXTURE_MODE`, so the real
 * build can fold the check to false and drop the stand-in from its bundle.
 * beacon.test.ts keeps the two in step.
 */
const FIXTURE_BUILD = import.meta.env.MODE === "fixtures";
export const FIXTURE_TOKEN = "fixture-token";
export const FIXTURE_BEACON_SRC = "/fixture-beacon.js";

/** What the browser says about tracking and the network. */
export interface BrowserSignals {
  /** Global Privacy Control: true when the player asked not to be tracked. */
  globalPrivacyControl?: boolean;
  /** Do Not Track: "1" (or "yes" in older Firefox) when set. */
  doNotTrack?: string | null;
  onLine: boolean;
}

/** The beacon's `<script>`: its address and its `data-cf-beacon` attribute. */
export interface BeaconScript {
  src: string;
  dataCfBeacon: string;
}

/**
 * Whether to load the beacon, and how. Only with a site token, only when the
 * browser sends neither GPC nor Do Not Track (the beacon checks neither
 * itself), and only online, so an offline visit isn't counted or queued.
 */
export function beaconScript(token: string, browser: BrowserSignals, src = BEACON_SRC): BeaconScript | undefined {
  if (!token) return undefined;
  if (browser.globalPrivacyControl === true) return undefined;
  if (browser.doNotTrack === "1" || browser.doNotTrack === "yes") return undefined;
  if (!browser.onLine) return undefined;
  return { src, dataCfBeacon: JSON.stringify({ token }) };
}

/**
 * Adds the beacon to the page when `beaconScript` says to. It counts page
 * visits only: no play events and no error reporting. A beacon that fails to
 * load is left alone; it runs apart from the app, so it can't break it.
 */
export function startBeacon(): void {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const script = beaconScript(
    FIXTURE_BUILD ? FIXTURE_TOKEN : SITE_TOKEN,
    {
      globalPrivacyControl: nav.globalPrivacyControl,
      // Safari and old Edge put Do Not Track on window instead.
      doNotTrack: nav.doNotTrack ?? (window as Window & { doNotTrack?: string | null }).doNotTrack,
      onLine: nav.onLine,
    },
    FIXTURE_BUILD ? FIXTURE_BEACON_SRC : BEACON_SRC,
  );
  if (!script) return;
  try {
    const element = document.createElement("script");
    element.defer = true;
    element.src = script.src;
    element.dataset.cfBeacon = script.dataCfBeacon;
    document.body.append(element);
  } catch {
    // Counting a visit is never worth breaking the game.
  }
}
