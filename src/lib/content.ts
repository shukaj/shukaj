import { getCollection } from "astro:content";
import { marked } from "marked";
import plans from "../data/plans.json";
import { substitute, pluralIndex, PLAN_IDS, NULL_PHRASE } from "./tokens.mjs";
import { ui, LANGS, BOT, pagePath, guidePath, other, type Lang } from "./ui";

export { LANGS, type Lang };

type Plans = typeof plans;

export interface Faq { q: string; a: string; aHtml: string }
export interface Hero {
  search: string; saved: string; sub: string; note: string; pushSearch: string; dropMark: string; ghost: string;
  ads: { kind: "new" | "drop" | "bump" | "plain"; title: string; price: string; was: string; when: string }[];
}
export interface Doc {
  kind: "page" | "guide";
  lang: Lang;
  key: string; // page id or guide slug
  file: string;
  path: string; // URL path, with slashes
  startId: string; // web-<startId>[-be]
  title: string;
  description: string;
  h1: string;
  crumb: string;
  related: string[];
  faq: Faq[];
  hero?: Hero;
  published?: Date;
  steps?: { name: string; text: string }[];
  html: string; // rendered body
}

export const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Keep a one-letter word with the next one: «в Telegram» stays together. */
export const nbsp = (s: string) => s.replace(/(^|\s)([вуиікасоаяВУИІКАСОАЯ])\s/g, "$1$2 ");

export const startUrl = (doc: { startId: string; lang: Lang }) =>
  `${BOT}?start=web-${doc.startId}${doc.lang === "be" ? "-be" : ""}`;

export function plansHtml(lang: Lang): string {
  const t = ui[lang];
  const p = plans as Plans;
  const plural = (n: number, forms: [string, string, string]) => forms[pluralIndex(n)];
  const period = t.perPeriod(`${p.periodDays} ${plural(p.periodDays, t.days)}`);
  const priceHead = `${t.table.price} ${period}`;
  const rows = PLAN_IDS.map((id) => {
    const plan = p[id as "free" | "pro" | "ultra"];
    const kept = plan.kept === null ? NULL_PHRASE[lang] : String(plan.kept);
    const price = plan.stars === 0 ? t.free : `${plan.stars} ${plural(plan.stars, t.stars)}`;
    const name = id[0].toUpperCase() + id.slice(1);
    return (
      `<tr><th scope="row">${name}</th>` +
      `<td data-label="${t.table.how}">${t.every(plan.everyMinutes)}</td>` +
      `<td data-label="${t.table.active}">${plan.active}</td>` +
      `<td data-label="${t.table.kept}">${kept}</td>` +
      `<td data-label="${priceHead}">${price}</td></tr>`
    );
  }).join("");
  return (
    `<div class="plans-wrap"><table class="plans"><thead><tr>` +
    `<th scope="col">${t.table.plan}</th><th scope="col">${t.table.how}</th><th scope="col">${t.table.active}</th>` +
    `<th scope="col">${t.table.kept}</th><th scope="col">${priceHead}</th></tr></thead><tbody>${rows}</tbody></table></div>`
  );
}

function ctaHtml(doc: Pick<Doc, "startId" | "lang">, inline = false): string {
  const a = `<a class="cta" href="${startUrl(doc)}">${ui[doc.lang].open}</a>`;
  return inline ? a : `<p class="cta-row">${a}</p>`;
}

/** Plain-text fields: tokens that are values only. */
function plain(text: string, lang: Lang, where: string): string {
  return substitute(text, { plans, lang, where });
}

function md(text: string, doc: Pick<Doc, "startId" | "lang">, where: string): string {
  const src = substitute(text, {
    plans,
    lang: doc.lang,
    where,
    blocks: { plans: "\n\n@@PLANS@@\n\n", cta: "@@CTA@@" },
  });
  let html = marked.parse(src, { async: false, gfm: true }) as string;
  html = html
    .replace(/<p>\s*@@PLANS@@\s*<\/p>/g, () => plansHtml(doc.lang))
    .replace(/<p>\s*@@CTA@@\s*<\/p>/g, () => ctaHtml(doc))
    .replace(/@@PLANS@@/g, () => plansHtml(doc.lang))
    .replace(/@@CTA@@/g, () => ctaHtml(doc, true));
  return html;
}

/** Wrap each `## heading` and what follows it into a <section>; text before the first one stays loose. */
function sections(html: string): string {
  const chunks = html.split(/(?=<h2[\s>])/);
  return chunks
    .map((chunk) => {
      const m = chunk.match(/^(<h2[\s\S]*?<\/h2>)([\s\S]*)$/);
      if (!m) return chunk.trim() ? `<div class="intro">${chunk}</div>` : "";
      return `<section class="sec">${m[1]}<div class="sec-body">${m[2]}</div></section>`;
    })
    .join("\n");
}

type RawPage = Awaited<ReturnType<typeof getCollection<"pages">>>[number];
type RawGuide = Awaited<ReturnType<typeof getCollection<"guides">>>[number];

