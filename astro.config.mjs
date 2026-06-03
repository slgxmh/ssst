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
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: [],
        runtimeCaching: [
          {
            // HTML 文件使用 NetworkFirst，确保总是获取最新版本
            urlPattern: /\.html$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // JS/CSS 等静态资源使用 StaleWhileRevalidate
            urlPattern: /\.(js|css|ico|png|svg)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // JSON 文件使用 NetworkFirst
            urlPattern: /\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "json-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 3,
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
