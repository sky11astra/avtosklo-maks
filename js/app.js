/* Автоскло-Макс v12 — 3D-шоурум з чотирма авто, тонуванням по зонах і сторінка */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODELS, findModels } from './models.js?v=50';

window.__am_ready = true;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 760;
const PHONE = '+380504332288';
const DEV = new URLSearchParams(location.search).has('dev');

/* ---------- авто (тут міняти моделі) ---------- */
const CARS = {
  jeep: {
    url: 'models/jeep.glb?v=7', name: 'Jeep Wrangler', cls: 'Позашляховик', ex: 'Jeep Wrangler',
    credit: '«2023 Jeep Wrangler Rubicon 392 20th Anniversary» — Ddiaz Design, CC BY-NC-SA 4.0',
    creditUrl: 'https://sketchfab.com/3d-models/2023-jeep-wrangler-rubicon-392-20th-anniversary-7247a74596224c3dadc219836430279c',
    glass: n => /(^|\s)glass(\s|$)/.test(n) && !/red|orange/.test(n),
  },
  gti: {
    url: 'models/gti.glb?v=7', name: 'VW Golf GTI', cls: 'Легкове', ex: 'VW Golf',
    credit: '«VW Golf GTi MK7» — vecarz, CC BY-NC 4.0',
    creditUrl: 'https://sketchfab.com/3d-models/vw-golf-gti-mk7-wwwvecarzcom-60c87f48ba28491c9748a083371fd8ce',
    glass: n => /^(glassext|glass_ext_tint|glassmtl|glassdarkmtl)\b/.test(n),
  },
  crafter: {
    url: 'models/crafter.glb?v=7', name: 'VW Crafter', cls: 'Бус', ex: 'VW Crafter',
    credit: '«Volkswagen Crafter» — geyges, Sketchfab Standard',
    creditUrl: 'https://sketchfab.com/3d-models/volkswagen-crafter-647fb3d619c645a4b8e62d80db7cab98',
    glass: n => /windowshape|(^|\s)object_92$/.test(n), belt: .42, frontMin: .7, rearMax: .06,
  },
  sclass: {
    url: 'models/sclass.glb?v=7', name: 'Mercedes S-клас', cls: 'Бізнес-клас', ex: 'Mercedes S-клас',
    credit: '«Mercedes S-Class» — dmas, CC BY 4.0',
    creditUrl: 'https://sketchfab.com/3d-models/mercedes-s-class-581e6ce2ba48448a96dc3512d9385bc2',
    glass: n => /window_glass/.test(n), yaw: Math.PI,
  },
};
const urlCar = new URLSearchParams(location.search).get('car');
let START = CARS[urlCar] ? urlCar : urlCar === 'mercedes' ? 'sclass' : 'jeep';

function whenGSAP() {
  return new Promise(res => {
    const ok = () => window.gsap && window.ScrollTrigger;
    if (ok()) return res();
    const t = setInterval(() => { if (ok()) { clearInterval(t); res(); } }, 20);
  });
}

/* ---------- тріщини й уламки ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function nearest(pts, cx, cy, r) { let best = null, bd = 1e9; for (const p of pts) { const d = Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - r); if (d < bd) { bd = d; best = p; } } return bd < r * .5 ? best : null; }
function genCrack(cx, cy, R, rnd, opts = {}) {
  const lines = [], n = opts.rays || (9 + Math.floor(rnd() * 6)), rays = [];
  for (let i = 0; i < n; i++) {
    const base = (i / n) * Math.PI * 2 + (rnd() - .5) * .5, len = R * (.45 + rnd() * .55), steps = 7 + Math.floor(rnd() * 5);
    const pts = [[cx, cy]]; let a = base, x = cx, y = cy;
    for (let s = 1; s <= steps; s++) {
      a += (rnd() - .5) * .38; const d = len / steps * (.7 + rnd() * .6); x += Math.cos(a) * d; y += Math.sin(a) * d; pts.push([x, y]);
      if (s > 2 && rnd() < .22) { const bp = [[x, y]]; let ba = a + (rnd() < .5 ? -1 : 1) * (.4 + rnd() * .6), bx = x, by = y; const bs = 2 + Math.floor(rnd() * 3); for (let k = 0; k < bs; k++) { ba += (rnd() - .5) * .4; const bd = d * (.6 + rnd() * .5); bx += Math.cos(ba) * bd; by += Math.sin(ba) * bd; bp.push([bx, by]); } lines.push({ pts: bp, start: Math.hypot(x - cx, y - cy) / R, w: .8 }); }
    }
    rays.push(pts); lines.push({ pts, start: 0, w: 1.4 });
  }
  const rings = opts.rings ?? 3;
  for (let k = 0; k < rings; k++) {
    const rr = R * (.12 + k * .2) * (.85 + rnd() * .3);
    for (let i = 0; i < n; i++) {
      if (rnd() < .3) continue;
      const A = nearest(rays[i], cx, cy, rr), B = nearest(rays[(i + 1) % n], cx, cy, rr); if (!A || !B) continue;
      lines.push({ pts: [A, [(A[0] + B[0]) / 2 + (rnd() - .5) * rr * .15, (A[1] + B[1]) / 2 + (rnd() - .5) * rr * .15], B], start: rr / R + .05, w: .9 });
    }
  }
  lines.forEach(l => { let L = 0; for (let i = 1; i < l.pts.length; i++) L += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); l.len = L; });
  return { cx, cy, R, lines };
}
function drawCrack(ctx, c, t, scale = 1, alpha = 1) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const l of c.lines) {
    const p = clamp((t - l.start * .55) / .45, 0, 1); if (p <= 0) continue;
    let remain = l.len * p; ctx.beginPath(); ctx.moveTo(l.pts[0][0], l.pts[0][1]);
    for (let i = 1; i < l.pts.length && remain > 0; i++) {
      const [x0, y0] = l.pts[i - 1], [x1, y1] = l.pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
      if (seg <= remain) { ctx.lineTo(x1, y1); remain -= seg; } else { const f = remain / seg; ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); remain = 0; }
    }
    ctx.strokeStyle = `rgba(255,255,255,${.9 * alpha})`; ctx.lineWidth = l.w * scale; ctx.stroke();
    ctx.strokeStyle = `rgba(170,225,255,${.22 * alpha})`; ctx.lineWidth = l.w * scale * 3.2; ctx.stroke();
  }
  if (t > 0) { const r = c.R * .05 * clamp(t * 3, 0, 1); ctx.fillStyle = `rgba(255,255,255,${.95 * alpha})`; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, rr = r * (i % 2 ? .45 : 1); ctx.lineTo(c.cx + Math.cos(a) * rr, c.cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function clipPoly(poly, px, py, nx, ny) { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const da = (a[0] - px) * nx + (a[1] - py) * ny, db = (b[0] - px) * nx + (b[1] - py) * ny; if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { const f = da / (da - db); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); } } return out; }
function voronoi(pts, W, H) { return pts.map((p, i) => { let poly = [[0, 0], [W, 0], [W, H], [0, H]]; for (let j = 0; j < pts.length && poly.length; j++) { if (i === j) continue; const q = pts[j]; poly = clipPoly(poly, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, q[0] - p[0], q[1] - p[1]); } return poly; }).filter(p => p.length > 2); }

/* ---------- прелоадер: скло тріскається й розлітається ---------- */
const loaderEl = $('[data-loader]'), ldBar = $('[data-ld-bar]'), ldPct = $('[data-ld-pct]');
function setProgress(p) { if (loaderEl) loaderEl.style.setProperty('--p', p.toFixed(3)); if (ldBar) ldBar.style.transform = `scaleX(${p})`; if (ldPct) ldPct.textContent = String(Math.round(p * 100)).padStart(2, '0'); }
function shatterOut(onBreak) {
  const W = innerWidth, H = innerHeight;
  if (reduce || W < 20 || H < 20 || document.hidden) { loaderEl.classList.add('is-done'); onBreak(); return; }
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas'); cv.className = 'shatter';
  document.body.appendChild(cv); cv.width = W * DPR; cv.height = H * DPR; const ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const tex = document.createElement('canvas'); tex.width = W * DPR; tex.height = H * DPR; const tc = tex.getContext('2d'); tc.setTransform(DPR, 0, 0, DPR, 0, 0);
  const bg = tc.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b1018'); bg.addColorStop(1, '#05070b'); tc.fillStyle = bg; tc.fillRect(0, 0, W, H);
  [[.08, .22, .07], [.3, .36, .045], [.62, .8, .06]].forEach(([a, b, o]) => { const g = tc.createLinearGradient(W * a, 0, W * b, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(190,225,255,${o})`); g.addColorStop(1, 'rgba(255,255,255,0)'); tc.fillStyle = g; tc.fillRect(0, 0, W, H); });
  tc.font = `700 ${clamp(W / 22, 24, 44)}px Unbounded, system-ui, sans-serif`; tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.fillStyle = '#f2f4f7';
  tc.fillText('АВТОСКЛО-МАКС', W / 2, H / 2 - 30);
  tc.font = `500 ${clamp(W / 90, 11, 14)}px "IBM Plex Mono", monospace`; tc.fillStyle = '#ffd21f'; tc.fillText('ІВАНО-ФРАНКІВСЬК · З 2005 РОКУ', W / 2, H / 2 + 14);
  loaderEl.style.visibility = 'hidden';
  const cx = W * .5, cy = H * .5 - 30, R = Math.hypot(W, H) * .55;
  const crack = genCrack(cx, cy, R, rng(77), { rays: 14, rings: 4 });
  const rnd = rng(9), seeds = [];
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 1.6) * R * .45; seeds.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
  for (let i = 0; i < 34; i++) seeds.push([rnd() * W, rnd() * H]);
  const shards = voronoi(seeds, W, H).map(poly => { let sx = 0, sy = 0; poly.forEach(p => { sx += p[0]; sy += p[1]; }); sx /= poly.length; sy /= poly.length; const dx = sx - cx, dy = sy - cy, dist = Math.hypot(dx, dy) || 1, sp = 260 + rnd() * 420; return { poly, sx, sy, vx: dx / dist * sp * (.4 + rnd() * .6), vy: dy / dist * sp * .35 - 120 - rnd() * 160, vr: (rnd() - .5) * 3.2, delay: dist / R * 380, ds: .05 + rnd() * .25 }; });
  let start = 0, broke = false;
  const T_CRACK = 120, T_FALL = 850, T_END = 2300;
  const end = () => { cv.remove(); loaderEl.classList.add('is-done'); };
  const safety = setTimeout(() => { if (!broke) { broke = true; onBreak(); } end(); }, 4000);
  function frame(now) {
    try {
      if (!start) start = now; const e = now - start; ctx.clearRect(0, 0, W, H);
      if (e < T_FALL) {
        ctx.drawImage(tex, 0, 0, W, H);
        if (e > T_CRACK) { drawCrack(ctx, crack, clamp((e - T_CRACK) / 520, 0, 1), 1.4); const f = clamp(1 - (e - T_CRACK) / 220, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f * .25})`; ctx.fillRect(0, 0, W, H); } }
      } else {
        if (!broke) { broke = true; loaderEl.classList.add('is-done'); onBreak(); }
        const t = e - T_FALL;
        for (const s of shards) {
          const lt = Math.max(0, t - s.delay) / 1000, a = clamp(1 - lt * 1.15, 0, 1); if (a <= 0) continue;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(s.sx + s.vx * lt, s.sy + s.vy * lt + 1400 * lt * lt); ctx.rotate(s.vr * lt); const sc = 1 + s.ds * lt * 2; ctx.scale(sc, sc); ctx.translate(-s.sx, -s.sy);
          ctx.beginPath(); s.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
          ctx.save(); ctx.clip(); ctx.drawImage(tex, 0, 0, W, H); if (lt < .05) drawCrack(ctx, crack, 1, 1.4); ctx.restore();
          ctx.strokeStyle = 'rgba(200,235,255,.5)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
        }
      }
      if (e > T_END) { clearTimeout(safety); end(); return; }
      requestAnimationFrame(frame);
    } catch (err) { clearTimeout(safety); end(); if (!broke) { broke = true; onBreak(); } }
  }
  requestAnimationFrame(frame);
}

/* ---------- шейдери ---------- */
/* Каталог плівок. Порядок вікон у SLOTS = порядок елементів масивів uFilmA/uFilmB у шейдері.
   t — відтінок нейтральної плівки; c — колір; m — дзеркальність; ir — хамелеон [базовий тон, розмах]; mat — матова; v — типовий %. */
