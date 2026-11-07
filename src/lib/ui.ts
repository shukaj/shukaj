// Interface strings that are not content: nav, labels, table headings.
export type Lang = "ru" | "be";
export const LANGS: Lang[] = ["ru", "be"];
export const SITE = "https://shukaj.pages.dev";
export const BOT = "https://t.me/shukajbot";
export const CHANNEL = "https://t.me/shukajnews";
export const GITHUB = "https://github.com/shukaj";

interface Ui {
  htmlLang: string;
  ogLocale: string;
  home: string;
  nav: { tarify: string; faq: string; guides: string };
  navLabel: string;
  open: string;
  related: string;
  faq: string;
  guides: string;
  published: string;
  months: string[];
  disclaimer: string;
  official: string;
  breadcrumbs: string;
  heroLabel: (search: string) => string;
  table: { plan: string; how: string; active: string; kept: string; price: string };
  every: (n: number) => string;
  free: string;
  stars: [string, string, string];
  days: [string, string, string];
  perPeriod: (days: string) => string;
  logoAlt: string;
  notFound: { title: string; text: string; home: string };
  ogAlt: string;
}

export const ui: Record<Lang, Ui> = {
  ru: {
    htmlLang: "ru",
    ogLocale: "ru_RU",
    home: "Главная",
    nav: { tarify: "Тарифы", faq: "Вопросы", guides: "Гайды" },
    navLabel: "Разделы",
    open: "Открыть бота",
    related: "Смотри также",
    faq: "Вопросы и ответы",
    guides: "Гайды",
    published: "Опубликовано",
    months: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    disclaimer: "Шукай не является официальным сервисом Kufar",
    official: "Официальные адреса",
    breadcrumbs: "Где ты",
    heroLabel: (s) => `Пример: поиск «${s}» и новые объявления по нему`,
    table: { plan: "План", how: "Как часто", active: "Активных сразу", kept: "Хранится поисков", price: "Цена" },
    every: (n) => `раз в ${n} мин`,
    free: "бесплатно",
    stars: ["звезда Telegram", "звезды Telegram", "звёзд Telegram"],
    days: ["день", "дня", "дней"],
    perPeriod: (d) => `за ${d}`,
    logoAlt: "Шукай!",
    notFound: { title: "Страница не найдена", text: "Такой страницы нет. Вот начало сайта:", home: "На главную" },
    ogAlt: "Шукай: бот для новых объявлений Kufar в Telegram",
  },
  be: {
    htmlLang: "be",
    ogLocale: "be_BY",
    home: "Галоўная",
    nav: { tarify: "Тарыфы", faq: "Пытанні", guides: "Гайды" },
    navLabel: "Раздзелы",
    open: "Адкрыць бота",
    related: "Глядзі таксама",
    faq: "Пытанні і адказы",
    guides: "Гайды",
    published: "Апублікавана",
    months: ["студзеня", "лютага", "сакавіка", "красавіка", "мая", "чэрвеня", "ліпеня", "жніўня", "верасня", "кастрычніка", "лістапада", "снежня"],
    disclaimer: "Шукай не з'яўляецца афіцыйным сэрвісам Kufar",
    official: "Афіцыйныя адрасы",
    breadcrumbs: "Дзе ты",
    heroLabel: (s) => `Прыклад: пошук «${s}» і новыя аб'явы па ім`,
    table: { plan: "План", how: "Як часта", active: "Актыўных адразу", kept: "Захоўваецца пошукаў", price: "Цана" },
    every: (n) => `раз на ${n} хв`,
    free: "бясплатна",
    stars: ["зорка Telegram", "зоркі Telegram", "зорак Telegram"],
    days: ["дзень", "дні", "дзён"],
    perPeriod: (d) => `за ${d}`,
    logoAlt: "Шукай!",
    notFound: { title: "Старонка не знойдзена", text: "Такой старонкі няма. Вось пачатак сайта:", home: "На галоўную" },
    ogAlt: "Шукай: бот для новых аб'яў Kufar у Telegram",
  },
};

export const other = (lang: Lang): Lang => (lang === "ru" ? "be" : "ru");
export const prefix = (lang: Lang) => (lang === "be" ? "/be" : "");
export const pagePath = (lang: Lang, id: string) => (id === "home" ? `${prefix(lang)}/` : `${prefix(lang)}/${id}/`);
export const guidePath = (lang: Lang, slug: string) => `${prefix(lang)}/guides/${slug}/`;
export const ogImage = (lang: Lang) => `${SITE}/og/${lang}.png`;
