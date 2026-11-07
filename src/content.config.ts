import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const faq = z.array(z.object({ q: z.string(), a: z.string() }).strict());

const hero = z
  .object({
    search: z.string(),
    saved: z.string(),
    sub: z.string(),
    note: z.string(),
    ads: z
      .array(
        z
          .object({
            kind: z.enum(["new", "drop", "bump", "plain"]),
            title: z.string(),
            price: z.string(),
            was: z.string().default(""),
            meta: z.string(),
            tag: z.string().default(""),
          })
          .strict(),
      )
      .min(3)
      .max(5),
  })
  .strict();

const base = {
  title: z.string().max(60),
  description: z.string().max(160),
  h1: z.string(),
  crumb: z.string().optional(),
  related: z.array(z.string()).default([]),
  faq: faq.optional(),
};

// pages/<lang>/<id>.md, entry id is "<lang>/<id>"
const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "{ru,be}/*.md" }),
  schema: z.object({ id: z.string().regex(/^[a-z0-9-]+$/), ...base, hero: hero.optional() }).strict(),
});

// guides/<lang>/<slug>.md, entry id is "<lang>/<slug>"
const guides = defineCollection({
  loader: glob({ base: "./src/content/guides", pattern: "{ru,be}/*.md" }),
  schema: z
    .object({
      id: z.string().optional(),
      ...base,
      published: z.coerce.date(),
      steps: z.array(z.object({ name: z.string(), text: z.string() }).strict()).optional(),
    })
    .strict(),
});

export const collections = { pages, guides };
