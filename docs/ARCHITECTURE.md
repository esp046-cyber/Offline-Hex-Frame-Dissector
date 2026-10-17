# Architecture

```
index.html ── app.js ──┬─ js/editor.js        sanitise pasted hex -> bytes
                       ├─ js/validator.js     parse + CRC + IIN  (pure functions, no DOM)
                       │     └─ js/tag-converter.js   code tables (FC, IIN bits, objects)
                       ├─ js/templates.js     result object -> escaped HTML strings
                       └─ js/db.js            IndexedDB, last 50 decodes (keyed by hex)
sw-register.js ── service-worker.js           precache + cache-first + offline.html fallback
```

## Parsing pipeline (`parseDNP3`)

1. **Data link**: sync `05 64`, LENGTH, CONTROL, DEST/SRC (little-endian), header CRC. User data follows in
   16-byte blocks, each with its own CRC. CRC-16/DNP: reflected poly `0xA6BC`, init 0, inverted output, stored little-endian.
   LENGTH counts 5 header bytes plus user data, excluding CRCs.
2. **Transport**: first user-data byte per frame: FIN (bit 7), FIR (bit 6), SEQ (bits 0-5). Payloads are concatenated.
3. **Application**: control byte (FIR, FIN, CON, UNS, SEQ), function code. Responses (`0x81-0x83`) add IIN1 and IIN2.
   Then object headers: group, variation, qualifier (prefix bits 4-6, range bits 0-3).
4. **IIN**: each bit mapped to name, severity and a field hint. Fault bits drive the banner above the layers.

## Offline

`npm run build` copies the site to `dist/` and Workbox `injectManifest` replaces `self.__WB_MANIFEST` with the file list and
revisions. The cache name is derived from those revisions, so each deploy installs a fresh cache and deletes old ones.
User data never leaves the device: no network calls, strict CSP (`script-src 'self'`).
