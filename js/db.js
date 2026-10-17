// IndexedDB storage for the last 50 decoded hex strings.
const DB_NAME = 'dnp3-fieldassist', STORE = 'decodes', MAX = 50;

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'hex' });
      s.createIndex('ts', 'ts');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); });
const wrap = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function saveDecode(hex, summary) {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.put({ hex, summary, ts: Date.now() });   // same hex replaces the old entry
  const all = await wrap(store.getAll());
  all.sort((a, b) => b.ts - a.ts).slice(MAX).forEach(e => store.delete(e.hex));
  await done(tx); db.close();
}

export async function getRecent(limit = MAX) {
  const db = await open();
  const all = await wrap(db.transaction(STORE).objectStore(STORE).getAll());
  db.close();
  return all.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

export async function clearAll() {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await done(tx); db.close();
}
