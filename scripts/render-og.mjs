// Renders public/og/<lang>-night.png (1200x630) through headless Chrome. Run again when a home h1 changes:
//   npm run og      (CHROME=<path to chrome.exe> to override)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;

const handle = { ru: "@shukajbot · @shukajnews", be: "@shukajbot · @shukajnews" };

fs.mkdirSync(path.join(ROOT, "public", "og"), { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shukaj-og-"));

for (const lang of ["ru", "be"]) {
  const raw = fs.readFileSync(path.join(ROOT, "src/content/pages", lang, "home.md"), "utf8");
  const fm = parseYaml(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;src:url("${url("public/fonts/unbounded.woff2")}");font-weight:700 800}
@font-face{font-family:"PT Serif";src:url("${url("public/fonts/pt-serif-italic.woff2")}");font-style:italic}
@font-face{font-family:"IBM Plex Mono";src:url("${url("public/fonts/plex-mono-500.woff2")}");font-weight:500}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#1E1B4B;color:#F7F5F0}
.c{position:relative;width:1200px;height:630px;padding:64px 72px;box-sizing:border-box}
.logo{position:absolute;right:72px;top:64px;width:200px;height:200px}
h1{color:#FFD43B;position:absolute;left:72px;top:220px;margin:0;width:1000px;font:800 64px/1.08 Unbounded,sans-serif;letter-spacing:-.02em}
.search{position:absolute;left:72px;top:64px;font:700 28px/1.2 Unbounded,sans-serif;letter-spacing:-.01em}
.search svg{display:block;width:100%;height:14px;margin-top:6px}
.saved{position:absolute;left:72px;top:150px;font:500 20px/1.4 "IBM Plex Mono",monospace}
.sub{position:absolute;left:72px;bottom:112px;font:italic 30px/1.3 "PT Serif",serif}
.foot{position:absolute;left:72px;bottom:64px;font:500 22px/1 "IBM Plex Mono",monospace}
</style></head><body><div class="c">
<img class="logo" src="${url("public/logo-night-192.jpg")}" alt="">
<div class="search">${esc(fm.hero.search)}<svg viewBox="0 0 600 14" preserveAspectRatio="none"><path d="M3 9 C 120 4, 260 12, 380 7 S 540 5, 597 8" fill="none" stroke="#FFD43B" stroke-width="3" stroke-linecap="round"/></svg></div>
<div class="saved">${esc(fm.hero.saved)}</div>
<h1>${esc(fm.h1)}</h1>
<div class="sub">${esc(fm.hero.note)}</div>
<div class="foot">${handle[lang]}</div>
</div></body></html>`;
  const file = path.join(tmp, `${lang}.html`);
  fs.writeFileSync(file, html);
  const out = path.join(ROOT, "public", "og", `${lang}-night.png`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", "--virtual-time-budget=5000", `--screenshot=${out}`, pathToFileURL(file).href,
  ], { stdio: "ignore" });
  console.log("wrote", path.relative(ROOT, out));
}
fs.rmSync(tmp, { recursive: true, force: true });
