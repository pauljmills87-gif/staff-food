import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "landing.png",
        "menu.png",
        "order-bg.png",
        "menu.json",
        "icon-192.png",
        "icon-512.png"
      ],
      manifest: {
        name: "Muito Bom Staff Food",
        short_name: "Staff Food",
        description: "Home comfort food, delivered fresh — built for the strip staff.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0b0b",
        theme_color: "#0b0b0b",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    })
  ]
});