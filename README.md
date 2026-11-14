<p align="center">
  <img src="assets/banner.jpg" alt="2 smanettoni" width="640">
</p>

<h1 align="center">2 smanettoni · free downloads</h1>

<p align="center">
  Technology explained in 1 minute: the guides, prompts and cheat sheets we promise in our reels.<br>
  <a href="https://2smanettoni.thatsabyte.com/"><b>Visit the site</b></a> ·
  <a href="https://www.instagram.com/2smanettoni/">Instagram @2smanettoni</a>
</p>

---

## What it is

A tiny static site hosted on **GitHub Pages** for the files we promise in our reels.

- **Home page:** every file shows a blurred cover (the blur is baked into the image, not a CSS filter). Clicking it opens a popup: *follow the instructions in the reel to get the link in your DMs.*
- **Private page:** each file also has its own page at `p/<id>/`, where `<id>` is a random 22-character string. That is the link we send in DMs: sharp preview of every page (rendered with [pdf.js](https://mozilla.github.io/pdf.js/)) and a big yellow **Download** button.
- No page links to `p/<id>/`, and those pages are `noindex`. It is a hard-to-guess link, not real access control: the repo is public on purpose.

Privacy-friendly analytics by [Plausible](https://plausible.io/), no cookies.

## Files

<table>
  <tr>
    <td align="center" width="50%">
      <img src="assets/blur/prompt-gta6.jpg" alt="" width="240"><br>
      <b>15 prompts to step into GTA VI</b><br>
      <sub>ChatGPT & Gemini prompts · 16 pages</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/blur/trucchi-gta6.jpg" alt="" width="240"><br>
      <b>GTA VI: the cheats going around</b><br>
      <sub>26 PlayStation & Xbox codes · not verified yet</sub>
    </td>
  </tr>
</table>

## Add a new file

1. Drop the PDF into `files/` (no spaces in the name, e.g. `2smanettoni-battery-tips.pdf`).
2. Add an entry to `files.json` (leave out `id`: the build creates it):
   ```json
   {
     "slug": "battery",
     "file": "2smanettoni-battery-tips.pdf",
     "kicker": "Guida gratuita",
     "title": "10 consigli per la batteria",
     "description": "One short sentence: shown under the title and in the WhatsApp/Instagram link preview.",
     "date": "2026-11-20"
   }
   ```
3. Build:
   ```bash
   node build.mjs
   ```
   It moves the PDF to `p/<id>/`, renders the blurred cover and prints the links to send in DMs.
4. Commit and push.

To update a PDF, drop the new version into `files/` with the same name and build again: the link stays the same. To revoke a link, delete the file's `id` from `files.json` and build: a new link is created and the old one stops working.

> `build.mjs` needs **macOS** (`qlmanage`, `sips` and `swift` for covers and blurred previews) and Node 18+. No npm dependencies.

## How it works

```
files.json            list of files (title, description, slug, date, id)
files/                drop zone for new PDFs (emptied by the build)
p/<id>/               private page, sharp cover and the PDF
assets/blur/          blurred covers for the home page
build.mjs             generates every page
render.swift          renders a PDF page at low resolution and blurs it (CoreImage)
assets/viewer.js      pdf.js preview (lazy, page by page) and download events
assets/home.js        "locked content" popup
```

- On the private page the first page is a static JPEG, so the preview shows up instantly; pdf.js draws the others as you scroll (up to 30).
- CSS and JS links carry a content hash (`?v=…`), so updates skip the GitHub Pages cache.
- Plausible gets two custom events: `Download` and `Contenuto bloccato` (popup opened), both with the file name.

## Run locally

```bash
python3 -m http.server 8787
```

Then open <http://localhost:8787>.

## Deploy

**Settings → Pages → Deploy from a branch → `main` / `(root)`.** Every push goes live in about a minute.

Custom domain: **2smanettoni.thatsabyte.com** (set in Settings → Pages, saved in the `CNAME` file). The build uses it for links and link previews (`site.baseUrl` in `files.json`).

---

<p align="center">
  <img src="assets/logo.png" alt="" width="72"><br>
  <sub>Made by Giuseppe & Gabriele · engineers by day, tinkerers by night</sub>
</p>
