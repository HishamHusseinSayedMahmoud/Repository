// يسحب بيانات الواقع ويكتب world.json. يحتاج Node 20 أو أحدث.
import fs from 'node:fs/promises';

const GOVS = {
  cairo: [30.04, 31.24], giza: [30.01, 31.21], sharqia: [30.59, 31.50], dakahlia: [31.04, 31.38],
  beheira: [31.03, 30.47], minya: [28.11, 30.75], qalyubia: [30.47, 31.18], sohag: [26.56, 31.70],
  alex: [31.20, 29.92], gharbia: [30.79, 31.00], assiut: [27.18, 31.18], menoufia: [30.55, 31.01],
  fayoum: [29.31, 30.84], kafr: [31.11, 30.94], qena: [26.16, 32.72], beni: [29.07, 31.10],
  aswan: [24.09, 32.90], damietta: [31.42, 31.81], ismailia: [30.60, 32.27], luxor: [25.69, 32.64],
  suez: [29.97, 32.55], portsaid: [31.27, 32.30], matrouh: [31.35, 27.24], nsinai: [31.13, 33.80],
  redsea: [27.26, 33.81], newvalley: [25.45, 30.55], ssinai: [28.24, 33.62]
};

async function readJSON(path, fallback) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; }
}
async function getJSON(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'realworld-x-sync' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

const prev = await readJSON('world.json', {});
const cfg = await readJSON('config/egypt.json', {});
const out = { ...prev, updatedAt: new Date().toISOString(), sources: { ...(prev.sources || {}) } };

// التاريخ بتوقيت القاهرة (YYYY-MM-DD)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// 1) سعر الدولار
try {
  const d = await getJSON('https://open.er-api.com/v6/latest/USD');
  const egp = d && d.rates && Number(d.rates.EGP);
  if (!(egp > 0)) throw new Error('EGP rate missing');
  let base = await readJSON('config/baseline.json', null);
  if (!base || !(base.usdEgp > 0)) {
    base = { usdEgp: egp, setAt: today };
    await fs.writeFile('config/baseline.json', JSON.stringify(base, null, 2));
  }
  out.fx = { usdEgp: Number(egp.toFixed(4)), index: Number((egp / base.usdEgp).toFixed(4)), baselineSetAt: base.setAt };
  out.sources.fx = { ok: true, at: out.updatedAt };
} catch (e) {
  out.sources.fx = { ok: false, error: String(e.message || e), at: out.updatedAt };
}

// 2) الطقس لكل محافظة
try {
  const ids = Object.keys(GOVS);
  const lat = ids.map(i => GOVS[i][0]).join(',');
  const lon = ids.map(i => GOVS[i][1]).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation&timezone=Africa%2FCairo`;
  let d = await getJSON(url);
  if (!Array.isArray(d)) d = [d];
  if (d.length !== ids.length) throw new Error('unexpected weather response size');
  out.weather = {};
  ids.forEach((id, k) => {
    const c = d[k] && d[k].current;
    if (c) out.weather[id] = { tempC: Number(c.temperature_2m), rain: Number(c.precipitation) > 0.1 };
  });
  out.sources.weather = { ok: true, at: out.updatedAt };
} catch (e) {
  out.sources.weather = { ok: false, error: String(e.message || e), at: out.updatedAt };
}

// 3) التقويم والإجازات
{
  const md = today.slice(5);
  const fixed = (cfg.fixedHolidays || []).find(h => h.md === md);
  const movable = (cfg.movableHolidays || []).find(h => h.date === today);
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(new Date());
  out.calendar = { today, dow, holiday: (movable || fixed || {}).name || null };
  out.sources.calendar = { ok: true, at: out.updatedAt };
}

// 4) أحداث يدوية من config/egypt.json
out.events = (cfg.events || []).filter(e => e && e.id && (!e.from || e.from <= today) && (!e.to || e.to >= today));

await fs.writeFile('world.json', JSON.stringify(out, null, 2));
console.log('world.json updated', JSON.stringify(out.sources));
