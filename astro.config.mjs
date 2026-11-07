import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://shukaj.pages.dev",
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  build: { format: "directory", inlineStylesheets: "always" },
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "be"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      // The 404 page is not a page to index.
      filter: (page) => !page.endsWith("/404/") && !page.endsWith("/404.html"),
      i18n: { defaultLocale: "ru", locales: { ru: "ru", be: "be" } },
    }),
  ],
});
