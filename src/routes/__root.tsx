import { createRootRoute, Outlet } from "@tanstack/react-router";

// The Studio stage under every screen: the navy spotlight comes from <body>.
export const Route = createRootRoute({
  component: () => (
    <div className="stage">
      <Outlet />
    </div>
  ),
});
