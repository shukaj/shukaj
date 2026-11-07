import plans from "../data/plans.json";
import { pluralIndex, PLAN_IDS, NULL_PHRASE } from "./tokens.mjs";
import { plainText, startUrl, type Doc, type Site, type Link } from "./content";
import { ui, SITE, BOT, CHANNEL, GITHUB, ogImage, pagePath } from "./ui";

export function crumbs(site: Site, doc: Doc): Link[] {
  const t = ui[doc.lang];
  if (doc.kind === "page" && doc.key === "home") return [];
  const list: Link[] = [{ href: pagePath(doc.lang, "home"), label: t.home }];
  if (doc.kind === "guide") {
    const index = site.pages[doc.lang].get("guides");
    list.push({ href: pagePath(doc.lang, "guides"), label: index?.crumb ?? t.guides });
  }
  list.push({ href: doc.path, label: doc.crumb });
  return list;
}

const abs = (path: string) => `${SITE}${path}`;
const ORG_ID = `${SITE}/#organization`;

function organization(doc: Doc) {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Шукай",
    url: abs(pagePath(doc.lang, "home")),
    logo: abs("/logo-night-192.jpg"),
    sameAs: [BOT, CHANNEL, GITHUB],
  };
}

function softwareApplication(doc: Doc) {
  const t = ui[doc.lang];
  const plural = (n: number, forms: [string, string, string]) => forms[pluralIndex(n)];
  const offers = PLAN_IDS.map((id) => {
    const plan = plans[id as "free" | "pro" | "ultra"];
    const name = id[0].toUpperCase() + id.slice(1);
    const kept = plan.kept === null ? NULL_PHRASE[doc.lang] : String(plan.kept);
    const facts = `${t.table.how}: ${t.every(plan.everyMinutes)}; ${t.table.active}: ${plan.active}; ${t.table.kept}: ${kept}`;
    if (plan.stars === 0) {
      return { "@type": "Offer", name, price: 0, url: BOT, description: `${t.free[0].toUpperCase()}${t.free.slice(1)}. ${facts}` };
    }
    const price = `${plan.stars} ${plural(plan.stars, t.stars)} ${t.perPeriod(`${plans.periodDays} ${plural(plans.periodDays, t.days)}`)}`;
    return { "@type": "Offer", name, url: BOT, description: `${price}. ${facts}` };
  });
  return {
    "@type": "SoftwareApplication",
    name: "Шукай",
    description: doc.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Telegram",
    inLanguage: doc.lang,
    url: abs(doc.path),
    offers,
  };
}

/** Structured data blocks for one page, each an independent JSON-LD object. */
export function jsonLd(site: Site, doc: Doc): object[] {
  const out: object[] = [];
  const ctx = { "@context": "https://schema.org" };
  const url = abs(doc.path);

  if (doc.kind === "page" && doc.key === "home") {
    out.push({
      ...ctx,
      "@type": "WebSite",
      name: "Шукай",
      url,
      inLanguage: doc.lang,
      publisher: { "@id": ORG_ID },
    });
    out.push({ ...ctx, ...organization(doc) });
  }
  if (doc.kind === "page" && (doc.key === "home" || doc.key === "tarify")) {
    out.push({ ...ctx, ...softwareApplication(doc) });
  }
  if (doc.faq.length) {
    out.push({
      ...ctx,
      "@type": "FAQPage",
      inLanguage: doc.lang,
      mainEntity: doc.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: plainText(f.aHtml) },
      })),
    });
  }
  const trail = crumbs(site, doc);
  if (trail.length) {
    out.push({
      ...ctx,
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: abs(c.href),
      })),
    });
  }
  if (doc.kind === "guide") {
    const date = doc.published!.toISOString().slice(0, 10);
    out.push({
      ...ctx,
      "@type": "Article",
      headline: doc.h1,
      description: doc.description,
      inLanguage: doc.lang,
      datePublished: date,
      dateModified: date,
      image: ogImage(doc.lang),
      mainEntityOfPage: url,
      author: { "@id": ORG_ID, "@type": "Organization", name: "Шукай", url: abs(pagePath(doc.lang, "home")) },
      publisher: { "@type": "Organization", "@id": ORG_ID, name: "Шукай", logo: { "@type": "ImageObject", url: abs("/logo-night-192.jpg") } },
    });
    if (doc.steps?.length) {
      out.push({
        ...ctx,
        "@type": "HowTo",
        name: doc.h1,
        description: doc.description,
        inLanguage: doc.lang,
        step: doc.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
      });
    }
  }
  return out;
}

export { startUrl };
