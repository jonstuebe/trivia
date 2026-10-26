/**
 * When the menu theme plays: on every screen outside the Game, so the Main
 * menu, Pick a topic, Ready to play (and Not enough new questions) and the
 * privacy note. Pick a topic sits between the Main menu and Ready to play,
 * so playing there too means going back and forth between them never
 * restarts the theme from the top. `/game` is the Game and its Game over,
 * which have the Game's own beds and stings.
 */
export function menuThemePlays(pathname: string): boolean {
  return pathname !== "/game";
}

/** The part of the sound engine the menu theme needs. */
interface ThemeSound {
  startBed(name: "theme"): void;
  stopBed(only?: "theme"): void;
}

/**
 * Starts or stops the menu theme for the screen at `pathname`. Starting it
 * while it plays does nothing, so it carries on across the menu screens.
 * On the Game it stops the theme, but leaves a bed the Game has already
 * started alone.
 */
export function syncMenuTheme(sound: ThemeSound, pathname: string): void {
  if (menuThemePlays(pathname)) sound.startBed("theme");
  else sound.stopBed("theme");
}
