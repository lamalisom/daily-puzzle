# Daily Puzzles & Sudoku H5 (High-Yield Web Game)

A lightweight, high-retention HTML5 web game framework hosting two daily puzzle modes: **Daily Jigsaw** and **Daily Sudoku**. Engineered for mobile-first PWA execution, instant FCP, offline caching, and strategic Google Ad Placement API monetization (Interstitial & Rewarded Ads).

---

## 🚀 Key Performance Indicators (KPIs)
* **First Contentful Paint (FCP)**: < 1.5 seconds.
* **Total Asset Size**: < 200 KB initial bundle (well below the 2MB budget).
* **Ad Engagement**: Native integration of Rewarded Hint system for maximum CTR / RPM.
* **Storage & Retention**: LocalStorage streak tracking, state autosave, and multi-language support (EN, ZH-TW, JA, DE, ES).

---

## 📁 File Structure
```text
/
├── index.html       # Main SPA container + Layout safe zones for Ads (CLS safe)
├── manifest.json    # PWA Web App Manifest
├── sw.js            # Service Worker for offline caching & PWA support
├── css/
│   └── styles.css   # Custom styles & safety margins
├── src/
│   ├── app.js       # Main initialization, router, Web Audio synthesizer
│   ├── jigsaw.js    # Canvas Jigsaw engine (image slicing, drag-and-drop, snapping)
│   ├── sudoku.js    # Sudoku generator & validator algorithm with notes mode
│   ├── storage.js   # LocalStorage manager (Streak, score, state save)
│   ├── i18n.js      # Multilingual dictionary loader (EN, ZH-TW, JA, DE, ES)
│   └── ads.js       # Google H5 Games Ad Placement API integration wrapper
└── assets/          # PWA icons (SVG & PNG)
```

---

## 🎮 Features
1. **Daily Jigsaw Engine**:
   - Procedural date-seeded vivid scenery generator (100% offline, zero asset lag).
   - Realistic interlocking bezier tabs and blanks.
   - Smooth multi-touch & pointer drag-and-drop with magnetic snap distance.
   - Ghost preview guide and piece tray.
   - 3x3 (Easy), 4x4 (Medium), and 5x5 (Hard) modes.

2. **Daily Sudoku Engine**:
   - Unique-solution puzzle generation with backtracking algorithm.
   - 4 difficulty settings: Easy, Medium, Hard, Expert.
   - Conflict detection (row, col, 3x3 box), peer highlighting, and error counters.
   - Notes / Pencil mark mode.
   - Full Undo & Erase stack.

3. **Strategic Monetization (Google H5 Games Ad Placement API)**:
   - **CLS-Safe Ad Zones**: Top and bottom anchor slots with fixed height to eliminate Cumulative Layout Shift.
   - **Rewarded Hint System**: Players can watch a rewarded ad to unlock an instant hint (auto-places 1 jigsaw piece or solves a sudoku cell).
   - **Level-Complete Interstitials**: Seamless interstitial trigger upon completing a daily puzzle.
   - **Development Simulator**: Integrated fallback simulation when testing locally or when adblockers are active.

4. **Zero-Byte Web Audio Synthesizer**:
   - Punchy, tactile UI sounds (tap, magnetic snap, chime, error buzzer, victory fanfare) synthesized in real-time via Web Audio API.

---

## 🛠️ Local Development & Testing
Run any standard local HTTP server inside the project root:

```bash
# Using Python
python3 -m http.server 8080

# Or using Node.js npx serve
npx serve .
```
Then visit `http://localhost:8080` on your mobile browser or desktop.

---

## 🌐 Deployment Setup

### Cloudflare Pages
1. Connect your repository to Cloudflare Pages.
2. Build command: *(leave empty)*
3. Build output directory: `.` (or project root).

### Vercel
1. Import project into Vercel.
2. Framework Preset: **Other**.
3. Output Directory: `./`.

### GitHub Pages
1. Push repository to GitHub.
2. Go to **Settings > Pages**.
3. Source: Deploy from a branch (`main` / `/ (root)`).

---

## 💰 Enabling Live Google AdSense / Ad Placement API
In `index.html`, replace the placeholder client ID with your approved publisher ID:
```html
<script async data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-channel="daily_games"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js">
</script>
```
In `src/app.js`, update `publisherId`:
```javascript
this.ads = new AdManager({
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXX'
});
```
