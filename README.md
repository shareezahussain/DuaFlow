# DuaFlow — Quranic Supplications

> Built for the [Quran Foundation Hackathon](https://launch.provisioncapital.com/quran-hackathon) — helping Muslims maintain their connection with the Quran beyond Ramadan through beautiful, accessible technology.

DuaFlow is a web app for browsing, listening to, bookmarking, designing, and sharing all 40 Rabbana duas from the Quran. It makes these powerful supplications accessible in multiple languages, listenable with word-by-word highlights, and shareable as beautiful printable booklets or sing-along social media videos.

---

## What is a Rabbana Dua?

Rabbana (رَبَّنَا) means "Our Lord" in Arabic. The Quran contains 40 supplications that begin with this word — heartfelt prayers covering forgiveness, guidance, mercy, gratitude, patience, and more. DuaFlow brings all of them together in one beautifully designed place.

---

## Features

| Feature | Description |
|---|---|
| **Browse & Search** | All 40 Rabbana duas in a responsive grid with full-text search |
| **Theme Filters** | Filter duas by Peace, Forgiveness, Healing, Provision, or Repentance |
| **Multi-language** | Translations in English, Urdu, and Bengali |
| **Quick Preview** | Tap any card to preview the full dua in a modal |
| **Listen** | Hear each dua recited by 5 world-renowned reciters |
| **Karaoke Sing-Along** | Word-by-word Arabic and transliteration highlight synced to the audio |
| **Bookmarks** | Sign in with your Quran Foundation account to save duas — syncs across devices in real time |
| **Print Designer** | Build a fully customised printable booklet with live preview |
| **Share as Image** | Export a high-res PNG of any dua card |
| **Sing-Along Video** | Generate a portrait 9:16 MP4 karaoke video for social media |
| **Persistent State** | Print cart and design settings survive page refresh |

---

## Running Locally

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/duaflow.git
cd duaflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
# Quran Foundation OAuth — required for bookmark sign-in
VITE_QURAN_CLIENT_ID=your_client_id
VITE_QURAN_AUTH_BASE=https://oauth2.quran.foundation
VITE_QURAN_API_BASE=https://api.quranfoundation.org
VITE_REDIRECT_URI=http://localhost:5173/auth/callback

# imgBB — optional, only needed for Twitter/Pinterest image sharing
VITE_IMGBB_API_KEY=your_imgbb_api_key
```

> The app runs without the OAuth credentials — bookmarks and sign-in will be disabled but all other features work. imgBB is only needed for sharing to Twitter/Pinterest; download always works without it.

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

## How to Use

### Browsing Duas

- All 40 Rabbana duas are shown in a card grid on the home screen
- Use the **search bar** to filter by topic, Arabic text, or translation
- Click the **Filter** button next to the search bar to filter by theme (Peace, Forgiveness, Healing, Provision, Repentance) — select multiple to combine
- Switch the **translation language** using the English / اردو / বাংলা pills in the header
- Click any card to open a **quick preview modal** with the full text and language switcher

### Listening & Sing-Along

1. Click **▶ Listen** on any dua card to open the detail page
2. Choose a reciter from the row of options at the top of the audio player
3. Press **Play** — Arabic words highlight right-to-left in sync with the audio; transliteration highlights left-to-right simultaneously
4. Use **speed control** (0.5×–2×) to slow down or speed up the recitation
5. Toggle **Repeat** to loop the dua continuously

### Sharing a Dua

From the dua detail page, press the **Share** button to open the share panel:

**Image tab**
- Download a high-res PNG of the dua card
- Share directly to Twitter, Pinterest, or via the device share sheet (mobile)

**Video tab**
- Press **Generate Video** to encode a portrait 9:16 MP4 karaoke sing-along
- On desktop/Android — full animated karaoke with word-by-word highlights
- On iOS — a static card with audio (iOS Safari limitation)
- Once generated, share via download, Twitter, Pinterest, or the native share sheet

### Bookmarks

1. Click **🔖 Sign in** in the header to authenticate with your Quran Foundation account
2. Click the bookmark icon (🏷) on any dua card or detail page to save it
3. Saved duas appear in the **🔖 Saved Duas** panel (accessible from the header)
4. Bookmarks sync to the Quran Foundation API and stay in sync across devices and sessions — no manual refresh needed

### Design & Print

1. Click **+ Add to Print** on one or more dua cards to add them to your collection
2. Click the **🖨** counter button in the header or **Design & Print** from a detail page
3. On the **Design** tab, customise:
   - **Font** — family, size, and weight
   - **Colours** — accent, Arabic text, transliteration, and translation
   - **Border** — style (solid / dashed / dotted), width, radius, and colour
   - **Block accent** — left bar, top bar, full border, or none
   - **Spacing** — compact, normal, or spacious
   - **Bismillah** — toggle the opening invocation
   - **Emoji overlays** — pick emojis from topic suggestions, drag them anywhere on the preview
4. The **Live Preview** updates instantly as you design
5. To export:
   - **🖨 Print** — opens the browser print dialog (save as PDF from here)
   - **⬇ PDF** — opens the printable page in a new tab for saving as PDF
   - **Share → Image** — downloads a 2× high-res PNG of your design

---

## APIs Used

### Quran Foundation — Audio CDN
Recitation audio is streamed directly:
```
https://verses.quran.com/{reciterId}/mp3/{surah}{ayah}.mp3
```
Five reciters: Mishary Al Afasy, Abu Bakr Al Shatri, Abdul Rahman Al Sudais, Hani Ar Rifai, Saood Al Shuraym.

### Quran Foundation — Bookmarks API
Authenticated bookmark management via PKCE OAuth2:
- `GET /api/bookmarks` — fetch saved bookmarks
- `POST /api/bookmarks` — save a dua
- `DELETE /api/bookmarks/{id}` — remove a bookmark

### quran.com — Word Timestamps
Word-level timing data for karaoke highlight sync:
```
https://api.quran.com/api/v4/recitations/{id}/by_ayah/{surah}:{ayah}
```

### imgBB (optional)
Used to host images for Twitter and Pinterest share links. Falls back to local file download if not configured.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Routing | React Router 7 |
| State | Zustand with `persist` middleware |
| Styling | Tailwind CSS |
| Auth | PKCE OAuth2 (Quran Foundation) |
| Audio | HTML5 Audio API |
| Video (desktop/Android) | WebCodecs API + mp4-muxer |
| Video (iOS) | FFmpeg.wasm |
| Image export | html2canvas |
| Image hosting | imgBB API |

---

## Project Structure

```
src/
  context/
    AppContext.tsx              # Zustand store — auth, bookmarks, print cart, design
    QuranContentContext.tsx     # Fetches dua content; 24h localStorage cache
  data/
    rabbanas.ts                 # 40 Rabbana duas with metadata + category tags
  hooks/
    useBookmarkToggle.ts        # Reusable bookmark add/remove with optimistic updates
  pages/
    HomePage.tsx                # Browse, search, filter, bookmark
    DuaDetailPage.tsx           # Listen, sing-along, share image/video
    PrintDesignerPage.tsx       # Design, live preview, print, share
    AuthCallbackPage.tsx        # OAuth2 PKCE callback handler
  components/
    DuaCard.tsx                 # Grid card with bookmark toggle
    DuaPreviewModal.tsx         # Quick-preview modal
    BookmarksPanel.tsx          # Saved duas side panel
    SharePanel.tsx              # Shared image + video share UI
  workers/
    videoEncoder.worker.ts      # Off-main-thread MP4 encoding (WebCodecs)
  util/
    generateIOSVideo.ts         # iOS FFmpeg.wasm video path
    renderKaraokeFrame.ts       # Static karaoke frame for iOS
    constants.ts                # Shared LANG_LABELS, scale constants
  services/
    bookmarksApi.ts             # Quran Foundation OAuth + bookmark API
    quranApi.ts                 # Verse content + word timestamp fetching
api/
  token.js                      # Serverless — OAuth code exchange
  bookmarks.js                  # Serverless — bookmark proxy
  refresh-token.js              # Serverless — token refresh
  userinfo.js                   # Serverless — user profile
```

---

## Deploying to Vercel

The `vercel.json` at the project root handles SPA routing. To deploy:

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Add these environment variables in the Vercel dashboard:

| Variable | Required | Description |
|---|---|---|
| `VITE_QURAN_CLIENT_ID` | Yes (for auth) | Quran Foundation OAuth client ID |
| `VITE_QURAN_AUTH_BASE` | Yes (for auth) | e.g. `https://oauth2.quran.foundation` |
| `VITE_QURAN_API_BASE` | Yes (for auth) | e.g. `https://api.quranfoundation.org` |
| `VITE_REDIRECT_URI` | Yes (for auth) | Your deployed URL + `/auth/callback` |
| `VITE_IMGBB_API_KEY` | No | For Twitter/Pinterest image sharing |

4. Click **Deploy** — Vercel auto-detects Vite, no additional config needed

---

## Hackathon Alignment

**Theme:** Helping Muslims maintain their spiritual connection with the Quran beyond Ramadan.

| Criterion | How DuaFlow Addresses It |
|---|---|
| **Quran Engagement** | Makes 40 Rabbana duas accessible for daily dhikr, memorisation, and sharing |
| **Product Quality & UX** | Mobile-first, smooth audio, live preview designer, word-by-word sing-along |
| **Technical Execution** | WebCodecs API, FFmpeg.wasm, PKCE OAuth, Zustand persist, real-time bookmark sync |
| **Innovation** | Full print booklet designer + animated karaoke MP4 generator — not just a reader |
| **API Usage** | Quran Foundation audio CDN, Bookmarks API (OAuth2), quran.com word timestamps |

---

## License

MIT