const SLOTS = ['ws', 'fl', 'fr', 'rl', 'rr', 'rw'], WINS_MAIN = ['fl', 'fr', 'rl', 'rr', 'rw'];
const WIN_NAMES = { ws: 'лобове', fl: 'переднє ліве', fr: 'переднє праве', rl: 'заднє бокове ліве', rr: 'заднє бокове праве', rw: 'заднє скло' };
const mirSw = (a, b, c, d) => `linear-gradient(135deg,${a},${b} 42%,${c} 56%,${d})`;
const FILMS = [
  { id: 'black', g: 'Тонувальні', n: 'Чорна', sw: 'linear-gradient(135deg,#343b44,#0a0c10)' },
  { id: 'carbon', g: 'Тонувальні', n: 'Вуглецева', t: [.28, .31, .34], sw: 'linear-gradient(135deg,#3a3d40,#101214)' },
  { id: 'ceramic', g: 'Тонувальні', n: 'Керамічна', t: [.24, .36, .48], sw: 'linear-gradient(135deg,#3b4f64,#0c1219)' },
  { id: 'dyed', g: 'Тонувальні', n: 'Фарбована', t: [.34, .29, .4], sw: 'linear-gradient(135deg,#453c50,#110e16)' },
  { id: 'metal', g: 'Тонувальні', n: 'Металізована', t: [.3, .33, .38], m: .35, sw: mirSw('#79828c', '#3b424a', '#8a939d', '#23282e') },
  { id: 'bronze', g: 'Кольорові', n: 'Бронзова', c: '#8a5a2b', d: 'кольорова · теплий відтінок', sw: 'linear-gradient(135deg,#a2703c,#4a2e14)' },
  { id: 'blue', g: 'Кольорові', n: 'Синя', c: '#1f5fd0', d: 'кольорова · синій відтінок', sw: 'linear-gradient(135deg,#3f82ee,#123b86)' },
  { id: 'silver', g: 'Дзеркальні', n: 'Срібне дзеркало', c: '#cfd6de', np: 1, m: 1, v: 15, d: 'дзеркальна · салон не видно', sw: mirSw('#f5f8fb', '#8d97a3', '#e9eef3', '#5b6571') },
  { id: 'gold', g: 'Дзеркальні', n: 'Золоте дзеркало', c: '#e0a93a', m: 1, v: 15, d: 'дзеркальна · золотий блиск', sw: mirSw('#ffe9a8', '#b9832a', '#ffd877', '#7a5213') },
  { id: 'mbronze', g: 'Дзеркальні', n: 'Бронзове дзеркало', c: '#a8703a', m: 1, v: 15, d: 'дзеркальна · бронзовий блиск', sw: mirSw('#e3b98c', '#7f5128', '#d29c66', '#4c2e14') },
  { id: 'sky', g: 'Дзеркальні', n: 'Блакитне дзеркало', c: '#6fb3ff', m: 1, v: 15, d: 'дзеркальна · блакитний блиск', sw: mirSw('#d4e9ff', '#4a87cc', '#a9d2ff', '#27548a') },
  { id: 'navy', g: 'Дзеркальні', n: 'Темно-синє дзеркало', c: '#2a4fb0', m: 1, mg: .6, v: 15, d: 'дзеркальна · темно-синя', sw: mirSw('#7b98e0', '#1d3a85', '#5b7cd0', '#0f2150') },
  { id: 'mgreen', g: 'Дзеркальні', n: 'Зелене дзеркало', c: '#3f9e62', m: 1, v: 15, d: 'дзеркальна · зелений блиск', sw: mirSw('#a6e0bb', '#2c7748', '#7cc99a', '#17472a') },
  { id: 'mblack', g: 'Дзеркальні', n: 'Чорне дзеркало', c: '#4a4f57', m: 1, mg: .3, v: 5, d: 'дзеркальна · майже чорна', sw: mirSw('#8d939c', '#25292f', '#6d737c', '#0e1013') },
  { id: 'chblue', g: 'Хамелеон', n: 'Синьо-фіолетовий', ir: [.36, -.25], v: 80, d: 'хамелеон · колір змінюється під кутом', sw: 'linear-gradient(120deg,#2b6bff,#6a44ff 55%,#c04fe0)' },
  { id: 'chgreen', g: 'Хамелеон', n: 'Зелено-фіолетовий', ir: [.67, -.5], v: 80, d: 'хамелеон · колір змінюється під кутом', sw: 'linear-gradient(120deg,#2fd07a,#2d8fd8 50%,#9a4fe6)' },
  { id: 'chred', g: 'Хамелеон', n: 'Червона веселка', ir: [0, .9], v: 80, d: 'хамелеон · веселкові переливи', sw: 'linear-gradient(120deg,#ff4d4d,#ffb03a 35%,#3fd67c 62%,#4a7dff)' },
  { id: 'chrob', g: 'Хамелеон', n: 'Червоно-оранжево-синій', ir: [.9, .5], v: 80, d: 'хамелеон · колір змінюється під кутом', sw: 'linear-gradient(120deg,#e0364e,#ff9a3a 50%,#2f6bff)' },
  { id: 'athermal', g: 'Спеціальні', n: 'Атермальна', c: '#9fd8d0', np: 1, v: 80, d: 'прозора · захищає від УФ', sw: 'linear-gradient(135deg,#d8f4ef,#7fc2b8)' },
  { id: 'white', g: 'Спеціальні', n: 'Біла матова', c: '#e6e9ee', mat: 1, v: 50, d: 'матова · непрозора', sw: 'linear-gradient(135deg,#ffffff,#c9ced6)' },
  { id: 'none', g: 'Спеціальні', n: 'Без плівки', d: 'без плівки', sw: 'linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.03))' },
];
const FILM = Object.fromEntries(FILMS.map(f => [f.id, f]));
function filmVecs(cfg, A, B) {
  if (!cfg) { A.set(.29, .37, .44, 1); B.set(0, 0, 0, 0); return; }
  // % керує кожною плівкою: менший % — темніше, насиченіше й щільніше; більший — світліше, блідіше й прозоріше
  const f = FILM[cfg.f], T = cfg.v / 100, t2 = T * T;
  const mEff = !f.m ? 0 : f.m >= .9 ? f.m * (1 - .7 * Math.pow(T, 1.6)) : f.m * T; // повне дзеркало слабшає з %, легкий металевий блиск — навпаки
  const mGain = lerp(.12, 1, Math.pow(T, .7)) * (f.mg ?? 1); // у темному шоурумі щільне дзеркало відбиває темряву
  if (f.ir) { A.set(0, 0, 0, T); B.set(0, f.ir[1], 0, f.ir[0]); return; }
  if (f.mat) { const c = new THREE.Color(f.c); A.set(c.r, c.g, c.b, T); B.set(0, 0, 1, 0); return; }
  if (f.c) {
    const c = new THREE.Color(f.c), L = (.06 + .94 * Math.pow(T, 1.3)) * (f.np ? 1 + .3 * t2 : 1), pale = f.np ? 0 : smooth(clamp((T - .35) / .55, 0, 1)) * .5;
    A.set(lerp(c.r * L, .29 * t2, pale), lerp(c.g * L, .37 * t2, pale), lerp(c.b * L, .44 * t2, pale), T); B.set(mEff, 0, 0, mGain); return;
  }
  const t = f.t || [.29, .37, .44]; A.set(t[0] * t2, t[1] * t2, t[2] * t2, T); B.set(mEff, 0, 0, f.m ? mGain : 0);
}
const G = { // спільні для всіх авто
  uFilmA: { value: Array.from({ length: 6 }, () => new THREE.Vector4(.29, .37, .44, 1)) }, uFilmB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uFilmP: { value: new THREE.Vector2(-1, 0) },
  uTime: { value: 0 }, uGlow: { value: new THREE.Vector4() }, uTint: { value: new THREE.Vector4(1, .15, .15, 0) }, uTintOn: { value: 0 },
  uShine: { value: -1 }, uCrack: { value: null }, uCrackOn: { value: 0 }, uHeal: { value: 0 },
  // вибране вікно: x — зона, y — бік (1 лівий, -1 правий, 0 — без боку), z — сила підсвітки
  uSel: { value: new THREE.Vector4() },
  // скол: точка й радіус, площина скла, ріст 0..1, вигляд (промені, кільця, зерно, довгі тріщини)
  uChipP: { value: new THREE.Vector4(0, -9, 0, .1) }, uChipN: { value: new THREE.Vector3(1, 0, 0) },
  uChipU: { value: new THREE.Vector3(0, 0, 1) }, uChipV: { value: new THREE.Vector3(0, 1, 0) },
  uChipOn: { value: 0 }, uChipK: { value: new THREE.Vector4(9, 1, 1, 0) }, uRoofGlow: { value: 0 },
};
// процедурний скол / тріщина / павутина навколо точки удару
const CHIP_GLSL = `
uniform vec4 uSel; uniform vec4 uChipP; uniform vec3 uChipN; uniform vec3 uChipU; uniform vec3 uChipV; uniform float uChipOn; uniform vec4 uChipK;
float selSide(vec3 lp) { return mix(1., step(0., lp.x * uSel.y), abs(uSel.y)); }
float chipPat(vec3 lp) {
  if (uChipOn < .001) return 0.;
  vec3 d = lp - uChipP.xyz;
  vec2 p = vec2(dot(d, uChipU), dot(d, uChipV)) / uChipP.w;
  float r = length(p);
  if (r > 1.05 || abs(dot(d, uChipN)) > .4) return 0.;
  float g = uChipOn, N = uChipK.x;
  float a = atan(p.y, p.x);
  float s = (a / 6.2831853 + .5) * N, id = floor(s);
  float h = fract(sin(id * 91.7 + uChipK.z * 17.3) * 43758.5453), h2 = fract(h * 13.37 + .21);
  float len = mix(.3, 1., h * h) * g;
  if (uChipK.w > .5 && mod(id, max(1., floor(N * .5))) < 1.) len = g;
  float jit = (h2 - .5) * .45 + sin(r * 17. + id * 2.7) * .06 + sin(r * 43. + id * 5.1) * .02;
  float dA = abs(fract(s) - .5 - jit * .4) * 6.2831853 / N * r;
  float w = mix(.014, .004, clamp(r / max(len, .001), 0., 1.)) + fwidth(dA) * .8;
  float leg = smoothstep(w, w * .2, dA) * (1. - smoothstep(len * .85, len, r));
  float rings = 0.;
  for (int k = 1; k <= 3; k++) {
    float fk = float(k);
    if (fk > uChipK.y) break;
    float rr = (.12 + .24 * fk) * g + .012 * sin(a * 7. + fk * 2.);
    float on = step(.3, fract(sin(floor(a * (2. + fk) + fk) * 12.9898) * 437.585));
    rings += smoothstep(.01 + fwidth(r), 0., abs(r - rr)) * on;
  }
  float core = smoothstep(.07, .02, r) + smoothstep(.2, 0., r) * .4;
  return clamp(leg + rings * .8 + core * step(.02, g), 0., 1.);
}
`;
const GLASS_HEAD = `
varying float vZone;
uniform mat4 uInv; uniform vec3 uMin; uniform vec3 uMax; uniform vec4 uWs;
uniform vec4 uFilmA[6]; uniform vec4 uFilmB[6]; uniform vec2 uFilmP; uniform float uWinC;
uniform vec4 uGlow; uniform vec4 uTint; uniform float uTintOn; uniform float uShine; uniform float uTime;
uniform sampler2D uCrack; uniform float uCrackOn; uniform float uHeal;
float zoneIs(float z) { return 1.0 - step(.5, abs(vZone - z)); }
` + CHIP_GLSL;
// темна «скляна» панель люка, намальована прямо на даху (для авто без скляного даху)
const ROOF_HEAD = `
uniform mat4 uInv; uniform vec4 uRoof; uniform float uRoofOn; uniform float uRoofGlow; uniform float uTime;
` + CHIP_GLSL;
const ROOF_BODY = `
if (uRoofOn > .5) {
  vec3 lq = (uInv * vec4(vScanW, 1.0)).xyz; lq.y = abs(lq.y);
  vec2 rq = vec2(abs(lq.x) - uRoof.x, abs(lq.z - uRoof.y) - uRoof.z);
  float rc = min(uRoof.x, uRoof.z) * .35;
  float sd = length(max(rq + rc, 0.)) + min(max(rq.x + rc, rq.y + rc), 0.) - rc;
  float up = step(uRoof.w, lq.y);
  float inR = up * (1. - smoothstep(-.004, .004, sd));
  float seal = up * smoothstep(.02, 0., abs(sd + .008));
  float zf = clamp((lq.z - uRoof.y + uRoof.z) / (2. * uRoof.z), 0., 1.);
  // чорне тоноване скло: колір не залежить від освітлення кузова, тож ребра й метал під ним не видно
  float sheen = smoothstep(.22, 0., abs((lq.z - uRoof.y) / uRoof.z * .55 + lq.x / uRoof.x * .3 - .2));
  vec3 glassC = vec3(.006, .008, .012) + vec3(.02, .035, .05) * smoothstep(.3, 1., zf) + vec3(.06, .075, .09) * sheen * .55;
  outgoingLight = mix(outgoingLight, glassC, inR);
  outgoingLight = mix(outgoingLight, vec3(.01), seal * .85);
  float g5 = clamp(uRoofGlow + step(4.5, uSel.x) * uSel.z, 0., 1.);
  float sw = .5 + .5 * sin(lq.z * 6. + lq.x * 3. - uTime * 2.2);
  float rim = up * smoothstep(.022, 0., abs(sd + .004));
  outgoingLight = mix(outgoingLight, vec3(.12, .3, .4) * (.5 + .5 * sw), g5 * inR * .1);
  outgoingLight += vec3(.55, .9, 1.) * g5 * (rim * 1.3 + inR * smoothstep(.93, 1., sw) * .1);
  float ckR = chipPat(lq) * inR * step(4.5, uSel.x);
  outgoingLight = mix(outgoingLight, vec3(.93, .98, 1.), ckR * .92);
}
`;
const GLASS_BODY = `
float zW = zoneIs(1.), zSF = zoneIs(2.), zSR = zoneIs(3.), zR = zoneIs(4.), zT = zoneIs(5.);
float zWin = clamp(zW + zSF + zSR + zR + zT, 0., 1.);
vec3 lp = (uInv * vec4(vScanW, 1.0)).xyz; lp.y = abs(lp.y);
vec3 q = (lp - uMin) / (uMax - uMin);
vec2 wsuv = vec2((q.x - uWs.x) / (uWs.y - uWs.x), (q.y - uWs.z) / (uWs.w - uWs.z));
float strip = zW * smoothstep(.8, .82, wsuv.y) * uTint.w;
float aBase = mix(.2, mix(.32, .48, clamp(zSF + zSR + zR + zT, 0., 1.)), zWin);
float sL = step(0., lp.x); // +x — ліва (водійська) сторона
vec4 fa = uFilmA[0] * zW + (uFilmA[1] * sL + uFilmA[2] * (1. - sL)) * zSF + (uFilmA[3] * sL + uFilmA[4] * (1. - sL)) * zSR + uFilmA[5] * zR;
vec4 fb = uFilmB[0] * zW + (uFilmB[1] * sL + uFilmB[2] * (1. - sL)) * zSF + (uFilmB[3] * sL + uFilmB[4] * (1. - sL)) * zSR + uFilmB[5] * zR;
float zF = clamp(zW + zSF + zSR + zR, 0., 1.), tK = uTintOn * zF;
float vlt = mix(fa.a, .2, strip), t2 = vlt * vlt; // світло проходить плівку двічі: у салон і назад до очей
vec3 nVw = normalize(vViewPosition);
float nv = abs(dot(nVw, normal));
vec3 rw = inverseTransformDirection(reflect(-nVw, normal), viewMatrix); // куди дивиться відбиття: небо, горизонт, земля
float rg = rw.y * 1.2 + (q.y - uWinC) * 3.4; // у дзеркалі: знизу темна земля, згори світле небо, між ними яскрава лінія горизонту
vec3 mir = mix(vec3(.04, .05, .065), vec3(.62, .7, .8), smoothstep(-.4, .45, rg));
mir += vec3(.95, .98, 1.) * smoothstep(.05, 0., abs(rg - .02)) * .85;
mir += vec3(.9, .95, 1.) * smoothstep(.16, 0., abs(fract(q.z * 5. + q.y * 3. + rw.x * 1.5) - .5)) * .3;
float irA = step(.001, abs(fb.y));
vec3 body = mix(fa.rgb, (.5 + .5 * cos(6.2832 * (fb.w + (1. - nv) * fb.y + vec3(0., .33, .67)))) * (.06 + .94 * pow(vlt, 1.3)) * .85, irA);
body = mix(body, vec3(.29, .37, .44) * .04, strip);
float aF = mix(mix(1.0 - t2 * .78, .98 - .9 * vlt, fb.z), 1.0 - t2 * .35, fb.x);
aF = mix(aF, 1.0 - t2 * .55, irA);
vec3 envL = outgoingLight * mix(mix(.12, .5, vlt), 0., fb.z);
vec3 mirT = fa.rgb / max(max(fa.r, max(fa.g, fa.b)), .002); // відтінок дзеркала
vec3 filmC = mix(body + envL, mir * mirT * 1.1 * fb.w + envL * .15, fb.x);
filmC *= mix(1., min(.9 / max(aF, .35), 2.2), clamp(step(.001, fb.w) + irA, 0., 1.)); // кольорові й дзеркальні: темний салон за склом не «з'їдає» яскравість
float aOut = mix(aBase, aF, tK);
outgoingLight = mix(outgoingLight, filmC, tK);
float wP = uFilmP.x < -.5 ? 0. : uFilmP.x < .5 ? zW : uFilmP.x < 1.5 ? zSF * sL : uFilmP.x < 2.5 ? zSF * (1. - sL) : uFilmP.x < 3.5 ? zSR * sL : uFilmP.x < 4.5 ? zSR * (1. - sL) : zR;
outgoingLight += vec3(.55, .9, 1.) * wP * uFilmP.y * uTintOn * .55; aOut = max(aOut, wP * uFilmP.y * uTintOn * .5); // коротке блимання вибраного вікна
float film = clamp(zF * step(fa.a, .99) + strip, 0., 1.) * uTintOn;
float shine = film * smoothstep(.07, 0., abs((1.0 - q.z) - uShine));
outgoingLight += vec3(.75, .93, 1.) * shine * .9; aOut = max(aOut, shine * .8);
float glow = clamp(uGlow.x * zW + uGlow.y * (zSF + zSR) + uGlow.z * zR + uGlow.w * zT, 0., 1.);
float sweep = .5 + .5 * sin((q.z * 6.0 + q.y * 3.0) - uTime * 2.2);
outgoingLight = mix(outgoingLight, vec3(.45, .86, 1.) * (.55 + .45 * sweep), glow * .7);
outgoingLight += vec3(.5, .9, 1.) * glow * smoothstep(.8, 1., sweep) * .9;
aOut = max(aOut, glow * .82);
float inWs = zW * step(0., wsuv.x) * step(wsuv.x, 1.) * step(0., wsuv.y) * step(wsuv.y, 1.);
float ck = texture2D(uCrack, vec2(wsuv.x, 1.0 - wsuv.y)).a * inWs * uCrackOn * step(uHeal, wsuv.x);
float healBand = inWs * uCrackOn * (1.0 - smoothstep(0.0, .06, abs(wsuv.x - uHeal))) * step(.001, uHeal) * step(uHeal, .999);
outgoingLight = mix(outgoingLight, vec3(1.0), ck) + vec3(.6, .9, 1.) * healBand * .9;
aOut = max(aOut, max(ck, healBand * .8));
float selM = zoneIs(uSel.x) * selSide(lp);
float selW = selM * uSel.z;
outgoingLight = mix(outgoingLight, vec3(.45, .86, 1.) * (.45 + .4 * sweep), selW * .5);
outgoingLight += vec3(.5, .9, 1.) * selW * smoothstep(.85, 1., sweep) * .6;
aOut = max(aOut, selW * .62);
float chipM = chipPat(lp) * selM;
outgoingLight = mix(outgoingLight, vec3(.93, .98, 1.), chipM * .92);
aOut = max(aOut, chipM * .92);
diffuseColor.a = aOut;
`;
function patch(mat, car, glass) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uScan = car.uScan;
    if (glass) Object.assign(sh.uniforms, G, car.U);
    else Object.assign(sh.uniforms, { uInv: car.U.uInv, uRoof: car.uRoof, uRoofOn: car.uRoofOn, uRoofGlow: G.uRoofGlow, uTime: G.uTime, uSel: G.uSel, uChipP: G.uChipP, uChipN: G.uChipN, uChipU: G.uChipU, uChipV: G.uChipV, uChipOn: G.uChipOn, uChipK: G.uChipK });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScanW;' + (glass ? '\nattribute float aZone;\nvarying float vZone;' : ''))
      .replace('#include <project_vertex>', '#include <project_vertex>\nvScanW = (modelMatrix * vec4(transformed, 1.0)).xyz;' + (glass ? '\nvZone = aZone;' : ''));
    let f = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScanW;\nuniform vec4 uScan;' + (glass ? GLASS_HEAD : ROOF_HEAD))
      .replace('void main() {', 'void main() {\nfloat scanD = abs(vScanW.y) - uScan.x;\nif (uScan.z > .5 && scanD > 0.0) discard;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb += vec3(.5, .88, 1.) * uScan.z * (smoothstep(.045, 0., abs(scanD)) * 3.0 + smoothstep(.45, 0., abs(scanD)) * .16);');
    f = f.replace('#include <opaque_fragment>', (glass ? GLASS_BODY : ROOF_BODY) + '\n#include <opaque_fragment>');
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => glass ? 'am5-glass' : 'am5-std';
  mat.needsUpdate = true;
}

