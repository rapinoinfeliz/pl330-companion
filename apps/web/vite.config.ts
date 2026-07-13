import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "autoUpdate", includeAssets: ["icon.svg"],
    manifest: { name: "PL-330 Companion", short_name: "PL-330", description: "Identificação, diário SWL e propagação", theme_color: "#08110f", background_color: "#08110f", display: "standalone", lang: "pt-BR", start_url: "/", icons: [{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}] },
    workbox: { navigateFallback: "/index.html", runtimeCaching: [
      { urlPattern: /\/api\/schedules\//, handler: "StaleWhileRevalidate", options: { cacheName: "eibi-results", expiration: { maxEntries: 80, maxAgeSeconds: 604800 } } },
      { urlPattern: /\/api\/space-weather\//, handler: "NetworkFirst", options: { cacheName: "noaa-last-known", networkTimeoutSeconds: 5, expiration: { maxEntries: 20, maxAgeSeconds: 604800 } } }
    ] }
  })],
  server: { proxy: { "/api": "http://localhost:8788" } }
});
