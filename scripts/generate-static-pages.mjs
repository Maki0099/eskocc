// Post-build: generuje statické HTML soubory pro klíčové routy.
// Googlebot indexuje SPA pomalu, protože initial HTML je prázdné. Tento skript
// vytvoří dist/<route>/index.html s route-specific <title>, meta description
// a viditelným SEO obsahem uvnitř #root. Po hydrataci React obsah přepíše,
// ale crawler vidí plnohodnotné HTML.
//
// Apache SPA fallback (public/.htaccess) preferuje existující soubory
// (RewriteCond -f/-d), takže statické stránky se servírují přímo se
// statusem 200. Dynamické routy (/member/:id, /event/:id) padají zpět
// na /index.html.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const DIST = resolve("dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");

if (!existsSync(TEMPLATE_PATH)) {
  console.error(`[static-pages] dist/index.html neexistuje – přeskakuji.`);
  process.exit(0);
}

const template = readFileSync(TEMPLATE_PATH, "utf8");

/** @type {{ path: string; title: string; description: string; h1: string; body: string }[]} */
const pages = [
  {
    path: "/events",
    title: "Klubové vyjížďky | ESKO.cc Karolinka",
    description:
      "Kalendář nadcházejících klubových vyjížděk ESKO.cc v Beskydech. Silniční kolo, gravel i MTB. Přidej se k naší komunitě z Karolinky.",
    h1: "Klubové vyjížďky ESKO.cc",
    body: `Prohlédni si nadcházející společné vyjížďky cyklistického klubu ESKO.cc z Karolinky.
    U každé akce najdeš plánovanou trasu s GPX souborem, převýšení, obtížnost, start a účastníky.
    Klub jezdí pravidelně silniční, gravel i MTB výjezdy po Beskydech, Javorníkách a Vsetínských vrších.`,
  },
  {
    path: "/pruvodce-beskydy",
    title: "Průvodce Beskydy pro cyklisty | ESKO.cc",
    description:
      "Podrobný průvodce cyklistickými trasami v Beskydech – silniční okruhy, gravel, MTB. Doporučené výjezdy z Karolinky, Velkých Karlovic i Rožnova.",
    h1: "Cyklistický průvodce Beskydy",
    body: `Kompletní průvodce cyklistickými trasami v Beskydech od místního klubu ESKO.cc.
    Najdeš tu doporučené silniční okruhy (Karolinka – Soláň – Velké Karlovice, Bumbálka),
    gravelové trasy Javorníky, MTB výjezdy na Lysou horu i Pustevny, tipy na občerstvení,
    přehled převýšení a GPX ke stažení. Ideální podklad pro plánování víkendu v horách.`,
  },
  {
    path: "/about",
    title: "O klubu ESKO.cc | Cyklistika Karolinka, Beskydy",
    description:
      "Kdo jsme, jak klub ESKO.cc vznikl a co děláme. Cyklistický klub z Karolinky sdružuje nadšence silniční, gravel i horské cyklistiky v Beskydech.",
    h1: "O klubu ESKO.cc",
    body: `ESKO.cc je cyklistický klub sídlící v Karolince v srdci Beskyd.
    Sdružujeme nadšence silniční cyklistiky, gravelu i horské cyklistiky napříč generacemi.
    Pořádáme společné vyjížďky, závody, tréninky pro mládež i společenské akce v klubovně.`,
  },
  {
    path: "/cafe",
    title: "Klubovna & Café | ESKO.cc Karolinka",
    description:
      "Klubovna a kavárna ESKO.cc v Karolince – místo, kde se scházejí cyklisté z Beskyd. Kolostyl, káva, gril, servis, GPX plány.",
    h1: "Klubovna a Café ESKO.cc",
    body: `Klubovna ESKO.cc v Karolince je zázemím klubu i otevřenou kavárnou pro cyklisty.
    Nabízíme kvalitní kávu, drobné občerstvení, prostor pro plánování tras a společné startovní místo
    pro klubové výjezdy do Beskyd.`,
  },
  {
    path: "/gallery",
    title: "Galerie | ESKO.cc Karolinka",
    description:
      "Fotografie z klubových vyjížděk, závodů a akcí cyklistického klubu ESKO.cc z Karolinky v Beskydech.",
    h1: "Galerie klubu ESKO.cc",
    body: `Prohlédni si fotografie z klubových vyjížděk, tréninků, závodů a společenských akcí ESKO.cc.
    Beskydy z pohledu cyklistů – silniční okruhy, gravel, MTB, dětské závody i klubovna.`,
  },
  {
    path: "/statistiky",
    title: "Statistiky členů | ESKO.cc",
    description:
      "Přehled najetých kilometrů členů klubu ESKO.cc a plnění ročních cyklistických výzev. Data ze Stravy.",
    h1: "Klubové statistiky ESKO.cc",
    body: `Statistiky členů cyklistického klubu ESKO.cc – najeté kilometry, převýšení a plnění ročních výzev.
    Data se synchronizují ze Stravy a aktualizují se denně.`,
  },
  {
    path: "/install",
    title: "Instalace aplikace | ESKO.cc",
    description:
      "Nainstaluj si mobilní aplikaci ESKO.cc a měj klubové vyjížďky, statistiky a mapy vždy po ruce.",
    h1: "Nainstaluj si aplikaci ESKO.cc",
    body: `ESKO.cc funguje jako Progressive Web App – nainstaluješ ji jedním klikem z prohlížeče
    a máš okamžitý přístup k trasám, vyjížďkám, statistikám a notifikacím i offline.`,
  },
  {
    path: "/dokumenty",
    title: "Dokumenty klubu | ESKO.cc",
    description:
      "Stanovy, zakládací listina a další oficiální dokumenty cyklistického klubu ESKO.cc Karolinka.",
    h1: "Dokumenty klubu ESKO.cc",
    body: `Zde najdeš oficiální dokumenty klubu ESKO.cc – zakládací listinu, stanovy, členské podmínky
    a další institucionální materiály ke stažení.`,
  },
  {
    path: "/login",
    title: "Přihlášení | ESKO.cc",
    description:
      "Přihlaš se do svého účtu člena klubu ESKO.cc a získej přístup k vyjížďkám, statistikám a galerii.",
    h1: "Přihlášení do ESKO.cc",
    body: `Přihlaš se ke svému účtu člena klubu ESKO.cc.`,
  },
  {
    path: "/register",
    title: "Registrace člena | ESKO.cc",
    description:
      "Staň se členem cyklistického klubu ESKO.cc Karolinka. Registrace zabere pár minut.",
    h1: "Registrace do klubu ESKO.cc",
    body: `Vyplň krátkou registraci a staň se členem klubu ESKO.cc. Získáš přístup k vyjížďkám,
    statistikám, galerii a interním sekcím.`,
  },
];

