import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startBeacon } from "./analytics/beacon";
import { routeTree } from "./routeTree.gen";
import "./ui/fonts";
import "./ui/studio.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Anonymous page-visit counts, only when the browser sends no privacy signal.
startBeacon();