/* ---------- розбір скла на зони: 1 лобове, 2 передні бокові, 3 задні бокові, 4 заднє, 5 дах ---------- */
function classifyGlass(car, meshes) {
  const { box, size } = car;
  const inv = new THREE.Matrix4().copy(car.group.matrixWorld).invert();
  const islands = [], perMesh = [];
  const v = new THREE.Vector3(), M = new THREE.Matrix4();
  for (const m of meshes) {
    const g = m.geometry, pos = g.attributes.position, n = pos.count;
    M.multiplyMatrices(inv, m.matrixWorld);
    const P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(M).sub(box.min).divide(size); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
    const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
    const weld = new Map(), E = 1500;
    for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * E) + '|' + Math.round(P[i * 3 + 1] * E) + '|' + Math.round(P[i * 3 + 2] * E); const j = weld.get(k); if (j === undefined) weld.set(k, i); else uni(i, j); }
    const idx = g.index, tris = idx ? idx.count / 3 : n / 3;
    const tv = new Int32Array(3);
    const getT = t => { if (idx) { tv[0] = idx.getX(t * 3); tv[1] = idx.getX(t * 3 + 1); tv[2] = idx.getX(t * 3 + 2); } else { tv[0] = t * 3; tv[1] = t * 3 + 1; tv[2] = t * 3 + 2; } return tv; };
    for (let t = 0; t < tris; t++) { getT(t); uni(tv[0], tv[1]); uni(tv[1], tv[2]); }
    const acc = new Map();
    for (let t = 0; t < tris; t++) {
      getT(t); const a = tv[0] * 3, b = tv[1] * 3, c = tv[2] * 3;
      const e1x = (P[b] - P[a]) * size.x, e1y = (P[b + 1] - P[a + 1]) * size.y, e1z = (P[b + 2] - P[a + 2]) * size.z;
      const e2x = (P[c] - P[a]) * size.x, e2y = (P[c + 1] - P[a + 1]) * size.y, e2z = (P[c + 2] - P[a + 2]) * size.z;
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const ar = Math.hypot(nx, ny, nz) * .5; if (!ar) continue;
      const r = find(tv[0]); let s = acc.get(r);
      if (!s) { s = { ax: 0, ay: 0, az: 0, area: 0, cx: 0, cy: 0, cz: 0, zmin: 9, zmax: -9 }; acc.set(r, s); }
      s.ax += Math.abs(nx) * .5; s.ay += Math.abs(ny) * .5; s.az += Math.abs(nz) * .5; s.area += ar;
      s.cx += (P[a] + P[b] + P[c]) / 3 * ar; s.cy += (P[a + 1] + P[b + 1] + P[c + 1]) / 3 * ar; s.cz += (P[a + 2] + P[b + 2] + P[c + 2]) / 3 * ar;
      s.zmin = Math.min(s.zmin, P[a + 2], P[b + 2], P[c + 2]); s.zmax = Math.max(s.zmax, P[a + 2], P[b + 2], P[c + 2]);
    }
    acc.forEach(s => { s.cx /= s.area; s.cy /= s.area; s.cz /= s.area; s.nx = s.ax / s.area; s.ny = s.ay / s.area; s.nz = s.az / s.area; islands.push(s); });
    perMesh.push({ m, P, find, acc, n });
  }
  // belt — нижче цієї висоти скло вважаємо фарами/ліхтарями; frontMin/rearMax — вікна лише на обшивці, не в салоні
  const cfg = car.cfg, belt = cfg.belt ?? .6, frontMin = cfg.frontMin ?? .58, rearMax = cfg.rearMax ?? .35;
  const sides = [];
  for (const s of islands) {
    if (s.cy < belt) s.zone = 0;
    else if (s.ny > .8 && s.cy > .88) s.zone = 5;
    else if (s.nx > s.nz && s.nx > s.ny * .8) { s.zone = Math.abs(s.cx - .5) > .28 ? 3 : 0; if (s.zone) sides.push(s); }
    else s.zone = s.cz > frontMin ? 1 : s.cz < rearMax ? 4 : 0;
  }
  [sides.filter(s => s.cx >= .5), sides.filter(s => s.cx < .5)].forEach(list => {
    if (!list.length) return;
    const maxA = Math.max(...list.map(s => s.area));
    list.sort((a, b) => b.cz - a.cz);
    const D = list.find(s => s.area > maxA * .25);
    list.forEach(s => { if (s.cz >= D.zmin - .01) s.zone = 2; });
  });
  const zoneArea = [0, 0, 0, 0, 0, 0], cen = [...Array(6)].map(() => new THREE.Vector3());
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  const sidePlus = { 2: null, 3: null };
  for (const pm of perMesh) {
    const zones = new Float32Array(pm.n);
    for (let i = 0; i < pm.n; i++) {
      const s = pm.acc.get(pm.find(i)); const z = s ? s.zone : 0; zones[i] = z;
      if (z === 1) { const px = pm.P[i * 3], py = pm.P[i * 3 + 1]; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    }
    pm.m.geometry.setAttribute('aZone', new THREE.BufferAttribute(zones, 1));
  }
  for (const s of islands) {
    zoneArea[s.zone] += s.area;
    if (s.zone === 2 || s.zone === 3) { if (s.cx >= .5 && (!sidePlus[s.zone] || s.area > sidePlus[s.zone].area)) sidePlus[s.zone] = s; continue; }
    cen[s.zone].x += s.cx * s.area; cen[s.zone].y += s.cy * s.area; cen[s.zone].z += s.cz * s.area;
  }
  [1, 4, 5].forEach(z => { if (zoneArea[z]) cen[z].divideScalar(zoneArea[z]); });
  [2, 3].forEach(z => { const s = sidePlus[z]; if (s) cen[z].set(s.cx, s.cy, s.cz); });
  const toLocal = q => q.clone().multiply(size).add(box.min);
  car.zoneArea = zoneArea;
  car.anchors = {
    1: zoneArea[1] ? toLocal(cen[1]) : new THREE.Vector3(0, size.y * .75, size.z * .2),
    2: sidePlus[2] ? toLocal(cen[2]) : new THREE.Vector3(size.x * .48, size.y * .7, size.z * .05),
    3: sidePlus[3] ? toLocal(cen[3]) : new THREE.Vector3(size.x * .48, size.y * .7, -size.z * .15),
    4: zoneArea[4] ? toLocal(cen[4]) : new THREE.Vector3(0, size.y * .72, -size.z * .45),
    5: zoneArea[5] ? toLocal(cen[5]) : null,
  };
  if (x1 > x0 && y1 > y0) car.U.uWs.value.set(x0, x1, y0, y1);
  car.islands = islands;
}

/* ---------- голограма люка на даху ---------- */
function makeSunroof(car) {
  const { size, box } = car;
  // профіль висоти даху по вершинах (швидше за промені): смужка біля x = 18% ширини, щоб оминути антену
  const NB = 61, xs = size.x * .18, tol = size.x * .07, hs = [];
  for (let i = 0; i < NB; i++) hs.push({ z: box.min.z + size.z * (.08 + .84 * i / (NB - 1)), y: -1 });
  const inv = new THREE.Matrix4().copy(car.group.matrixWorld).invert(), M = new THREE.Matrix4(), v = new THREE.Vector3();
  car.model.traverse(o => {
    if (!o.isMesh || o.userData.glass) return;
    const pos = o.geometry.attributes.position; M.multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(M);
      if (Math.abs(Math.abs(v.x) - xs) > tol) continue;
      const b = Math.round(((v.z - box.min.z) / size.z - .08) / .84 * (NB - 1));
      if (b >= 0 && b < NB && v.y > hs[b].y) hs[b].y = v.y;
    }
  });
  const yMax = Math.max(...hs.map(h => h.y)); let best = [0, 0], cur = null;
  hs.forEach((h, i) => { if (h.y > yMax - size.y * .05) { if (!cur) cur = [i, i]; cur[1] = i; if (cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); } else cur = null; });
  const z0 = hs[best[0]].z, z1 = hs[best[1]].z;
  const zc = car.cfg.roofZ != null ? box.min.z + size.z * car.cfg.roofZ : (z0 + z1) / 2;
  const len = car.cfg.roofLen != null ? size.z * car.cfg.roofLen : clamp((z1 - z0) * .72, size.z * .14, size.z * .3), wid = size.x * .54;
  // темна панель люка на даху: межа — найнижча точка даху під панеллю, трохи з запасом
  let yMin = 9; hs.forEach(h => { if (Math.abs(h.z - zc) <= len / 2 && h.y > 0) yMin = Math.min(yMin, h.y); });
  car.uRoof.value.set(wid / 2, zc, len / 2, (yMin < 9 ? yMin : yMax) - size.y * .035);
  car.uRoofOn.value = car.hasRoofGlass ? 0 : 1;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uOn: { value: 0 }, uTime: G.uTime, uAsp: { value: len / wid } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uOn; uniform float uTime; uniform float uAsp;
      float sdr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
      void main(){
        vec2 p = (vUv - .5) * vec2(1., uAsp);
        float d = sdr(p, vec2(.46, .46 * uAsp), .06);
        float inside = step(d, 0.);
        float edge = smoothstep(.022, 0., abs(d)) + smoothstep(.12, 0., abs(d)) * .25;
        float slide = fract(uTime * .35);
        float band = smoothstep(.09, 0., abs(vUv.y - slide)) * inside;
        float streak = smoothstep(.06, 0., abs(vUv.x + vUv.y * .6 - fract(uTime * .22) * 2.2 + .4)) * inside * .55;
        float grid = (step(.985, fract(vUv.x * 14.)) + step(.98, fract(vUv.y * 9.))) * inside * .12;
        float a = (edge * 1.3 + inside * .1 + band * .45 + streak + grid) * uOn;
        gl_FragColor = vec4(vec3(.56, .89, 1.) * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, yMax + size.y * .025, zc); mesh.renderOrder = 5; mesh.visible = false;
  car.group.add(mesh);
  car.sunroof = mesh;
  if (!car.anchors[5] || !car.hasRoofGlass) car.anchors[5] = new THREE.Vector3(0, yMax, zc);
}

/* ---------- студійне оточення для відблисків ---------- */
function studioEnv(renderer) {
  const s = new THREE.Scene();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (w, h, d, x, y, z, k, col = 0xffffff) => { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) })); m.scale.set(w, h, d); m.position.set(x, y, z); s.add(m); };
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: 0x07090d, side: THREE.BackSide })); room.position.y = 7; s.add(room);
  add(.35, .05, 14, -1.7, 7, 0, 7); add(.35, .05, 14, 1.7, 7, 0, 7); add(.6, .05, 14, 0, 7.4, 0, 3.2);
  add(.05, 3, 9, -9, 3, 0, 3.2); add(.05, 3, 9, 9, 3, 0, 1.6, 0xffd36a);
  add(12, 1.4, .05, 0, 2.4, -11, 2.2, 0x9fdcff); add(12, .8, .05, 0, 4.6, 11, 1.4);
  add(30, .05, 30, 0, -.9, 0, .05);
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, .035).texture; pm.dispose();
  return t;
}

/* ---------- 3D ---------- */
const canvas = $('[data-gl]');
const stageEl = $('.stage');
const state = { c: 0, chapter: 0, spin: 0, mouseX: 0, mouseY: 0, drag: 0, dragV: 0, dragging: false, intro: 0, tintOn: 0, zoom: 1 };
let E = null; // рушій

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

function makeCrackTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d');
  const crack = genCrack(560, 230, 640, rng(31), { rays: 13, rings: 3 });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  let last = -1;
  return { tex, set(p) { const q = Math.round(p * 60) / 60; if (q === last) return; last = q; ctx.clearRect(0, 0, 1024, 512); if (q > 0) drawCrack(ctx, crack, q, 2.6); tex.needsUpdate = true; } };
}

async function init3D() {
  if (!webglOK()) return null;
  const mobile = isMobile();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 200);

  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 8, 4); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); key.shadow.radius = 8; key.shadow.bias = -.0004;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 });
  scene.add(key);
  const rimC = new THREE.PointLight(0x7fdcff, 40, 30, 2); rimC.position.set(-5, 2.2, -4); scene.add(rimC);
  const rimW = new THREE.PointLight(0xffc36b, 24, 30, 2); rimW.position.set(5, 1.6, -5); scene.add(rimW);
  scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x101010, .3));

  // підлога: дзеркальне відображення гаситься напівпрозорою «підлогою» кольору фону
  const fadeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#c4c4c4'); gr.addColorStop(.45, '#e6e6e6'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x07090d, alphaMap: fadeTex, transparent: true, depthWrite: false, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; scene.add(floor);
  const shadowMat = new THREE.ShadowMaterial({ opacity: .6, depthWrite: false });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = .002; ground.receiveShadow = true; ground.renderOrder = 1; scene.add(ground);
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256); gr.addColorStop(0, 'rgba(143,227,255,.2)'); gr.addColorStop(.55, 'rgba(143,227,255,.05)'); gr.addColorStop(1, 'rgba(143,227,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowDisc.rotation.x = -Math.PI / 2; glowDisc.position.y = .004; glowDisc.renderOrder = 2; scene.add(glowDisc);
  // рамка сканера, що бігає по авто при зміні
  const scanTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.strokeStyle = 'rgba(160,232,255,1)'; g.shadowColor = 'rgba(143,227,255,1)'; g.shadowBlur = 18; g.lineWidth = 5; g.strokeRect(22, 22, 212, 212); g.shadowBlur = 0; g.lineWidth = 2; g.strokeRect(22, 22, 212, 212); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const scanRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  scanRing.rotation.x = -Math.PI / 2; scanRing.visible = false; scanRing.renderOrder = 6; scene.add(scanRing);

  const pivot = new THREE.Group(); scene.add(pivot);
  const crackT = makeCrackTexture(); G.uCrack.value = crackT.tex;

  // моделі стиснуті Draco (точні нормалі, 12 біт) — удвічі легші за meshopt і без «вм'ятин» на фарбі
  const draco = new DRACOLoader().setDecoderPath('js/vendor/three/addons/libs/draco/'); draco.preload();
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  const cache = {}, pending = {};
  let noMirror = false;

  function load(keyName, onProg) {
    if (cache[keyName]) return Promise.resolve(cache[keyName]);
    if (pending[keyName]) return pending[keyName];
    const cfg = CARS[keyName];
    pending[keyName] = new Promise((res, rej) => loader.load(cfg.url, res, e => { if (e.total && onProg) onProg(e.loaded / e.total); }, rej)).then(gltf => {
      const car = setupCar(keyName, cfg, gltf.scene); cache[keyName] = car; delete pending[keyName]; return car;
    });
    return pending[keyName];
  }

  function setupCar(keyName, cfg, model) {
    // групу додаємо на поворотний стіл лише в кінці: усі розміри рахуємо без його повороту
    const group = new THREE.Group(); group.visible = false;
    let box = new THREE.Box3().setFromObject(model); let size = box.getSize(new THREE.Vector3());
    if (size.x > size.z) model.rotation.y = Math.PI / 2;
    model.rotation.y += cfg.yaw || 0;
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model); size = box.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(4.6 / size.z); model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model); const ctr = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(ctr.x, box.min.y, ctr.z));
    group.add(model); group.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model); size = box.getSize(new THREE.Vector3());
    const car = {
      key: keyName, cfg, group, model, box, size,
      uScan: { value: new THREE.Vector4(0, 0, 1, 0) },
      U: { uWinC: { value: .75 }, uInv: { value: new THREE.Matrix4() }, uMin: { value: box.min.clone() }, uMax: { value: box.max.clone() }, uWs: { value: new THREE.Vector4(.1, .9, .5, .85) } },
      uRoof: { value: new THREE.Vector4(0, 0, 0, 99) }, uRoofOn: { value: 0 },
    };
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b1320, metalness: 0, roughness: .02, transparent: true, opacity: .45, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: .02, side: THREE.DoubleSide, depthWrite: false });
    patch(glassMat, car, true);
    const used = new Map(); model.traverse(o => { if (o.isMesh) used.set(o.geometry, (used.get(o.geometry) || 0) + 1); });
    const glassMeshes = [], patched = new Set();
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false; // без самотіні: інакше смуги на даху
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m, i) => {
        if (!m) return;
        const nm = ((m.name || '') + ' ' + (o.name || '')).toLowerCase();
        if (cfg.glass(nm)) {
          if (used.get(o.geometry) > 1) o.geometry = o.geometry.clone();
          if (Array.isArray(o.material)) o.material[i] = glassMat; else o.material = glassMat;
          o.castShadow = false; o.renderOrder = 3; o.userData.glass = true; if (!glassMeshes.includes(o)) glassMeshes.push(o);
          return;
        }
        if (/khronos/i.test(m.name || '') && m.map) { m.map = null; m.color?.set(0x111111); }
        if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity ?? 1, .35); m.depthWrite = false; }
        if (m.isMeshStandardMaterial) {
          m.envMapIntensity = 1.3;
          if (m.isMeshPhysicalMaterial && m.metalness > .3) { m.clearcoat = Math.max(m.clearcoat || 0, .8); m.clearcoatRoughness = .05; }
        }
        if (!patched.has(m)) { patch(m, car, false); patched.add(m); }
      });
    });
    model.updateMatrixWorld(true);
    classifyGlass(car, glassMeshes);
    car.U.uInv.value.copy(group.matrixWorld).invert();
    car.glassMeshes = glassMeshes;
    car.U.uWinC.value = (car.anchors[2].y + car.anchors[3].y) / 2 / size.y;
    car.hasRoofGlass = car.zoneArea[5] > size.x * size.z * .06;
    makeSunroof(car);
    if (!mobile) {
      const mirror = model.clone(); car.mirror = mirror; mirror.visible = !noMirror;
      mirror.position.set(model.position.x, -model.position.y, model.position.z);
      mirror.scale.set(model.scale.x, -model.scale.y, model.scale.z);
      mirror.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.userData.glass) o.renderOrder = 0; } });
      group.add(mirror);
    }
    car.presets = presets(car);
    pivot.add(group);
    return car;
  }

  // ракурси камери: t — куди дивимось, dir — звідки, r — радіус, який має влізти в кадр
  function presets(car) {
    const { size: S, anchors: A } = car, L = S.z, H = S.y, W = S.x;
    const R = .5 * Math.hypot(L, H, W);
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const side = A[2].clone().add(A[3]).multiplyScalar(.5);
    const P = [
      { t: v(0, H * .42, 0), dir: v(.62, .26, .74).normalize(), r: R * 1.07, mob: .86, fov: 30 },
      { t: A[1].clone(), dir: v(.2, .5, .85).normalize(), r: Math.max(W, H) * .85, fov: 28 },
      { t: v(0, side.y * .92, side.z), dir: v(1, .1, .02).normalize(), r: L * .5, fov: 30 },
      { t: A[4].clone(), dir: v(-.4, .42, -.8).normalize(), r: Math.max(W, H) * .92, fov: 28 },
      { t: A[5].clone(), dir: v(.36, 1.5, .55).normalize(), r: Math.max(W, L * .5) * .95, fov: 30 },
      { t: v(0, H * .45, -L * .06), dir: v(.72, .2, -.62).normalize(), r: R * .98, mob: .86, fov: 30 },
      { t: v(0, H * .48, L * .04), dir: v(.66, .34, .67).normalize(), r: R * 1.02, mob: 1.12, fov: 30 },
    ];
    car.tintPres = { r: { ...P[5], dir: v(-.72, .2, -.62).normalize() }, f: { ...P[5], t: v(0, H * .5, L * .08), dir: v(.42, .3, .86).normalize(), r: R * 1.02 } }; // камера під праві вікна й лобове
    return P;
  }

  const ro = new ResizeObserver(() => resize()); ro.observe(stageEl);
  function resize() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    measureBand();
  }
  // на телефоні ставимо авто посередині вільної смуги між перемикачем і заголовком
  let band = null;
  function measureBand() {
    const g = $('.gar-t'), hz = $('.ch-hero'), nv = $('.ch-nav'); if (!g || !hz) return;
    const s = stageEl.getBoundingClientRect(), bot = hz.getBoundingClientRect().top - s.top;
    let top = g.getBoundingClientRect().bottom - s.top;
    if (nv) { const r = nv.getBoundingClientRect(); if (r.top - s.top < s.height / 2) top = Math.max(top, r.bottom - s.top); }
    band = bot - top > 40 && s.height ? clamp(.5 - (top + bot) / 2 / s.height, -.05, .2) : null;
  }
  document.fonts && document.fonts.ready.then(measureBand);
  addEventListener('load', measureBand);
  resize();

  let current = null, busy = false;
  const curP = new THREE.Vector3(), curT = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let curFov = 30, curShift = 0, curOffY = 0, visible = true, firstFrame = true, zoomCur = 1;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stageEl);
  const clock = new THREE.Timer();
  const hotEls = $$('[data-hot]');
  const sideOf = [0, 1, -1, 1, -1, 1, -1];
  const pinEl = $('[data-pin]'), pinLabel = $('[data-pin-t]');

  function framePos(pr, out) {
    const vf = THREE.MathUtils.degToRad(pr.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const D = pr.r * (camera.aspect < .8 ? (pr.mob ?? 1) : 1) / Math.sin(Math.min(vf, hf) / 2); // на телефоні свій масштаб
    return out.copy(pr.dir).multiplyScalar(D).add(pr.t);
  }

  function setCar(car) {
    current = car; car.group.visible = true;
    if (state.sel) selectWin(state.sel, state.kind, false);
    glowDisc.scale.set(car.size.z * 1.9, car.size.z * 1.9, 1);
    scanRing.scale.set(car.size.x * 1.5, car.size.z * 1.12, 1);
  }

  function scanTween(car, from, to, dur, ease) {
    return new Promise(res => {
      car.uScan.value.z = 1; car.uScan.value.x = from; scanRing.visible = true;
      const o = { v: from };
      window.gsap.to(o, { v: to, duration: dur, ease, onUpdate: () => { car.uScan.value.x = o.v; scanRing.position.y = Math.max(o.v, .01); }, onComplete: res });
    });
  }

  async function reveal() { // перша поява авто після прелоадера
    if (!current) return;
    if (reduce || !window.gsap) { current.uScan.value.z = 0; return; }
    shadowMat.opacity = 0;
    await scanTween(current, -.02, current.size.y * 1.08, 1.5, 'power2.inOut');
    current.uScan.value.z = 0; scanRing.visible = false;
    window.gsap.to(shadowMat, { opacity: .6, duration: .6 });
  }

  async function switchTo(keyName, onProg) {
    if (busy || !current || keyName === current.key) return false;
    busy = true;
    try {
      const next = await load(keyName, onProg);
      if (reduce || !window.gsap) { current.group.visible = false; next.uScan.value.z = 0; setCar(next); return true; }
      window.gsap.to(shadowMat, { opacity: 0, duration: .3 });
      await scanTween(current, current.size.y * 1.08, -.02, .7, 'power2.in');
      current.group.visible = false; current.uScan.value.z = 0;
      next.uScan.value.set(-.02, 0, 1, 0); setCar(next);
      await scanTween(next, -.02, next.size.y * 1.08, 1.05, 'power2.out');
      next.uScan.value.z = 0; scanRing.visible = false;
      window.gsap.to(shadowMat, { opacity: .6, duration: .5 });
      return true;
    } finally { busy = false; }
  }

  // якість під залізо: якщо в середньому кадр довший за 24 мс (менше ~40 кадрів/с) —
  // спершу знижуємо роздільність, потім прибираємо відображення авто в підлозі
  const gov = { n: 0, sum: 0, last: 0, step: 0, skip: 100 };
  function governor() {
    const now = performance.now(), d = gov.last ? now - gov.last : 0; gov.last = now;
    if (gov.step > 1 || document.hidden || busy) return;
    if (gov.skip > 0) { gov.skip--; return; }
    if (d > 0 && d < 200) { gov.sum += d; gov.n++; }
    if (gov.n < 120) return;
    const avg = gov.sum / gov.n; gov.sum = gov.n = 0;
    if (avg < 24) return;
    gov.step++; gov.skip = 60;
    if (gov.step === 1 && renderer.getPixelRatio() > 1.01) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .5)); resize(); }
    else { gov.step = 2; noMirror = true; Object.values(cache).forEach(c => c.mirror && (c.mirror.visible = false)); }
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !current) return;
    governor();
    clock.update(); const dt = Math.min(clock.getDelta(), .05), t = clock.getElapsed();
    G.uTime.value = t;
    const P = current.presets;
    const c = clamp(state.c, 0, P.length - 1), i = Math.floor(c), f = smooth(c - i), j = Math.min(i + 1, P.length - 1);
    const tv = state.tintView && current.tintPres ? current.tintPres[state.tintView] : null;
    const Pi = i === 6 && current.selPre ? current.selPre : i === 5 && tv ? tv : P[i], Pj = j === 6 && current.selPre ? current.selPre : j === 5 && tv ? tv : P[j];
    framePos(Pi, tmpA); framePos(Pj, tmpB); tmpP.lerpVectors(tmpA, tmpB, f);
    tmpT.lerpVectors(Pi.t, Pj.t, f);
    const heroW = 1 - clamp(c, 0, 1), tintW = clamp(c - 4, 0, 1), reqW = clamp(c - 5, 0, 1);
    // поворотний стіл + перетягування
    if (!state.touched) state.spin += dt * .12 * heroW; // легке погойдування лише до першого дотику
    const canDrag = heroW > .5 || tintW > .5;
    if ((!canDrag || state.dragTo0) && !state.dragging) { // повертаємо авто до вибраного вікна
      const to = Math.round(state.drag / (Math.PI * 2)) * Math.PI * 2;
      state.drag = lerp(state.drag, to, 1 - Math.pow(.02, dt)); if (Math.abs(state.drag - to) < .002) state.dragTo0 = false;
    }
    pivot.rotation.y = Math.sin(state.spin) * .55 * heroW + state.drag;
    tmpP.x += state.mouseX * .35 * heroW; tmpP.y += state.mouseY * .2 * heroW;
    if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / 2.6);
    const ie = 1 - Math.pow(1 - state.intro, 3);
    tmpP.sub(tmpT).multiplyScalar(lerp(1.7, 1, ie)).add(tmpT); tmpP.y += lerp(1.2, 0, ie);
    zoomCur = lerp(zoomCur, state.zoom, 1 - Math.pow(.002, dt));
    tmpP.sub(tmpT).multiplyScalar(1 / zoomCur).add(tmpT); // збільшення: камера ближче до тієї ж точки
    const k = firstFrame ? 1 : 1 - Math.pow(.0009, dt); firstFrame = false;
    curP.lerp(tmpP, k); curT.lerp(tmpT, k);
    curFov = lerp(curFov, lerp(Pi.fov, Pj.fov, f), k);
    camera.position.copy(curP); camera.lookAt(curT);
    if (Math.abs(camera.fov - curFov) > .01) { camera.fov = curFov; camera.updateProjectionMatrix(); }
    const mob = isMobile();
    const targetShift = mob ? 0 : lerp(sideOf[i], sideOf[j], f) * -.2 * (c > .5 ? 1 : c * 2);
    const targetOffY = mob ? (c < .5 ? (band ?? .1) : c > 5.5 ? .1 : c > 4.5 ? .16 : .18) : (c < .5 ? .15 : .02);
    curShift = lerp(curShift, targetShift, k); curOffY = lerp(curOffY, targetOffY, k);
    const w = renderer.domElement.width, h = renderer.domElement.height;
    camera.setViewOffset(w, h, -curShift * w, curOffY * h, w, h);
    // підсвітка скла в розділах
    const Z = [[0, 0, 0, 0], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0]];
    const z0 = Z[i], z1 = Z[j], roofGlass = current.hasRoofGlass ? 1 : 0;
    G.uGlow.value.set(lerp(z0[0], z1[0], f), lerp(z0[1], z1[1], f), lerp(z0[2], z1[2], f), lerp(z0[3], z1[3], f) * roofGlass).multiplyScalar(.85 + .15 * Math.sin(t * 3));
    const roofOn = lerp(z0[3], z1[3], f);
    const sr = current.sunroof; if (sr) { sr.material.uniforms.uOn.value = roofOn * (roofGlass ? .35 : .3); sr.visible = roofOn > .01 && roofGlass > 0; }
    G.uRoofGlow.value = roofOn * (1 - roofGlass) * (.75 + .25 * Math.sin(t * 3));
    // вибране вікно світиться й показує скол лише в розділі заявки
    const dmgW = state.chapter === 5 ? 0 : reqW; // у «Тонуванні» — лише плівка, жодних пошкоджень
    G.uSel.value.z = state.selGlow * dmgW; G.uChipOn.value = state.chipGrow * dmgW;
    // тріщина на лобовому
    const w1 = c - 1; let grow = 0, heal = 0, on = 0;
    if (state.chapter !== 5 && w1 > -.6 && w1 < 1) { on = 1; grow = clamp((w1 + .6) / .75, 0, 1); heal = clamp((w1 - .3) / .55, 0, 1); }
    crackT.set(grow); G.uCrackOn.value = on; G.uHeal.value = heal >= 1 ? 1.01 : heal;
    // тонування
    G.uTintOn.value = lerp(G.uTintOn.value, c > 4.4 && c < 5.6 ? 1 : 0, 1 - Math.pow(.05, dt));
    const tt = state.tintTarget; if (tt) G.uTint.value.lerp(tt, 1 - Math.pow(.004, dt));
    if (state.filmA) { const kf = 1 - Math.pow(.004, dt); for (let n = 0; n < 6; n++) { G.uFilmA.value[n].lerp(state.filmA[n], kf); G.uFilmB.value[n].lerp(state.filmB[n], kf); } }
    current.U.uInv.value.copy(current.group.matrixWorld).invert();
    rimC.intensity = 40 + Math.sin(t * .8) * 8;
    scene.environmentRotation.y = t * .05;
    renderer.render(scene, camera);
    hotspots(heroW);
    pin(dmgW);
  }

  // точки на склі, що «прилипли» до 3D-моделі
  const camDir = new THREE.Vector3(), nrm = new THREE.Vector3();
  const NORMALS = { 1: [0, .55, .85], 2: [1, .1, 0], 3: [1, .1, 0], 4: [0, .45, -.9], 5: [0, 1, 0] };
  function hotspots(heroW) {
    if (!hotEls.length) return;
    const show = heroW > .9 && state.intro > .85 && !busy;
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    current.group.updateMatrixWorld();
    hotEls.forEach(el => {
      const z = +el.dataset.hot, a = current.anchors[z];
      if (!a || !show) { el.classList.remove('is-on'); return; }
      tmpA.copy(a).applyMatrix4(current.group.matrixWorld);
      nrm.set(...NORMALS[z]).normalize().transformDirection(current.group.matrixWorld);
      camDir.copy(camera.position).sub(tmpA).normalize();
      const facing = nrm.dot(camDir);
      tmpA.project(camera);
      const x = (tmpA.x + 1) / 2 * w, y = (1 - tmpA.y) / 2 * h;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-on', facing > .18 && x > 30 && x < w - 30 && y > 90 && y < h * .62);
    });
    // підписи по черзі, щоб не налазили один на одного
    const now = performance.now();
    if (now - hotT > 2200) {
      hotT = now;
      const on = hotEls.filter(el => el.classList.contains('is-on'));
      hotI = on.length ? (hotI + 1) % on.length : 0;
      hotEls.forEach(el => el.classList.toggle('is-label', on[hotI] === el));
    }
  }
  let hotT = 0, hotI = -1;

  // мітка над сколом у розділі заявки
  function pin(reqW) {
    if (!pinEl) return;
    const on = reqW > .9 && state.sel && state.chipGrow > .2 && !busy;
    pinEl.classList.toggle('is-on', !!on);
    if (!on) return;
    tmpA.set(G.uChipP.value.x, G.uChipP.value.y, G.uChipP.value.z).applyMatrix4(current.group.matrixWorld).project(camera);
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    const px = (tmpA.x + 1) / 2 * w, py = (1 - tmpA.y) / 2 * h, narrow = isMobile();
    pinEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
    // на телефоні підпис стоїть над точкою (або під нею) і не вилазить за край екрана
    pinEl.classList.toggle('is-cen', narrow); pinEl.classList.toggle('is-down', narrow && py < 250);
    if (pinLabel) pinLabel.style.left = narrow ? (clamp(px - pinLabel.offsetWidth / 2, 8, w - pinLabel.offsetWidth - 8) - px).toFixed(1) + 'px' : '';
  }

  /* вибір вікна: підсвітка, політ камери й скол у точці удару */
  const KINDS = { chip: { R: .13, k: [9, 1, 0] }, crack: { R: .55, k: [4, 0, 1] }, broken: { R: .8, k: [16, 3, 0] } };
  const ZN = { 1: [0, .5, .86], 2: [1, 0, 0], 3: [1, 0, 0], 4: [0, .45, -.89], 5: [0, 1, 0] };
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), invM = new THREE.Matrix4();
  state.selGlow = 0; state.chipGrow = 0;
  function pick(clientX, clientY) {
    if (!current || busy) return null;
    const rc = canvas.getBoundingClientRect();
    ndc.set((clientX - rc.left) / rc.width * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(current.model, true)[0];
    if (!hit) return null;
    current.group.updateMatrixWorld(); invM.copy(current.group.matrixWorld).invert();
    const p = hit.point.clone().applyMatrix4(invM);
    let zone = 0;
    if (hit.object.userData.glass) { const za = hit.object.geometry.attributes.aZone; zone = za && hit.face ? Math.round(za.getX(hit.face.a)) : 0; }
    else if (current.uRoofOn.value > .5) { const R = current.uRoof.value; if (Math.abs(p.x) < R.x && Math.abs(p.z - R.y) < R.z && p.y > R.w) zone = 5; }
    if (!zone) return null;
    const n = zone !== 5 && hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(invM) : null;
    return { zone, side: zone === 2 || zone === 3 ? (p.x >= 0 ? 1 : -1) : 0, point: p, normal: n, car: current.key };
  }
  function selPreset(car, zone, side, p) {
    const { size: S } = car, L = S.z, H = S.y, W = S.x, v = (x, y, z) => new THREE.Vector3(x, y, z), t = p.clone();
    if (zone === 1) return { t, dir: v(.2, .42, .88).normalize(), r: Math.max(W, H) * .55, mob: 1.2, fov: 28 };
    if (zone === 2) return { t, dir: v(side, .24, .32).normalize(), r: L * .2, mob: 1.3, fov: 28 };
    if (zone === 3) return { t, dir: v(side, .24, -.26).normalize(), r: L * .22, mob: 1.3, fov: 28 };
    if (zone === 4) return { t, dir: v(-.22, .42, -.88).normalize(), r: Math.max(W, H) * .58, mob: 1.2, fov: 28 };
    return { t, dir: v(.3, 1.5, .5).normalize(), r: Math.max(W * .85, L * .3), mob: 1.2, fov: 30 };
  }
  function selectWin(sel, kind = 'chip', animate = true) {
    state.sel = sel; state.kind = kind;
    const gs = window.gsap;
    if (!sel || !current) { if (gs) gs.killTweensOf(state, 'selGlow,chipGrow'); state.selGlow = 0; state.chipGrow = 0; if (current) current.selPre = null; return; }
    const car = current, A = car.anchors, S = car.size;
    let p = sel.point && sel.car === car.key ? sel.point.clone() : null;
    if (!p) { // точка за замовчуванням: трохи збоку від центру скла
      p = A[sel.zone] ? A[sel.zone].clone() : new THREE.Vector3(0, S.y * .7, 0);
      if (sel.side) p.x = Math.abs(p.x) * sel.side;
      if (sel.zone === 1) { p.x += S.x * .12; p.y -= S.y * .02; }
      if (sel.zone === 4) p.x -= S.x * .08;
      if (sel.zone === 5) p.z += car.uRoof.value.z * .3;
      sel.normal = null;
    }
    sel.point = p.clone(); sel.car = car.key;
    const N = sel.normal ? sel.normal.clone() : new THREE.Vector3(...ZN[sel.zone]);
    if (!sel.normal && sel.side) N.x *= sel.side;
    N.normalize();
    const U = Math.abs(N.x) > .7 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    U.addScaledVector(N, -U.dot(N)).normalize();
    const V = new THREE.Vector3().crossVectors(N, U).normalize();
    const K = KINDS[kind] || KINDS.chip;
    G.uChipP.value.set(p.x, p.y, p.z, K.R); G.uChipN.value.copy(N); G.uChipU.value.copy(U); G.uChipV.value.copy(V);
    G.uChipK.value.set(K.k[0], K.k[1], 1 + Math.floor(Math.random() * 9), K.k[2]);
    G.uSel.value.x = sel.zone; G.uSel.value.y = sel.side || 0;
    car.selPre = selPreset(car, sel.zone, sel.side, p);
    state.dragTo0 = true; state.dragV = 0;
    if (gs && !reduce && animate) {
      gs.killTweensOf(state, 'selGlow,chipGrow');
      gs.fromTo(state, { selGlow: 1 }, { selGlow: .38, duration: 1.8, ease: 'power2.out', delay: .3 });
      gs.fromTo(state, { chipGrow: 0 }, { chipGrow: 1, duration: kind === 'chip' ? .9 : 1.5, ease: 'expo.out', delay: .55 });
    } else { state.selGlow = .38; state.chipGrow = 1; }
  }

  // перетягування мишкою / пальцем
  let lastX = 0, pinch = null;
  const pts = new Map(), zoomBtn = $('[data-zoom-x]');
  const setZoom = z => {
    state.zoom = clamp(z, 1, 2); const on = state.zoom > 1.03;
    stageEl.classList.toggle('is-zoomed', on);
    if (zoomBtn) { zoomBtn.hidden = !on; const t = $('b', zoomBtn); if (t) t.textContent = state.zoom.toFixed(1).replace('.', ',') + '×'; }
  };
  zoomBtn && zoomBtn.addEventListener('click', () => setZoom(1));
  const endDrag = () => { state.dragging = false; stageEl.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, [e.clientX, e.clientY]); stageEl.classList.add('was-touched');
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: state.zoom }; endDrag(); return; }
    if (pts.size > 2 || !(state.c < .5 || state.c > 4.5)) return;
    state.dragging = true; state.dragTo0 = false; state.touched = true; lastX = e.clientX; state.dragV = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {} stageEl.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; setZoom(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d); return; }
    if (!state.dragging) return;
    // авто йде рівно за пальцем на будь-який кут і зупиняється разом із ним: без інерції
    state.drag += (e.clientX - lastX) * Math.max(.008, 2 * Math.PI / (innerWidth * 1.1)); lastX = e.clientX;
  });
  const lift = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; endDrag(); };
  canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
  // мишка: подвійний клік або жест «зведення» на тачпаді (Ctrl + колесо) — збільшити
  canvas.addEventListener('dblclick', () => setZoom(state.zoom > 1.4 ? 1 : 2));
  canvas.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(state.zoom * Math.exp(-e.deltaY * .01)); }, { passive: false });

  const first = await load(START, p => setProgress(p * .95));
  first.uScan.value.set(-.02, 0, 1, 0);
  setCar(first);
  frame();
  E = { renderer, scene, camera, load, switchTo, reveal, pick, selectWin, setZoom, get current() { return current; }, get busy() { return busy; }, cache, G, state };
  window.__am = E;
  setProgress(1);
  // інші авто довантажуємо, коли браузер вільний (на телефоні чи в режимі економії трафіку — лише за потреби)
  const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
  if (!mobile && !saveData) idle(() => { Object.keys(CARS).filter(k => k !== START).reduce((p, k) => p.then(() => load(k).catch(() => {})), Promise.resolve()); }, { timeout: 5000 });
  return E;
}