function renderPage(page) {
  let html = template;

  // <title>
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${page.title}</title>`,
  );

  // <meta name="description">
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
  );

  // og:title / twitter:title
  html = html.replace(
    /<meta\s+property=["']og:title["'][^>]*>/gi,
    `<meta property="og:title" content="${escapeAttr(page.title)}">`,
  );
  html = html.replace(
    /<meta\s+name=["']twitter:title["'][^>]*>/gi,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}">`,
  );

  // og:description / twitter:description
  html = html.replace(
    /<meta\s+property=["']og:description["'][^>]*>/gi,
    `<meta property="og:description" content="${escapeAttr(page.description)}">`,
  );
  html = html.replace(
    /<meta\s+name=["']twitter:description["'][^>]*>/gi,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}">`,
  );

  // og:url – nastavíme na absolutní URL routy
  const url = `https://www.eskocc.cz${page.path}`;
  html = html.replace(
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${url}" />`,
  );

  // canonical link
  if (/rel=["']canonical["']/i.test(html)) {
    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${url}" />`,
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${url}" />\n  </head>`,
    );
  }

  // SEO obsah uvnitř #root – Googlebot ho uvidí v initial HTML.
  // React při hydrataci obsah přepíše (createRoot nahrazuje children).
  const seoContent = `
      <noscript>
        <style>.seo-fallback { display: block !important; }</style>
      </noscript>
      <div class="seo-fallback" style="position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;">
        <h1>${escapeHtml(page.h1)}</h1>
        <p>${escapeHtml(page.body).replace(/\s+/g, " ").trim()}</p>
      </div>`;

  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${seoContent}</div>`,
  );

  return html;
}

function escapeAttr(s) {
  return s.replace(/"/g, "&quot;");
}
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let written = 0;
for (const page of pages) {
  const outPath = resolve(DIST, page.path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderPage(page), "utf8");
  written++;
  console.log(`[static-pages] ${page.path} → ${outPath}`);
}

console.log(`[static-pages] Hotovo: ${written} statických stránek.`);
