# Rabbanas — Quranic Supplications

> Built for the [Quran Foundation Hackathon](https://launch.provisioncapital.com/quran-hackathon) — helping Muslims maintain their connection with the Quran beyond Ramadan through beautiful, accessible technology.

Rabbanas is a web app for browsing, listening to, designing, and sharing all 40 Rabbana duas from the Quran. It makes these powerful supplications accessible in multiple languages, listenable with word-by-word highlights, and shareable as beautiful printable booklets or social media videos.

---

## What is a Rabbana Dua?

Rabbana (رَبَّنَا) means "Our Lord" in Arabic. The Quran contains 40 supplications that begin with this word — heartfelt prayers covering forgiveness, guidance, mercy, gratitude, patience, and more. This app brings all of them together in one beautifully designed place.

---

## Features

| Feature | Description |
|---|---|
| **Browse & Search** | All 40 Rabbana duas with Arabic text, transliteration, and translation |
| **Multi-language** | Translations in English, Urdu, and Bengali |
| **Listen** | Hear each dua recited by 5 world-renowned reciters |
| **Sing-Along** | Word-by-word Arabic & transliteration highlight synced to the recitation |
| **Print Designer** | Build a custom printable booklet with full design control |
| **Share as Image** | Export your designed booklet as a high-res PNG |
| **Sing-Along Video** | Generate an MP4 sing-along video of any dua for social media |
| **Persistent State** | Print cart and design settings survive page refresh |

---

## APIs Used

This project integrates the **Quran Foundation API** as required by the hackathon.

### Audio API
Each dua's recitation audio is streamed directly from the Quran Foundation CDN:

```
https://verses.quran.com/{reciterId}/mp3/{surah}{ayah}.mp3
```

Five reciters are available:
- Mishary Al Afasy (`Alafasy`)
- Abu Bakr Al Shatri (`Shatri`)
- Abdul Rahman Al Sudais (`Sudais`)
- Hani Ar Rifai (`Rifai`)
- Saood Al Shuraym (`Shuraym`)

### Content Data
The 40 Rabbana duas are sourced from the Quran Foundation dataset, stored locally in `src/data/rabbanas.ts` with:
- Arabic text with full diacritics (tashkeel)
- English transliteration
- Translations in English, Urdu, and Bengali
- Surah and ayah reference for each dua

---

## Hackathon Alignment

**Theme:** Helping Muslims maintain their spiritual connection with the Quran beyond Ramadan.

| Judging Criterion | How This App Addresses It |
|---|---|
| **Impact on Quran Engagement** | Makes 40 Rabbana duas accessible for daily dhikr, memorisation, and sharing — encouraging consistent spiritual practice |
| **Product Quality & UX** | Mobile-first responsive design, smooth audio controls, live preview designer, word-by-word sing-along |
| **Technical Execution** | React 19 + TypeScript, WebCodecs API for video generation, Zustand persist, html2canvas, mp4-muxer |
| **Innovation & Creativity** | Full print booklet designer + sing-along MP4 video generator — not just a reader |
| **Effective API Use** | Quran Foundation audio CDN integrated for 5 reciters with real-time word highlight sync |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Routing | React Router 7 |
| State | Zustand with `persist` middleware |
| Styling | Tailwind CSS |
| Audio | HTML5 Audio API + Quran Foundation CDN |
| Video | WebCodecs API + mp4-muxer |
| Image export | html2canvas |
| Image hosting | imgBB API (for Twitter/Pinterest share) |

---

## Running Locally

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/rabbanas-app.git
cd rabbanas-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables (optional)

Create a `.env` file in the project root:

```bash
VITE_IMGBB_API_KEY=your_imgbb_api_key_here
```

> This is only required for sharing images to Twitter/Pinterest via imgBB. The app runs fully without it — those buttons fall back to a local file download.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
  context/
    AppContext.tsx           # Zustand store — print cart + design settings (persisted)
    QuranContentContext.tsx  # Fetches dua data; provides audio via Quran Foundation CDN
  data/
    rabbanas.ts              # All 40 Rabbana duas (Arabic, transliteration, translations)
  pages/
    HomePage.tsx             # Browse + search + add to print cart
    DuaDetailPage.tsx        # Listen view — audio player, word highlight, share
    PrintDesignerPage.tsx    # Design view — live preview, export PNG, generate video
  components/
    SharePanel.tsx           # Shared share panel (Image tab + Sing-Along video tab)
```

---

## How to Use

### Browse duas
- Open the app — all 40 duas are shown in a grid
- Use the search bar to filter by topic, Arabic text, or translation
- Switch translation language with the **English / اردو / বাংলা** buttons

### Listen & Sing-Along
- Click **Listen** on any card
- Choose a reciter from the row of options
- Press **Play** — Arabic words highlight right-to-left in sync, transliteration highlights left-to-right
- Tap **Share → Sing-Along** to generate and download an MP4 video

### Design & Print
- Click **+ Add to Print** on one or more dua cards
- Click the floating **Design & Print** button
- Customise in the **Design** panel:
  - Font family, size, and weight
  - Accent and text colours
  - Border style (solid / dashed / dotted), width, and corner radius
  - Block spacing and background colour
  - Drag emoji overlays onto the live preview
- Click **Print** to open the browser print dialog (also exports as PDF)
- Click **Share → Image** to download a high-res 2× PNG
- Click **Share → Sing-Along** to generate a 1080×1080 MP4 video for any dua in your collection

---

## Deploying to Vercel

The `vercel.json` at the project root handles SPA client-side routing. To deploy:

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Add `VITE_IMGBB_API_KEY` in the Environment Variables section (optional)
4. Click **Deploy**

Vercel auto-detects Vite — no additional configuration needed.

---

## License

MIT
