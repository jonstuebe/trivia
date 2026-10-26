import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useMenuTheme } from "../screens/use-menu-theme";

// The Studio stage under every screen: the navy spotlight comes from <body>.
// The menu theme plays from here, so it carries on between the menu screens.
export const Route = createRootRoute({
  component: Root,
});

function Root() {
  useMenuTheme();
  return (
    <div className="stage">
      <Outlet />
    </div>
  );
}
