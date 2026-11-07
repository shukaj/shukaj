// `npm run check`: run after `astro build`. Reads dist/ and src/content/ and fails on anything CONTENT.md
// or the spec's Testing Decisions forbid. Prints every problem, grouped by file, then exits 1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { parse as parseHtml } from "node-html-parser";
import { findTokens, isKnownToken } from "../src/lib/tokens.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.CHECK_DIST ?? path.join(ROOT, "dist");
const CONTENT = process.env.CHECK_CONTENT ?? path.join(ROOT, "src", "content");
const SITE = "https://shukaj.pages.dev";
const LANGS = ["ru", "be"];
const EXPECTED_PAGES = ["home", "kvartiry", "avto", "telefony", "ssylka", "faq", "tarify", "guides"];
const MIN_GUIDES = 5; // the spec: 5 guides at launch
const DISCLAIMER = {
  ru: "Шукай не является официальным сервисом Kufar",
  be: "Шукай не з'яўляецца афіцыйным сэрвісам Kufar",
};
const START_BASE = "https://t.me/shukajbot?start=";

const plans = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "plans.json"), "utf8"));
const intervals = new Set(["free", "pro", "ultra"].map((p) => plans[p].everyMinutes));

const problems = new Map(); // where -> [messages]
const fail = (where, msg) => {
  if (!problems.has(where)) problems.set(where, []);
  problems.get(where).push(msg);
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const len = (s) => [...s].length;

// ---------------------------------------------------------------- src/content

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
}

/** All string leaves of a value, with a label for where each came from. */
function leaves(value, label, out = []) {
  if (typeof value === "string") out.push({ label, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${label}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) leaves(v, label ? `${label}.${k}` : k, out);
  return out;
}

const sources = { pages: { ru: {}, be: {} }, guides: { ru: {}, be: {} } };
for (const group of ["pages", "guides"]) {
  for (const lang of LANGS) {
    const dir = path.join(CONTENT, group, lang);
    for (const f of listMd(dir)) {
      const file = path.join(dir, f);
      const key = f.replace(/\.md$/, "");
      const where = rel(file);
      const raw = fs.readFileSync(file, "utf8");
      const m = raw.match(FM_RE);
      if (!m) {
        fail(where, "no frontmatter block");
        continue;
      }
      let fm;
      try {
        fm = parseYaml(m[1]) ?? {};
      } catch (e) {
        fail(where, `frontmatter is not valid YAML: ${e.message.split("\n")[0]}`);
        continue;
      }
      sources[group][lang][key] = { where, fm, body: m[2] };
    }
  }
}

// Pairs, expected pages, ids.
for (const group of ["pages", "guides"]) {
  for (const lang of LANGS) {
    const otherLang = lang === "ru" ? "be" : "ru";
    for (const key of Object.keys(sources[group][lang])) {
      if (!sources[group][otherLang][key]) {
        fail(sources[group][lang][key].where, `no ${otherLang} pair: src/content/${group}/${otherLang}/${key}.md is missing`);
      }
    }
  }
}
for (const lang of LANGS) {
  for (const id of EXPECTED_PAGES) {
    if (!sources.pages[lang][id]) fail(`src/content/pages/${lang}/${id}.md`, "page does not exist yet");
  }
  const n = Object.keys(sources.guides[lang]).length;
  if (n < MIN_GUIDES) fail(`src/content/guides/${lang}/`, `${n} guide(s), the spec asks for ${MIN_GUIDES} at launch`);
  for (const [key, s] of Object.entries(sources.pages[lang])) {
    if (s.fm.id !== key) fail(s.where, `frontmatter id "${s.fm.id}" must equal the file name "${key}"`);
  }
  for (const [key, s] of Object.entries(sources.guides[lang])) {
    if (!/^[a-z0-9-]+$/.test(key)) fail(s.where, `guide slug "${key}" must be lowercase a-z, 0-9 and -`);
    if (!s.fm.published) fail(s.where, "guide needs `published:`");
  }
}

// Stars amounts and check intervals typed as numbers; «парсер»; tokens; style rules.
const STARS_RE = /\d[\d\s.,]*\s*(?:⭐|★|звёзд\p{L}*|звезд\p{L}*|зорак|зорк\p{L}*|stars?\b|XTR\b)|(?:⭐|★)\s*\d/iu;
const EVERY_RE = /(?:раз|кожныя|кожную|кожны|каждые|каждую|каждый|every)\s+(?:в\s+|на\s+)?\d+\s*(?:мин\p{L}*|хв\p{L}*|min\b|minutes?\b|сек\p{L}*|секунд\p{L}*)/iu;
const MINUTES_RE = /(?<![\d.,:])(\d+)\s*(?:мин\p{L}*|хв\p{L}*)/giu;
const PARSER_RE = /парс\p{L}*/iu;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

for (const group of ["pages", "guides"]) {
  for (const lang of LANGS) {
    for (const [key, s] of Object.entries(sources[group][lang])) {
      const items = [...leaves(s.fm, "frontmatter"), { label: "body", text: s.body }];
      for (const { label, text } of items) {
        const isFaq = /^frontmatter\.faq\[\d+\]\.[qa]$/.test(label);
        for (const t of findTokens(text)) {
          if (!isKnownToken(plans, t.name)) fail(s.where, `${label}: unknown token ${t.raw}`);
          else if (["plans", "cta"].includes(t.name) && label !== "body" && !(isFaq && label.endsWith(".a"))) {
            fail(s.where, `${label}: ${t.raw} only works in the body or a faq answer`);
          }
        }
        const bare = text.replace(/\{\{[^{}]*\}\}/g, "");
        const stars = bare.match(STARS_RE);
        if (stars) fail(s.where, `${label}: Stars amount typed as a number ("${stars[0].trim()}"); use {{pro.stars}} / {{ultra.stars}}`);
        const every = bare.match(EVERY_RE);
        if (every) fail(s.where, `${label}: check interval typed as a number ("${every[0]}"); use {{<plan>.everyMinutes}}`);
        for (const m of bare.matchAll(MINUTES_RE)) {
          if (intervals.has(Number(m[1]))) fail(s.where, `${label}: "${m[0]}" is a Plan's check interval; use {{<plan>.everyMinutes}}`);
        }
        if (PARSER_RE.test(text) && !isFaq) {
          fail(s.where, `${label}: «парсер» appears outside a faq entry`);
        }
        if (/!/.test(bare.replace(/Шукай!/g, ""))) fail(s.where, `${label}: exclamation mark (only «Шукай!» may have one)`);
        if (EMOJI_RE.test(bare)) fail(s.where, `${label}: emoji`);
        // Links on a page stay in its own language.
        for (const m of text.matchAll(/\]\((\/[^)\s]*)\)|href="(\/[^"]*)"/g)) {
          const href = m[1] ?? m[2];
          if (/\.[a-z0-9]+$/i.test(href.split("#")[0])) continue;
          const isBe = href === "/be" || href.startsWith("/be/");
          if (lang === "be" && !isBe) fail(s.where, `${label}: link ${href} on a Belarusian page must start with /be/`);
          if (lang === "ru" && isBe) fail(s.where, `${label}: link ${href} on a Russian page must not start with /be/`);
        }
      }
      // related ids exist
      for (const ref of s.fm.related ?? []) {
        const g = /^guide:(.+)$/.exec(ref);
        const exists = g ? sources.guides[lang][g[1]] : sources.pages[lang][ref];
        if (!exists) fail(s.where, `related "${ref}" does not exist`);
      }
      if (group === "pages" && key === "home" && !s.fm.hero) fail(s.where, "home needs a hero: block");
    }
  }
}

