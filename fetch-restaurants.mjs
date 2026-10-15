// يجلب المطاعم والكافيهات من OpenStreetMap (عبر Overpass API) لمحافظة واحدة.
// الاستخدام: node scripts/fetch-restaurants.mjs cairo
// البيانات: © مساهمو OpenStreetMap، ترخيص ODbL (يجب ذكر المصدر).
import fs from 'node:fs/promises';

const GOV = process.argv[2] || 'cairo';
const AREAS = {
  cairo: { iso: 'EG-C', bbox: [29.78, 31.10, 30.20, 31.65] } // جنوب، غرب، شمال، شرق
};
const cfg = AREAS[GOV];
if (!cfg) { console.error('محافظة غير معرّفة: ' + GOV); process.exit(1); }

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const SEL = '["amenity"~"^(restaurant|fast_food|cafe)$"]';
const byIso = `[out:json][timeout:180];area["ISO3166-2"="${cfg.iso}"]->.a;(nwr${SEL}(area.a););out center tags;`;
const [s, w, n, e] = cfg.bbox;
const byBox = `[out:json][timeout:180];(nwr${SEL}(${s},${w},${n},${e}););out center tags;`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runQuery(q) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const ep of ENDPOINTS) {
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'realworld-x-game/1.0 (github actions)' },
          body: 'data=' + encodeURIComponent(q)
        });
        if (!r.ok) throw new Error(ep + ' -> ' + r.status);
        const j = await r.json();
        if (!j || !Array.isArray(j.elements)) throw new Error('رد غير متوقع');
        return j.elements;
      } catch (err) { lastErr = err; console.warn('محاولة فشلت:', String(err.message || err)); }
    }
    await sleep(15000 * (attempt + 1));
  }
  throw lastErr;
}

let usedBbox = false;
let els = await runQuery(byIso);
console.log('نتائج الاستعلام بالحدود الإدارية:', els.length);
if (els.length < 100) {
  console.warn('عدد قليل، سنجرب المستطيل الجغرافي (قد يشمل أطرافًا من محافظات مجاورة)');
  els = await runQuery(byBox);
  usedBbox = true;
  console.log('نتائج الاستعلام بالمستطيل:', els.length);
}

const T = { restaurant: 'r', fast_food: 'f', cafe: 'c' };
const seen = new Set();
const items = [];
for (const el of els) {
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  const tg = el.tags || {};
  const name = tg['name:ar'] || tg.name || tg['name:en'] || '';
  if (!(lat && lon) || !name) continue;
  const key = name + '|' + lat.toFixed(4) + '|' + lon.toFixed(4);
  if (seen.has(key)) continue;
  seen.add(key);
  items.push([Number(lat.toFixed(5)), Number(lon.toFixed(5)), T[tg.amenity] || 'r', name, tg.cuisine || '', tg.brand || tg['brand:ar'] || '']);
}

if (items.length < 50) { console.error('عدد النتائج بعد التنظيف قليل جدًا، لن أكتب الملف.'); process.exit(1); }

await fs.mkdir('data', { recursive: true });
await fs.writeFile(`data/restaurants-${GOV}.json`, JSON.stringify({
  updatedAt: new Date().toISOString(),
  source: '© OpenStreetMap contributors (ODbL)',
  gov: GOV, usedBbox, count: items.length, items
}));
console.log(`تم: ${items.length} مكان في ${GOV}`);
