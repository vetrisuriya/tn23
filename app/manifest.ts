import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TN23 — Kosapet Cycle Stories",
    short_name: "TN23",
    description:
      "Run a bicycle repair shop in Kosapet, Vellore. Repair cycles and deliver them across town. English & Tamil.",
    start_url: "/",
    display: "standalone",
    background_color: "#8ec96e",
    theme_color: "#294b45",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
