# Frontend performance on the server

If the app feels slow on the server, use this checklist. Most slowness comes from **running in dev mode** or **loading too much JS on first paint**.

---

## 1. Run production build (most important)

On the server, **do not** use `npm run dev`. Use the production build:

```bash
npm run build
npm start
```

- **`npm run dev`** – development server: slower, no caching, large bundles, recompiles on change.
- **`npm run build`** + **`npm start`** – production: minified, cached, code-split. Much faster.

To use port 5100 (same as dev):

```bash
PORT=5100 npm start
```

---

## 2. Environment

In `.env` or server env:

- **`NODE_ENV=production`** (Next sets this during `next build` when you run `next start`; ensure the process isn’t overriding it.)
- **`NEXT_PUBLIC_API_URL`** – set to your backend API URL so the frontend doesn’t wait for wrong/default URLs.

---

## 3. What we optimized in the app

- **Lazy loading** – Heavy screens (Profit dashboard, eBay dashboard, Repricer, Cashflow, PPC dashboard) load their JS only when you open that route. First load stays smaller.
- **Charts** – Recharts and map (Leaflet) are loaded only when the page that uses them is opened (dynamic import).
- **Production build** – `next build` enables minification, tree-shaking, and chunk splitting. Always use it on the server.

---

## 4. If it’s still slow

| Area | Check |
|------|--------|
| **First page load** | Use production build; check Network tab for large JS chunks. |
| **After login (dashboard)** | Backend might be slow (see backend SERVER-PERFORMANCE.md). |
| **Switching tabs/pages** | First time opening a lazy-loaded page (e.g. Repricer) will fetch its chunk; next time it’s cached. |
| **Sluggish UI** | Too many re-renders or heavy lists; we can add virtualization or memo. |

---

## 5. Quick server commands

```bash
# Build and run production (from frontend root)
npm run build
PORT=5100 npm start

# Or use PM2
pm2 start npm --name "beddora-frontend" -- start
# Then set PORT in env or ecosystem file, e.g. PORT=5100
```

Summary: run **`npm run build`** then **`npm start`** (with **`PORT=5100`** if needed), and ensure **`NEXT_PUBLIC_API_URL`** points to your backend. Do not run `npm run dev` on the server.
