# DNP3 FieldAssist

Offline-first PWA that decodes raw DNP3 hex frames during SCADA loop checks. Paste a hex string
(`05 64 ...`) and read the Data Link, Transport and Application layers, CRC results, and the
IIN1/IIN2 flags (Device Restart, Need Time, Class 1/2/3 events, Event Buffer Overflow, and more).

## Run

```bash
npm install
npm run dev      # unbuilt, http://localhost:8080 (uses the service worker's fallback cache list)
npm run serve    # production build in dist/, http://localhost:8080
```

Serve over HTTPS (or localhost): service workers will not register otherwise.

## Deploy

`npm run build` writes the site to `dist/` and injects the precache manifest into `service-worker.js`.
Netlify (`netlify.toml`), Vercel (`vercel.json`) and GitHub Pages (`.github/workflows/deploy.yml`) are preconfigured.
Replace `dnp3-fieldassist.example.com` in `robots.txt`, `sitemap.xml` and `security.txt`, and the contact in `security.txt`.

## Scope and limits

- Decodes link frames (with header and block CRC-16/DNP checks), transport segments and the application fragment.
- Multi-frame messages are reassembled from the pasted frames in order.
- Object headers are listed; object data is stepped through for the common groups in `js/tag-converter.js`.
  Unknown objects stop decoding and show the remaining bytes raw.
- Secure Authentication objects (g120) are listed by header only.
- Icons are SVG files named `*.png.svg`. Some platforms want real PNGs for installability.

See `docs/ARCHITECTURE.md`.
