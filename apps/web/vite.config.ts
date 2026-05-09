import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Anna",
        short_name: "Anna",
        description: "Gestão para brechós",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fff8f7",
        theme_color: "#1a1a2e",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    // Prefer TS sources over stale compiled `.js` twins in `src/`.
    extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"]
  }
});
