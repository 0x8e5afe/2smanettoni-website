#!/usr/bin/env node
// Genera il sito statico da files.json.
// Uso: node build.mjs   (serve macOS: qlmanage, sips e swift per copertine e anteprime sfocate)
//
// - Home: copertine già sfocate nei pixel; cliccandole compare il popup "segui le istruzioni nel reel".
// - Ogni file ha una pagina "segreta" p/<id>/ (id casuale) con anteprima nitida e tasto Scarica:
//   è il link da mandare in DM. Nessuna pagina pubblica collega p/<id>/ o il PDF.
// - Un PDF nuovo si mette in files/ (cartella d'arrivo): la build lo sposta in p/<id>/.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync, readdirSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = dirname(fileURLToPath(import.meta.url));
const configPath = join(root, "files.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const { site, files } = config;
const base = site.baseUrl.endsWith("/") ? site.baseUrl : site.baseUrl + "/";
const ver = (f) => createHash("sha1").update(readFileSync(join(root, "assets", f))).digest("hex").slice(0, 8);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mb = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const pagine = (n) => (n ? `${n} ${n === 1 ? "pagina" : "pagine"}` : null);
const dataIt = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
const newer = (a, b) => !existsSync(b) || statSync(a).mtimeMs > statSync(b).mtimeMs;

// id da 22 caratteri (128 bit): impossibile da indovinare
let idsAdded = false;
for (const f of files) {
  if (!f.id) {
    f.id = randomBytes(16).toString("base64url");
    idsAdded = true;
  }
}
if (idsAdded) writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// Prima pagina nitida → JPEG (anteprima immediata e immagine del link nei DM).
function makeCover(pdf, outJpg) {
  const tmp = join(tmpdir(), "sito-cover-" + process.pid);
  mkdirSync(tmp, { recursive: true });
  execFileSync("qlmanage", ["-t", "-s", "1400", "-o", tmp, pdf], { stdio: "ignore" });
  const png = readdirSync(tmp).find((f) => f.endsWith(".png"));
  if (!png) throw new Error("qlmanage non ha generato la copertina di " + pdf);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", join(tmp, png), "--out", outJpg], { stdio: "ignore" });
  rmSync(tmp, { recursive: true, force: true });
}

// Prima pagina sfocata nei pixel (render.swift) → copertina pubblica della home. Restituisce il numero di pagine.
function makeBlur(pdf, outJpg) {
  const tmp = join(tmpdir(), "sito-blur-" + process.pid);
  rmSync(tmp, { recursive: true, force: true });
  const out = execFileSync("swift", [join(root, "render.swift"), pdf, tmp, "1"], { encoding: "utf8" });
  renameSync(join(tmp, "1.jpg"), outJpg);
  rmSync(tmp, { recursive: true, force: true });
  return parseInt(out.trim(), 10) || null;
}

const icons = {
  underline: `<svg class="scribble" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 15 C 70 6, 160 4, 296 10" /><path d="M60 20 C 120 15, 190 14, 250 17" /></svg>`,
  ig: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="dot"/></svg>`,
  dl: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2" class="dot"/></svg>`,
  reel: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8.5h18"/><path d="M8 3l3 5.5"/><path d="M13.5 3l3 5.5"/><path d="M10.5 12.2v5l4.3-2.5z" class="dot"/></svg>`,
};

function head({ title, description, url, image, prefix, noindex }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? `<meta name="robots" content="noindex, nofollow">\n` : ""}<meta name="theme-color" content="#FCF6F1">
<link rel="icon" href="${prefix}assets/favicon.png">
<link rel="apple-touch-icon" href="${prefix}assets/favicon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}assets/style.css?v=${ver("style.css")}">
<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://stats.byreference.net/js/pa-OYn9YDxo6S1acWB1VPNhb.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
</head>`;
}

const topbar = (prefix) => `<header class="topbar">
  <a class="brand" href="${prefix}">
    <img src="${prefix}assets/logo.png" alt="" width="52" height="52">
    <span>${esc(site.name)}</span>
  </a>
  <a class="ig" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">${icons.ig}<span>@${esc(site.instagram)}</span></a>
</header>`;

const footer = (prefix) => `<footer class="footer">
  <img src="${prefix}assets/logo.png" alt="" width="64" height="64">
  <p><strong>${esc(site.name)}</strong> · ${esc(site.tagline)}</p>
  <a class="ig" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">${icons.ig}<span>Seguici su Instagram</span></a>
</footer>`;

mkdirSync(join(root, "assets/blur"), { recursive: true });
mkdirSync(join(root, "files"), { recursive: true });

const items = files.map((f) => {
  const dir = join(root, "p", f.id);
  mkdirSync(dir, { recursive: true });
  const pdf = join(dir, f.file);
  const arrivo = join(root, "files", f.file);
  if (existsSync(arrivo)) renameSync(arrivo, pdf); // PDF nuovo o aggiornato
  if (!existsSync(pdf)) {
    // id cambiato (link revocato): recupera il PDF dalla cartella vecchia
    const old = readdirSync(join(root, "p"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== f.id)
      .map((d) => join(root, "p", d.name, f.file))
      .find((x) => existsSync(x));
    if (old) renameSync(old, pdf);
  }
  if (!existsSync(pdf)) throw new Error(`Manca il PDF: metti ${f.file} in files/ e rilancia`);

  const cover = join(dir, "cover.jpg");
  if (newer(pdf, cover)) makeCover(pdf, cover);
  const blur = join(root, "assets/blur", f.slug + ".jpg");
  let pages = f.pages ?? null;
  if (newer(pdf, blur) || !pages) pages = makeBlur(pdf, blur) ?? pages;
  f.pages = pages;
  return { ...f, size: statSync(pdf).size, pages };
});
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// Elimina le cartelle p/<id>/ di file tolti da files.json
for (const d of readdirSync(join(root, "p"), { withFileTypes: true })) {
  if (d.isDirectory() && !items.some((f) => f.id === d.name)) rmSync(join(root, "p", d.name), { recursive: true, force: true });
}
// p/ da sola rimanda alla home (niente elenco delle cartelle)
writeFileSync(
  join(root, "p", "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=../"><title>${esc(site.name)}</title><a href="../">${esc(site.name)}</a>\n`
);
for (const b of readdirSync(join(root, "assets/blur"))) {
  if (!items.some((f) => f.slug + ".jpg" === b)) rmSync(join(root, "assets/blur", b));
}

