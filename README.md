# R.E.M.I.N.D

**A little collection of gentle games — sequence memory, photo jigsaw, and a music quiz — unified into one installable web app.**

🔗 **Live app:** [remind-theraghavbansals-projects.vercel.app](https://remind-theraghavbansals-projects.vercel.app/)

---

## About

R.E.M.I.N.D started as three separate browser games and became a single home for all of them — one hub page, shared navigation, and a consistent warm, calm design language across every screen. It's built to be installable: as a Progressive Web App on desktop/mobile, and as a standalone Android app via [PWABuilder](https://www.pwabuilder.com/).

## Games

| Game | What it is |
|---|---|
| **R.E.M.I.N.D Memory** | A sequence-recall game — watch the pattern light up, then repeat it back. See how many rounds you can hold. |
| **Piecework** | Upload any photo and it's cut into a real interlocking jigsaw, right in the browser — drag pieces from the tray and snap them into place. |
| **R.E.M.I.N.D Music** | A gentle music quiz — listen to a clip via Spotify's embedded player and guess the singer or the song. |

## Features

- 🎮 Three complete games, one unified entry point
- 📱 Installable as a **PWA** — custom manifest, service worker with offline caching, home-screen icon
- 🤖 Packaged as a signed, installable **Android APK** via PWABuilder (Trusted Web Activity)
- 🎨 Consistent hand-built design system across the hub and every game (no UI framework)
- ⚡ Zero build step — plain HTML, CSS, and JavaScript, deployed as a static site

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (ES6+)
- **PWA:** Web App Manifest, Service Worker (network-first caching strategy)
- **Audio:** Spotify iFrame Playback API (for the music quiz)
- **Hosting:** [Vercel](https://vercel.com)
- **Android packaging:** [PWABuilder](https://www.pwabuilder.com/) (Trusted Web Activity)

## Project Structure

```
remind-app/
├── www/                        ← the whole web app lives here
│   ├── index.html              ← hub / home screen
│   ├── style.css
│   ├── hub-link.css            ← shared "← Home" pill used inside every game
│   ├── manifest.json           ← PWA manifest
│   ├── sw.js                   ← service worker
│   ├── icons/                  ← app icons
│   └── games/
│       ├── memory/             ← R.E.M.I.N.D Memory
│       ├── puzzle/             ← Piecework
│       └── song/                ← R.E.M.I.N.D Music
├── vercel.json                 ← trailing-slash config (see note below)
└── README.md
```

## Running it locally

No build step, no dependencies. Just:

1. Download (or `git clone`) this repo.
2. Open `www/index.html` in your browser.

That's it — the hub and all three games run straight from the file.

> Note: the Piecework puzzle's photo upload can be restricted by some
> browsers when run via `file://`. If that happens, serving the `www`
> folder locally (e.g. `npx serve .` or `python3 -m http.server`) works
> around it — but for normal play, just opening `index.html` is enough.

## Deployment notes

- Deployed on Vercel as a static site with the **Root Directory** set to `www`.
- `vercel.json` sets `"trailingSlash": true` — without it, relative paths inside each game folder (`style.css`, `app.js`) resolve incorrectly once Vercel's clean-URL rewrite strips the trailing slash.
- To generate the Android APK: run the live URL through [PWABuilder](https://www.pwabuilder.com/), which validates the manifest + service worker and packages a signed Trusted Web Activity APK.

## License

Licensed under the [MIT License](LICENSE) — feel free to use, learn from, or build on this.

## Author

**Raghav Bansal**
[GitHub](https://github.com/theraghavbansal) · [LinkedIn](https://www.linkedin.com/in/therbansal)
