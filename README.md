# KATZE Work Hub

A mobile-first web portal that gives employees one page for three work applications, a daily checklist, and Android installation as a Progressive Web App (PWA). Plain HTML, CSS and JavaScript. No frameworks, build step, API keys or paid services.

- Repository: `Learn2manoj/katze-work-hub`
- Live URL: https://learn2manoj.github.io/katze-work-hub/

## Files

```text
katze-work-hub/
├── index.html            Page markup (must stay in the project root)
├── styles.css            Design system and responsive layout
├── app.js                Checklist, install button, service worker registration
├── manifest.webmanifest  PWA manifest
├── sw.js                 Service worker (offline cache + update handling)
├── README.md
└── assets/
    ├── katze-logo.png    Official KATZE logo, unmodified
    ├── icon-192.png      Square home-screen icon (192×192)
    └── icon-512.png      Square home-screen icon (512×512)
```

## What it does

- **Three application cards** open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). The sites are not embedded, and the hub never asks for or stores work passwords.
  - Katze Intranet: `https://sites.google.com/katzeindia.com/katzeintranet/routine-employee-links`
  - WorkIndia Dashboard: `http://3.6.125.26/login`
  - Job Cart: `http://3.6.125.26/jobcart/login`
- **Daily Checklist** with completed / total / percentage and a progress bar. Progress is saved in the browser's `localStorage`. A new checklist starts automatically when the local calendar date changes, including when the app stays open past midnight. **Reset Checklist** asks for confirmation. If storage is blocked, the checklist still works for the session and shows a notice.
- **Install button** uses the browser's native prompt when it is offered, and otherwise shows manual steps. It only says the app is installed when the browser reports it (the `appinstalled` event) or the app is already running in standalone mode.

## Test locally

Service workers and installation need HTTPS, but browsers treat `localhost` as secure, so a local server is enough.

To mirror the GitHub Pages path, serve the *parent* folder:

```bash
# from the folder that CONTAINS katze-work-hub/
python3 -m http.server 8000
```

Then open <http://localhost:8000/katze-work-hub/>. (Serving from inside the project folder also works, because every path in the app is relative.)

In Chrome DevTools, open **Application → Manifest** and **Application → Service Workers** to check the manifest, icons and worker.

Do not open `index.html` by double-clicking it (`file://`): service workers and installation will not work.

## Deploy to GitHub Pages

1. Create the repository `katze-work-hub` under the `Learn2manoj` account.
2. Upload the project contents so that `index.html` is at the **repository root** (not inside another folder). With git:
   ```bash
   cd katze-work-hub
   git init
   git add .
   git commit -m "KATZE Work Hub"
   git branch -M main
   git remote add origin https://github.com/Learn2manoj/katze-work-hub.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main`, folder `/ (root)`, and save.
4. After a minute or two the site is live at **https://learn2manoj.github.io/katze-work-hub/**. GitHub serves it over HTTPS, which installation requires.

### Paths on GitHub Pages

The site lives under `/katze-work-hub/`, not at the domain root, so the project uses relative paths everywhere:

| Item | Value | Resolves to |
|---|---|---|
| `start_url` | `./?source=pwa` | `/katze-work-hub/` |
| `scope` | `./` | `/katze-work-hub/` |
| Service worker | `register('sw.js', { scope: './' })` | `/katze-work-hub/sw.js` |
| Icons, logo, CSS, JS | `assets/…`, `styles.css`, `app.js` | `/katze-work-hub/…` |

### Publishing updates

1. Edit the files and **change `VERSION` at the top of `sw.js`** (for example `1.0.0` → `1.0.1`). This is what makes installed copies refresh.
2. Commit and push. Open apps show a "A new version of Work Hub is ready" bar with a **Reload** button.

## Install on Android

1. Open https://learn2manoj.github.io/katze-work-hub/ in **Chrome** on the phone.
2. Tap **Install Katze Work Hub** on the page. If Chrome offers the prompt, confirm it.
3. If nothing appears, tap the **⋮** menu → **Install app** (or **Add to Home screen**) → confirm.
4. Open **Katze Hub** from the home screen or app list.

Whether the install option appears is decided by the browser, not by this app. It requires HTTPS, a valid manifest and service worker, and a browser that supports installation. If the option is missing, refresh the page, make sure Chrome is up to date, and try again.

## Notes

- **HTTP work applications:** WorkIndia Dashboard and Job Cart use `http://` addresses. Browsers may label them "Not secure"; that comes from those sites, not this hub. Opening them in a new tab from an HTTPS page works normally.
- **Logo:** `assets/katze-logo.png` is the supplied file, unmodified. The image has a light-grey strip along its right edge, so the page crops that strip with CSS (the logo's proportions are untouched). Replace the file with a clean export and the crop becomes unnecessary; adjust `.logo` in `styles.css` if the dimensions change.
- **Icons:** the square icons use the "K" letterform taken from the supplied logo, in white on KATZE blue (`#0B93DF`).
- **Checklist data** stays on each device. It is never sent anywhere.
