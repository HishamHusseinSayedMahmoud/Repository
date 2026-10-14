// يسحب بيانات الواقع ويكتب world.json
import fs from 'node:fs/promises';

const LOCS = {
  'القاهرة': [30.04, 31.23], 'الجيزة': [30.01, 31.21], 'القليوبية': [30.41, 31.18], 'الإسكندرية': [31.20, 29.91],
  'البحيرة': [31.04, 30.47], 'مطروح': [31.35, 27.24], 'الدقهلية': [31.04, 31.38], 'الشرقية': [30.59, 31.50],
  'الغربية': [30.79, 31.00], 'المنوفية': [30.55, 31.01], 'دمياط': [31.42, 31.81], 'كفر الشيخ': [31.11, 30.94],
  'الفيوم': [29.31, 30.84], 'بني سويف': [29.07, 31.10], 'المنيا': [28.11, 30.75], 'أسيوط': [27.18, 31.18],
  'سوهاج': [26.56, 31.70], 'قنا': [26.16, 32.72], 'الأقصر': [25.69, 32.64], 'أسوان': [24.09, 32.90],
  'البحر الأحمر': [27.26, 33.81], 'الوادي الجديد': [25.45, 30.55], 'مطروح_جنوب': [29.97, 32.55],
  'شمال سيناء': [31.13, 33.80], 'جنوب سيناء': [28.24, 33.62], 'الإسماعيلية': [30.60, 32.27],
  'السويس': [29.97, 32.55], 'بورسعيد': [31.27, 32.30]
};

async function readJsonSafe(path) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); }
  catch { return null; }
}

async function fetchUrl(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'realworld-x-sync' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const prev = (await readJsonSafe('world.json')) || {};
const cfg = (await readJsonSafe('egypt.json')) || {};

const out = {
  updatedAt: new Date().toISOString(),
  usdEgp: prev.usdEgp || null,
  weather: prev.weather || {},
  events: [],
  sources: prev.sources || { usd: { ok: false }, weather: { ok: false }, cal: { ok: false } }
};

// 1) سعر الدولار
try {
  const data = await fetchUrl('https://open.er-api.com/v6/latest/USD');
  const rate = data?.rates?.EGP;
  if (rate) {
    out.usdEgp = Number(rate.toFixed(4));
    out.sources.usd = { ok: true, rate: out.usdEgp, time: new Date().toISOString() };
  } else {
    throw new Error('No EGP rate');
  }
} catch (e) {
  out.sources.usd = { ok: false, err: e.message || String(e) };
}

// 2) الطقس لكل محافظة
try {
  const wMap = {};
  for (const [name, [lat, lon]] of Object.entries(LOCS)) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation&timezone=Africa%2FCairo`;
    const data = await fetchUrl(url);
    const curr = data?.current;
    if (curr) {
      wMap[name] = {
        temp: curr.temperature_2m,
        rain: curr.precipitation > 0.1
      };
    }
  }
  if (Object.keys(wMap).length > 0) {
    out.weather = wMap;
    out.sources.weather = { ok: true, count: Object.keys(wMap).length };
  }
} catch (e) {
  out.sources.weather = { ok: false, err: e.message || String(e) };
}

// 3) التقويم والإجازات
try {
  const now = new Date();
  const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long', timeZone: 'Africa/Cairo' });
  const dateStr = now.toISOString().split('T')[0];
  
  const isWeekend = dayName.includes('الجمعة') || dayName.includes('السبت');
  const isHoliday = Boolean(cfg.holidays && cfg.holidays[dateStr]);
  
  out.sources.cal = { ok: true, day: dayName, isHoliday: isHoliday || isWeekend };
} catch (e) {
  out.sources.cal = { ok: false, err: e.message || String(e) };
}

// 4) الأحداث
if (cfg.events && Array.isArray(cfg.events)) {
  out.events = cfg.events;
}

// حفظ الملف النهائي
await fs.writeFile('world.json', JSON.stringify(out, null, 2), 'utf8');
console.log('world.json updated successfully!');