// Pagina con anteprima e download: p/<id>/
for (const f of items) {
  const url = base + "p/" + f.id + "/";
  const p = "../../";
  const meta = ["PDF", pagine(f.pages), mb(f.size)].filter(Boolean).join(" · ");
  const html = `${head({ title: `${f.title} · ${site.name}`, description: f.description, url, image: url + "cover.jpg", prefix: p, noindex: true })}
<body class="file-page" data-slug="${esc(f.slug)}" data-id="${esc(f.id)}">
${topbar(p)}
<main class="file">
  <section class="info">
    <p class="kicker">${esc(f.kicker)}</p>
    <h1>${esc(f.title)}${icons.underline}</h1>
    <p class="desc">${esc(f.description)}</p>
    <p class="meta">${esc(meta)}</p>
    <div class="actions">
      <a class="btn btn-main" href="${esc(f.file)}" download>${icons.dl}<span>Scarica il PDF</span></a>
    </div>
    <p class="note">Pubblicato il ${esc(dataIt(f.date))}. Questo link è riservato a te: grazie per seguirci!</p>
  </section>
  <section class="preview" aria-label="Anteprima del PDF">
    <div class="pages" data-pdf="${esc(f.file)}">
      <figure class="page"><img src="cover.jpg" alt="Prima pagina di ${esc(f.title)}"></figure>
    </div>
  </section>
</main>
<div class="sticky-dl"><a class="btn btn-main" href="${esc(f.file)}" download>${icons.dl}<span>Scarica il PDF</span></a></div>
${footer(p)}
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="${p}assets/viewer.js?v=${ver("viewer.js")}"></script>
</body>
</html>
`;
  writeFileSync(join(root, "p", f.id, "index.html"), html);
}

// Home: solo copertine sfocate, nessun link alle pagine p/<id>/
const cards = [...items]
  .sort((a, b) => b.date.localeCompare(a.date))
  .map(
    (f) => `    <button class="card" type="button" data-locked="${esc(f.title)}" data-slug="${esc(f.slug)}">
      <span class="thumb"><img src="assets/blur/${esc(f.slug)}.jpg" alt="" loading="lazy"><span class="lock">${icons.lock}</span></span>
      <span class="card-body">
        <span class="kicker">${esc(f.kicker)}</span>
        <span class="card-title">${esc(f.title)}</span>
        <span class="meta">PDF${f.pages ? ` · ${pagine(f.pages)}` : ""}</span>
        <span class="card-cta">${icons.lock}<span>Contenuto riservato</span></span>
        <span class="card-cta card-open">${icons.dl}<span>Apri e scarica</span></span>
      </span>
    </button>`
  )
  .join("\n");

writeFileSync(
  join(root, "index.html"),
  `${head({ title: `${site.name} · ${site.tagline}`, description: "Guide e file gratuiti dei reel di @" + site.instagram + ": la tecnologia spiegata in 1 minuto.", url: base, image: base + "assets/banner.jpg", prefix: "" })}
<body class="home">
${topbar("")}
<main>
  <section class="hero">
    <img class="banner" src="assets/banner.jpg" alt="I due smanettoni al lavoro su un PC aperto" width="1672" height="941">
    <h1>I file dei nostri reel${icons.underline}</h1>
    <p class="lead">Guide, prompt e trucchi che promettiamo nei video. Per riceverli segui le istruzioni nel reel dedicato: ti mandiamo il link in DM.</p>
  </section>
  <section class="list" aria-label="Contenuti">
${cards}
  </section>
</main>
${footer("")}
<dialog class="modal" aria-labelledby="modal-title">
  <span class="modal-icon">${icons.reel}</span>
  <p class="kicker modal-file"></p>
  <h2 id="modal-title">Contenuto riservato</h2>
  <p>Per vedere e scaricare questo contenuto segui le istruzioni nel reel dedicato: ti mandiamo il link in DM.</p>
  <div class="modal-actions">
    <a class="btn btn-main" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">${icons.ig}<span>Vai ai nostri reel</span></a>
    <button class="btn btn-ghost" type="button" data-close>Ho capito</button>
  </div>
</dialog>
<script src="assets/home.js?v=${ver("home.js")}"></script>
</body>
</html>
`
);

console.log("✓ Link da mandare in DM:");
for (const f of items) console.log(`  ${f.title}\n  ${base}p/${f.id}/\n`);