// ----------------------------------------------------------------------- dist

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error("dist/ is missing: run `npm run build` first.");
  process.exit(2);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
const urlOf = (file) => {
  const r = "/" + path.relative(DIST, file).split(path.sep).join("/");
  if (r === "/404.html") return r;
  return r.replace(/index\.html$/, "");
};
const fileOf = (urlPath) => {
  const p = urlPath.endsWith("/") ? urlPath + "index.html" : urlPath;
  return path.join(DIST, p);
};
const exists = (urlPath) => {
  try {
    return fs.statSync(fileOf(urlPath)).isFile();
  } catch {
    return false;
  }
};
const pages = new Map(); // url -> { file, root, lang }
for (const f of htmlFiles) {
  const url = urlOf(f);
  pages.set(url, { file: f, root: parseHtml(fs.readFileSync(f, "utf8"), { comment: false }), html: fs.readFileSync(f, "utf8") });
}
const langOf = (url) => (url === "/be" || url.startsWith("/be/") ? "be" : "ru");
const idCache = new Map();
const idsOf = (url) => {
  if (!idCache.has(url)) {
    const html = pages.get(url)?.html ?? "";
    idCache.set(url, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(url);
};
/** The expected start payload for a page URL, e.g. /be/guides/x/ -> web-guide-x-be */
const startFor = (url) => {
  const lang = langOf(url);
  let p = lang === "be" ? url.replace(/^\/be/, "") || "/" : url;
  let id;
  const g = p.match(/^\/guides\/([^/]+)\/$/);
  if (p === "/") id = "home";
  else if (g) id = `guide-${g[1]}`;
  else id = p.replace(/^\/|\/$/g, "");
  return `web-${id}${lang === "be" ? "-be" : ""}`;
};

for (const [url, { file, root }] of pages) {
  const where = rel(file);
  const is404 = url === "/404.html";
  const lang = langOf(url);

  // title, description, H1
  const title = root.querySelector("title")?.text.trim() ?? "";
  if (!title) fail(where, "no <title>");
  else if (len(title) > 60) fail(where, `title is ${len(title)} characters (max 60): "${title}"`);
  const desc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  if (!desc) fail(where, "no meta description");
  else if (len(desc) > 160) fail(where, `description is ${len(desc)} characters (max 160)`);
  const h1s = root.querySelectorAll("h1").length;
  if (h1s !== 1) fail(where, `${h1s} <h1> elements, expected exactly 1`);
  if (root.querySelector("html")?.getAttribute("lang") !== (is404 ? "ru" : lang)) fail(where, "<html lang> does not match the page language");

  // leftover tokens
  const text = root.querySelector("body")?.text ?? "";
  if (/\{\{|\}\}|@@/.test(text)) fail(where, "an unreplaced {{token}} is left in the page");

  // footer disclaimer
  const foot = root.querySelector("footer")?.text ?? "";
  for (const l of is404 ? LANGS : [lang]) {
    if (!foot.includes(DISCLAIMER[l])) fail(where, `footer lacks the disclaimer «${DISCLAIMER[l]}»`);
  }
  for (const a of ["@shukajbot", "@shukajnews", "https://github.com/shukaj"]) {
    const ok = a.startsWith("@")
      ? root.querySelector("footer")?.querySelector(`a[href="https://t.me/${a.slice(1)}"]`)
      : root.querySelector("footer")?.querySelector(`a[href="${a}"]`);
    if (!ok) fail(where, `footer lacks the link to ${a}`);
  }

  // no client JS; JSON-LD must parse
  const ldTypes = [];
  for (const s of root.querySelectorAll("script")) {
    if (s.getAttribute("type") !== "application/ld+json") {
      fail(where, "a <script> that is not JSON-LD (the site ships no client JS)");
      continue;
    }
    try {
      const j = JSON.parse(s.text);
      for (const item of j["@graph"] ?? [j]) ldTypes.push(item["@type"]);
    } catch {
      fail(where, "JSON-LD does not parse");
    }
  }
  for (const img of root.querySelectorAll("img")) if (img.getAttribute("alt") === undefined) fail(where, "<img> without alt");

  if (is404) {
    if (!root.querySelector('meta[name="robots"][content*="noindex"]')) fail(where, "404 page should be noindex");
    continue;
  }

  // canonical + hreflang, reciprocal
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (!canonical) fail(where, "no canonical");
  else if (canonical !== SITE + url) fail(where, `canonical is ${canonical}, expected ${SITE + url}`);
  const alt = {};
  for (const l of root.querySelectorAll('link[rel="alternate"][hreflang]')) alt[l.getAttribute("hreflang")] = l.getAttribute("href");
  for (const k of ["ru", "be", "x-default"]) if (!alt[k]) fail(where, `no hreflang="${k}"`);
  if (alt["x-default"] && alt.ru && alt["x-default"] !== alt.ru) fail(where, "hreflang x-default must point to the Russian page");
  for (const k of ["ru", "be"]) {
    if (!alt[k]) continue;
    if (!alt[k].startsWith(SITE)) { fail(where, `hreflang ${k} is not on ${SITE}`); continue; }
    const u = alt[k].slice(SITE.length);
    const other = pages.get(u);
    if (!other) fail(where, `hreflang ${k} -> ${u} does not exist (no language pair)`);
    else if (other.root.querySelector(`link[rel="alternate"][hreflang="${lang}"]`)?.getAttribute("href") !== SITE + url) {
      fail(where, `hreflang pair ${u} does not point back here`);
    }
  }
  if (alt[lang] && alt[lang] !== SITE + url) fail(where, `hreflang ${lang} is not this page`);

  // Open Graph / Twitter
  const meta = (sel) => root.querySelector(sel)?.getAttribute("content");
  for (const p of ["og:title", "og:description", "og:image", "og:url", "og:type"]) if (!meta(`meta[property="${p}"]`)) fail(where, `no ${p}`);
  for (const n of ["twitter:card", "twitter:title", "twitter:image"]) if (!meta(`meta[name="${n}"]`)) fail(where, `no ${n}`);
  const og = meta('meta[property="og:image"]');
  if (og && !(og.startsWith(SITE) && exists(og.slice(SITE.length)))) fail(where, `og:image ${og} does not exist in dist`);

  // structured data present where the contract says
  const need = (type) => { if (!ldTypes.includes(type)) fail(where, `no ${type} structured data`); };
  if (url === "/" || url === "/be/") { need("WebSite"); need("Organization"); need("SoftwareApplication"); }
  else need("BreadcrumbList");
  if (/^\/(be\/)?tarify\/$/.test(url)) need("SoftwareApplication");
  if (root.querySelector(".faq")) need("FAQPage");
  else if (ldTypes.includes("FAQPage")) fail(where, "FAQPage structured data without a visible FAQ");
  if (/^\/(be\/)?guides\/[^/]+\/$/.test(url)) need("Article");

  // start links
  const starts = root.querySelectorAll("a").map((a) => a.getAttribute("href")).filter((h) => h?.startsWith(START_BASE));
  const expected = startFor(url);
  if (!starts.length) fail(where, "no «Открыть бота» start link");
  for (const h of starts) {
    const payload = h.slice(START_BASE.length);
    if (payload !== expected) fail(where, `start link payload "${payload}", expected "${expected}"`);
    if (!/^web-[a-z0-9-]{1,48}$/.test(payload) || payload.length > 64) fail(where, `start payload "${payload}" is not web-[a-z0-9-]{1,48}`);
  }

  // internal links and assets resolve; language stays
  const refs = [
    ...root.querySelectorAll("a[href]").map((e) => ({ tag: "a", v: e.getAttribute("href"), sw: e.getAttribute("hreflang") })),
    ...root.querySelectorAll("link[href]").map((e) => ({ tag: "link", v: e.getAttribute("href") })),
    ...root.querySelectorAll("img[src]").map((e) => ({ tag: "img", v: e.getAttribute("src") })),
  ];
  for (const { tag, v, sw } of refs) {
    let target = null;
    if (v.startsWith("/") && !v.startsWith("//")) target = v;
    else if (v.startsWith(SITE + "/") || v === SITE) target = v.slice(SITE.length) || "/";
    if (target === null) continue;
    const [p, hash] = target.split("#");
    const pathOnly = p.split("?")[0];
    const isFile = /\.[a-z0-9]+$/i.test(pathOnly);
    if (!isFile && !pathOnly.endsWith("/")) { fail(where, `link ${v} has no trailing slash`); continue; }
    if (!exists(pathOnly)) { fail(where, `broken link: ${v}`); continue; }
    if (hash && pages.has(pathOnly) && !idsOf(pathOnly).has(hash)) fail(where, `link ${v}: no #${hash} on the target page`);
    if (tag === "a" && !isFile && !sw && langOf(pathOnly) !== lang) fail(where, `link ${v} leaves the page's language`);
  }
}

// sitemap, robots, headers
const sitemapIndex = path.join(DIST, "sitemap-index.xml");
if (!fs.existsSync(sitemapIndex)) fail("dist/sitemap-index.xml", "missing");
else {
  const all = walk(DIST).filter((f) => /sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const url of pages.keys()) {
    if (url === "/404.html") {
      if (all.includes(`${SITE}/404`)) fail("dist/sitemap-0.xml", "the 404 page is in the sitemap");
      continue;
    }
    if (!all.includes(`<loc>${SITE}${url}</loc>`)) fail("dist/sitemap-0.xml", `${url} is not in the sitemap`);
  }
  if (!/hreflang="be"/.test(all) || !/hreflang="ru"/.test(all)) fail("dist/sitemap-0.xml", "no i18n alternates (xhtml:link ru/be)");
}
const robots = path.join(DIST, "robots.txt");
if (!fs.existsSync(robots) || !/^Sitemap: https:\/\/\S+sitemap-index\.xml$/m.test(fs.readFileSync(robots, "utf8"))) {
  fail("dist/robots.txt", "missing, or does not name the sitemap");
}
if (!fs.existsSync(path.join(DIST, "_headers"))) fail("dist/_headers", "missing");

// ---------------------------------------------------------------------- report

const files = [...problems.keys()].sort();
let total = 0;
for (const f of files) {
  console.log(`\n${f}`);
  for (const m of problems.get(f)) {
    console.log(`  - ${m}`);
    total++;
  }
}
console.log(
  `\ncheck: ${pages.size} built page(s), ${Object.values(sources.pages).reduce((n, o) => n + Object.keys(o).length, 0)} page source(s), ` +
    `${Object.values(sources.guides).reduce((n, o) => n + Object.keys(o).length, 0)} guide source(s): ${total} problem(s) in ${files.length} file(s)`,
);
process.exit(total ? 1 : 0);