function build(kind: "page" | "guide", e: RawPage | RawGuide): Doc {
  const [lang, key] = e.id.split("/") as [Lang, string];
  const file = `src/content/${kind === "page" ? "pages" : "guides"}/${e.id}.md`;
  if (!LANGS.includes(lang) || !key) throw new Error(`${file}: expected <lang>/<name>`);
  const d = e.data as RawPage["data"] & Partial<RawGuide["data"]>;
  if (kind === "page" && d.id !== key) {
    throw new Error(`${file}: frontmatter id "${d.id}" must equal the file name "${key}"`);
  }
  const ctx: Pick<Doc, "startId" | "lang"> = { startId: kind === "page" ? key : `guide-${key}`, lang };
  const w = (f: string) => `${file} ${f}`;
  const hero = (d as RawPage["data"]).hero;
  const out: Doc = {
    kind,
    lang,
    key,
    file,
    path: kind === "page" ? pagePath(lang, key) : guidePath(lang, key),
    startId: ctx.startId,
    title: plain(d.title, lang, w("title")),
    description: plain(d.description, lang, w("description")),
    h1: plain(d.h1, lang, w("h1")),
    crumb: plain(d.crumb ?? d.h1, lang, w("crumb")),
    related: d.related ?? [],
    faq: (d.faq ?? []).map((f, i) => ({
      q: plain(f.q, lang, w(`faq[${i}].q`)),
      a: plain(f.a, lang, w(`faq[${i}].a`)),
      aHtml: md(f.a, ctx, w(`faq[${i}].a`)),
    })),
    published: d.published,
    steps: d.steps?.map((s, i) => ({
      name: plain(s.name, lang, w(`steps[${i}].name`)),
      text: plain(s.text, lang, w(`steps[${i}].text`)),
    })),
    html: sections(md(e.body ?? "", ctx, w("body"))),
  };
  if (hero) {
    out.hero = {
      search: plain(hero.search, lang, w("hero.search")),
      saved: plain(hero.saved, lang, w("hero.saved")),
      sub: plain(hero.sub, lang, w("hero.sub")),
      note: plain(hero.note, lang, w("hero.note")),
      pushSearch: plain(hero.pushSearch, lang, w("hero.pushSearch")),
      dropMark: plain(hero.dropMark, lang, w("hero.dropMark")),
      ghost: plain(hero.ghost, lang, w("hero.ghost")),
      ads: hero.ads.map((a, i) => ({
        kind: a.kind,
        title: plain(a.title, lang, w(`hero.ads[${i}].title`)),
        price: plain(a.price, lang, w(`hero.ads[${i}].price`)),
        was: plain(a.was, lang, w(`hero.ads[${i}].was`)),
        when: plain(a.when, lang, w(`hero.ads[${i}].when`)),
      })),
    };
  }
  if (kind === "page" && key === "home" && !out.hero) {
    throw new Error(`${file}: the home page needs a hero: block`);
  }
  return out;
}

export interface Site {
  pages: Record<Lang, Map<string, Doc>>;
  guides: Record<Lang, Map<string, Doc>>;
}

let cache: Promise<Site> | undefined;
export function loadSite(): Promise<Site> {
  cache ??= (async () => {
    const site: Site = {
      pages: { ru: new Map(), be: new Map() },
      guides: { ru: new Map(), be: new Map() },
    };
    for (const e of await getCollection("pages")) {
      const d = build("page", e);
      site.pages[d.lang].set(d.key, d);
    }
    for (const e of await getCollection("guides")) {
      const d = build("guide", e);
      site.guides[d.lang].set(d.key, d);
    }
    for (const group of ["pages", "guides"] as const) {
      for (const lang of LANGS) {
        for (const key of site[group][lang].keys()) {
          if (!site[group][other(lang)].has(key)) {
            throw new Error(`src/content/${group}/${lang}/${key}.md has no ${other(lang)} pair`);
          }
        }
      }
    }
    return site;
  })();
  return cache;
}

/** Guides newest first. */
export const guideList = (site: Site, lang: Lang) =>
  [...site.guides[lang].values()].sort(
    (a, b) => b.published!.getTime() - a.published!.getTime() || a.key.localeCompare(b.key),
  );

export interface Link { href: string; label: string }
/** Related links; an id that does not exist yet is skipped (`npm run check` reports it). */
export function relatedLinks(site: Site, doc: Doc): Link[] {
  const out: Link[] = [];
  for (const ref of doc.related) {
    const m = ref.match(/^guide:(.+)$/);
    const target = m ? site.guides[doc.lang].get(m[1]) : site.pages[doc.lang].get(ref);
    if (!target) {
      console.warn(`[content] ${doc.file}: related "${ref}" does not exist (skipped)`);
      continue;
    }
    out.push({ href: target.path, label: target.crumb });
  }
  return out;
}

export function pairOf(site: Site, doc: Doc): Doc {
  const group = doc.kind === "page" ? site.pages : site.guides;
  return group[other(doc.lang)].get(doc.key)!;
}

export async function staticPaths(lang: Lang) {
  const site = await loadSite();
  const out: { params: { slug: string | undefined }; props: { id: string; kind: Doc["kind"] } }[] = [];
  for (const d of site.pages[lang].values()) {
    out.push({ params: { slug: d.key === "home" ? undefined : d.key }, props: { id: d.key, kind: "page" } });
  }
  for (const d of site.guides[lang].values()) {
    out.push({ params: { slug: `guides/${d.key}` }, props: { id: d.key, kind: "guide" } });
  }
  return out;
}
