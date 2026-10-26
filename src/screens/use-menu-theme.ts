import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { sound } from "../app/sound";
import { syncMenuTheme } from "../sound/menu-theme";

/**
 * Plays the menu theme on the screens outside the Game, and stops it when a
 * Game starts (`syncMenuTheme`). It's run once, under every screen, so it
 * follows the path rather than each screen mounting and unmounting it:
 * moving between menu screens doesn't restart it. The engine holds it
 * until the first tap or key press, and while muted.
 */
export function useMenuTheme(): void {
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => syncMenuTheme(sound, pathname), [pathname]);
}
