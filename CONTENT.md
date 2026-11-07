# Content contract

How the site's words are stored, so templates and copy can be written apart. The spec behind it is `.scratch/website/spec.md` in the bot's repo (private). Terms: a **Saved Search** («поиск» / «пошук»), an **Ad** («объявление» / «аб'ява»), a **Plan** (Free, Pro, Ultra), a **Bump** («поднятие» / «паднятая»), a **Price Drop** («цена снижена» / «цана зніжана»).

## Where things live

- `src/data/plans.json`: every Plan number. Nothing else on the site types them.
- `src/content/pages/<lang>/<id>.md`: the pages. `<lang>` is `ru` or `be`.
- `src/content/guides/<lang>/<slug>.md`: the guides.
- A page or guide exists in both languages under the same file name; the build fails otherwise.

## URLs

| File | Russian URL | Belarusian URL |
|---|---|---|
| `pages/*/home.md` | `/` | `/be/` |
| `pages/*/<id>.md` | `/<id>/` | `/be/<id>/` |
| `guides/*/<slug>.md` | `/guides/<slug>/` | `/be/guides/<slug>/` |

Page ids: `home`, `kvartiry`, `avto`, `telefony`, `ssylka`, `faq`, `tarify`. `/guides/` itself is a list page built from the guides (its title and intro live in `pages/*/guides.md`).

## Frontmatter

Pages:

```yaml
id: kvartiry                 # page id; the start link is web-<id>, web-<id>-be on Belarusian pages
title: "…"                   # <title>, at most 60 characters
description: "…"             # meta description, at most 160 characters
h1: "…"                      # the one H1
crumb: "Квартиры"            # breadcrumb label; omitted on home
related: [avto, "guide:pervym-na-kvartiru"]   # links shown under the page: page ids, or guide:<slug>
faq:                         # optional; rendered as a list and as FAQPage structured data
  - q: "…"
    a: "…"                   # Markdown, tokens allowed
```

Guides add `published: 2026-11-08` and, when the guide is a list of steps, `steps:` (`- name: … / text: …`) for HowTo structured data. The guide's body still writes the steps out in Markdown; `steps` is only the structured copy.

The home page adds a `hero:` block for the first screen (the yellow «Маркер» screen with Ads arriving, `.scratch/website/prototypes/d-marker-feed.html` in the bot's repo):

```yaml
hero:
  search: "велосипед · Гродно · до 400 р."
  saved: "Сохранено. Слежу."
  sub: "…"
  note: "…"                  # the small line under the button
  ads:                       # newest first; kind: new | drop | bump | plain
    - { kind: new,  title: "…", price: "390 р.", was: "", meta: "…", tag: "…" }
```

## Body

Markdown. `##` headings only (the H1 comes from the frontmatter). Links between pages are root-relative and in the page's own language: `/avto/` on Russian pages, `/be/avto/` on Belarusian ones.

Tokens, replaced at build time:

- `{{plans}}`: the Plans table (Free, Pro, Ultra: how often, how many at once, how many kept, the price), in the page's language.
- `{{cta}}`: the «Открыть бота» / «Адкрыць бота» button, with this page's start link.
- `{{<path>}}`: a value from `plans.json`, e.g. `{{pro.stars}}`, `{{free.everyMinutes}}`, `{{prolong.graceHours}}`, `{{quietHours.start}}`. `{{ultra.kept}}` is `null` and renders as «сколько угодно» / «колькі заўгодна», as the bot says. `{{<plan>.perHour}}` is 60 / everyMinutes.

The build fails on an unknown token, and on a Stars amount or a check interval typed as a number in `src/content/` instead of a token (for example «300 звёзд», «650 ⭐», «раз в 5 минут», «кожныя 30 хвілін»).

## Words

- «ты». The bot speaks as «я» in examples and in the hero; the pages describe it in the third person («бот») or as «я», but one page keeps one voice.
- «Kufar» in titles, H1s and headings; «Куфар» («на Куфаре» / «на Куфары») where a person would write it in running text, once or twice a page.
- «Парсер» only in its FAQ entry.
- No exclamation marks except in «Шукай!». No em dash as a clause connector (grammar dashes only). No emoji in body text.
- Every page's footer says «Шукай не является официальным сервисом Kufar» / «Шукай не з'яўляецца афіцыйным сэрвісам Kufar».
- Belarusian follows the bot's `be.ftl`: аб'ява, пошук, захаваць, катэгорыя, рэгіён, цана, прадавец, падняў, ціхія гадзіны.
