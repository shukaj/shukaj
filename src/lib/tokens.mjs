// Token rules shared by the build (src/lib/content.ts) and `npm run check`.
// A token is {{name}}: `plans` and `cta` are blocks, anything else is a path into plans.json.

export const PLAN_IDS = ["free", "pro", "ultra"];
export const BLOCK_TOKENS = ["plans", "cta"];
export const NULL_PHRASE = { ru: "сколько угодно", be: "колькі заўгодна" };

const TOKEN_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;
const NAME_RE = /^[A-Za-z][A-Za-z0-9_.]*$/;

/** All tokens in a text: [{ raw, name }] */
export function findTokens(text) {
  return [...text.matchAll(TOKEN_RE)].map((m) => ({ raw: m[0], name: m[1] }));
}

/** Value of a plans.json path for a language. Throws on anything that is not a leaf. */
export function resolvePath(plans, name, lang) {
  if (!NAME_RE.test(name)) throw new Error(`Bad token {{${name}}}`);
  const parts = name.split(".");
  if (parts[0].startsWith("_")) throw new Error(`Unknown token {{${name}}}`);
  let node = plans;
  for (const part of parts) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      throw new Error(`Unknown token {{${name}}}`);
    }
    if (Object.hasOwn(node, part)) {
      node = node[part];
    } else if (
      part === "perHour" &&
      typeof node.everyMinutes === "number" &&
      PLAN_IDS.includes(parts[0]) &&
      parts.length === 2
    ) {
      const n = 60 / node.everyMinutes;
      return String(Number.isInteger(n) ? n : Math.round(n * 10) / 10);
    } else {
      throw new Error(`Unknown token {{${name}}}`);
    }
  }
  if (node === null) return NULL_PHRASE[lang];
  if (typeof node === "object") throw new Error(`Token {{${name}}} is not a single value`);
  return String(node);
}

/** Every valid token name, for checks. */
export function isKnownToken(plans, name) {
  if (BLOCK_TOKENS.includes(name)) return true;
  try {
    resolvePath(plans, name, "ru");
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace tokens in a text. `blocks` maps `plans` / `cta` to replacement strings;
 * without it a block token throws (plain-text fields cannot hold a table or a button).
 */
/** @param {string} text @param {{ plans: any, lang: string, blocks?: { plans: string, cta: string }, where?: string }} opts */
export function substitute(text, { plans, lang, blocks, where = "text" }) {
  return text.replace(TOKEN_RE, (_raw, name) => {
    try {
      if (BLOCK_TOKENS.includes(name)) {
        if (!blocks) throw new Error(`{{${name}}} is not allowed here`);
        return blocks[name];
      }
      return resolvePath(plans, name, lang);
    } catch (e) {
      throw new Error(`${e.message} in ${where}`);
    }
  });
}

/** ru/be plural form index: 0 one, 1 few, 2 many */
export function pluralIndex(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 0;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
  return 2;
}
