import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PnL Diary",
    short_name: "PnL Diary",
    description:
      "Jurnal PnL harian yang simpel, aman, dan bisa diakses dari HP maupun desktop. Catat profit & loss trading-mu, pantau performa, dan simpan datamu dengan aman.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F3F4F6",
    theme_color: "#1E3A8A",
    lang: "id",
    categories: ["finance", "productivity", "business"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

