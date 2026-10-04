import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TN23 — Kosapet Cycle Stories",
    short_name: "TN23",
    description:
      "Run a bicycle repair shop in Kosapet, Vellore. Repair cycles and deliver them across town. English & Tamil.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    categories: ["games", "entertainment", "kids"],
    background_color: "#8ec96e",
    theme_color: "#294b45",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