/* ---------- сторінка ---------- */
async function main() {
  const story = $('.story'), chs = $$('.ch', story), navBtns = $$('.ch-nav button', story);
  const carBtns = $$('[data-car]');
  const credits = $$('[data-credit]');
  const carName = $$('[data-car-name]');
  // за замовчуванням усі вікна однакові; галочка вмикає свою плівку на кожне вікно
  const tintWins = { ws: null, fl: { f: 'black', v: 35 }, fr: { f: 'black', v: 35 }, rl: { f: 'black', v: 35 }, rr: { f: 'black', v: 35 }, rw: { f: 'black', v: 35 } };
  const tintCfg = { multi: false, target: 'fl', strip: false };
  let userCar = ''; // модель, яку людина знайшла в пошуку гаража
  const carLabel = () => userCar || CARS[activeCar].name;
  const WIN = { 1: 'Лобове скло', 4: 'Заднє скло', 5: 'Люк' };
  const winName = (z, sd) => z === 2 ? `Бокове переднє ${sd > 0 ? 'ліве' : 'праве'}` : z === 3 ? `Бокове заднє ${sd > 0 ? 'ліве' : 'праве'}` : WIN[z];
  const DMG = { chip: 'скол', crack: 'тріщина', broken: 'розбите' };
  let sel = null, dmg = 'crack';
  const dlg = $('[data-req]'), form = $('[data-req-form]'), reqCar = $('[data-req-car]');

  function paintCarUI(keyName) {
    const cfg = CARS[keyName];
    carBtns.forEach(b => { const on = b.dataset.car === keyName; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $$('[data-car-card]').forEach(c => c.classList.toggle('is-current', c.dataset.carCard === keyName));
    $$('[data-gar-img]').forEach(i => { i.src = `img/cars/${keyName}.webp?v=7`; });
    credits.forEach(el => { el.innerHTML = `<a href="${cfg.creditUrl}" target="_blank" rel="noopener">${cfg.credit}</a>`; });
    carName.forEach(el => { el.textContent = carLabel(); });
    const gSub = $('[data-gar-sub]'), gName = $('[data-gar-name]');
    if (gSub) gSub.textContent = userCar ? `Ваше авто · як ${cfg.ex}` : 'Авто в шоурумі';
    if (gName) gName.textContent = userCar || cfg.name;
    $$('[data-req-img]').forEach(i => { i.src = `img/cars/${keyName}.webp?v=7`; });
    try { const u = new URL(location.href); u.searchParams.set('car', keyName); history.replaceState(null, '', u); } catch (e) {}
    updateSms(); updateReq();
  }
  let activeCar = START;
  paintCarUI(START);

  let ok = false;
  try { ok = !!(await init3D()); } catch (e) { console.warn('3D failed', e); }
  if (!ok) { $('.gl-fallback').hidden = false; story.classList.add('no-3d'); }
  await whenGSAP();
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: .1, smoothWheel: true, anchors: { offset: -70 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToY = (y, d = 1.4) => lenis ? lenis.scrollTo(y, { duration: d }) : scrollTo({ top: y, behavior: 'smooth' });

  const splits = splitHeads();
  const heroIn = () => {
    lenis && lenis.start();
    E && E.reveal();
    document.documentElement.classList.add('is-in');
    if (reduce) return;
    gsap.from('.giant span', { yPercent: 40, opacity: 0, duration: 1.8, ease: 'expo.out', stagger: .12 });
    gsap.from('.h1 .w > i', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05, delay: .25 });
    gsap.from(['.ch-hero .lead', '.ch-hero .act', '.ch-hero .meta'], { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08, delay: .5 });
    gsap.from('.gar-t', { x: 40, opacity: 0, duration: 1, ease: 'expo.out', delay: .7 });
    gsap.from('.bar', { opacity: 0, duration: 1, delay: .4 });
    gar.peek(); // гараж сам виїжджає, показує авто й ховається
  };
  const gar = garage();
  setProgress(1);
  if (DEV) { // ?dev — без прелоадера, для перевірки
    loaderEl.hidden = true; lenis && lenis.start(); document.documentElement.classList.add('is-in', 'dev');
    if (E) { E.current.uScan.value.z = 0; state.intro = 1; }
    window.__go = c => goCh(Math.round(c)); window.__films = { FILMS, filmVecs };
  } else setTimeout(() => shatterOut(heroIn), 250);

  /* історія з прокруткою: 0 герой, 1 лобове, 2 бокові, 3 заднє, 4 люк, 5 тонування, 6 заявка */
  const N = 7, K = .86;
  const setCh = idx => {
    if (idx === state.chapter) return; state.chapter = idx;
    chs.forEach(el => el.classList.toggle('is-on', +el.dataset.ch === idx));
    navBtns.forEach(b => b.classList.toggle('is-on', +b.dataset.go === idx));
    story.classList.toggle('in-steps', idx > 0);
    story.classList.toggle('in-tint', idx === 5);
    story.classList.toggle('in-req', idx === 6);
    canvas.dataset.cursor = idx === 0 || idx === 5 ? 'drag' : 'pick'; dispatchEvent(new Event('am:ch'));
    if (idx > 0 && idx < 5) gar.close();
    const nav = $('.ch-nav', story), on = navBtns.find(b => +b.dataset.go === idx);
    if (nav && on && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  };
  // розділ обирають дотиком по кнопці (чи по склу), а не прокруткою — сторінка гортається вільно
  const chBar = $('[data-ch-bar]');
  const storyTop = () => story.getBoundingClientRect().top + scrollY;
  const goCh = i => {
    i = clamp(i, 0, N - 1);
    if (Math.abs(story.getBoundingClientRect().top) > 40) scrollToY(storyTop(), 1);
    setCh(i); E && E.setZoom(1);
    gsap.to(state, { c: i, duration: reduce ? 0 : clamp(.9 + Math.abs(i - state.c) * .16, .9, 1.7), ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to('.giant', { yPercent: i ? -24 : 0, opacity: i ? .22 : 1, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
    if (chBar) chBar.style.transform = `scaleX(${i / (N - 1)})`;
  };
  addEventListener('keydown', e => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.target.closest('input, textarea, select, [role="tablist"], dialog')) return;
    const r = story.getBoundingClientRect(); if (r.top > innerHeight * .4 || r.bottom < innerHeight * .6) return;
    e.preventDefault(); goCh(state.chapter + (e.key === 'ArrowRight' ? 1 : -1));
  });
  navBtns.forEach(b => b.addEventListener('click', () => goCh(+b.dataset.go)));
  $$('[data-hot]').forEach(b => b.addEventListener('click', () => goCh(+b.dataset.go)));
  $$('[data-go-ch]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goCh(+a.dataset.goCh); }));
  addEventListener('pointermove', e => { state.mouseX = e.clientX / innerWidth - .5; state.mouseY = e.clientY / innerHeight - .5; }, { passive: true });

  /* вибір авто */
  async function chooseCar(keyName) {
    if (!E || keyName === activeCar || E.busy) return;
    const prev = activeCar; activeCar = keyName; paintCarUI(keyName);
    $$(`[data-car="${keyName}"]`).forEach(b => b.classList.add('is-loading'));
    const prog = p => $$(`[data-car="${keyName}"]`).forEach(b => b.style.setProperty('--load', p.toFixed(3)));
    try {
      const switched = await E.switchTo(keyName, prog);
      if (switched === false) { activeCar = prev; paintCarUI(prev); }
    } catch (e) { console.warn(e); activeCar = prev; paintCarUI(prev); }
    finally { $$(`[data-car="${keyName}"]`).forEach(b => { b.classList.remove('is-loading'); b.style.removeProperty('--load'); }); }
  }
  const qIn = $('[data-car-q]'), sugEl = $('[data-car-sug]');
  carBtns.forEach(b => {
    b.addEventListener('click', () => {
      // клас вибрали вручну: введена в пошук модель лишається, якщо її немає в списку або вона цього ж класу
      const typed = qIn ? qIn.value.trim() : '', known = MODELS.find(m => m.name === typed);
      if (!typed || (known && known.k !== b.dataset.car)) { userCar = ''; if (qIn) qIn.value = ''; } else userCar = typed;
      if (b.dataset.car === activeCar) paintCarUI(activeCar); else chooseCar(b.dataset.car);
      setTimeout(gar.close, 420);
    });
    b.addEventListener('pointerenter', () => E && E.load(b.dataset.car).catch(() => {}), { once: true });
  });
  $$('[data-show-car]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.showCar; userCar = ''; if (qIn) qIn.value = ''; paintCarUI(activeCar);
    goCh(0);
    setTimeout(() => chooseCar(k), lenis ? 900 : 300);
  }));

  // пошук своєї моделі: «Octavia» → легкове, показуємо на прикладі Golf
  if (qIn && sugEl) {
    let sugList = [], sugI = -1;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mark = () => { [...sugEl.children].forEach((li, i) => li.setAttribute('aria-selected', i === sugI)); qIn.setAttribute('aria-activedescendant', sugI >= 0 ? 'sug-' + sugI : ''); };
    const hide = () => { sugEl.hidden = true; qIn.setAttribute('aria-expanded', 'false'); };
    const render = () => {
      const q = qIn.value.trim();
      sugList = q ? findModels(q, 6) : []; sugI = sugList.length ? 0 : -1;
      if (!q) return hide();
      sugEl.innerHTML = sugList.length
        ? sugList.map((m, i) => `<li role="option" id="sug-${i}" data-i="${i}"><img src="img/cars/${m.k}.webp?v=7" alt="" width="880" height="605"><span><b>${esc(m.name)}</b><small>${CARS[m.k].cls} · як ${CARS[m.k].ex}</small></span></li>`).join('')
        : `<li class="sug-none" role="option" aria-disabled="true">Не знайшли «${esc(q)}»? <b>Оберіть клас нижче</b> — модель запишемо в заявку.</li>`;
      sugEl.hidden = false; qIn.setAttribute('aria-expanded', 'true'); mark();
    };
    const pickModel = m => {
      userCar = m.name; qIn.value = m.name; hide();
      if (m.k === activeCar) paintCarUI(activeCar); else chooseCar(m.k);
      setTimeout(gar.close, 520);
    };
    qIn.addEventListener('input', render);
    qIn.addEventListener('focus', () => { gar.open(); if (qIn.value.trim() && !MODELS.some(m => m.name === qIn.value.trim())) render(); });
    qIn.addEventListener('keydown', e => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && sugList.length) { e.preventDefault(); sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (sugList[sugI]) pickModel(sugList[sugI]); }
      else if (e.key === 'Escape' && !sugEl.hidden) { e.stopPropagation(); hide(); }
    });
    sugEl.addEventListener('pointerdown', e => e.preventDefault());
    sugEl.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) pickModel(sugList[+li.dataset.i]); });
  }
  const dlist = $('#car-models'); if (dlist) dlist.innerHTML = MODELS.map(m => `<option value="${m.name}">`).join('');

  /* заявка: позначене скло, вид пошкодження, SMS майстру */
  const wmBtns = $$('[data-win]'), reqSum = $('[data-req-sum]'), pinT = $('[data-pin-t]');
  function paintSel() {
    wmBtns.forEach(b => { const on = !!sel && +b.dataset.win === sel.zone && +(b.dataset.side || 0) === (sel.side || 0); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    if (reqSum) reqSum.innerHTML = sel ? `<b>${winName(sel.zone, sel.side)}</b> · ${DMG[dmg]}` : 'Скло ще не позначено';
    if (pinT && sel) pinT.textContent = `${winName(sel.zone, sel.side)} · ${DMG[dmg]}`;
    updateReq();
  }
  function setSel(sNew) { sel = sNew; if (E) E.selectWin(sel, dmg); paintSel(); }
  wmBtns.forEach(b => b.addEventListener('click', () => setSel({ zone: +b.dataset.win, side: +(b.dataset.side || 0) })));
  $$('input[name="dmg"]').forEach(inp => inp.addEventListener('change', () => { dmg = inp.value; if (sel && E) E.selectWin(sel, dmg); paintSel(); }));
  $$('[data-mark]').forEach(b => b.addEventListener('click', () => { setSel({ zone: +b.dataset.mark, side: +(b.dataset.side || 0) }); goCh(6); }));
  // торкнулись скла на 3D-авто (на першому екрані чи в розділі заявки)
  let tap = null;
  canvas.addEventListener('pointerdown', e => { tap = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!tap || !E) return;
    const far = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 7 || performance.now() - tap.t > 600; tap = null;
    if (far) return;
    if (state.chapter === 5) { // у «Тонуванні» дотик не робить тріщин: із галочкою він лише обирає вікно
      if (!tintCfg.multi) return;
      const h = E.pick(e.clientX, e.clientY); if (!h) return;
      const k = h.zone === 1 ? 'ws' : h.zone === 2 ? (h.side > 0 ? 'fl' : 'fr') : h.zone === 3 ? (h.side > 0 ? 'rl' : 'rr') : h.zone === 4 ? 'rw' : null;
      if (k) pickTintWin(k);
      return;
    }
    const hit = E.pick(e.clientX, e.clientY); if (!hit) return;
    setSel(hit);
    if (state.c < 5.5) goCh(6);
  });
  function reqText() {
    const f = form ? form.elements : null, v = n => f && f[n] ? f[n].value.trim() : '';
    const lines = ['Добрий день! Заявка з сайту на ремонт скла.', `Авто: ${v('car') || userCar || CARS[activeCar].cls.toLowerCase() + ', модель не вказана'}`, `Скло: ${sel ? winName(sel.zone, sel.side) : 'не вказано'}`, `Пошкодження: ${DMG[dmg]}`];
    if (v('name')) lines.push(`Ім'я: ${v('name')}`);
    if (v('phone')) lines.push(`Телефон: ${v('phone')}`);
    if (v('note')) lines.push(`Коментар: ${v('note')}`);
    return lines.join('\n');
  }
  function updateReq() {
    if (!form) return;
    $('[data-req-win]').textContent = sel ? winName(sel.zone, sel.side) : 'не позначено';
    $('[data-req-dmg]').textContent = DMG[dmg];
    $('[data-req-sms]').href = `sms:${PHONE}?&body=` + encodeURIComponent(reqText());
  }
  if (dlg && form) {
    form.addEventListener('input', updateReq);
    form.addEventListener('submit', e => e.preventDefault());
    $('[data-req-open]').addEventListener('click', () => {
      if (!sel) { const m = $('.wmap'); m.classList.remove('is-nudge'); void m.offsetWidth; m.classList.add('is-nudge'); reqSum.textContent = 'Спершу торкніться скла на авто або на схемі'; return; }
      if (!reqCar.value.trim()) reqCar.value = userCar;
      updateReq(); dlg.showModal(); lenis && lenis.stop();
    });
    $('[data-req-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => lenis && lenis.start());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    $('[data-req-copy]').addEventListener('click', async e => {
      const b = e.currentTarget, t = reqText();
      try { await navigator.clipboard.writeText(t); } catch (err) { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); }
      b.textContent = 'Скопійовано ✓'; setTimeout(() => { b.textContent = 'Скопіювати текст'; }, 2200);
    });
  }

  /* тонування */
  state.tintTarget = new THREE.Vector4(); // .w — смуга на лобовому
  state.filmA = Array.from({ length: 6 }, () => new THREE.Vector4());
  state.filmB = Array.from({ length: 6 }, () => new THREE.Vector4());
  const law = $('[data-tint-law]'), tintIn = $('[data-tint]'), tintOut = $('[data-tint-out]'), tintWord = $('[data-tint-word]');
  // стандартний ринковий ряд плівок: % світлопропускання (VLT) і як це виглядає
  const TINT = [[5, 'лімузин · салон не видно'], [15, 'дуже темна · салон майже не видно'], [20, 'темна · салон видно лише впритул'], [35, 'середня · салон видно нечітко'], [50, 'світла · легке затемнення'], [70, 'майже прозора'], [80, 'прозора · як заводське скло']];
  const tintStops = $$('[data-tint-stop]'), tintCard = $('.ch-tint'), filmOpen = $('[data-film-open]'), filmPanel = $('[data-film-panel]'), winRow = $('[data-win-row]'), winBtns = $$('[data-win-t]'), filmSw = $('[data-film-sw]'), filmName = $('[data-film-name]');
  const curKey = () => tintCfg.multi ? tintCfg.target : 'fl';
  const targetKeys = () => tintCfg.multi ? [tintCfg.target] : WINS_MAIN;
  function applyTint(flash) {
    SLOTS.forEach((k, i) => filmVecs(tintWins[k], state.filmA[i], state.filmB[i]));
    state.tintTarget.set(1, 1, 1, tintCfg.strip ? 1 : 0);
    const c = tintWins[curKey()], f = c ? FILM[c.f] : FILM.none, stop = c ? TINT.findIndex(t => t[0] === c.v) : -1;
    tintStops.forEach((b, i) => b.setAttribute('aria-pressed', i === stop));
    if (tintIn && stop >= 0) { tintIn.value = stop; tintIn.setAttribute('aria-valuetext', `${c.v}%, ${TINT[stop][1]}`); }
    if (tintOut) tintOut.textContent = c ? c.v + '%' : '—';
    if (tintWord) tintWord.textContent = c ? (f.d || TINT[stop][1]) : 'без плівки';
    if (filmSw) filmSw.style.background = f.sw;
    if (filmName) filmName.textContent = f.n;
    $$('[data-film]', filmPanel).forEach(b => b.setAttribute('aria-pressed', b.dataset.film === f.id));
    const tgt = $('[data-film-target]', filmPanel); if (tgt) tgt.textContent = tintCfg.multi ? WIN_NAMES[tintCfg.target] : 'усі вікна';
    winBtns.forEach(b => { const k = b.dataset.winT, w = tintWins[k]; b.setAttribute('aria-pressed', tintCfg.multi && k === tintCfg.target); const d = $('i', b); if (d) d.style.background = (w ? FILM[w.f] : FILM.none).sw; });
    const all = SLOTS.map(k => tintWins[k]).filter(Boolean), front = [tintWins.fl, tintWins.fr].filter(Boolean);
    const mirror = all.some(w => FILM[w.f].m >= .9), frontDark = front.some(w => w.v < 70), frontMin = front.length ? Math.min(...front.map(w => w.v)) : 0;
    // норма стосується скла разом із плівкою: відсотки множаться, тож плівка 70% на заводському склі дає менше 70%
    const msg = mirror ? 'Дзеркальні плівки на дорогах України заборонені. Тут можна лише приміряти.'
      : tintWins.ws ? 'Лобове: норма — від 75% разом зі склом, плівка майже завжди її порушує.'
      : frontDark ? 'Передні бокові темніші за норму 70%. Таку плівку ставимо лише на задні.'
      : front.length ? `Зі склом вийде темніше за ${frontMin}%, а норма для передніх — 70%. Майстер заміряє приладом.`
      : 'Відповідає ПДР: передні бокові без плівки, задні — будь-які.';
    if (law) { law.textContent = msg; law.classList.toggle('warn', mirror || !!tintWins.ws || front.length > 0); }
    if (flash && !reduce) gsap.fromTo(G.uShine, { value: -.15 }, { value: 1.15, duration: 1.1, ease: 'power2.inOut' });
    updateSms();
  }
  const setPct = v => { targetKeys().forEach(k => { tintWins[k] = { f: tintWins[k] ? tintWins[k].f : 'black', v }; }); };
  function setFilm(id) {
    const f = FILM[id];
    targetKeys().forEach(k => { tintWins[k] = id === 'none' ? null : { f: id, v: f.v ?? (tintWins[k] ? tintWins[k].v : 35) }; });
    applyTint(true);
  }
  function pickTintWin(k) {
    tintCfg.target = k;
    state.tintView = k === 'fr' || k === 'rr' ? 'r' : k === 'ws' ? 'f' : null; state.dragTo0 = true; state.dragV = 0;
    G.uFilmP.value.x = SLOTS.indexOf(k);
    if (!reduce) gsap.fromTo(G.uFilmP.value, { y: 1 }, { y: 0, duration: .9, ease: 'power2.out', overwrite: true });
    applyTint(false);
  }
  if (tintIn) {
    tintIn.addEventListener('input', () => { setPct(TINT[+tintIn.value][0]); applyTint(false); }); // повзунок ходить по реальних плівках
    tintStops.forEach(b => b.addEventListener('click', () => { setPct(TINT[+b.dataset.tintStop][0]); applyTint(true); }));
    tintIn.addEventListener('change', () => applyTint(true)); // відпустили — по плівці проходить відблиск
  }
  // каталог плівок: перекриває лише картку, авто лишається видно
  if (filmPanel) {
    const groups = [...new Set(FILMS.map(f => f.g))];
    filmPanel.innerHTML = '<div class="tf-h"><div><b>Усі плівки</b><small>Для: <span data-film-target>усі вікна</span></small></div><button type="button" class="tf-x" data-film-close aria-label="Закрити перелік">✕</button></div>'
      + groups.map(g => `<p class="tf-g">${g}</p><div class="tf-l">${FILMS.filter(f => f.g === g).map(f => `<button type="button" data-film="${f.id}" aria-pressed="false"><i style="background:${f.sw}"></i><span>${f.n}</span></button>`).join('')}</div>`).join('');
    const openPanel = on => { filmPanel.hidden = !on; filmOpen.setAttribute('aria-expanded', on); if (on) filmPanel.scrollTop = 0; };
    filmOpen.addEventListener('click', () => openPanel(filmPanel.hidden));
    filmPanel.addEventListener('click', e => {
      const b = e.target.closest('[data-film]'); if (b) setFilm(b.dataset.film);
      if (e.target.closest('[data-film-close]')) { openPanel(false); filmOpen.focus(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !filmPanel.hidden) { openPanel(false); filmOpen.focus(); } });
  }
  winBtns.forEach(b => b.addEventListener('click', () => pickTintWin(b.dataset.winT)));
  const multiIn = $('#tint-multi');
  multiIn && multiIn.addEventListener('change', () => {
    const base = tintWins[curKey()] || { f: 'black', v: 35 }; // зняли галочку — усі вікна знову як вибране
    tintCfg.multi = multiIn.checked; tintCard.classList.toggle('is-multi', tintCfg.multi); winRow.hidden = !tintCfg.multi;
    if (tintCfg.multi) { tintCfg.target = 'fl'; }
    else { WINS_MAIN.forEach(k => { tintWins[k] = { ...base }; }); tintWins.ws = null; state.tintView = null; G.uFilmP.value.y = 0; }
    applyTint(true);
  });
  const stripIn = $('#tint-strip'); stripIn && stripIn.addEventListener('change', () => { tintCfg.strip = stripIn.checked; applyTint(true); });
  function updateSms() {
    const a = $('[data-tint-sms]'); if (!a) return;
    const d = c => c ? `${FILM[c.f].n.toLowerCase()} ${c.v}%` : 'без плівки';
    const what = tintCfg.multi ? (SLOTS.filter(k => tintWins[k]).map(k => `${WIN_NAMES[k]} — ${d(tintWins[k])}`).join(', ') || 'без плівки') : `усі бокові й заднє — ${d(tintWins.fl)}`;
    a.href = `sms:${PHONE}?&body=` + encodeURIComponent(`Добрий день! Хочу тонування на ${carLabel()}: ${what}${tintCfg.strip ? ', смуга на лобове' : ''}. Скільки коштуватиме?`);
  }
  applyTint(false); G.uTint.value.copy(state.tintTarget);
  state.filmA.forEach((v, i) => { G.uFilmA.value[i].copy(v); G.uFilmB.value[i].copy(state.filmB[i]); });

  /* поява блоків */
  $$('[data-reveal]').forEach(el => {
    if (reduce) { el.style.opacity = 1; el.style.transform = 'none'; return; }
    gsap.to(el, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  splits.forEach(h => {
    if (reduce) return;
    gsap.from($$('.w > i', h), { yPercent: 110, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  if (!reduce) $$('[data-count]').forEach(el => { const to = +el.dataset.count, from = +(el.dataset.from || 0), o = { v: from }; el.textContent = from; gsap.to(o, { v: to, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } }); });
  if (!reduce) gsap.from('.st', { y: 60, opacity: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 80%', once: true } });
  if (!reduce) gsap.from('.fc', { y: 90, opacity: 0, stagger: .09, duration: 1.3, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.fl-grid', start: 'top 88%', once: true } });
  if (!reduce) gsap.from('.pc', { y: 60, opacity: 0, stagger: .07, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.pgrid', start: 'top 88%', once: true } });
  // фото розкриваються з-під «шторки»
  if (!reduce) $$('[data-clip]').forEach(el => gsap.fromTo(el, { clipPath: 'inset(14% 10% 14% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  // роботи — горизонтальна стрічка
  const track = $('[data-track]');
  if (track && !isMobile() && !reduce) {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.works', start: 'top top', end: () => '+=' + dist(), pin: '.works-pin', scrub: 1, invalidateOnRefresh: true } });
    $$('.wk img', track).forEach(img => gsap.fromTo(img, { scale: 1.25 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: '.works', start: 'top top', end: () => '+=' + dist(), scrub: 1 } }));
  }
  if (!reduce) gsap.fromTo('.zsu-media', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.zsu', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!reduce) gsap.fromTo('.ticker .tk-row', { x: 0 }, { x: -200, ease: 'none', scrollTrigger: { trigger: '.ticker', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!reduce) gsap.from('.ft-phone', { yPercent: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });

  // до / після: дві роботи, перемикаються вкладками
  const BA = {
    merc: { b: 'img/ba-merc-before', a: 'img/ba-merc-after', ab: 'Mercedes S-клас з розбитим лобовим склом', aa: 'Mercedes S-клас з новим чистим лобовим склом', fb: 'лобове розбите «павутиною» від удару', fa: 'нове лобове скло — вклеєне й вимите' },
    mazda: { b: 'img/ba-mazda-before', a: 'img/ba-mazda-after', ab: 'Mazda 3 з тріснутим заднім склом', aa: 'Mazda 3 з новим заднім склом', fb: 'заднє скло тріснуло зіркою від удару', fa: 'нове заднє скло з обігрівом' },
    bentley: { b: 'img/ba-bentley-before', a: 'img/ba-bentley-after', ar: 1280 / 698, ab: 'Bentley Continental з побитим лобовим склом', aa: 'Bentley Continental з новим лобовим склом', fb: 'лобове побите десятками ударів — живого місця нема', fa: 'нове лобове скло, як із заводу' },
  };
  const ba = $('[data-ba]');
  if (ba) {
    const r = $('.ba-range', ba); const set = v => { ba.style.setProperty('--p', v + '%'); r.value = v; };
    // вау-показ: двірник змітає розбите скло дугою — під ним уже нове; потім повзунок для порівняння
    let tl = null;
    const wipeEnd = () => { ba.classList.remove('is-wiping'); ba.style.setProperty('--wa', '0deg'); };
    r.addEventListener('input', () => { if (tl) { tl.kill(); tl = null; wipeEnd(); } set(r.value); });
    const demo = () => {
      if (reduce) { set(55); return; }
      if (tl) tl.kill();
      const o = { a: 0, v: 0 };
      tl = gsap.timeline({ onComplete: () => { tl = null; } })
        .call(() => { set(100); ba.style.setProperty('--wa', '0deg'); ba.classList.add('is-wiping'); })
        .to(o, { a: 180, duration: 1.6, ease: 'power2.inOut', onUpdate: () => ba.style.setProperty('--wa', o.a.toFixed(1) + 'deg') }, .25)
        .call(() => { set(0); wipeEnd(); })
        .to(o, { v: 55, duration: 1.3, ease: 'power3.inOut', onUpdate: () => set(o.v) }, '+=.35');
    };
    ScrollTrigger.create({ trigger: ba, start: 'top 70%', once: true, onEnter: demo });
    const tabs = $$('[data-ba-case]'), imgB = $('[data-ba-before]'), imgA = $('[data-ba-after]'), fb = $('[data-ba-fb]'), fa = $('[data-ba-fa]');
    const show = k => {
      const c = BA[k]; if (!c) return;
      tabs.forEach(t => { const on = t.dataset.baCase === k; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      ba.setAttribute('aria-labelledby', 'ba-t-' + k);
      const big = innerWidth > 800 ? '.webp' : '-720.webp';
      const pre = [c.b, c.a].map(src => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = src + big; }));
      ba.classList.add('is-swap');
      Promise.all([...pre, new Promise(res => setTimeout(res, 320))]).then(() => {
        imgB.srcset = `${c.b}-720.webp 720w, ${c.b}.webp 1280w`; imgB.src = c.b + '-720.webp'; imgB.alt = c.ab;
        imgA.srcset = `${c.a}-720.webp 720w, ${c.a}.webp 1280w`; imgA.src = c.a + '-720.webp'; imgA.alt = c.aa;
        fb.textContent = c.fb; fa.textContent = c.fa; ba.style.setProperty('--arn', (c.ar || 1280 / 714).toFixed(4));
        requestAnimationFrame(() => { ba.classList.remove('is-swap'); demo(); });
      });
    };
    tabs.forEach(t => t.addEventListener('click', () => { if (t.getAttribute('aria-selected') !== 'true') show(t.dataset.baCase); }));
    const tabList = $('.ba-tabs');
    tabList && tabList.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); show(n.dataset.baCase);
    });
  }

  process(gsap, ScrollTrigger);
  checker(gsap);
  lightbox(lenis, gsap);
  bar();
  magnets();
  spot();
  cursor();
  progress();
  openStatus();
  mobileCta(ScrollTrigger);
  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
  // нагору: кнопка у футері й плаваюча стрілка, що з'являється після першого екрана
  $$('[data-top]').forEach(b => b.addEventListener('click', () => scrollToY(0, 1.6)));
  const upBtn = $('.to-top');
  if (upBtn) { const t = () => upBtn.classList.toggle('is-on', scrollY > innerHeight * 1.3); addEventListener('scroll', t, { passive: true }); t(); }
  const footEl = $('.foot'); if (upBtn && footEl) new IntersectionObserver(es => upBtn.classList.toggle('is-foot', es[0].isIntersecting)).observe(footEl);
  addEventListener('load', () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 600);
}

/* заголовки по словах */
function splitHeads() {
  const els = $$('[data-split]');
  els.forEach(h => {
    if (h.dataset.done) return; h.dataset.done = 1;
    const label = h.textContent.trim().replace(/\s+/g, ' ');
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('i'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(h);
    h.setAttribute('aria-label', label);
    $$('.w', h).forEach(w => w.setAttribute('aria-hidden', 'true'));
  });
  return els.filter(h => !h.classList.contains('h1'));
}

/* процес заміни лобового: кільце годинника заповнюється з прокруткою */
function process(gsap, ScrollTrigger) {
  const sec = $('.proc'); if (!sec) return;
  const steps = $$('.pr-step', sec), ring = $('[data-ring]', sec), lbl = $('[data-ring-step]', sec);
  const len = ring ? ring.getTotalLength() : 0;
  if (ring) { ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len; }
  ScrollTrigger.create({
    trigger: '.pr-list', start: 'top 65%', end: 'bottom 55%', scrub: true,
    onUpdate: self => {
      const p = self.progress;
      if (ring) ring.style.strokeDashoffset = len * (1 - p);
      const idx = clamp(Math.floor(p * steps.length * .999), 0, steps.length - 1);
      steps.forEach((s, i) => { s.classList.toggle('is-on', i === idx); s.classList.toggle('is-past', i < idx); });
      if (lbl) lbl.textContent = steps[idx]?.dataset.t || '';
    },
  });
}

function checker(gsap) {
  const svg = $('[data-ws]'); if (!svg) return;
  const sizesBox = $('[data-sizes]'), g = $('[data-crack]', svg);
  const vTitle = $('[data-v-title]'), vText = $('[data-v-text]'), verdict = $('[data-verdict]'), sms = $('[data-sms]');
  const SIZES = { chip: [['s', 'до 1 см'], ['m', '1–2,5 см'], ['l', 'більше 2,5 см']], crack: [['s', 'до 15 см'], ['m', '15–30 см'], ['l', 'довша за 30 см']] };
  let kind = 'chip', size = 's', pt = [430, 150], seed = 3, userPath = null, drawing = null;
  const hint = $('[data-ws-hint]'), CM = .25; // 1 одиниця схеми ≈ 0,25 см (лобове ~145 см завширшки)
  const renderSizes = () => { sizesBox.innerHTML = SIZES[kind].map(([v, t]) => `<label><input type="radio" name="size" value="${v}" ${v === size ? 'checked' : ''}><span>${t}</span></label>`).join(''); $$('input', sizesBox).forEach(inp => inp.addEventListener('change', () => { size = inp.value; seed++; userPath = null; update(); })); };
  const setHint = () => { svg.classList.toggle('is-draw', kind === 'crack'); if (hint) hint.innerHTML = kind === 'crack' ? '<b>Проведіть пальцем по склу</b> — там, де тріщина, і в її напрямку' : '<b>Торкніться скла</b> там, де скол'; };
  $$('input[name="kind"]').forEach(inp => inp.addEventListener('change', () => { kind = inp.value; size = 's'; seed++; userPath = null; renderSizes(); setHint(); update(); }));
  const edgeOf = (x, y) => { const xl = 62 - 52 * (y - 22) / 256, xr = 538 + 52 * (y - 22) / 256; return (x - xl < 34) || (xr - x < 34) || y < 44 || y > 252; };
  const inA = (x, y) => x > 96 && x < 286 && y > 70 && y < 240;
  function drawDamage() {
    g.innerHTML = ''; const rnd = rng(seed * 131 + Math.round(pt[0] + pt[1])); const paths = [];
    if (kind === 'chip') {
      const R = { s: 15, m: 26, l: 42 }[size]; const c = genCrack(pt[0], pt[1], R, rnd, { rays: 7 + Math.floor(rnd() * 4), rings: 1 });
      c.lines.forEach(l => paths.push({ d: 'M' + l.pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L'), w: l.w * 1.5 }));
      paths.push({ d: `M${pt[0] - R * .35} ${pt[1]} a${R * .35} ${R * .35} 0 1 0 ${R * .7} 0 a${R * .35} ${R * .35} 0 1 0 ${-R * .7} 0`, w: 2.2, fill: true });
    } else if (userPath) {
      const P = userPath, main = [P[0]];
      for (let i = 1; i < P.length; i++) {
        const [x0, y0] = P[i - 1], [x1, y1] = P[i], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(d / 9)), nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
        for (let k = 1; k <= n; k++) { const t = k / n, j = k === n && i === P.length - 1 ? 0 : (rnd() - .5) * 5; main.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]); }
      }
      paths.push({ d: 'M' + main.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L'), w: 2.2 });
      for (let i = 6; i < main.length - 3; i += 5 + Math.floor(rnd() * 6)) {
        if (rnd() < .45) continue;
        const [x, y] = main[i], [px, py] = main[i - 1]; let a = Math.atan2(y - py, x - px) + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .6), bx = x, by = y; const bp = [[x, y]];
        for (let k = 0; k < 3; k++) { a += (rnd() - .5) * .5; bx += Math.cos(a) * (5 + rnd() * 7); by += Math.sin(a) * (5 + rnd() * 7); bp.push([bx, by]); }
        paths.push({ d: 'M' + bp.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L'), w: 1.1 });
      }
      paths.push({ d: `M${P[0][0] - 3} ${P[0][1]} a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0`, w: 2, fill: true });
    } else {
      const L = { s: 70, m: 130, l: 250 }[size];
      for (let k = 0; k < (size === 'l' ? 2 : 1); k++) { let a = (k ? Math.PI : 0) + (rnd() - .5) * .8, x = pt[0], y = pt[1]; const pts = [[x, y]]; for (let i = 0; i < 14; i++) { a += (rnd() - .5) * .5; x += Math.cos(a) * L / 14; y += Math.sin(a) * L / 14 * .7; pts.push([x, y]); } paths.push({ d: 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L'), w: 2.2 }); }
      paths.push({ d: `M${pt[0] - 3} ${pt[1]} a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0`, w: 2, fill: true });
    }
    if (userPath && kind === 'crack') { const L = userPath.reduce((a, q, i) => i ? a + Math.hypot(q[0] - userPath[i - 1][0], q[1] - userPath[i - 1][1]) : 0, 0), e = userPath[userPath.length - 1], t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('x', Math.min(540, e[0] + 8)); t.setAttribute('y', Math.max(24, e[1] - 8)); t.setAttribute('class', 'ws-len'); t.textContent = `≈ ${Math.round(L * CM)} см`; g.appendChild(t); }
    paths.forEach((p, i) => { const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', p.d); el.setAttribute('stroke-width', p.w); if (p.fill) el.setAttribute('fill', 'rgba(255,255,255,.75)'); g.appendChild(el); if (!reduce) { const len = el.getTotalLength(); el.style.strokeDasharray = len; el.style.strokeDashoffset = len; el.getBoundingClientRect(); el.style.transition = `stroke-dashoffset ${.5 + Math.random() * .3}s cubic-bezier(.2,.7,.1,1) ${i * .02}s`; el.style.strokeDashoffset = 0; } });
  }
  function update() {
    const [x, y] = pt, drawn = userPath && kind === 'crack', e = drawn ? userPath.some(q => edgeOf(q[0], q[1])) : edgeOf(x, y), a = drawn ? userPath.some(q => inA(q[0], q[1])) : inA(x, y), sizeTxt = SIZES[kind].find(s => s[0] === size)[1];
    let title, text, replace = false;
    if (kind === 'chip') {
      if (size === 'l') { title = 'Великий скол — радше заміна'; text = 'Скол більше 2,5 см ремонт тримає погано. Заміна — робота від 1000 грн плюс скло; часто встигаємо за день.'; replace = true; }
      else { title = `Скол ${sizeTxt} — відремонтуємо`; text = 'Ремонт від 500 грн, близько години. Смола заповнює скол, і він перестає рости.'; if (a) text += ' У зоні водія може лишитися ледь помітний слід.'; if (e) text += ' Біля краю скол легко пускає тріщину — не відкладайте.'; }
    } else {
      if (e) { title = 'Тріщина біля краю — краще замінити'; text = 'Від краю тріщини ростуть найшвидше, і ремонт там ненадійний. Заміна — робота від 1000 грн плюс скло.'; replace = true; }
      else if (size === 's') { title = 'Коротка тріщина — ще врятуємо'; text = 'Тріщину до 15 см зупиняємо й заповнюємо — від 500 грн. Приїжджайте, поки вона не поповзла далі.' + (a ? ' У зоні водія може лишитися слід.' : ''); }
      else if (size === 'm') { title = 'Тріщина 15–30 см — покажіть майстру'; text = 'Іноді ще ремонтуємо, іноді вже ні: залежить від місця й того, куди вона йде. Огляд безкоштовний.'; }
      else { title = 'Довга тріщина — заміна'; text = 'Таку тріщину вже не зупинити. Заміна — робота від 1000 грн плюс скло, машину забираєте за 3–4 години.'; replace = true; }
    }
    vTitle.textContent = title; vText.textContent = text; verdict.classList.toggle('is-replace', replace);
    const tag = $('[data-v-tag]'); if (tag) tag.textContent = replace ? 'Заміна' : 'Ремонт';
    sms.href = `sms:${PHONE}?&body=` + encodeURIComponent(`Добрий день! ${kind === 'chip' ? 'Скол' : 'Тріщина'} ${userPath && kind === 'crack' ? '≈' + Math.round(userPath.reduce((a, q, i) => i ? a + Math.hypot(q[0] - userPath[i - 1][0], q[1] - userPath[i - 1][1]) : 0, 0) * CM) + ' см' : sizeTxt} на лобовому склі${a ? ', у зоні водія' : ''}${e ? ', біля краю' : ''}. Авто: ... Скільки коштуватиме?`);
    drawDamage();
    if (!reduce) gsap.fromTo([vTitle, vText], { y: 10, opacity: .2 }, { y: 0, opacity: 1, duration: .5, stagger: .05, ease: 'expo.out', overwrite: true });
  }
  const outline = svg.querySelector('path[fill="url(#wsg)"]') || svg.querySelector('path');
  const toSvg = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const inGlass = q => !outline.isPointInFill || outline.isPointInFill(q);
  svg.addEventListener('click', ev => { if (kind === 'crack') return; const q = toSvg(ev); if (!inGlass(q)) return; pt = [q.x, q.y]; seed++; update(); });
  // тріщина: ведемо пальцем — малюється одразу; довжина сама обирає розмір
  svg.addEventListener('pointerdown', ev => {
    if (kind !== 'crack') return; const q = toSvg(ev); if (!inGlass(q)) return;
    ev.preventDefault(); drawing = { pts: [[q.x, q.y]], len: 0 }; try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
  });
  svg.addEventListener('pointermove', ev => {
    if (!drawing) return; const q = toSvg(ev), l = drawing.pts[drawing.pts.length - 1], d = Math.hypot(q.x - l[0], q.y - l[1]);
    if (d < 5 || !inGlass(q)) return;
    drawing.pts.push([q.x, q.y]); drawing.len += d;
    g.innerHTML = `<path d="M${drawing.pts.map(v => v[0].toFixed(1) + ' ' + v[1].toFixed(1)).join(' L')}" stroke-width="2.2" class="ws-live"/>`;
  });
  const finish = () => {
    if (!drawing) return; const dr = drawing; drawing = null; seed++;
    if (dr.len < 14) { userPath = null; pt = dr.pts[0]; update(); return; } // просто торкнулись — тріщина сама
    userPath = dr.pts; pt = dr.pts[0];
    const cm = dr.len * CM; size = cm <= 15 ? 's' : cm <= 30 ? 'm' : 'l'; renderSizes(); update();
  };
  svg.addEventListener('pointerup', finish); svg.addEventListener('pointercancel', finish);
  renderSizes(); setHint(); update();
  if (!reduce) gsap.fromTo('.ws-refl', { attr: { x: -300 } }, { attr: { x: 900 }, duration: 3.5, repeat: -1, repeatDelay: 2, ease: 'power2.inOut' });
}

function lightbox(lenis, gsap) {
  const box = $('[data-lb-box]'); if (!box) return; const img = $('img', box); let last = null;
  const close = () => { box.hidden = true; lenis && lenis.start(); last && last.focus(); };
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => { last = b; img.src = b.dataset.lb; img.alt = $('img', b)?.alt || ''; box.hidden = false; lenis && lenis.stop(); $('[data-lb-close]', box).focus(); if (!reduce) gsap.fromTo(img, { scale: .92, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'expo.out' }); }));
  box.addEventListener('click', e => { if (e.target === box || e.target.hasAttribute('data-lb-close')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
}
function bar() {
  const b = $('.bar'); let lastY = 0;
  const tick = () => { const y = scrollY; b.classList.toggle('is-solid', y > 40); if (y > 500 && y > lastY + 3) b.classList.add('is-hidden'); else if (y < lastY - 3 || y < 500) b.classList.remove('is-hidden'); lastY = y; };
  addEventListener('scroll', tick, { passive: true }); tick();
}
function magnets() {
  if (reduce || !matchMedia('(pointer: fine)').matches) return;
  $$('[data-magnet]').forEach(el => { el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 12}px, ${((e.clientY - r.top) / r.height - .5) * 10}px)`; }); el.addEventListener('pointerleave', () => { el.style.transform = ''; }); });
}
/* гараж: панель вибору авто виїжджає й ховається */
function garage() {
  const root = $('[data-gar]'), btn = $('[data-gar-toggle]');
  let peekT = 0;
  const api = {
    open() { if (!root) return; root.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); },
    close() { if (!root) return; clearTimeout(peekT); root.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); },
    toggle() { root && (root.classList.contains('is-open') ? api.close() : api.open()); },
    peek() { // після появи сторінки: показали вибір на 3 секунди, якщо людина не взаємодіє — сховали
      if (!root) return;
      setTimeout(() => { if (state.chapter === 0) api.open(); peekT = setTimeout(() => { if (!root.matches(':hover') && !root.contains(document.activeElement)) api.close(); }, 3200); }, 1600);
    },
  };
  if (!root) return api;
  btn.addEventListener('click', e => { e.stopPropagation(); clearTimeout(peekT); api.toggle(); });
  document.addEventListener('pointerdown', e => { if (!root.contains(e.target)) api.close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('is-open')) { api.close(); btn.focus(); } });
  root.addEventListener('pointerleave', () => { if (peekT) { clearTimeout(peekT); peekT = setTimeout(api.close, 1200); } });
  return api;
}
/* рамка й підсвітка, що йдуть за курсором */
function spot() {
  if (!matchMedia('(pointer: fine)').matches) return;
  $$('[data-spot]').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  }, { passive: true }));
}
/* курсор-кільце з підписами над інтерактивом */
function cursor() {
  if (reduce || !matchMedia('(pointer: fine)').matches) return;
  const el = $('[data-cur]'), label = $('[data-cur-t]'); if (!el) return;
  document.documentElement.classList.add('has-cur');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, shown = false;
  addEventListener('pointerdown', () => el.classList.add('is-down')); addEventListener('pointerup', () => el.classList.remove('is-down'));
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (!shown) { cx = x; cy = y; shown = true; el.classList.remove('is-hidden'); } }, { passive: true });
  let last = null;
  const upd = target => {
    const t = target && target.closest && target.closest('[data-cursor], a, button, label, input, summary, [data-lb]');
    const txt = t && t.dataset.cursor;
    const m = txt === 'drag' || txt === 'pick' ? txt : '';
    el.classList.toggle('is-drag', m === 'drag');
    el.classList.toggle('is-pick', m === 'pick');
    el.classList.toggle('is-label', !!txt && !m);
    el.classList.toggle('is-hover', !!t && !txt);
    label.textContent = m === 'pick' ? 'Торкніться вікна' : txt && !m ? txt : '';
  };
  document.addEventListener('pointerover', e => upd(last = e.target));
  addEventListener('am:ch', () => upd(last)); // розділ змінився прокруткою — курсор під мишею теж
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'));
  (function loop() { cx += (x - cx) * .22; cy += (y - cy) * .22; el.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; requestAnimationFrame(loop); })();
}
/* тонка лінія прогресу прокрутки зверху */
function progress() {
  const el = $('[data-prog]'); if (!el) return;
  const tick = () => { const h = document.documentElement.scrollHeight - innerHeight; el.style.setProperty('--sp', h > 0 ? (scrollY / h).toFixed(4) : 0); };
  addEventListener('scroll', tick, { passive: true }); tick();
}
function mobileCta(ScrollTrigger) {
  const el = $('.mcta'); if (!el) return;
  ScrollTrigger.create({ trigger: '.story', start: 'top -60%', endTrigger: '.foot', end: 'top bottom', onToggle: s => el.classList.toggle('is-on', s.isActive) });
}
function openStatus() {
  const dot = $('[data-open]'), txt = $('[data-open-text]'); if (!dot || !txt) return;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = k => parts.find(p => p.type === k)?.value; const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')); const m = (+g('hour') % 24) * 60 + (+g('minute'));
    const close = wd >= 1 && wd <= 5 ? 18 * 60 : wd === 6 ? 15 * 60 : 0;
    if (close && m >= 540 && m < close) { dot.classList.add('is-open'); txt.textContent = `Зараз відчинено, до ${close / 60}:00`; }
    else txt.textContent = `Зараз зачинено, відкриємось ${wd >= 1 && wd <= 6 && m < 540 ? 'сьогодні о 9:00' : (wd === 6 || wd === 0) ? 'у понеділок о 9:00' : 'завтра о 9:00'}`;
  } catch (e) {}
}

main();
