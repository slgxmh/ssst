import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: netlify(),
  site: "https://ssst.netlify.app",
  integrations: [
    solid(),
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: false,
      // 禁用 workbox 的 glob 预缓存，改用运行时缓存
      workbox: {
        globPatterns: [],
        runtimeCaching: [
          {
            urlPattern: /\.(js|css|html|ico|png|svg|json)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
