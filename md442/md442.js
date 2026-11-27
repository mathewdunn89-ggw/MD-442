'use strict';
/* MD|442 v2 — MATHEW's drum machine. One engine, two layouts:
   <html data-layout="desk">  the desktop console      <html data-layout="phone">  the phone app
   Sections: 1 parameters · 2 presets · 3 sound engine · 4 sequencer · 5 controls · 6 desktop console · 7 phone app · 8 start-up */
(() => {
const root = document.getElementById('md442'); if (!root) return;
const PHONE = document.documentElement.dataset.layout === 'phone';
const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[?#].*$/, '').replace(/[^/]*$/, '');   // md442.js's folder: the sample banks sit beside it
const $ = (s, r = root) => r.querySelector(s);
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (tag === 'button') e.type = 'button'; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

/* ---------- 1. parameters, in real units ---------- */
// [id, full name, key label]
const VOICES = [['BD', 'Kick', 'KICK'], ['SD', 'Snare', 'SNARE'], ['CP', 'Clap', 'CLAP'], ['RS', 'Rim shot', 'RIM'], ['LT', 'Low tom', 'LO TOM'], ['MT', 'Mid tom', 'MID TOM'], ['HT', 'Hi tom', 'HI TOM'],
  ['CH', 'Closed hat', 'CL HAT'], ['OH', 'Open hat', 'OP HAT'], ['CR', 'Crash', 'CRASH'], ['RD', 'Ride', 'RIDE'], ['BS', 'Bass', 'BASS'], ['ST', 'Dub stab', 'STAB'], ['SM', 'Sampler', 'SAMPLE'], ['AC', 'Accent', 'ACCENT']];
const KEYS = VOICES.map(v => v[0]), SOUND = KEYS.filter(k => k !== 'AC');
const NAME = Object.fromEntries(VOICES.map(v => [v[0], v[1]])), SHORT = Object.fromEntries(VOICES.map(v => [v[0], v[2]]));
const CHORDS = [['Fifth', [0, 7, 12]], ['Minor', [0, 3, 7]], ['Min 7', [0, 3, 7, 10]], ['Min 9', [0, 3, 7, 10, 14]], ['Maj 7', [0, 4, 7, 11]], ['Maj 9', [0, 4, 7, 11, 14]], ['6/9', [0, 4, 7, 9, 14]]];
const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
const NOTE_CYCLE = [0, 3, 5, 7, 10, 12, -2];
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '');
// MD|442's three machines: one engine, the same filters, effects and controls; their own patterns, sound and sample banks.
// The banks are the ones in the MD|187 / MD|888 keyboard firmwares (tools/md_gen_samples.py there): 8 slices each.
const STYLES = { 442: { name: 'MD|442', tag: 'TECHNO', first: 'Peak Warehouse', bank: 4 }, 187: { name: 'MD|187', tag: 'HIP-HOP', first: 'Boom Bap', bank: 0 }, 888: { name: 'MD|888', tag: 'HARD TECHNO', first: 'Warehouse', bank: 4 } };
const STYLE_IDS = ['442', '187', '888'];
const BANKS = [['187', 'BOOMBP', 1, 96, 'Boom bap break'], ['187', 'DRUMS', 1, 96, 'Dusty drum hits'], ['187', 'STABS', 1, 96, 'Jazz stabs'], ['187', 'VOX', 1, 96, 'Vocal hits'],
  ['888', 'RUMBLE', 1, 155, 'Rumble'], ['888', 'GABBA', 1, 155, 'Gabba kicks'], ['888', 'TRANCE', 2, 155, 'Trance stabs'], ['888', 'HITS', 1, 155, 'Industrial hits']];   // [machine, file, bars, BPM it was cut at, name]
const ETIMES = [['1/16', 1], ['1/8 T', 4 / 3], ['1/8', 2], ['3/16', 3], ['1/4', 4], ['3/8', 6]];   // echo time in 16th notes
const F = {
  db: v => v <= -40 ? 'OFF' : sgn(v) + String(Math.abs(Math.round(v * 2) / 2)) + ' dB',
  hz: v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' kHz' : Math.round(v) + ' Hz',
  ms: v => v <= 4 ? (+v).toFixed(v < 1 ? 2 : 1) + ' s' : v >= 1000 ? (v / 1000).toFixed(2).replace(/0$/, '') + ' s' : Math.round(v) + ' ms',
  pc: v => Math.round(v) + '%',
  st: v => sgn(v) + String(Math.abs(v)) + ' st',
  bpm: v => Math.round(v) + ' BPM',
  key: v => NOTES[Math.round(v)],
  chord: v => CHORDS[Math.round(v)][0],
  etime: v => ETIMES[Math.round(v)][0],
  pan: v => Math.abs(v) < 3 ? 'C' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v)),
  bank: v => BANKS[Math.round(v)][1],
  filter: v => Math.abs(v) < 4 ? 'OFF' : v < 0 ? 'LP ' + F.hz(lpHz(v)) : 'HP ' + F.hz(hpHz(v))
};
const lpHz = v => 18000 * Math.pow(140 / 18000, (-v - 4) / 96), hpHz = v => 20 * Math.pow(4500 / 20, (v - 4) / 96);
// key: { mn, mx, df, lb: full label, f: display, exp: exponential travel, step: size of one click of the wheel or arrow key }
const DEF = {};
const D = (k, mn, mx, df, lb, f, o) => { DEF[k] = Object.assign({ mn, mx, df, lb, f: F[f], step: f === 'db' ? .5 : 1 }, o); };
D('vol', -40, 6, -3, 'Volume', 'db'); D('bpm', 60, 200, 128, 'Tempo', 'bpm'); D('shuffle', 50, 75, 50, 'Shuffle', 'pc'); D('key', 0, 11, 0, 'Key', 'key'); D('accent', 0, 12, 5, 'Accent', 'db');
D('bd.tune', 36, 72, 50, 'Kick tune', 'hz', { step: .5 }); D('bd.decay', 120, 1800, 500, 'Kick decay', 'ms', { exp: 1 }); D('bd.attack', 0, 100, 50, 'Kick attack', 'pc'); D('bd.punch', 0, 100, 50, 'Kick punch', 'pc'); D('bd.rumble', 0, 100, 0, 'Kick rumble', 'pc');
D('sd.tune', -12, 12, 0, 'Snare tune', 'st', { step: .5 }); D('sd.tone', 0, 100, 50, 'Snare tone', 'pc'); D('sd.snappy', 0, 100, 65, 'Snappy', 'pc'); D('sd.decay', 80, 900, 300, 'Snare decay', 'ms', { step: 5 });
D('cp.tone', 700, 2200, 1300, 'Clap tone', 'hz', { step: 10 }); D('cp.decay', 60, 800, 300, 'Clap decay', 'ms', { step: 5 });
D('rs.tune', -12, 12, 0, 'Rim tune', 'st', { step: .5 });
[['lt', 'Low tom'], ['mt', 'Mid tom'], ['ht', 'Hi tom']].forEach(([t, n]) => { D(t + '.tune', -12, 12, 0, n + ' tune', 'st', { step: .5 }); D(t + '.decay', 100, 1200, 400, n + ' decay', 'ms', { step: 10 }); });
D('ch.decay', 20, 400, 80, 'Closed hat decay', 'ms', { exp: 1 }); D('oh.decay', 150, 2000, 500, 'Open hat decay', 'ms', { exp: 1 }); D('hh.tone', 0, 100, 60, 'Hats tone', 'pc');
D('cr.tune', -12, 12, 0, 'Crash tune', 'st', { step: .5 }); D('cr.decay', 400, 4000, 1600, 'Crash decay', 'ms', { exp: 1 }); D('cr.tone', 0, 100, 50, 'Crash tone', 'pc');
D('rd.tune', -12, 12, 0, 'Ride tune', 'st', { step: .5 }); D('rd.decay', 300, 3000, 1100, 'Ride decay', 'ms', { exp: 1 }); D('rd.tone', 0, 100, 50, 'Ride tone', 'pc');
D('bs.cutoff', 60, 8000, 500, 'Bass cutoff', 'hz', { exp: 1 }); D('bs.reso', 0, 100, 45, 'Bass reso', 'pc'); D('bs.acid', 0, 100, 0, 'Acid', 'pc'); D('bs.drive', 0, 100, 30, 'Bass drive', 'pc'); D('bs.echo', 0, 100, 0, 'Bass echo', 'pc'); D('bs.fat', 0, 100, 0, 'Bass fat', 'pc'); D('bs.decay', 40, 800, 200, 'Bass decay', 'ms', { exp: 1 });
D('st.tone', 300, 12000, 2500, 'Stab tone', 'hz', { exp: 1 }); D('st.decay', 80, 1700, 400, 'Stab decay', 'ms', { exp: 1 }); D('st.chord', 0, 6, 1, 'Chord', 'chord'); D('st.echo', 0, 100, 0, 'Stab echo', 'pc'); D('st.verb', 0, 100, 0, 'Stab verb', 'pc');
D('sm.bank', 0, 7, 0, 'Sample loop', 'bank'); D('sm.tune', -12, 12, 0, 'Sample tune', 'st', { step: .5 }); D('sm.chop', 0, 100, 0, 'Chop', 'pc');
D('fx.filter', -100, 100, 0, 'Filter', 'filter'); D('fx.verb', 0, 100, 0, 'Reverb', 'pc'); D('fx.space', 0, 100, 0, 'Space', 'pc'); D('fx.drive', 0, 100, 0, 'Drive', 'pc');
D('fx.vdec', .3, 4, 1.6, 'Reverb decay', 'ms', { exp: 1 }); D('fx.etime', 0, 5, 3, 'Echo time', 'etime'); D('fx.efb', 0, 95, 50, 'Echo feedback', 'pc');
const LEVEL = { BD: 0, SD: -3, CP: -4, RS: -8, LT: -6, MT: -6, HT: -6, CH: -3, OH: -4, CR: -6, RD: -8, BS: -5.5, ST: -6, SM: -4 };
SOUND.forEach(k => D('lvl.' + k, -40, 6, LEVEL[k], NAME[k] + ' level', 'db'));
// channel tools, the same five on every drum: where it sits, its own filter and drive, and how much goes to the reverb and the echo
const PAN = { RS: -12, LT: -30, HT: 30, CH: 18, OH: -18, CR: -24, RD: 26 };
const RV = { BD: 0, SD: .5, CP: .7, RS: .45, LT: .5, MT: .55, HT: .55, CH: .16, OH: .24, CR: .3, RD: .2, BS: 0, SM: .12 }, DV = { SM: .08, BD: 0, SD: .32, CP: .45, RS: .4, LT: .4, MT: .5, HT: .5, CH: .1, OH: .18, CR: .2, RD: .12 };
SOUND.forEach(k => {
  D('pan.' + k, -100, 100, PAN[k] || 0, NAME[k] + ' pan', 'pan'); D('flt.' + k, -100, 100, 0, NAME[k] + ' filter', 'filter'); D('drv.' + k, 0, 100, 0, NAME[k] + ' channel drive', 'pc');
  if (k !== 'ST') D('rev.' + k, 0, 100, Math.round(RV[k] * 100), NAME[k] + ' reverb send', 'pc');
  if (k !== 'ST' && k !== 'BS') D('ech.' + k, 0, 100, Math.round(DV[k] * 100), NAME[k] + ' echo send', 'pc');
});
const REVK = k => k === 'ST' ? 'st.verb' : 'rev.' + k, ECHK = k => k === 'ST' ? 'st.echo' : k === 'BS' ? 'bs.echo' : 'ech.' + k;
const TOOLS = k => [['pan.' + k, 'PAN'], ['flt.' + k, 'FILTER'], ['drv.' + k, 'DRIVE'], [REVK(k), 'VERB'], [ECHK(k), 'ECHO']];
// knob travel 0..1 <-> value
const toPos = (k, v) => { const d = DEF[k]; return d.exp ? Math.log(v / d.mn) / Math.log(d.mx / d.mn) : (v - d.mn) / (d.mx - d.mn); };
const toVal = (k, p) => { const d = DEF[k]; p = clamp(p, 0, 1); if (!d.exp) return clamp(Math.round((d.mn + p * (d.mx - d.mn)) / d.step) * d.step, d.mn, d.mx); const v = d.mn * Math.pow(d.mx / d.mn, p); return clamp(+v.toPrecision(3), d.mn, d.mx); };
// the knobs each voice owns: [key, short label]. On the phone these make the row under the instrument keys.
const KN = {
  BD: [['bd.tune', 'TUNE'], ['bd.decay', 'DECAY'], ['bd.attack', 'ATTACK'], ['bd.punch', 'PUNCH'], ['bd.rumble', 'RUMBLE']],
  SD: [['sd.tune', 'TUNE'], ['sd.tone', 'TONE'], ['sd.snappy', 'SNAPPY'], ['sd.decay', 'DECAY']],
  CP: [['cp.tone', 'TONE'], ['cp.decay', 'DECAY']], RS: [['rs.tune', 'TUNE']],
  LT: [['lt.tune', 'TUNE'], ['lt.decay', 'DECAY']], MT: [['mt.tune', 'TUNE'], ['mt.decay', 'DECAY']], HT: [['ht.tune', 'TUNE'], ['ht.decay', 'DECAY']],
  CH: [['ch.decay', 'DECAY'], ['hh.tone', 'TONE']], OH: [['oh.decay', 'DECAY'], ['hh.tone', 'TONE']],
  CR: [['cr.tune', 'TUNE'], ['cr.decay', 'DECAY'], ['cr.tone', 'TONE']], RD: [['rd.tune', 'TUNE'], ['rd.decay', 'DECAY'], ['rd.tone', 'TONE']],
  BS: [['bs.cutoff', 'CUTOFF'], ['bs.reso', 'RESO'], ['bs.decay', 'DECAY'], ['bs.acid', 'ACID'], ['bs.fat', 'FAT'], ['bs.drive', 'DRIVE']],
  ST: [['st.tone', 'TONE'], ['st.decay', 'DECAY'], ['st.chord', 'CHORD']],
  SM: [['sm.bank', 'LOOP'], ['sm.tune', 'TUNE'], ['sm.chop', 'CHOP']],
  AC: [['accent', 'AMOUNT']]
};
// phone: the row under the instrument keys = the drum's sound knobs, then its channel tools (its level is in the Mixer)
const PKN = {}; KEYS.forEach(k => { PKN[k] = k === 'AC' ? KN[k] : KN[k].concat(TOOLS(k)); });
// the desktop console's sections: sound only. Short labels and fixed columns, so shared sections never overlap.
const SECT = [
  { t: 'KICK', v: ['BD'], k: KN.BD }, { t: 'SNARE', v: ['SD'], k: KN.SD },
  { t: 'RIM · CLAP', v: ['RS', 'CP'], k: [['rs.tune', 'RM TUNE'], ['cp.tone', 'CP TONE'], ['cp.decay', 'CP DEC']] },
  { t: 'TOMS', v: ['LT', 'MT', 'HT'], k: [['lt.tune', 'LO TUNE'], ['lt.decay', 'LO DEC'], ['mt.tune', 'MD TUNE'], ['mt.decay', 'MD DEC'], ['ht.tune', 'HI TUNE'], ['ht.decay', 'HI DEC']] },
  { t: 'HATS', v: ['CH', 'OH'], k: [['ch.decay', 'CH DEC'], ['oh.decay', 'OH DEC'], ['hh.tone', 'TONE']] },
  { t: 'CYMBALS', v: ['CR', 'RD'], k: [['cr.tune', 'CR TUNE'], ['rd.tune', 'RD TUNE'], ['cr.decay', 'CR DEC'], ['rd.decay', 'RD DEC'], ['cr.tone', 'CR TONE'], ['rd.tone', 'RD TONE']] },
  { t: 'BASS', v: ['BS'], k: KN.BS }, { t: 'STAB · SAMPLE', v: ['ST', 'SM'], k: [['st.tone', 'ST TONE'], ['st.decay', 'ST DEC'], ['st.chord', 'CHORD'], ['sm.chop', 'CHOP'], ['sm.bank', 'LOOP'], ['sm.tune', 'SM TUNE']] }
];
const MASTER = [['vol', 'VOLUME'], ['bpm', 'TEMPO'], ['shuffle', 'SHUFFLE'], ['key', 'KEY'], ['accent', 'ACCENT']];
const FXK = [['fx.filter', 'FILTER'], ['fx.verb', 'REVERB'], ['fx.space', 'ECHO'], ['fx.drive', 'DRIVE']];
const FXMORE = [['fx.vdec', 'RV DECAY'], ['fx.etime', 'E TIME'], ['fx.efb', 'E FDBK']];

/* ---------- 2. Mathew's patterns ---------- */
// v1 data: p = dial positions 0–100 in the order of PK, g = rows BD SD CP CH OH bongo BS ST. Converted to real units when loaded.
const PK = ['bd.depth', 'bd.attack', 'bd.punch', 'bd.decay', 'sd.tune', 'sd.snap', 'sd.decay', 'cp.tone', 'cp.decay', 'ch.decay', 'ch.tone', 'oh.decay', 'oh.tone', 'rm.tune', 'rm.decay',
  'bs.cutoff', 'bs.reso', 'bs.drive', 'bs.echo', 'bs.verb', 'st.tone', 'st.decay', 'st.echo', 'st.verb', 'fx.verb', 'fx.space'];
const PRESETS = {
  'Peak Warehouse': { bpm: 142, swing: 0, kick: 'hard', acid: .55, root: 41.2, chord: [0, 7, 12], notes: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 15, 0, 0, 12, 0, 7],
    p: [45, 68, 85, 58, 55, 65, 30, 60, 40, 20, 74, 38, 72, 55, 35, 52, 62, 68, 0, 8, 70, 18, 35, 30, 24, 0],
    g: ['x...x...x...x...', '................', '....x.......x...', 'xxxxxxxxxxxxxxxx', '..x...x...x...x.', '...........x..x.', '.xx..xx..xx..xx.', '..............x.'] },
  'Berlin Roll': { bpm: 133, swing: 4, kick: 'hard', acid: .25, root: 43.65, chord: [0, 3, 7], notes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0],
    p: [58, 52, 68, 66, 45, 55, 38, 50, 50, 26, 56, 48, 56, 45, 45, 38, 48, 45, 10, 0, 42, 30, 70, 0, 0, 30],
    g: ['x...x...x...x...', '............x...', '................', 'x.xxx.xxx.xxx.xx', '..x...x...x...x.', '..x.....x.x.....', '.x.x.x.x.x.x.x.x', '......x.........'] },
  'Electro': { bpm: 124, swing: 6, kick: 'hard', acid: .5, root: 49, chord: [0, 3, 7, 10], notes: [0, 0, 0, 12, 0, 10, 0, 0, 0, 0, 0, 12, 0, 7, 10, 0],
    p: [45, 70, 85, 40, 55, 80, 40, 60, 45, 20, 70, 40, 68, 55, 35, 58, 55, 95, 0, 0, 68, 30, 25, 20, 12, 0],
    g: ['x...x...x...x...', '....x.......x...', '....x.......x...', '..xx..xx..xx..xx', '..x...x...x...x.', '................', 'x.xx.x..x.xx.xx.', '......x.......x.'] },
  'Acid Jack': { bpm: 126, swing: 8, kick: 'deep', acid: .9, root: 55, chord: [0, 3, 7], notes: [0, 0, 12, 0, 3, 0, 0, 12, 0, 7, 0, 0, 10, 12, 0, 0],
    p: [50, 60, 65, 35, 55, 60, 35, 55, 40, 22, 66, 40, 64, 55, 35, 48, 85, 55, 0, 0, 60, 20, 0, 0, 8, 0],
    g: ['x...x...x...x...', '................', '....x.......x...', 'x.x.x.x.x.x.x.xx', '..x...x...x...x.', '................', 'x.xxx.xx.xx.xxx.', '................'] },
  'Deep House': { bpm: 122, swing: 18, kick: 'deep', acid: 0, root: 43.65, chord: [0, 3, 7, 10, 14], notes: [0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 7, 0, 0, 0, 0, 0],
    p: [70, 35, 40, 42, 45, 45, 40, 48, 50, 30, 50, 48, 50, 50, 40, 32, 25, 15, 0, 0, 45, 45, 15, 25, 18, 0],
    g: ['x...x...x...x...', '................', '....x.......x...', 'x..xx..xx..xx..x', '..x...x...x...x.', '......x......x..', 'x..x...x..x.....', 'x..x......x.....'] },
  'Breakbeat': { bpm: 134, swing: 24, kick: 'deep', acid: 0, root: 43.65, chord: [0, 4, 7, 11, 14], notes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 7, 0, 0],
    p: [55, 50, 55, 40, 60, 50, 25, 55, 45, 22, 60, 40, 58, 60, 30, 30, 15, 15, 0, 0, 55, 55, 30, 45, 25, 15],
    g: ['x......x..x.....', '.........x.....x', '....x.......x...', 'x.x.x.xxx.x.x.x.', '..x.......x.....', '...x.....x..x...', 'x..x......x..x..', 'x.....x...x.....'] },
  'Dub Techno': { bpm: 118, swing: 12, kick: 'deep', acid: 0, root: 46.25, chord: [0, 3, 7, 10, 14], notes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    p: [85, 10, 25, 55, 45, 40, 45, 42, 55, 18, 36, 55, 38, 70, 15, 22, 15, 8, 0, 10, 34, 62, 95, 85, 60, 70],
    g: ['x...x...x...x...', '................', '................', '..x..xx...x..xx.', '......x.........', '....x.......x..x', 'x.....x...x.....', '..x.......x.....'] }
};
const FIRST = 'Peak Warehouse';
const half = v => Math.round(v * 2) / 2;
// the old bongo row played a high or a low drum depending on the step; those become the hi and mid toms
const bongoHi = i => ![0, 3, 6, 10, 13].includes(i) && i % 2 === 0;
function convert(p) {
  const a = {}; PK.forEach((k, j) => { a[k] = p.p[j] / 100; });
  const v = {
    bpm: p.bpm, shuffle: Math.round(50 + p.swing * .33), key: ((Math.round(12 * Math.log2(p.root / 41.2)) % 12) + 12) % 12,
    'bd.tune': half(60 - a['bd.depth'] * 18), 'bd.decay': Math.round(3300 * (.045 + Math.pow(a['bd.decay'], 1.6) * .5)), 'bd.attack': p.p[1], 'bd.punch': p.p[2], 'bd.rumble': p.kick === 'hard' ? 80 : 0,
    'sd.tune': half((a['sd.tune'] - .5) * 10.8), 'sd.tone': 50, 'sd.snappy': p.p[5], 'sd.decay': Math.round(3670 * (.045 + a['sd.decay'] * .2)),
    'cp.tone': Math.round(950 + a['cp.tone'] * 750), 'cp.decay': Math.round(3500 * (.028 + a['cp.decay'] * .2)),
    'ch.decay': Math.round(4160 * (.011 + Math.pow(a['ch.decay'], 1.5) * .085)), 'oh.decay': Math.round(3450 * (.08 + Math.pow(a['oh.decay'], 1.4) * .5)), 'hh.tone': p.p[10],

    'bs.cutoff': Math.round(70 * Math.pow(2, a['bs.cutoff'] * 5.6)), 'bs.reso': p.p[16], 'bs.acid': Math.round(p.acid * 100), 'bs.drive': p.p[17], 'bs.echo': p.p[18], 'bs.decay': Math.round(1000 * (.05 + (1 - p.acid) * .18)), 'fx.efb': Math.round((.32 + a['fx.space'] * .42) / .9 * 100), 'fx.vdec': p.p[24] >= 50 ? 2.8 : 1.6,
    'st.tone': Math.min(12000, Math.round(300 * Math.pow(2, a['st.tone'] * 5.5))), 'st.decay': Math.round(1000 * (.08 + Math.pow(a['st.decay'], 1.5) * 1.6)),
    'st.chord': Math.max(0, CHORDS.findIndex(c => c[1].join() === p.chord.join())), 'st.echo': p.p[22], 'st.verb': p.p[23], 'fx.verb': p.p[24], 'fx.space': p.p[25]
  };
  ['lt', 'mt', 'ht'].forEach(t => { v[t + '.tune'] = half(7.2 + (a['rm.tune'] - .5) * 12); v[t + '.decay'] = Math.round(4000 * (.04 + a['rm.decay'] * .2) / 10) * 10; });
  const sc = emptyScene(), row = (k, s) => { sc.g[k] = s.split('').map(c => c === 'x'); };
  ['BD', 'SD', 'CP', 'CH', 'OH'].forEach((k, j) => row(k, p.g[j])); row('BS', p.g[6]); row('ST', p.g[7]);
  p.g[5].split('').forEach((c, i) => { if (c === 'x') sc.g[bongoHi(i) ? 'HT' : 'MT'][i] = true; });
  sc.n = p.notes.slice();
  return { v, sc };
}
// MD|187 and MD|888: the keyboard firmwares' factory patterns (md_gen_presets.py there), step for step. g: drum rows (808 and 909 together),
// ac: accent, bk: sample bank (BANKS), br: the SAMPLE row (1-8 = that slice, - = the slice before rings on, g = the loop plays on, . = off),
// cx: chop (how often the loop jumps), lv: sample level %, root + bs: the 303 line (n = semitones; a = accent, s = slide).
const VPRESETS = {
  "Boom Bap": {"s":"187","sw":32,"g":{"BD":"x......x..x.....","SD":"....x.......x...","CH":"x.x.x.x.x.x.x.x.","OH":"..............x."},"ac":"....x.......x...","bk":0,"br":"gggggggggggggggg","cx":0,"lv":70,"root":38,"bs":["0",".",".",".",".",".",".","0",".",".","s3","5",".",".",".","."]},
  "Dusty": {"s":"187","sw":36,"g":{"BD":"x.........x.....","CH":"..x...x...x...x."},"bk":1,"br":"1-..3-.2.1-3-..5","cx":0,"lv":100,"root":38,"bs":["0",".",".",".",".",".",".",".",".",".","0",".",".","-2",".","."]},
  "Stab City": {"s":"187","sw":30,"g":{"BD":"x......x.x......","SD":"....x.......x...","CH":"x.x.x.x.x.x.x.x.","RS":".......x......x."},"ac":"....x.......x...","bk":2,"br":"1-......2-....3.","cx":0,"lv":95,"root":38,"bs":["0",".",".",".",".",".",".","0",".","5",".",".",".",".",".","."]},
  "Vox Hits": {"s":"187","sw":32,"g":{"BD":"x.....x...x.....","SD":"....x.......x...","CP":"............x...","CH":"x.xxx.x.x.xxx.x."},"bk":3,"br":"..1-......2-..8-","cx":0,"lv":90,"root":38,"bs":["0",".",".",".",".",".","0",".",".",".","3",".",".",".",".","."]},
  "Laid Back": {"s":"187","sw":48,"g":{"BD":"x.......x.x.....","RS":"....x.......x...","CH":"x.x.x.x.x.x.x.x.","OH":"......x........."},"bk":1,"br":"......7-......7-","cx":0,"lv":80,"root":36,"bs":["0",".",".",".",".",".",".",".","0",".","s7","5",".",".",".","."]},
  "Chop Shop": {"s":"187","sw":28,"g":{"BD":"x.........x.....","CH":"x.x.x.x.x.x.x.x."},"bk":0,"br":"gggggggggggggggg","cx":65,"lv":100,"root":38,"bs":["0",".",".",".",".",".",".",".",".",".","0",".",".",".",".","."]},
  "Horns": {"s":"187","sw":30,"g":{"BD":"x......x..x.....","SD":"....x.......x...","CH":"x.x.x.x.x.x.x.x.","CR":"x..............."},"ac":"....x.......x...","bk":2,"br":"3-.4-.......3-4-","cx":0,"lv":95,"root":38,"bs":["0",".",".","0",".",".",".",".",".",".","a5",".",".",".",".","."]},
  "Scratch": {"s":"187","sw":34,"g":{"BD":"x......x..x..x..","SD":"....x.......x...","CH":"x.x.x.x.x.x.x.x."},"bk":3,"br":"........8-8-.8-.","cx":0,"lv":90,"root":38,"bs":["0",".",".",".",".",".",".","0",".",".","0",".",".",".",".","."]},
  "Warehouse": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CH":"xxxxxxxxxxxxxxxx","OH":"..x...x...x...x.","CP":"....x.......x..."},"ac":"x...x...x...x...","bk":4,"br":"gggggggggggggggg","cx":0,"lv":90},
  "Gabba": {"s":"888","sw":0,"g":{"CH":"..x...x...x...x.","CP":"....x.......x..."},"bk":5,"br":"gggggggggggggggg","cx":0,"lv":110,"root":45,"bs":["a0",".","0",".","a0",".","0",".","a0",".","0",".","a0",".","s0","12"]},
  "Trance Stab": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CH":"x.x.x.x.x.x.x.x.","OH":"..x...x...x...x.","RD":"x.x.x.x.x.x.x.x."},"bk":6,"br":"..1-..1-..2-..3-","cx":0,"lv":95},
  "Industry": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CH":"xxxxxxxxxxxxxxxx","RS":"...x..x....x..x."},"ac":"x...x...x...x...","bk":7,"br":"..1-......7-..5-","cx":0,"lv":90},
  "Acid 155": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CH":"..x...x...x...x.","CP":"....x.......x..."},"bk":4,"br":"gggggggggggggggg","cx":0,"lv":70,"root":45,"bs":["a0","0","s12","0","3","a0","s0","10","0","a12","0","s7","a0","0","3","s15"]},
  "Schranz": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CH":"xxxxxxxxxxxxxxxx","LT":"..x...x...x...x.","MT":".x...x...x...x..","HT":"...x...x...x...x"},"ac":"x...x...x...x...","bk":4,"br":"gggggggggggggggg","cx":0,"lv":75},
  "Rolling": {"s":"888","sw":0,"g":{"RS":".x..x..x.x..x..x","BD":"x...x...x...x...","OH":"..x...x...x...x.","CH":"x.xxx.xxx.xxx.xx"},"bk":4,"br":"gggggggggggggggg","cx":0,"lv":95},
  "Peak Time": {"s":"888","sw":0,"g":{"BD":"x...x...x...x...","CP":"....x.......x...","OH":"..x...x...x...x.","RD":"x.x.x.x.x.x.x.x.","CR":"x..............."},"ac":"x...x...x...x...","bk":6,"br":"1-..1-..6-..7-.4","cx":0,"lv":100}
};
// each machine's own sound, under every one of its patterns (the knobs are the same on all three)
const VSOUND = {
  187: { bpm: 96, 'bd.tune': 47, 'bd.decay': 950, 'bd.attack': 30, 'bd.punch': 38, 'bd.rumble': 0, 'sd.tune': -1.5, 'sd.tone': 38, 'sd.snappy': 48, 'sd.decay': 260, 'cp.tone': 1050, 'cp.decay': 260,
    'ch.decay': 55, 'oh.decay': 380, 'hh.tone': 34, 'rs.tune': -2, 'cr.tone': 35, 'cr.decay': 1800, 'bs.cutoff': 280, 'bs.reso': 18, 'bs.acid': 0, 'bs.drive': 22, 'bs.fat': 65, 'bs.decay': 420,
    'st.tone': 1700, 'st.decay': 520, 'st.chord': 3, 'fx.verb': 14, 'fx.space': 0, 'fx.drive': 18, 'fx.vdec': 1.2, 'drv.BD': 12, 'drv.SD': 18, 'flt.CH': -10, 'flt.SM': -6, 'drv.SM': 14, 'accent': 4 },
  888: { bpm: 155, 'bd.tune': 54, 'bd.decay': 420, 'bd.attack': 92, 'bd.punch': 100, 'bd.rumble': 85, 'sd.tune': 1, 'sd.snappy': 75, 'sd.decay': 220, 'cp.tone': 1500, 'cp.decay': 240,
    'ch.decay': 42, 'oh.decay': 300, 'hh.tone': 82, 'rd.tone': 70, 'bs.cutoff': 700, 'bs.reso': 72, 'bs.acid': 85, 'bs.drive': 80, 'bs.decay': 120, 'st.tone': 6000, 'st.decay': 280, 'st.chord': 1,
    'fx.verb': 20, 'fx.space': 14, 'fx.drive': 34, 'fx.vdec': 2.2, 'fx.etime': 2, 'fx.efb': 40, 'drv.BD': 55, 'drv.CP': 30, 'flt.SM': 0, 'drv.SM': 25, 'accent': 7 }
};
function convertV(p) {
  const v = Object.assign({}, VSOUND[p.s]); v.shuffle = Math.round(50 + p.sw / 4); v['sm.bank'] = p.bk; v['sm.chop'] = p.cx; v['lvl.SM'] = half(LEVEL.SM + 20 * Math.log10(Math.max(1, p.lv) / 100));
  const sc = emptyScene(); Object.keys(p.g).forEach(k => { sc.g[k] = p.g[k].split('').map(c => c === 'x'); }); if (p.ac) sc.g.AC = p.ac.split('').map(c => c === 'x');
  p.br.split('').forEach((c, i) => { sc.g.SM[i] = c !== '.'; sc.sl[i] = c >= '1' && c <= '8' ? +c : 0; });
  const root = p.root || (p.s === '888' ? 45 : 38); v.key = ((root - 28) % 12 + 12) % 12; const oct = 12 * Math.floor((root - 28) / 12);
  if (p.bs) p.bs.forEach((c, i) => { if (c === '.') return; sc.g.BS[i] = true; sc.n[i] = clamp(parseInt(c.replace(/^[asA]/, ''), 10) + oct, -24, 24); });
  return { v, sc };
}
const styleOf = name => (VPRESETS[name] ? VPRESETS[name].s : PRESETS[name] ? '442' : null);
const stylePresets = st => (st === '442' ? Object.keys(PRESETS) : Object.keys(VPRESETS).filter(n => VPRESETS[n].s === st));
function emptyScene() { return { g: Object.fromEntries(KEYS.map(k => [k, Array(16).fill(false)])), n: Array(16).fill(0), sl: Array(16).fill(0) }; }
// scenes saved before the sampler (or by another MD|442) get its row and slices
function fixScene(s) { if (!s || !s.g) return s; KEYS.forEach(k => { if (!Array.isArray(s.g[k]) || s.g[k].length !== 16) s.g[k] = Array(16).fill(false); }); if (!Array.isArray(s.sl) || s.sl.length !== 16) s.sl = Array(16).fill(0); else s.sl = s.sl.map(v => clamp(Math.round(+v) || 0, 0, 8)); return s; }
const copyScene = s => JSON.parse(JSON.stringify(s));
// Random: put together from parts that work with each other, so it always sounds like a beat
function randomScene() {
  const pick = a => a[Math.floor(Math.random() * a.length)], sc = emptyScene(), row = (k, s) => { sc.g[k] = s.split('').map(c => c === 'x'); };
  const BD = pick(['x...x...x...x...', 'x...x...x...x...', 'x...x...x...x..x', 'x...x..xx...x...', 'x.....x...x.....', 'x..x..x...x..x..', 'x.x.......xx....']), four = BD.startsWith('x...x...x...x');
  row('BD', BD);
  row('SD', four ? pick(['................', '................', '............x...', '.......x......x.']) : pick(['....x.......x...', '....x..x.x..x...', '....x.......x..x']));
  row('CP', four ? pick(['....x.......x...', '....x.......x...', '............x...']) : pick(['................', '............x...']));
  row('CH', pick(['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx', 'x..xx..xx..xx..x', 'xx.xxx.xxx.xxx.x', '..x...x...x...x.']));
  row('OH', pick(['..x...x...x...x.', '..x...x...x...x.', '..............x.', '......x.......x.', '................']));
  row('RS', pick(['................', '................', '..x..x....x..x..', '.......x.....x..', '...x......x.....']));
  const tom = pick(['................', '................', '...x..x....x.x..', '..x.....x.x.....', '.x...x.x...x..x.', '......x......x..']);
  tom.split('').forEach((c, i) => { if (c === 'x') sc.g[bongoHi(i) ? 'HT' : 'MT'][i] = true; });
  row('LT', pick(['................', '................', '................', '..............xx', '.............x.x']));
  row('RD', pick(['................', '................', '................', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.']));
  row('CR', pick(['................', '................', 'x...............']));
  row('BS', pick(['.xx..xx..xx..xx.', '.x.x.x.x.x.x.x.x', 'x..x..x...x..x..', 'x.x...x.x..x..x.', 'x.xxx.xx.xx.xxx.', 'x.......x..x....', '..x..x....x..x..', 'x..x...x..x.....']));
  row('ST', pick(['................', '................', '..............x.', '......x.........', 'x..x......x.....', '..x.....x..x....']));
  row('AC', pick(['................', 'x...x...x...x...', '..x...x...x...x.', 'x.....x...x.....']));
  const scale = [3, 5, 7, 10, 12, 12]; sc.n = Array.from({ length: 16 }, (_, i) => i % 4 === 0 || Math.random() < .6 ? 0 : pick(scale));
  if (S.style !== '442') {   // MD|187 / MD|888: the sampler joins in, a loop that plays on or a few slices
    const br = pick(['gggggggggggggggg', 'gggggggggggggggg', '1-..3-.2.1-3-..5', '..1-......2-..8-', '1-......2-....3.', '........8-8-.8-.', '..1-..1-..2-..3-']);
    br.split('').forEach((c, i) => { sc.g.SM[i] = c !== '.'; sc.sl[i] = c >= '1' && c <= '8' ? +c : 0; });
  }
  return sc;
}

/* ---------- state ---------- */
const P = {}; Object.keys(DEF).forEach(k => { P[k] = DEF[k].df; });
const S = { style: '442', preset: FIRST, dirty: false, scenes: [emptyScene()], sc: 0, chain: false, last: 16, mute: {}, kill: { LOW: false, MID: false, HI: false }, rep: { on: false, len: 1 }, sel: 'BD', view: 'one', mem: {}, mixer: false, midiOpen: false, metro: false, solo: null, keys: { open: false, target: 'BS', mode: 0, rate: 1, oct: 1, hold: false, rec: false } };
const sg = { mode: null, k: 0, wait: false, steps: [], ev: [], prev: {}, log: [], si: 0, ei: 0, notes: new Set(), saved: null, restoreT: 0, t0: 0, ending: false };   // SONG state (see SONG below)
let presetVals = {};                              // what double-click resets a knob to
const scene = () => S.scenes[S.sc];
// SCENE MIX: every scene keeps its own mutes, kills, filter, effects, mixer and sound knobs. The master volume and the tempo stay as they are.
const MIXK = () => Object.keys(DEF).filter(k => k !== 'vol' && k !== 'bpm' && k !== 'fx.filter');   // the DJ filter is played live, so a scene never moves it
function storeMix(sc) { sc = sc || scene(); if (!sc) return; const p = {}; MIXK().forEach(k => { p[k] = P[k]; }); sc.x = { P: p, mute: Object.assign({}, S.mute), kill: Object.assign({}, S.kill) }; }
function loadMix(sc) { sc = sc || scene(); if (!sc || !sc.x || !sc.x.P) return false; const x = sc.x; MIXK().forEach(k => { if (typeof x.P[k] === 'number') P[k] = clamp(x.P[k], DEF[k].mn, DEF[k].mx); }); S.mute = Object.assign({}, x.mute || {}); S.kill = Object.assign({ LOW: false, MID: false, HI: false }, x.kill || {}); return true; }
function goScene(n) { storeMix(); S.sc = clamp(n, 0, S.scenes.length - 1); if (loadMix()) { apply(); refreshKnobs(); } }
function loadPreset(name) {
  const st = styleOf(name); if (!st) return;
  const c = st === '442' ? convert(PRESETS[name]) : convertV(VPRESETS[name]), vol = P.vol; S.style = st; preloadBank(c.v['sm.bank'] != null ? c.v['sm.bank'] : DEF['sm.bank'].df);
  Object.keys(DEF).forEach(k => { P[k] = DEF[k].df; }); Object.assign(P, c.v); P.vol = vol;
  presetVals = Object.assign({}, P, { vol: DEF.vol.df });
  Object.assign(S, { preset: name, dirty: false, scenes: [c.sc], sc: 0, chain: false, last: 16, mute: {}, mem: {} }); pend = null;
}
const resetVal = k => (k in presetVals ? presetVals[k] : DEF[k].df);
const LS = 'md442-v2', LSB = 'md442-v2-beats';
let saveT = 0;
const saveNow = () => { clearTimeout(saveT); if (sg.saved) return;   /* a song is playing: your own beat is already saved */ storeMix(); try { localStorage.setItem(LS, JSON.stringify({ P, S: Object.assign({}, S, { rep: { on: false, len: S.rep.len } }), presetVals })); } catch (_) {} };
function persist() { storeMix(); clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
addEventListener('pagehide', saveNow);   // nothing from the last moment is lost when the page closes
const okScene = s => !!(s && s.g && fixScene(s) && Array.isArray(s.n) && s.n.length === 16);
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem(LS) || 'null'); if (!d || !d.S || !Array.isArray(d.S.scenes) || !d.S.scenes.length || !d.S.scenes.every(okScene)) return false;
    Object.keys(DEF).forEach(k => { if (typeof d.P[k] === 'number') P[k] = clamp(d.P[k], DEF[k].mn, DEF[k].mx); });
    const S0 = JSON.parse(JSON.stringify(S)); Object.assign(S, d.S); ['mute', 'kill', 'rep', 'mem'].forEach(k => { if (!S[k] || typeof S[k] !== 'object') S[k] = S0[k]; }); if (typeof S.rep.len !== 'number') S.rep = S0.rep; S.scenes = S.scenes.slice(0, 8); S.sc = clamp(S.sc | 0, 0, S.scenes.length - 1); S.rep.on = false; S.last = clamp(Math.round(+S.last) || 16, 1, 16); if (!['one', 'all'].includes(S.view)) S.view = 'one'; S.keys = Object.assign({ open: false, target: 'BS', mode: 0, rate: 1, oct: 1, hold: false, rec: false }, S.keys || {}); S.keys.rec = false; if (!KEYS.includes(S.sel)) S.sel = 'BD'; if (!STYLES[S.style]) S.style = styleOf(S.preset) || '442';
    P['fx.filter'] = 0;   // always open at centre: no filter
    presetVals = d.presetVals || {}; return true;
  } catch (_) { return false; }
}
let beats = []; try { const b = JSON.parse(localStorage.getItem(LSB) || '[]'); if (Array.isArray(b)) beats = b.filter(x => x && x.name && x.P && Array.isArray(x.scenes) && x.scenes.every(okScene)).slice(0, 8); } catch (_) {}
const keepBeats = () => { try { localStorage.setItem(LSB, JSON.stringify(beats)); } catch (_) {} };

/* ---------- 3. sound engine ---------- */
/* Drums are made the way the classic analogue machines make them: ringing resonators hit by a pulse,
   banks of six square waves for the metal, filtered noise for snap and clap. Works on a live or an offline context. */
const BUS = .4, CLIPIN = .56, OUT = .79, DUCK = .75, BDUCK = .72;   // louder into the soft clip (patterns land near -13 LUFS with peaks around -3 dBFS, so the kick keeps its punch); the ceiling stays at -1 dBFS: tanh(3.5) / tanh(1.4) × .79
const PTRIM = { 'Peak Warehouse': .5, 'Berlin Roll': -1, 'Electro': 1.6, 'Acid Jack': 1.9, 'Deep House': 2.6, 'Breakbeat': 1.8, 'Dub Techno': 1,
  'Boom Bap': 2.0, 'Dusty': 2.5, 'Stab City': 3, 'Vox Hits': 3, 'Laid Back': 3, 'Chop Shop': 3, 'Horns': 2.5, 'Scratch': 3, 'Warehouse': -1.0, 'Gabba': -0.5, 'Trance Stab': 2.5, 'Industry': 0.5, 'Acid 155': -0.5, 'Schranz': -0.5, 'Rolling': 1.5, 'Peak Time': -1.0 };   // dB per pattern, so they all play at the same loudness   // headroom into the master chain, output trim after the limiter, how far the kick dips the rest
const trimOf = () => { const b = beats.find(x => x.name === S.preset); return b ? +b.trim || 0 : PTRIM[S.preset] || 0; };
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540, 800], RIDE_F = [263, 400, 421, 474, 587, 845];
const curves = {};
const CDA = { BD: .9, BS: .6, LT: .5, MT: .5, HT: .45, SD: .45, CP: .45 };   // where each channel's drive starts to bite: about where that drum peaks
const setCurve = (ws, c) => { if (ws._c !== c) { ws._c = c; ws.curve = c; } };   // a new curve is only handed over when it changed: Chrome drops a block of audio while it swaps one in, which is crackle when it happens on every knob move
function shape(k, comp) { const id = k.toFixed(2) + '|' + comp.toFixed(2); if (curves[id]) return curves[id]; const c = new Float32Array(2049), n = Math.tanh(k); for (let i = 0; i < 2049; i++) c[i] = Math.tanh(k * (i / 1024 - 1)) / n * comp; /* odd length: silence in gives silence out */ return (curves[id] = c); }
// drive that adds grit without jumping in level: a signal peaking at A is rounded off, and the quiet parts only come up a little (about 3 dB at full drive)
function soft(amt, A) { const id = 's' + amt.toFixed(2) + '|' + A; if (curves[id]) return curves[id]; const kA = .05 + amt * 3, k = kA / A, m = Math.pow(Math.tanh(kA) / kA, .5), c = new Float32Array(2049); for (let i = 0; i < 2049; i++) c[i] = A * Math.tanh(k * (i / 1024 - 1)) / Math.tanh(kA) * m; return (curves[id] = c); }
function mkEngine(ac, live) {
  const g = (v = 1) => { const n = ac.createGain(); n.gain.value = v; return n; };
  const bq = (type, f, q, gn) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; if (gn != null) n.gain.value = gn; return n; };
  const chain = (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1]; };
  const X = { ac, live, g, bq, chain, ch: {}, sv: {}, sd: {}, in: {}, chAn: {}, cdrv: {}, clp: {}, chp: {}, pan: {}, pre: {}, openHat: null };
  X.noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); { const d = X.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  X.pulse = ac.createBuffer(1, Math.ceil(ac.sampleRate * .004), ac.sampleRate); { const d = X.pulse.getChannelData(0), n = ac.sampleRate * .0008; for (let i = 0; i < d.length; i++) d[i] = i < n ? 1 : Math.exp(-(i - n) / (n * .6)); }
  const bank = fs => { const b = g(.17), os = fs.map(f => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(b); o.start(); return o; }); b.os = os; return b; };
  X.bank = bank(HAT_F); X.crBank = bank(HAT_F); X.rdBank = bank(RIDE_F);

  // master: EQ kills → DJ filter (24 dB both ways) → overdrive → volume → glue compressor → soft clip
  X.mix = g(BUS); X.duck = g(); X.duck.connect(X.mix);
  X.lo = bq('lowshelf', 300, null, 0); X.mid = bq('peaking', 1000, .7, 0); X.hi = bq('highshelf', 4000, null, 0);
  X.lp1 = bq('lowpass', 22000, -3); X.lp2 = bq('lowpass', 22000, -3); X.hp1 = bq('highpass', 18, -3); X.hp2 = bq('highpass', 10, -3);   // parked outside the audio band until the Filter knob moves
  X.mst = g(.7); X.drv = ac.createWaveShaper(); X.drv.oversample = '2x';
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = .03; comp.release.value = .12;   // glue, not squash: the attack lets the kick through, the release breathes in time with a techno groove
  // output limiter: the same soft curve as before, but it now keeps bending smoothly for peaks up to 2.5× full scale instead of chopping them flat,
  // and it is not oversampled (an oversampled last stage overshoots past full scale, and the sound card turns that into crackle)
  const clip = ac.createWaveShaper(); { const c = new Float32Array(4096), n = Math.tanh(1.4); for (let i = 0; i < 4096; i++) c[i] = Math.tanh(1.4 * 2.5 * (i / 2047.5 - 1)) / n; clip.curve = c; } clip.oversample = 'none';
  X.an = ac.createAnalyser(); X.an.fftSize = 512;
  chain(X.mix, X.lo, X.mid, X.hi, X.lp1, X.lp2, X.hp1, X.hp2, X.drv, X.mst, comp, g(CLIPIN), clip, g(OUT), X.an, ac.destination);

  // reverb: pre-delay → generated room with a tail that gets darker → band-limited return
  X.revIn = g(); const pre = ac.createDelay(.1); pre.delayTime.value = .018;
  X.cvs = [ac.createConvolver(), ac.createConvolver()]; X.cvg = [g(1), g(0)]; X.cvA = 0; X.irSecs = 0;
  X.revRet = g(11); const rvf = bq('highpass', 320, .7); X.cvs.forEach((c, j) => { pre.connect(c); c.connect(X.cvg[j]); X.cvg[j].connect(rvf); }); X.revIn.connect(pre);
  chain(rvf, bq('highshelf', 5000, null, -3), bq('lowpass', 9000, .7), X.revRet, X.duck);
  // dub delay: dotted eighth, filtered feedback, a little of it into the room
  X.dlyIn = g(); X.dl = ac.createDelay(2); X.fb = g(.4); X.dlyRet = g(1.6);
  const dlp = bq('lowpass', 2000, -3), dhp = bq('highpass', 140, -3);   // Q is in dB here: -3 = no bump, so the loop can never gain and run away   // inside the loop, so every repeat is darker than the last
  chain(X.dlyIn, X.dl, dlp, dhp, X.fb, X.dl); chain(dhp, bq('highpass', 300, .7), X.dlyRet); X.dlyRet.connect(X.duck); chain(X.dlyRet, g(.18), X.revIn);
  // channels, each with a room send and a delay send. The kick skips the ducker: it is what ducks the rest.
  SOUND.forEach(k => {
    const c = X.ch[k] = g(1), bus = k === 'BD' ? X.mix : X.duck;
    X.cdrv[k] = ac.createWaveShaper(); X.clp[k] = bq('lowpass', 22000, -3); X.chp[k] = bq('highpass', 10, -3);
    X.pan[k] = ac.createStereoPanner ? ac.createStereoPanner() : g(1);
    if (k === 'BS') { X.bduck = g(); chain(X.cdrv[k], X.clp[k], X.chp[k], c, X.pan[k], X.bduck, bus); } else chain(X.cdrv[k], X.clp[k], X.chp[k], c, X.pan[k], bus); X.in[k] = X.pre[k] = X.cdrv[k];
    X.sv[k] = g(0); c.connect(X.sv[k]); X.sv[k].connect(X.revIn);
    X.sd[k] = g(0); c.connect(X.sd[k]); X.sd[k].connect(X.dlyIn);
    if (live) { const a = ac.createAnalyser(); a.fftSize = 256; c.connect(a); X.chAn[k] = a; }       // feeds the mixer's channel meter
  });
  X.in.BD = g(.62); X.kSh = ac.createWaveShaper(); X.kSh.oversample = '2x'; chain(X.in.BD, X.kSh, X.pre.BD);      // kick saturation
  X.rum = g(0); chain(X.ch.BD, X.rum, bq('lowpass', 130, .7), X.revIn);                                         // low rumble into the room
  X.in.BS = g(); X.bSh = ac.createWaveShaper(); X.bSh.oversample = '2x'; chain(X.in.BS, X.bSh, X.pre.BS);      // bass drive
  X.in.ST = g(); chain(X.in.ST, bq('highpass', 170, .7), X.pre.ST);                                              // keep the stab out of the low end
  // switching Reverb or Echo off empties what is still ringing, so nothing hangs on after the switch
  X.flushVerb = () => { if (!X.live) return; const now = ac.currentTime; hold(X.revRet.gain, now); X.revRet.gain.setTargetAtTime(0, now, .012);
    setTimeout(() => { const n = ac.currentTime; X.cvs.forEach(c => { if (c.buffer) { c.buffer = null; c.buffer = mkIR(ac, X.irSecs); } }); hold(X.revRet.gain, n); X.revRet.gain.setTargetAtTime(11, n + .02, .02); }, 90); };
  X.flushEcho = () => { if (!X.live) return; const now = ac.currentTime, wait = X.dl.delayTime.value + .12; X.echoHold = now + wait; [X.fb.gain, X.dlyRet.gain].forEach(p => { hold(p, now); p.setTargetAtTime(0, now, .01); });
    setTimeout(() => { const n = ac.currentTime; X.echoHold = 0; hold(X.dlyRet.gain, n); X.dlyRet.gain.setTargetAtTime(1.6, n, .02); hold(X.fb.gain, n); X.fb.gain.setTargetAtTime(P['fx.efb'] / 100 * .9, n, .02); }, wait * 1000); };
  return X;
}
const hold = (param, t) => { if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else param.cancelScheduledValues(t); };   // freeze an automation where it is, without a jump
// the reverb's room: noise that dies away to -60 dB in 'secs', getting darker as it goes, with a few early reflections
function mkIR(ac, secs) {
  const sr = ac.sampleRate, len = Math.max(64, Math.floor(sr * secs * 1.05)), ir = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const x = ir.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, a = Math.exp(-2 * Math.PI * (1400 + 9000 * Math.exp(-t * 3.2 / secs)) / sr); lp += (1 - a) * ((Math.random() * 2 - 1) - lp); x[i] = lp * Math.exp(-6.9 * t / secs) * Math.min(1, i / 130, (len - i) / 2000); }   // dense from the first sample, no separate echoes
  }
  return ir;
}
const lin = db => db <= -40 ? 0 : Math.pow(10, db / 20);
const off = k => !!S.mute[k] || (!!S.solo && S.solo !== k);   // silent: muted, or another drum is soloed
// one-knob filter: left of centre a low-pass closes, right of centre a high-pass opens. At centre both sit outside the audio band, so nothing is lost and nothing clicks.
function filt(lp, hp, v, T) {
  const lo = v < -4, hi = v > 4;
  T(lp.frequency, lo ? lpHz(v) : 22000, .03); T(lp.Q, lo ? 1 + (-v / 100) * 3 : -3, .03);
  T(hp.frequency, hi ? hpHz(v) : 10, .03); T(hp.Q, hi ? 1 + (v / 100) * 3 : -3, .03);
}
function apply(X) {
  X = X || E; if (!X) return;
  const t = X.ac.currentTime, T = (p, v, tc = .02) => { if (X.live) p.setTargetAtTime(v, t, tc); else p.value = v; };
  T(X.mst.gain, lin(P.vol) * Math.pow(10, trimOf() / 20));
  SOUND.forEach(k => T(X.ch[k].gain, off(k) ? 0 : lin(P['lvl.' + k]), .012));
  T(X.lo.gain, S.kill.LOW ? -40 : 0, .01); T(X.mid.gain, S.kill.MID ? -40 : 0, .01); T(X.hi.gain, S.kill.HI ? -40 : 0, .01);
  if (X.irSecs !== P['fx.vdec']) {   // rebuilt a moment after the Decay knob stops, into the idle room, which then fades in over the old one
    X.irSecs = P['fx.vdec']; clearTimeout(X.irT);
    const mk = () => { if (X.irSecs !== P['fx.vdec']) return; const b = mkIR(X.ac, P['fx.vdec']); if (!X.live || !X.cvs[X.cvA].buffer) { X.cvs[X.cvA].buffer = b; return; }
      const nx = 1 - X.cvA, now = X.ac.currentTime; X.cvs[nx].buffer = b; hold(X.cvg[nx].gain, now); hold(X.cvg[X.cvA].gain, now); X.cvg[nx].gain.setTargetAtTime(1, now + .02, .08); X.cvg[X.cvA].gain.setTargetAtTime(0, now + .02, .08); const old = X.cvA; X.cvA = nx; setTimeout(() => { if (X.cvA !== old) X.cvs[old].buffer = null; }, 900); };   // the faded-out room is emptied, so only one room costs CPU
    if (X.live && X.cvs[X.cvA].buffer) X.irT = setTimeout(mk, 180); else mk();
  }
  const va = Math.pow(P['fx.verb'] / 100, .8) * 2.2, sa = Math.pow(P['fx.space'] / 100, .7) * 1.3;
  SOUND.forEach(k => {
    // the stab's and the bass's own sends work by themselves; the drums' sends are scaled by the master Reverb and Space knobs
    const v = k === 'ST' ? P['st.verb'] / 100 * .5 : P['rev.' + k] / 100 * (k === 'BS' ? .4 : va), d = k === 'BS' ? P['bs.echo'] / 100 * .8 : k === 'ST' ? P['st.echo'] / 100 * 1.1 : P['ech.' + k] / 100 * sa;
    const pv = P['pan.' + k] / 100; if (X.pan[k].pan) T(X.pan[k].pan, pv, .02);
    const cd = P['drv.' + k] / 100; setCurve(X.cdrv[k], cd > .01 ? soft(cd, CDA[k] || .35) : null);
    filt(X.clp[k], X.chp[k], P['flt.' + k], T);
    T(X.sv[k].gain, v, .04); T(X.sd[k].gain, d, .04);
  });
  if (!(X.echoHold > t)) T(X.fb.gain, P['fx.efb'] / 100 * .9, .05); T(X.dl.delayTime, Math.min(1.95, 60 / P.bpm / 4 * ETIMES[P['fx.etime']][1]), .08);
  const v = P['fx.filter'], lo = v < -4, hi = v > 4;                      // 24 dB per octave either way
  [X.lp1, X.lp2].forEach((n, j) => { T(n.frequency, lo ? lpHz(v) : 22000, .03); T(n.Q, lo ? (j ? 1 + (-v / 100) * 4.5 : -3) : -3, .03); });
  T(X.hp1.frequency, hi ? hpHz(v) : 18, .03); T(X.hp2.frequency, hi ? hpHz(v) : 10, .03); T(X.hp2.Q, hi ? 1 + (v / 100) * 4.5 : -3, .03);
  const pun = P['bd.punch'] / 100, rmb = P['bd.rumble'] / 100, depth = clamp((60 - P['bd.tune']) / 18, 0, 1);
  setCurve(X.kSh, shape(1 + pun + rmb * .4, .95));
  T(X.rum.gain, (.02 + rmb * (.1 + depth * .07)) / 9, .05);   // the reverb return is 11× hotter than it was, so the rumble send is trimmed to match
  const dr = P['bs.drive'] / 100; setCurve(X.bSh, shape(1 + dr * 18, 1 - dr * .32));
  const da = P['fx.drive'] / 100; setCurve(X.drv, da > .01 ? soft(da, .5) : null);
  const cr = Math.pow(2, P['cr.tune'] / 12), rd = Math.pow(2, P['rd.tune'] / 12);
  X.crBank.os.forEach((o, i) => T(o.frequency, HAT_F[i] * 1.12 * cr, .01)); X.rdBank.os.forEach((o, i) => T(o.frequency, RIDE_F[i] * 1.5 * rd, .01));
}
function voice(X, k, t, i, vel, note) {
  const ac = X.ac; let d = X.in[k]; if (!d) return;
  if (vel && vel !== 1) { const a = ac.createGain(); a.gain.value = vel; a.connect(d); d = a; }
  // capacitor-style envelope: fast rise, true exponential fall
  const eg = (pk, tau, att = .0008) => { const n = ac.createGain(); n.gain.value = 0; /* start shut: a gain node is at 1 until its first scheduled value */ n.gain.setValueAtTime(0, t); n.gain.linearRampToValueAtTime(pk, t + att); n.gain.setTargetAtTime(0, t + att, tau); return n; };
  const flt = (type, f, q, gn) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; if (gn) n.gain.value = gn; return n; };
  // one ringing resonator: a sine that starts sharp and settles onto its note
  const ring = (f, tau, pk, bend = 1, bendT = .01, sag = 1) => {
    const o = ac.createOscillator(), e = eg(pk, tau); o.type = 'sine'; o.frequency.value = f * bend; o.frequency.setValueAtTime(f * bend, t);   // set the pitch outright too: an oscillator runs at 440 Hz until its first scheduled value
    if (bend !== 1) o.frequency.exponentialRampToValueAtTime(f, t + bendT); if (sag !== 1) o.frequency.exponentialRampToValueAtTime(f * sag, t + bendT + tau * 3);
    o.connect(e); e.connect(d); o.start(t); o.stop(t + tau * 12 + .05);
  };
  const click = (pk, cutoff) => { const b = ac.createBufferSource(), f = flt('lowpass', cutoff, .7), e = ac.createGain(); b.buffer = X.pulse; e.gain.value = pk; b.connect(f); f.connect(e); e.connect(d); b.start(t); };
  const hiss = (pk, tau, filters, att) => { const b = ac.createBufferSource(), e = eg(pk, tau, att); b.buffer = X.noise; b.loop = true; let n = b; filters.forEach(f => { n.connect(f); n = f; }); n.connect(e); e.connect(d); b.start(t, Math.random() * 1.5); b.stop(t + tau * 12 + .05); return e; };
  // a burst of one of the square-wave banks through filters; the bank is unplugged again once the sound has died away
  const metal = (bank, filters, env, life) => {
    let n = bank; filters.forEach(f => { n.connect(f); n = f; }); n.connect(env); env.connect(d);
    if (X.live) setTimeout(() => { try { bank.disconnect(filters[0]); } catch (_) {} }, Math.max(0, (t - ac.currentTime) + life + .2) * 1000);
    return env;
  };
  if (k === 'BD') {
    const f = P['bd.tune'], tau = P['bd.decay'] / 3300, pu = P['bd.punch'] / 100, at = P['bd.attack'] / 100;
    ring(f, tau, .8, 1.9 + pu * 4.2, .007 + (1 - pu) * .022, .955); ring(f * 2, tau * .28, .16 + pu * .2, 1.5, .006);   // a little second harmonic for weight on small speakers
    if (at > .02) { click(at * .55, 600 + at * 3400); hiss(at * .5 + pu * .2, .0042, [flt('bandpass', 3300 + at * 1400, 1.5)], .0004); }   // the beater: a tick you hear on headphones and small speakers
    ring(f * 3.1, .014 + pu * .008, .08 + pu * .14, 1.3, .004);   // knock: the short mid punch of a hard kick, gone before the bass comes back
    const g2 = X.duck.gain; hold(g2, t); g2.setTargetAtTime(DUCK, t, .004); g2.setTargetAtTime(1, t + .06, .06);   // everything else dips for a moment
    const g3 = X.bduck.gain; hold(g3, t); g3.setTargetAtTime(BDUCK, t, .003); g3.setTargetAtTime(1, t + .07, .045);   // and the bass a bit further, so kick and bass never fight
  } else if (k === 'SD') {
    const f = 238 * Math.pow(2, P['sd.tune'] / 12), sn = P['sd.snappy'] / 100, tn = P['sd.tone'] / 100 - .5;
    ring(f, .055, .75, 1.7, .008); ring(f * 2, .032, .4, 1.4, .006);
    hiss((.12 + sn * .34) * 1.7, P['sd.decay'] / 3670, [flt('highpass', (1700 + sn * 900) * Math.pow(2, tn * 1.6), .7), flt('peaking', 5200, .8, tn * 14)]);
  } else if (k === 'CP') {
    const b = ac.createBufferSource(), bp = flt('bandpass', P['cp.tone'], 1.4), hp = flt('highpass', 450, .7), e = ac.createGain(), tail = P['cp.decay'] / 3500;
    b.buffer = X.noise; b.loop = true; e.gain.value = 0; e.gain.setValueAtTime(0, t);
    [0, .0105, .021].forEach(o => { e.gain.setValueAtTime(3, t + o); e.gain.linearRampToValueAtTime(.32, t + o + .0095); });   // three quick bursts
    e.gain.setValueAtTime(2.3, t + .032); e.gain.setTargetAtTime(0, t + .032, tail);                                           // then the room-like tail
    b.connect(bp); bp.connect(hp); hp.connect(e); e.connect(d); b.start(t, Math.random()); b.stop(t + .04 + tail * 8);
  } else if (k === 'RS') {
    const f = Math.pow(2, P['rs.tune'] / 12);
    ring(1720 * f, .0075, .5); ring(497 * f, .011, .42, 1.3, .004); ring(1060 * f, .006, .22); click(.5, 7000);
  } else if (k === 'LT' || k === 'MT' || k === 'HT') {
    const tk = k.toLowerCase(), f = { LT: 110, MT: 165, HT: 247 }[k] * Math.pow(2, P[tk + '.tune'] / 12), tau = P[tk + '.decay'] / 4000;
    ring(f, tau, .55, k === 'LT' ? 1.45 : 1.28, k === 'LT' ? .02 : .012); ring(f * 2.02, tau * .3, .08); click(.2, 2600);
  } else if (k === 'CH' || k === 'OH') {
    const open = k === 'OH', tn = P['hh.tone'] / 100, tau = open ? P['oh.decay'] / 3450 : P['ch.decay'] / 4160, life = tau * 9;
    if (X.openHat) { hold(X.openHat.gain, t); X.openHat.gain.setTargetAtTime(0, t, .006); X.openHat = null; }   // a new hat chokes the open one
    // the metal bank through the two classic band-passes (3.44 k body, 7.1 k sizzle), then a high-pass set by TONE, plus a layer of band-passed noise for air
    const e = eg(open ? .36 : .6, tau, .0015), hp = flt('highpass', 2400 + tn * 4600, .7), lo = flt('bandpass', 3440, 1.1), hi = flt('bandpass', 7100, 1), lg = ac.createGain(), hg = ac.createGain(), sm = flt('highshelf', 9500, null, -4);   // softer front edge and a gentle top shelf: crisp, not fizzy
    lg.gain.value = 6 * (1 - tn * .6); hg.gain.value = 8; X.bank.connect(lo); X.bank.connect(hi); lo.connect(lg); hi.connect(hg); lg.connect(hp); hg.connect(hp); hp.connect(sm); sm.connect(e); e.connect(d);
    if (X.live) setTimeout(() => { try { X.bank.disconnect(lo); X.bank.disconnect(hi); } catch (_) {} }, Math.max(0, (t - ac.currentTime) + life + .2) * 1000);
    const nz = ac.createBufferSource(), ng = ac.createGain(); nz.buffer = X.noise; nz.loop = true; ng.gain.value = 1.6 + tn * .6;
    nz.connect(ng); const nh = flt('bandpass', 7000 + tn * 3000, .9); ng.connect(nh); nh.connect(sm); nz.start(t, Math.random() * 1.5); nz.stop(t + life + .1);
    if (open) X.openHat = e;
  } else if (k === 'CR') {
    const tau = P['cr.decay'] / 3450, f = Math.pow(2, P['cr.tune'] / 12), ctn = Math.pow(2, (P['cr.tone'] / 100 - .5) * 1.4);
    metal(X.crBank, [flt('highpass', 3400 * f * ctn, .7), flt('peaking', 7200 * f * ctn, .9, 4)], eg(1.1, tau, .002), tau * 9);
    hiss(.45, tau * .55, [flt('highpass', 6200 * f * ctn, .7)], .002); hiss(.5, .02, [flt('bandpass', 4200 * f, .8)], .001);
  } else if (k === 'RD') {
    const tau = P['rd.decay'] / 3450, f = Math.pow(2, P['rd.tune'] / 12), rtn = Math.pow(2, (P['rd.tone'] / 100 - .5) * 1.4), fl = () => [flt('bandpass', 6800 * f * rtn, 1.6), flt('highpass', 4200 * f * rtn, .7)];
    metal(X.rdBank, fl(), eg(2.6, .028, .0006), .4); metal(X.rdBank, fl(), eg(1.2, tau, .001), tau * 9);                           // the ping, then the wash
    hiss(.32, tau * .8, [flt('bandpass', 7400 * f * rtn, .7), flt('highpass', 4200 * f, .7)], .002);                               // noise in the wash, so it shimmers instead of buzzing on six notes
  } else if (k === 'BS') {
    const fr = 41.2 * Math.pow(2, (P.key + (note != null ? note : scene().n[i] || 0)) / 12), sd = 60 / P.bpm / 4, acid = P['bs.acid'] / 100, len = sd * (acid > .3 ? 1.05 : 1.6);
    const res = P['bs.reso'] / 100, base = P['bs.cutoff'], peak = Math.min(14000, base * (2 + acid * 8 + res * 2));
    const l1 = ac.createBiquadFilter(), l2 = ac.createBiquadFilter(), e = ac.createGain(), o1 = ac.createOscillator(), o2 = ac.createOscillator(), og = ac.createGain();
    l1.type = l2.type = 'lowpass'; l1.Q.value = .5; l2.Q.value = .7 + res * (acid > .3 ? 16 : 9);
    [l1, l2].forEach(l => { l.frequency.setValueAtTime(peak, t); l.frequency.exponentialRampToValueAtTime(Math.min(base, peak), t + P['bs.decay'] / 1000); });
    o1.type = acid > .3 ? 'square' : 'sawtooth'; o1.frequency.value = fr * (acid > .3 ? 2 : 1); o2.type = 'sine'; o2.frequency.value = fr; og.gain.value = acid > .3 ? .42 : .9;
    o1.connect(og); og.connect(l1); l1.connect(l2); l2.connect(e);
    // FAT: two more oscillators tuned slightly either side of the note, and more sub
    const fat = P['bs.fat'] / 100, sub = ac.createGain(), more = []; sub.gain.value = 1 + fat * .5; o2.connect(sub); sub.connect(e);
    if (fat > .01) { const fg = ac.createGain(); fg.gain.value = og.gain.value * (.35 + fat * .45); fg.connect(l1); [-1, 1].forEach(sg => { const o = ac.createOscillator(); o.type = o1.type; o.frequency.value = o1.frequency.value; o.detune.value = sg * (5 + fat * 17); o.connect(fg); more.push(o); }); og.gain.value *= 1 - fat * .2; }
    e.gain.value = 0; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.5, t + .004); e.gain.setTargetAtTime(.34, t + .004, .05); e.gain.setTargetAtTime(0, t + len, .025);
    e.connect(d); [o1, o2].concat(more).forEach(o => { o.start(t); o.stop(t + len + .2); });
  } else if (k === 'SM') {
    sampler(X, t, i, vel, note != null ? note : (scene().sl[i] | 0));
  } else if (k === 'ST') {
    const top = P['st.tone'], tn = Math.log2(top / 300) / 5.5, dur = P['st.decay'] / 1000;
    const lp = ac.createBiquadFilter(), e = ac.createGain(); lp.type = 'lowpass'; lp.Q.value = 2 + tn * 5;
    lp.frequency.setValueAtTime(Math.min(top, 16000), t); lp.frequency.exponentialRampToValueAtTime(Math.max(140, top * .15), t + dur * .85);
    CHORDS[P['st.chord']][1].forEach(iv => [-8, 8].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 41.2 * 4 * Math.pow(2, (P.key + iv + (note || 0)) / 12); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + .1); }));
    lp.connect(e); e.gain.value = 0; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.24, t + .004); e.gain.exponentialRampToValueAtTime(.0005, t + .004 + dur); e.gain.setTargetAtTime(0, t + .004 + dur, .012); e.connect(d);
  }
}
/* the sampler: MD|187 and MD|888's banks, fetched the first time a pattern or the LOOP knob needs one, played in time with the tempo */
const bankBufs = {}, bankWait = {};
function preloadBank(i) {
  i = clamp(Math.round(+i) || 0, 0, BANKS.length - 1); if (bankBufs[i]) return Promise.resolve(bankBufs[i]); if (bankWait[i]) return bankWait[i];
  const b = BANKS[i], OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC || !window.fetch) return Promise.resolve(null);
  const dc = new OAC(1, 1, 44100);
  return (bankWait[i] = fetch(BASE + 'samples/md' + b[0] + '/' + b[1] + '.wav').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(a => new Promise((res, rej) => dc.decodeAudioData(a, res, rej))).then(buf => { bankBufs[i] = buf; bankWait[i] = null; return buf; }).catch(() => { bankWait[i] = null; return null; }));
}
// sl > 0: that slice (1-8) of the bank; sl < 0: the loop from step -sl - 1; else the loop where this step falls (two-bar banks follow the bar count)
const SM_GAIN = 2.2;   // the banks sat about 8 dB under the drums: +6 dB so a slice or a vocal cuts through
function sampler(X, t, i, vel, sl) {
  const bi = Math.round(P['sm.bank']), buf = bankBufs[bi], b = BANKS[bi]; if (!buf) { preloadBank(bi); return false; }
  const ac = X.ac, rate = P.bpm / b[3] * Math.pow(2, P['sm.tune'] / 12), steps = 16 * b[2], per = buf.duration / steps;
  let off, dur;
  if (sl > 0) { off = (sl - 1) * buf.duration / 8; dur = buf.duration / 8; X.smLoop = false; }
  else { const pos = sl < 0 ? (-sl - 1) % steps : (i + 16 * ((X.bar || 0) % b[2])) % steps; off = pos * per; dur = buf.duration - off; X.smLoop = true; }
  if (X.smG && X.smEnd > t) { hold(X.smG.gain, t); X.smG.gain.setTargetAtTime(0, t, .003); }      // one sampler voice: a new hit cuts the last, as on the keyboard
  const src = ac.createBufferSource(), e = ac.createGain(), end = t + dur / rate; src.buffer = buf; src.playbackRate.value = rate;
  e.gain.value = 0; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * SM_GAIN, t + .002); e.gain.setValueAtTime(vel * SM_GAIN, Math.max(t + .002, end - .006)); e.gain.linearRampToValueAtTime(0, end);
  src.connect(e); e.connect(X.in.SM); src.start(t, off, dur + .01); src.stop(end + .02); X.smG = e; X.smEnd = end; return true;
}
// a SAMPLE step in a pattern: a slice plays and rings through the steps after it (the firmware's "-"); a run of loop steps plays on and
// is only lined up again every beat, unless CHOP makes it jump somewhere else in the loop (the firmware's break generator)
function smStep(X, sc, idx, t, vel) {
  const s = sc.sl[idx] | 0; if (s) return sampler(X, t, idx, vel, s);
  const prevOn = idx > 0 && sc.g.SM[idx - 1]; let j = idx - 1; while (j >= 0 && sc.g.SM[j] && !sc.sl[j]) j--;
  if (prevOn && j >= 0 && sc.g.SM[j] && sc.sl[j]) return false;
  const chop = P['sm.chop'] / 100, b = BANKS[Math.round(P['sm.bank'])];
  if (chop > 0 && idx % 2 === 0 && Math.random() < chop * .7) return sampler(X, t, idx, vel, -(1 + 2 * Math.floor(Math.random() * 8 * b[2])));
  if (prevOn && idx % 4 && X.smLoop && X.smEnd > t) return false;
  return sampler(X, t, idx, vel, 0);
}
let ac = null, E = null, restT = 0;
function rest() {
  clearTimeout(restT); restT = setTimeout(() => {
    if (!ac || ac.state !== 'running') return; const b = new Float32Array(E.an.fftSize); E.an.getFloatTimeDomainData(b);
    if (playing || rec || arpTimer || b.some(v => Math.abs(v) > 1e-4)) return rest(); ac.suspend().catch(() => {});
  }, 15000);
}
function boot() {
  if (ac) { if (ac.state !== 'running') ac.resume().catch(() => {}); rest(); return ac; }
  const AC = window.AudioContext || window.webkitAudioContext;
  try { ac = new AC({ latencyHint: PHONE || /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'balanced' : 'interactive' }); } catch (_) { ac = new AC(); }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}   // iPhone: play even with the silent switch on
  try { const sb = ac.createBufferSource(); sb.buffer = ac.createBuffer(1, 1, 22050); sb.connect(ac.destination); sb.start(0); } catch (_) {}   // older iPhones unlock audio with one silent sample inside the tap
  ac.onstatechange = () => { if (ac.state === 'interrupted' && playing) ac.resume().catch(() => {}); };
  E = mkEngine(ac, true); apply(); rest(); return ac;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && playing && ac.state !== 'running') ac.resume().catch(() => {}); });

/* ---------- 4. sequencer ---------- */
let playing = false, cur = 0, nt = 0, timer = 0, repStart = null, repN = 0, pend = null, firstBar = true; const queue = [];
const stepLen = () => 60 / P.bpm / 4;
const shuffleDelay = idx => (idx % 2 ? (P.shuffle / 100 - .5) * 2 * stepLen() : 0);
function playStep(X, idx, t) {
  const sc = scene(), acc = sc.g.AC[idx] && !S.mute.AC ? Math.pow(10, P.accent / 20) : 1, hits = [];
  SOUND.forEach(k => { if (sc.g[k][idx] && !off(k)) { if (k === 'SM') smStep(X, sc, idx, t, acc); else voice(X, k, t, idx, acc); hits.push(k); } });
  return hits;
}
let mstep = 0;
function metroTick(idx, t) {
  if (!S.metro || idx % 4) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = idx % 16 === 0 ? 2000 : 1400;
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .001); g.gain.setTargetAtTime(0, t + .004, .012); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .12);
}
function toggleMetro() { S.metro = !S.metro; drawAll(); persist(); }
function barLine() {
  if (firstBar) { firstBar = false; return; }
  if (sg.mode === 'play') return;                                         // the song decides the scenes and mutes
  if (pend != null) { const n = pend; pend = null; goScene(n); drawAll(); persist(); }
  else if (S.chain && S.scenes.length > 1) { goScene((S.sc + 1) % S.scenes.length); drawAll(); }
  if (mqDo) flipGroup();
}
function tick() {
  if (!playing) return;
  if (ac.state !== 'running') { ac.resume().catch(() => {}); return; }
  const now = ac.currentTime, ahead = document.hidden ? 1.6 : .12;      // a hidden tab only gets a timer about once a second, so queue further ahead
  if (nt < 0 || nt < now - 2) nt = now + .03;                            // just started, or asleep for seconds: begin from here
  while (nt < now + ahead) {
    cur %= S.last; if (cur === 0 && !S.rep.on) { barLine(); E.bar = (E.bar || 0) + 1; }
    if (sg.mode && !songStep(nt)) break;                                  // SONG: record this step, or play it back
    let idx = cur;
    if (S.rep.on) { const len = [4, 2, 1][S.rep.len]; if (repStart == null) { repStart = cur - (cur % len); repN = 0; } idx = (repStart + (repN++ % len)) % S.last; } else repStart = null;
    const tt = nt + shuffleDelay(idx);
    if (tt > now - .04) { const at = Math.max(tt, now + .003); queue.push({ i: idx, t: at, hits: playStep(E, idx, at) }); arpAtStep(idx, at); }   // a little late: play it now, whole. Long gone: skip it and stay on the grid
    metroTick(mstep++, Math.max(nt, now + .003));
    clockStep(nt, now);
    if (queue.length > 96) queue.splice(0, queue.length - 96);          // nobody drains the queue while the tab is hidden
    nt += stepLen(); cur = (cur + 1) % S.last;
  }
}
/* MIDI clock out (CLOCK OUT in the MIDI panel): 24 per beat, Start and Stop, sent ahead with timestamps so an FM-1, SMK-37 firmware, Maschine or Ableton can follow MD|442.
   Never sent while MD|442 is itself following someone else's clock, so two machines can't chase each other. */
let ckStarted = false;
// ONE TRANSPORT with an MD keyboard (SMK-37 or FM-1): plugged in and connected, its PLAY/STOP start and stop this page and its clock sets the
// tempo, and START here sends Start and clock to it (even with CLOCK OUT off), so the two never run separate beats. Unplugged, it plays on its own.
const KB_NAME = /SMK|FM-?1|M-?VAVE|MD ?\|? ?(442|187|888)/i;
const isKb = o => KB_NAME.test(o.name || '') || (kbx.out && o.name === kbx.out.name);
const ckOuts = () => { if (midi.ext || !midi.access || (midi.lastCk && performance.now() - midi.lastCk < 1000)) return []; const all = [...midi.access.outputs.values()]; return midi.cko ? all : all.filter(isKb); };
function clockStep(t, now) {
  const outs = ckOuts(); if (!outs.length) return;
  const base = performance.now() - now * 1000, dt = stepLen() / 6;
  const at = x => Math.max(performance.now(), base + x * 1000);
  outs.forEach(o => { try { if (!ckStarted) o.send([0xFA], at(t)); for (let j = 0; j < 6; j++) o.send([0xF8], at(t + j * dt)); } catch (_) {} });
  ckStarted = true;
}
function clockStop() { const outs = ckOuts(); ckStarted = false; outs.forEach(o => { try { o.send([0xFC]); } catch (_) {} }); }
function setPlaying(on) {
  if (on === playing || (on && root.querySelector('.dlg[data-locked]'))) return;   /* nothing starts behind the sign-up dialog: not START by keyboard, not MIDI start */
  playing = on;
  if (on && sg.restoreT) sgRestore();
  if (on) { ckStarted = false; if (rec) clearTimeout(rec.tail); boot(); apply(); E.bar = -1; cur = 0; mstep = 0; firstBar = true; nt = -1; repStart = null; queue.length = 0; clearInterval(timer); timer = setInterval(tick, 25); tick(); }
  else { if (sg.mode === 'rec') songRecStop(); else if (sg.mode === 'play') songEnd();
   clearInterval(timer); clockStop(); midi.ext = false; queue.length = 0; head = -1; drawHead(); if (rec && !rec.busy) rec.tail = setTimeout(recStop, Math.max(1500, P['fx.vdec'] * 1050 + 300));   // let the tails ring out, then save
 if (pend != null) { const n = pend; pend = null; goScene(n); } if (mqDo) flipGroup(); if (ac) { E.fb.gain.setTargetAtTime(0, ac.currentTime, .05); setTimeout(apply, 700); } }
  if (!on && S.keys.mode && held.length) arpRun();
  const st = window.MDStrobe; if (st) { if (on) st.music = 'md442'; else if (st.music === 'md442') st.music = null; }
  drawAll();
}
function hit(k, i = 0) { if (k === 'AC' || off(k)) return; boot(); const go = () => voice(E, k, ac.currentTime + .01, i, 1); if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => {}); flashKey(k); }
// offline renders, for tests: one hit of a voice, or whole bars of the current beat
function render(k, secs = 2.5, raw) {
  const oc = new OfflineAudioContext(1, Math.ceil(44100 * secs), 44100), X = mkEngine(oc, false); apply(X);
  if (raw) { X.an.disconnect(); (raw === 'bus' ? X.mix : X.pan[k]).connect(oc.destination); }   // tests: one channel after its fader, or the mix bus before mastering
  if (Array.isArray(k)) { let t = .02; for (let b = 0; b < k[0]; b++) for (let i = 0; i < S.last; i++) { playStep(X, i, t + shuffleDelay(i)); t += stepLen(); } } else voice(X, k, .02, 0, 1);
  return oc.startRendering().then(b => b.getChannelData(0));
}
// test: left and right level of one hit, in dB
function renderLR(k) { const oc = new OfflineAudioContext(2, 44100, 44100), X = mkEngine(oc, false); apply(X); voice(X, k, .02, 0, 1); return oc.startRendering().then(b => [0, 1].map(c => { const x = b.getChannelData(c); let q = 0; for (let i = 0; i < x.length; i++) q += x[i] * x[i]; return +(10 * Math.log10(q / x.length + 1e-12)).toFixed(1); })); }

/* ---------- 5. controls shared by both layouts ---------- */
const views = [];                                  // knob faces: { key, el, draw }
const drawers = [];                                // everything else that shows state: { el, fn }
const live = (el, fn, lite) => { drawers.push({ el, fn, lite }); fn(); return el; };
function drawLite() { for (let j = 0; j < drawers.length; j++) { const w = drawers[j]; if (w.lite && w.el.isConnected) w.fn(); } }   // the display and the effect switches
function drawAll() { for (let j = drawers.length - 1; j >= 0; j--) { const w = drawers[j]; if (!w.el.isConnected) drawers.splice(j, 1); else w.fn(); } for (let j = views.length - 1; j >= 0; j--) if (!views[j].el.isConnected) views.splice(j, 1); }
function refreshKnobs() { for (let j = views.length - 1; j >= 0; j--) { const w = views[j]; if (!w.el.isConnected) views.splice(j, 1); else w.draw(P[w.key]); } }
let flashTxt = null, flashT = 0, toastEl = null, toastT = 0;
function lcdFlash(a, b) { flashTxt = [a, b]; clearTimeout(flashT); flashT = setTimeout(() => { flashTxt = null; drawLite(); }, 1300); }
function toast(msg) { if (!toastEl) { toastEl = h('div', 'toast'); toastEl.setAttribute('role', 'status'); root.append(toastEl); } const host = fitEl && document.fullscreenElement === fitEl ? fitEl : root; if (toastEl.parentNode !== host) host.append(toastEl); toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200); }
const mark = () => { S.dirty = true; persist(); };
/* first-run tips: one slim line, closed with its ✕ key (the phone also closes it on the first START). Once seen on this device it stays away. */
const HINT_LS = 'md442-hints';
let hintEl = null, hinted = false; try { hinted = !!localStorage.getItem(HINT_LS); } catch (_) {}
const hintSeen = () => { if (hinted) return; hinted = true; try { localStorage.setItem(HINT_LS, '1'); } catch (_) {} };
function hintOff() { hintSeen(); if (hintEl) { hintEl.remove(); hintEl = null; } }
function set(k, v, quiet) {
  const d = DEF[k]; v = clamp(v, d.mn, d.mx); if (!d.exp) v = Math.round(v / d.step) * d.step; v = +v.toFixed(3);
  if (P[k] === v) return; P[k] = v; S.dirty = true; if (midi.learn && !midi.busy) { midi.armP = k; midi.armD = null; }
  for (let j = views.length - 1; j >= 0; j--) { const w = views[j]; if (!w.el.isConnected) { views.splice(j, 1); continue; } if (w.key === k) w.draw(v); }
  apply(); if (!quiet) lcdFlash(d.lb, d.f(v)); drawLite(); persist();
}
const nudge = (k, n) => { const d = DEF[k]; if (d.exp) set(k, toVal(k, toPos(k, P[k]) + n * .01)); else set(k, P[k] + n * d.step); };
// which drum a knob belongs to, so touching the knob lights that drum up
const VOICE_OF = { bd: 'BD', sd: 'SD', cp: 'CP', rs: 'RS', lt: 'LT', mt: 'MT', ht: 'HT', ch: 'CH', oh: 'OH', cr: 'CR', rd: 'RD', bs: 'BS', st: 'ST' };
function ownerOf(k) { const [a, b] = k.split('.'); if (a === 'hh') return S.sel === 'OH' ? 'OH' : 'CH'; if (a === 'accent') return 'AC'; if (VOICE_OF[a]) return VOICE_OF[a]; return SOUND.includes(b) ? b : null; }
let armed = PHONE;                                 // desktop: keys and the mouse wheel only act once the machine was the last thing clicked
/* type a tempo: the value text is swapped for a small number box; Enter or leaving it sets the tempo, Escape leaves it alone */
function typeBpm(el) {
  if (!el.isConnected) return; const inp = h('input', el.className + ' tin'); let done = false;
  inp.type = 'number'; inp.min = DEF.bpm.mn; inp.max = DEF.bpm.mx; inp.step = 1; inp.inputMode = 'numeric'; inp.enterKeyHint = 'done'; inp.autocomplete = 'off'; inp.value = Math.round(P.bpm); inp.setAttribute('aria-label', 'Tempo in BPM, ' + DEF.bpm.mn + ' to ' + DEF.bpm.mx);
  const close = ok => { if (done) return; done = true; const n = parseFloat(inp.value); inp.blur(); inp.replaceWith(el); if (ok && isFinite(n)) set('bpm', n); };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); close(true); } else if (e.key === 'Escape') { e.preventDefault(); close(false); } });
  inp.addEventListener('blur', () => close(true)); inp.addEventListener('click', e => e.stopPropagation());
  el.replaceWith(inp); inp.focus({ preventScroll: true }); inp.select();
}
function mkKnob(k, label) {
  const d = DEF[k], box = h('div', 'kb'), b = h('button', 'knob'), arc = h('i', 'arc'), ptr = h('i', 'ptr'), val = h('span', 'kv');
  b.append(arc, h('i', 'cap'), ptr); box.append(h('span', 'kl', label), b, val);
  const draw = v => {
    const deg = toPos(k, v) * 270;
    arc.style.background = k === 'fx.filter'
      ? `conic-gradient(from -135deg, var(--trk) 0 ${Math.min(deg, 135)}deg, var(--arc) 0 ${Math.max(deg, 135)}deg, var(--trk) 0 270deg, transparent 0)`
      : `conic-gradient(from -135deg, var(--arc) 0 ${deg}deg, var(--trk) 0 270deg, transparent 0)`;
    ptr.style.transform = `rotate(${-135 + deg}deg)`; val.textContent = d.f(v); b.setAttribute('aria-label', d.lb + ', ' + d.f(v));
  };
  views.push({ key: k, el: b, draw }); draw(P[k]);
  if (k === 'bpm') { val.classList.add('ed'); val.title = 'Type a tempo'; val.addEventListener('click', () => { boot(); typeBpm(val); }); }
  let g = null, lastTap = 0, raf = 0, pan = null;
  b.addEventListener('pointerdown', e => {
    if (e.button) return; e.preventDefault();
    /* in a phone sheet the browser snaps a touch that lands just beside a knob onto the knob; such a touch scrolls the sheet instead of turning it */
    const sh = e.pointerType === 'touch' && b.closest('.sheet'), kr = sh && b.getBoundingClientRect();
    if (sh && Math.hypot(e.clientX - kr.left - kr.width / 2, e.clientY - kr.top - kr.height / 2) > kr.width / 2 + 3) { pan = { el: sh, y: e.clientY }; try { b.setPointerCapture(e.pointerId); } catch (_) {} return; }
    boot(); cancelAnimationFrame(raf); try { b.setPointerCapture(e.pointerId); } catch (_) {} b.focus({ preventScroll: true });
    const own = ownerOf(k); if (own && own !== S.sel && !PHONE) select(own);
    const r = b.getBoundingClientRect();
    g = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, pos: toPos(k, P[k]), moved: false, cx: r.left + r.width / 2, touch: e.pointerType !== 'mouse', hist: [] };
    box.classList.add('turn');
  });
  b.addEventListener('pointermove', e => {
    if (pan) { pan.el.scrollTop += pan.y - e.clientY; pan.y = e.clientY; return; }
    if (!g) return; if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 5) return; g.moved = true;
    g.pos = clamp(g.pos + ((g.ly - e.clientY) + (e.clientX - g.lx)) / 200 / (e.shiftKey ? 4 : 1), 0, 1); g.lx = e.clientX; g.ly = e.clientY;   // up or right, 200 px for the full range, Shift = fine
    set(k, toVal(k, g.pos));
    const now = performance.now(); g.hist.push([now, g.pos]); while (g.hist.length > 2 && now - g.hist[0][0] > 90) g.hist.shift();
  });
  const end = e => {
    pan = null; const x = g; g = null; box.classList.remove('turn'); if (!x) return; if (!x.touch) b.blur();   // after a mouse drag the arrow keys go back to tempo and drum
    const now = performance.now();
    if (!x.moved) {                                 // a plain mouse click does nothing; a touch tap steps, right half up and left half down
      if (x.touch && e.type === 'pointerup') { if (now - lastTap < 300) { set(k, resetVal(k)); lastTap = 0; } else { lastTap = now; nudge(k, e.clientX >= x.cx ? 1 : -1); } buzz(5); }
      return;
    }
    if (x.touch && x.hist.length > 1) {             // a flick carries on with momentum
      const a = x.hist[0], z = x.hist[x.hist.length - 1]; let vel = (z[1] - a[1]) / Math.max(1, z[0] - a[0]) * 16, pos = x.pos;
      if (now - z[0] < 60 && Math.abs(vel) > .004) { const spin = () => { pos = clamp(pos + vel, 0, 1); vel *= .9; set(k, toVal(k, pos)); if (Math.abs(vel) > .0015 && pos > 0 && pos < 1) raf = requestAnimationFrame(spin); }; raf = requestAnimationFrame(spin); }
    }
  };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  b.addEventListener('dblclick', e => { e.preventDefault(); set(k, resetVal(k)); });
  b.addEventListener('wheel', e => { if (!armed) return; e.preventDefault(); nudge(k, (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1)); }, { passive: false });
  b.addEventListener('keydown', e => { const up = e.key === 'ArrowUp' || e.key === 'ArrowRight', dn = e.key === 'ArrowDown' || e.key === 'ArrowLeft'; if (!up && !dn) return; e.preventDefault(); e.stopPropagation(); nudge(k, (up ? 1 : -1) * (e.shiftKey ? 5 : 1)); });
  b.addEventListener('contextmenu', e => e.preventDefault());
  return box;
}
// a mixer fader: drag up and down, wheel and arrow keys step, double-click goes back to the pattern's value
function mkFader(k) {
  const d = DEF[k], b = h('button', 'fader'), fill = h('i', 'ffill'), th = h('i', 'fthumb'); b.append(fill, th);
  const draw = v => { const pc = toPos(k, v) * 100; fill.style.height = pc + '%'; th.style.bottom = pc + '%'; b.setAttribute('aria-label', d.lb + ', ' + d.f(v)); };
  views.push({ key: k, el: b, draw }); draw(P[k]);
  let g = null;
  b.addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); boot(); try { b.setPointerCapture(e.pointerId); } catch (_) {} b.focus({ preventScroll: true }); g = { y: e.clientY, pos: toPos(k, P[k]), hgt: b.getBoundingClientRect().height || 1, moved: false }; const own = ownerOf(k); if (own && own !== S.sel) select(own); });
  b.addEventListener('pointermove', e => { if (!g) return; if (!g.moved && Math.abs(e.clientY - g.y) < 3) return; g.moved = true; g.pos = clamp(g.pos + (g.y - e.clientY) / g.hgt / (e.shiftKey ? 4 : 1), 0, 1); g.y = e.clientY; set(k, toVal(k, g.pos)); });
  const end = () => { g = null; }; b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  b.addEventListener('dblclick', e => { e.preventDefault(); set(k, resetVal(k)); });
  b.addEventListener('wheel', e => { if (!armed) return; e.preventDefault(); nudge(k, (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1)); }, { passive: false });
  b.addEventListener('keydown', e => { const up = e.key === 'ArrowUp' || e.key === 'ArrowRight', dn = e.key === 'ArrowDown' || e.key === 'ArrowLeft'; if (!up && !dn) return; e.preventDefault(); e.stopPropagation(); nudge(k, (up ? 1 : -1) * (e.shiftKey ? 5 : 1)); });
  return b;
}
const chMeters = {};
// MIXER view: one strip per channel (meter, fader, level, mute, name) and the master
function buildMixer(box) {
  SOUND.forEach(k => {
    const master = k === 'vol', key0 = master ? 'vol' : 'lvl.' + k, strip = h('div', 'strip' + (master ? ' master' : '')), val = h('span', 'fval'), lane = h('div', 'flane'), mt = h('div', 'chm'), mi = h('i'), nm = h('button', 'fname', master ? 'MASTER' : SHORT[k]);
    mt.append(mi); lane.append(mt, mkFader(key0)); views.push({ key: key0, el: val, draw: v => { val.textContent = DEF[key0].f(v); } }); val.textContent = DEF[key0].f(P[key0]);
    if (!master) { const tk = h('div', 'ftools'); TOOLS(k).forEach(([p2, l2]) => tk.append(mkKnob(p2, l2))); strip.append(tk); }
    strip.append(val, lane);
    if (master) { chMeters.master = mi; strip.append(h('span', 'fgap')); }
    else { chMeters[k] = mi; const m = key('M', () => toggleMute(k), 'sw'); m.setAttribute('aria-label', 'Mute ' + NAME[k]); strip.append(live(m, () => { m.classList.toggle('on', !S.mute[k]); m.textContent = S.mute[k] ? 'MUTED' : 'ON'; })); nm.addEventListener('click', () => { boot(); select(k, true); }); }
    strip.append(nm); if (!master) live(strip, () => { strip.classList.toggle('sel', S.sel === k); strip.classList.toggle('mute', !!S.mute[k]); });
    box.append(strip);
  });
}
const key = (txt, fn, cls) => { const b = h('button', 'key' + (cls ? ' ' + cls : ''), txt); if (fn) b.addEventListener('click', e => { boot(); fn(e); buzz(6); if (e.detail > 0 && b.isConnected) b.blur(); }); return b; };
const seg = (items, get, pick, cls) => { const box = h('div', 'seg' + (cls ? ' ' + cls : '')); items.forEach(([v, txt]) => { const b = key(txt, () => pick(v)); box.append(b); live(b, () => { const on = get() === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }); return box; };

/* actions */
// UNDO: the last 20 changes to the beat (steps, scenes, clears, random, loading a pattern) can be taken back
const undoS = [], redoS = []; let editT = 0;
const snap = () => JSON.stringify({ P, style: S.style, scenes: S.scenes, sc: S.sc, last: S.last, preset: S.preset, chain: S.chain, dirty: S.dirty, mute: S.mute, presetVals });
function keep(label) { undoS.push([label, snap()]); if (undoS.length > 20) undoS.shift(); redoS.length = 0; }
function putBack(str) {
  const d = JSON.parse(str); Object.keys(DEF).forEach(k => { if (typeof d.P[k] === 'number') P[k] = d.P[k]; });
  Object.assign(S, { style: d.style || S.style, scenes: d.scenes, sc: clamp(d.sc, 0, d.scenes.length - 1), last: d.last, preset: d.preset, chain: d.chain, dirty: d.dirty, mute: d.mute || {} }); presetVals = d.presetVals || {}; pend = null;
  apply(); refreshKnobs(); drawAll(); persist();
}
const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘Z' : 'Ctrl+Z';
function undo() { const u = undoS.pop(); if (!u) return toast('Nothing to undo'); redoS.push([u[0], snap()]); putBack(u[1]); toast('Undone: ' + u[0]); }
function redo() { const r = redoS.pop(); if (!r) return toast('Nothing to redo'); undoS.push([r[0], snap()]); putBack(r[1]); toast('Redone: ' + r[0]); }
const undoHint = () => (PHONE ? ' UNDO is under CLEAR.' : ' ' + UNDO_KEY + ' to undo.');
const taps = [];
function tapTempo() { const n = performance.now(); if (taps.length && n - taps[taps.length - 1] > 2000) taps.length = 0; taps.push(n); if (taps.length > 6) taps.shift(); if (taps.length >= 2) set('bpm', Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)))); else lcdFlash('Tap tempo', 'Tap again'); }
function toggleSolo(k) { k = k || S.sel; if (k === 'AC') return; S.solo = S.solo === k ? null : k; apply(); lcdFlash(NAME[k], S.solo ? 'Solo' : 'Solo off'); drawAll(); persist(); buzz(15); }
function setStep(k, i, on, sound) {
  if (performance.now() - editT > 1000 && scene().g[k][i] !== on) keep('step edits'); editT = performance.now();
  const sc = scene(); if (sc.g[k][i] === on) return; sc.g[k][i] = on; mark(); drawAll();
  if (on && sound && !playing) hit(k, i);
}
function cycleNote(i) { keep('bass note'); const sc = scene(), j = NOTE_CYCLE.indexOf(sc.n[i]); sc.n[i] = NOTE_CYCLE[(j + 1) % NOTE_CYCLE.length]; mark(); lcdFlash('Bass note', sc.n[i] ? sgn(sc.n[i]) + Math.abs(sc.n[i]) + ' st' : 'Root'); drawAll(); if (!playing) hit('BS', i); buzz(12); }
function cycleSlice(i) { keep('sample slice'); const sc = scene(); sc.sl[i] = ((sc.sl[i] | 0) + 1) % 9; mark(); lcdFlash('Sample step', sc.sl[i] ? 'Slice ' + sc.sl[i] + ' of ' + BANKS[Math.round(P['sm.bank'])][1] : 'Loop plays on'); drawAll(); if (!playing) hit('SM', i); buzz(12); }
function select(k, sound) { if (!KEYS.includes(k)) return; if (midi.learn && SOUND.includes(k)) { midi.armD = k; midi.armP = null; } S.sel = k; drawAll(); persist(); if (sound && !playing) hit(k); }
// MUTE GROUP: pick several drums once, then FLIP mutes or unmutes them all together, on the next bar while it plays
const mq = new Set(); let grp = false, mqDo = null;
function flipGroup() { const ks = mqDo || []; mqDo = null; if (S.solo) S.solo = null; ks.forEach(k => { S.mute[k] = !S.mute[k]; }); apply(); lcdFlash('Mute group', ks.map(k => SHORT[k]).join(' ') || '-'); drawAll(); persist(); }
function fireGroup() { if (!mq.size) return; mqDo = [...mq]; if (playing) { lcdFlash('Mute group', 'on the next bar'); drawAll(); } else flipGroup(); buzz(15); }
function groupKeyTap() { if (learnAct('grp')) return; if (grp) { grp = false; drawAll(); if (mq.size) toast('Group saved: ' + [...mq].map(k => SHORT[k]).join(' + ') + '. Tap FLIP to mute or unmute them together.'); return; } if (!mq.size) return groupPick(); fireGroup(); }
function groupPick() { grp = true; drawAll(); toast('Tap the drums for the group, then DONE. FLIP then mutes or unmutes them together on the next bar. Hold this key to change the group.'); }
const groupKey = () => { const b = h('button', 'key led grp'); let t = 0, held = false;
  b.addEventListener('pointerdown', e => { if (e.button) return; boot(); held = false; clearTimeout(t); t = setTimeout(() => { held = true; groupPick(); buzz(15); }, 480); });
  const up = () => clearTimeout(t); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', () => { if (held) { held = false; return; } groupKeyTap(); buzz(6); });
  return live(b, () => { b.textContent = grp ? 'DONE · ' + mq.size : mq.size ? 'FLIP ' + [...mq].map(k => SHORT[k]).join('+') : 'MUTE GROUP'; b.classList.toggle('on', grp); b.classList.toggle('pend', !!mqDo); b.classList.toggle('arm', midi.learn && midi.armA === 'grp'); b.setAttribute('aria-label', grp ? 'Done picking the mute group' : mq.size ? 'Flip the mute group on the next bar. Hold to change it.' : 'Make a mute group'); }); };
function toggleMute(k) { if (!k && learnAct('m:' + S.sel)) return; k = k || S.sel; if (S.solo) S.solo = null; S.mute[k] = !S.mute[k]; apply(); lcdFlash(NAME[k], S.mute[k] ? 'Muted' : 'On'); drawAll(); persist(); buzz(15); }
function setScene(n) { if (n >= S.scenes.length) return; if (S.chain) { S.chain = false; toast('Chain is off: staying on scene ' + (n + 1) + '. Press CHAIN to play them in order again.'); } if (playing) pend = n === S.sc ? null : n; else goScene(n); drawAll(); persist(); }
function addScene() { if (S.scenes.length >= 8) return toast('Eight scenes is the most'); keep('new scene'); const from = S.sc + 1; storeMix(); S.scenes.push(copyScene(scene())); S.sc = S.scenes.length - 1; pend = null; mark(); drawAll(); toast('Scene ' + from + ' is saved. You are on scene ' + (S.sc + 1) + ': keep building. Press CHAIN to play them in order.'); }
function delScene() { if (S.scenes.length < 2) return toast('This is the only scene'); keep('delete scene'); S.scenes.splice(S.sc, 1); S.sc = Math.min(S.sc, S.scenes.length - 1); pend = null; if (loadMix()) { apply(); refreshKnobs(); } mark(); drawAll(); toast('Scene deleted.' + undoHint()); }
function toggleChain() { S.chain = !S.chain; drawAll(); persist(); }
function clearDrum() { keep('clear ' + NAME[S.sel].toLowerCase()); scene().g[S.sel].fill(false); mark(); drawAll(); toast(NAME[S.sel] + ' cleared.' + undoHint()); }
function clearScene() { keep('clear scene'); S.scenes[S.sc] = emptyScene(); mark(); drawAll(); toast('Scene ' + (S.sc + 1) + ' cleared.' + undoHint()); }
function randomize() { keep('random beat'); S.scenes[S.sc] = randomScene(); mark(); drawAll(); toast('Random beat.' + undoHint()); }
function setLast(n) { S.last = clamp(n, 1, 16); drawAll(); persist(); }
// last step: 16, 8 or 4, or any length with − and +
function lastCtl() {
  const w = h('div', 'lastc'), num = h('span', 'lastn'), dn = key('−', () => setLast(S.last - 1), 'x'), up = key('+', () => setLast(S.last + 1), 'x');
  dn.setAttribute('aria-label', 'One step shorter'); up.setAttribute('aria-label', 'One step longer'); live(num, () => { num.textContent = S.last; });
  w.append(seg([[16, '16'], [8, '8'], [4, '4']], () => S.last, setLast), dn, num, up); return w;
}
function setView(v) { S.view = v; drawAll(); persist(); }
const nextView = () => setView(S.view === 'one' ? 'all' : 'one');
function toggleMixer() { S.mixer = !S.mixer; drawAll(); persist(); }
function pickStyle(st) {
  if (!STYLES[st]) return; if (st === S.style) return lcdFlash(STYLES[st].name, STYLES[st].tag);
  pickPreset(STYLES[st].first); lcdFlash(STYLES[st].name, STYLES[st].tag + ' · ' + stylePresets(st).length + ' patterns'); buzz(15);
}
function pickPreset(name) { const had = S.dirty || S.scenes.length > 1; keep('load ' + name); loadPreset(name); apply(); refreshKnobs(); drawAll(); persist(); if (had) toast(name + ' loaded.' + undoHint()); }
function saveBeat() {
  if (beats.length >= 8) return toast('All 8 slots are full. Delete a beat first.');
  let n = 1; while (beats.some(b => b.name === 'My beat ' + n)) n++;
  const name = 'My beat ' + n; beats.push({ name, style: S.style, P: Object.assign({}, P), scenes: S.scenes.map(copyScene), last: S.last, trim: trimOf() }); keepBeats();
  S.preset = name; S.dirty = false; presetVals = Object.assign({}, P); drawAll(); persist(); toast('Saved as ' + name); if (kbx.ok) sendToKeyboard(true);   // a keyboard that answered before gets the saved beat too
}
function loadBeat(j) {
  const b = beats[j]; if (!b) return; keep('load ' + b.name);
  Object.keys(DEF).forEach(k => { P[k] = typeof b.P[k] === 'number' ? clamp(b.P[k], DEF[k].mn, DEF[k].mx) : DEF[k].df; }); presetVals = Object.assign({}, P);
  Object.assign(S, { style: STYLES[b.style] ? b.style : S.style, preset: b.name, dirty: false, scenes: b.scenes.map(copyScene).map(fixScene), sc: 0, chain: false, last: b.last || 16, mute: {}, mem: {} }); pend = null; loadMix();
  apply(); refreshKnobs(); drawAll(); persist();
}
function delBeat(j) { const b = beats[j]; if (!b) return; beats.splice(j, 1); keepBeats(); drawAll(); toast(b.name + ' deleted'); }
/* beats in and out: .md442.json is the same file the DAW plugin and the other MD|442 apps read and write; .mid is a clip for Ableton, Maschine or any DAW */
const fileName = (n, ext) => (String(n || 'MD442 beat').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'MD442-beat') + ext;
// the DAW plugin keeps the sampler as its BREAK row (scenes[].brk: . off, 1-8 a slice, - rings on, g the loop plays on) and brk.* settings;
// a file carries both, so the web, phone, desktop apps and the plugin all read each other's beats
const brkRow = sc => sc.g.SM.map((on, i) => { if (!on) return '.'; if (sc.sl[i]) return String(sc.sl[i]); let j = i - 1; while (j >= 0 && sc.g.SM[j] && !sc.sl[j]) j--; return i > 0 && sc.g.SM[i - 1] && j >= 0 && sc.g.SM[j] && sc.sl[j] ? '-' : 'g'; }).join('');
const brkP = Q => { const b = Math.round(Q['sm.bank']); return { 'brk.kit': S.style === '442' && !S.scenes.some(sc => sc.g.SM.some(Boolean)) ? 0 : b < 4 ? 1 : 2, 'brk.slot': b % 4, 'brk.level': clamp(Math.round(100 * Math.pow(10, (Q['lvl.SM'] - LEVEL.SM) / 20)), 0, 127), 'brk.complex': Q['sm.chop'], 'brk.pitch': Q['sm.tune'], 'pan.BRK': Q['pan.SM'], 'flt.BRK': Q['flt.SM'], 'drv.BRK': Q['drv.SM'], 'rev.BRK': Q['rev.SM'], 'ech.BRK': Q['ech.SM'] }; };
function beatFile() { storeMix(); return { format: 'md442-beat', version: 1, style: S.style, name: S.preset || 'MD442 beat', P: Object.assign({}, P, brkP(P)), scenes: S.scenes.map(sc => { const c = copyScene(sc); const r = brkRow(sc); if (r !== '................') c.brk = r; return c; }), last: S.last, trim: trimOf() }; }
async function saveAs(blob, name, desc, accept) {
  if (window.showSaveFilePicker && self === top) {
    try { const fh = await showSaveFilePicker({ suggestedName: name, startIn: 'documents', id: 'md442-beats', types: [{ description: desc, accept }] }); const w = await fh.createWritable(); await w.write(blob); await w.close(); return true; }
    catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  const u = URL.createObjectURL(blob), a = h('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true;
}
async function exportBeat() { const b = beatFile(); if (await saveAs(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }), fileName(b.name, '.md442.json'), 'MD|442 beat', { 'application/json': ['.json'] })) toast('Exported ' + b.name); }
function midiBytes() {   // one track, drums on channel 1 (C1 = kick, the plugin's pad map), bass on 2, stab on 3, sampler on 1 at 49-56 (slices 1-8, the plugin's slice pads; a loop that plays on is written as the slices it passes); every scene in order, one bar each
  storeMix();
  const PPQ = 96, ST = PPQ / 4, ev = [], keyN = Math.round(P.key), sh = (P.shuffle / 100 - .5) * 2 * ST, L = S.last;
  S.scenes.forEach((sc, bar) => { for (let i = 0; i < L; i++) {
    const t = Math.round(bar * L * ST + i * ST + (i % 2 ? sh : 0)), vel = sc.g.AC && sc.g.AC[i] ? 127 : 100;
    SOUND.forEach((k, ki) => { if (!sc.g[k] || !sc.g[k][i]) return;
      const [ch, n, len] = k === 'BS' ? [1, clamp(28 + keyN + (sc.n[i] | 0), 0, 127), ST - 2] : k === 'ST' ? [2, clamp(52 + keyN, 0, 127), ST - 2] : k === 'SM' ? [0, 48 + (sc.sl && sc.sl[i] ? sc.sl[i] : 1 + Math.floor(((i + 16 * (bar % BANKS[Math.round(P['sm.bank'])][2])) % (16 * BANKS[Math.round(P['sm.bank'])][2])) * 8 / (16 * BANKS[Math.round(P['sm.bank'])][2]))), ST - 2] : [0, 36 + ki, ST / 2];
      ev.push([t, 1, 0x90 | ch, n, vel], [t + len, 0, 0x80 | ch, n, 0]); });
  } });
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const vlq = v => { const o = [v & 127]; while ((v >>= 7)) o.unshift((v & 127) | 128); return o; };
  const us = Math.round(60000000 / P.bpm), tr = [0, 0xFF, 0x51, 3, us >> 16 & 255, us >> 8 & 255, us & 255, 0, 0xFF, 0x58, 4, 4, 2, 24, 8];
  let now = 0; ev.forEach(([t, , s, n, v]) => { tr.push(...vlq(t - now), s, n, v); now = t; });
  tr.push(...vlq(Math.max(0, S.scenes.length * L * ST - now)), 0xFF, 0x2F, 0);
  const n32 = v => [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255];
  return new Uint8Array([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 1, PPQ >> 8, PPQ & 255, 0x4D, 0x54, 0x72, 0x6B, ...n32(tr.length), ...tr]);
}
async function exportMidi() { if (await saveAs(new Blob([midiBytes()], { type: 'audio/midi' }), fileName(S.preset, '.mid'), 'MIDI clip', { 'audio/midi': ['.mid'] })) toast('MIDI clip saved: drag it onto a track in your DAW'); }
function midiDrag(b) {   // desktop Chrome / Edge: drag the key straight onto an Ableton or Maschine track, or the desktop
  b.draggable = true;
  b.addEventListener('dragstart', e => { try { const u = URL.createObjectURL(new Blob([midiBytes()], { type: 'audio/midi' })); e.dataTransfer.setData('DownloadURL', 'audio/midi:' + fileName(S.preset, '.mid') + ':' + u); e.dataTransfer.setData('text/uri-list', u); e.dataTransfer.effectAllowed = 'copy'; } catch (_) {} });
  return b;
}
function normBeat(x) {   // a beat from any MD|442: the web app, the phone app, the desktop app or the DAW plugin
  if (!x || typeof x !== 'object' || !x.P || typeof x.P !== 'object' || !Array.isArray(x.scenes) || !x.scenes.length) return null;
  const scenes = [];
  for (const s of x.scenes.slice(0, 8)) {
    if (!s || !s.g || !Array.isArray(s.n) || s.n.length !== 16) return null;
    const g = {}; for (const k of KEYS) { const r = s.g[k]; if (r != null && (!Array.isArray(r) || r.length !== 16)) return null; g[k] = r ? r.map(Boolean) : Array(16).fill(false); }
    const sc = fixScene({ g, n: s.n.map(v => clamp(Math.round(+v) || 0, -24, 24)), sl: s.sl });
    // a beat from the plugin: its BREAK row
    if (typeof s.brk === 'string' && s.brk.length === 16 && !(s.g.SM && Array.isArray(s.sl))) s.brk.split('').forEach((c, i) => { sc.g.SM[i] = /[-g1-8]/.test(c); sc.sl[i] = c >= '1' && c <= '8' ? +c : 0; });
    if (s.x && typeof s.x === 'object') sc.x = s.x; scenes.push(sc);
  }
  const Pn = {}, num = k => typeof x.P[k] === 'number' && isFinite(x.P[k]);
  if (num('brk.kit') && !num('sm.bank')) {   // the plugin's BREAK settings
    const kit = Math.round(x.P['brk.kit']), slot = num('brk.slot') ? clamp(Math.round(x.P['brk.slot']), 0, 3) : 0;
    if (kit > 0) Pn['sm.bank'] = (kit - 1) * 4 + slot; if (!x.style && kit > 0) x.style = kit === 1 ? '187' : '888';
    if (num('brk.level')) Pn['lvl.SM'] = kit > 0 ? half(LEVEL.SM + 20 * Math.log10(Math.max(1, x.P['brk.level']) / 100)) : -40;
    ['pan', 'flt', 'drv', 'rev', 'ech'].forEach(t => { if (num(t + '.BRK') && !num(t + '.SM')) Pn[t + '.SM'] = clamp(x.P[t + '.BRK'], DEF[t + '.SM'].mn, DEF[t + '.SM'].mx); });   // the plugin's BREAK channel tools
    if (num('brk.complex')) Pn['sm.chop'] = clamp(x.P['brk.complex'], 0, 100); if (num('brk.pitch')) Pn['sm.tune'] = clamp(x.P['brk.pitch'], -12, 12);
  }
  Object.keys(DEF).forEach(k => { if (num(k)) Pn[k] = clamp(x.P[k], DEF[k].mn, DEF[k].mx); });
  return { name: String(x.name || 'Imported beat').slice(0, 40), style: STYLES[x.style] ? String(x.style) : '442', P: Pn, scenes, last: clamp(Math.round(+x.last) || 16, 1, 16), trim: clamp(+x.trim || 0, -12, 12) };
}
function importBeat() {
  const inp = h('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.multiple = true;
  inp.addEventListener('change', async () => {
    let added = 0, bad = 0, first = -1;
    for (const f of [...inp.files]) {
      let d; try { d = JSON.parse(await f.text()); } catch (_) { bad++; continue; }
      const list = Array.isArray(d) ? d : Array.isArray(d && d.beats) ? d.beats : [d];
      for (const x of list) {
        const b = normBeat(x); if (!b) { bad++; continue; }
        if (beats.length >= 8) { toast('All 8 slots are full. Delete a beat first.'); break; }
        let nm = b.name, i = 2; while (beats.some(y => y.name === nm) || styleOf(nm)) nm = b.name + ' ' + i++;
        b.name = nm; beats.push(b); added++; if (first < 0) first = beats.length - 1;
      }
    }
    if (added) { keepBeats(); loadBeat(first); toast(added === 1 ? 'Imported ' + beats[first].name : 'Imported ' + added + ' beats'); }
    else toast(bad ? 'That file is not an MD|442 beat.' : 'Nothing imported.');
  });
  inp.click();
}
const beatIO = () => { const w = h('span', 'bio'); w.append(key('IMPORT', importBeat, 'io'), key('EXPORT', exportBeat, 'io'), midiDrag(key('MIDI ↓', exportMidi, 'io'))); w.lastChild.title = 'Save the beat as a MIDI clip, or drag this key onto a DAW track'; return w; };
const fxOn = k => (k === 'fx.filter' ? Math.abs(P[k]) >= 4 : P[k] !== 0);
function fxToggle(k) {   // off puts the knob at zero (the filter at centre) and empties the reverb or echo tail; turning the knob switches it back on
  if (fxOn(k)) { S.mem[k] = P[k]; set(k, 0); if (E) { if (k === 'fx.verb') E.flushVerb(); if (k === 'fx.space') E.flushEcho(); } }
  else if (k === 'fx.filter') { if (S.mem[k]) set(k, S.mem[k]); else lcdFlash('Filter', 'Left LP, right HP'); }
  else set(k, S.mem[k] || 35);
}
function toggleKill(b) { S.kill[b] = !S.kill[b]; apply(); drawAll(); persist(); }
function fxKnob(k, label) { const box = mkKnob(k, label), sw = key('', () => fxToggle(k), 'sw'); box.append(sw); live(sw, () => { const on = fxOn(k); sw.textContent = on ? 'ON' : 'OFF'; sw.classList.toggle('on', on); box.classList.toggle('off', !on); sw.setAttribute('aria-label', DEF[k].lb + (on ? ' on' : ' off')); }, true); return box; }
function holdKey() {
  const b = h('button', 'hold'); b.append(h('strong', '', 'HOLD REPEAT'), h('span', '', 'PRESS AND HOLD')); let t = 0;
  const off = () => { clearTimeout(t); if (!S.rep.on) return; S.rep.on = false; repStart = null; b.classList.remove('on'); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) {} if (!playing) setPlaying(true); S.rep.on = true; repStart = null; b.classList.add('on'); buzz(12); clearTimeout(t); t = setTimeout(off, 8000); });
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('contextmenu', e => e.preventDefault());
  return b;
}
const repSeg = () => seg([[0, '1/4'], [1, '1/8'], [2, '1/16']], () => S.rep.len, v => { S.rep.len = v; repStart = null; drawAll(); persist(); });
const killKeys = () => { const box = h('div', 'seg'); ['LOW', 'MID', 'HI'].forEach(b => { const x = key(b, () => toggleKill(b), 'led'); box.append(x); live(x, () => { x.classList.toggle('on', S.kill[b]); x.setAttribute('aria-pressed', S.kill[b]); }); }); return box; };
let meterEls = [];
const meter = () => { const m = h('div', 'meter'), i = h('i'); m.append(i); meterEls.push(i); return m; };

/* REC: captures the finished sound as it plays (chain, knob moves, keyboard and all) and saves a 16-bit stereo WAV. */
let rec = null;
const REC_SRC = "class R extends AudioWorkletProcessor{process(i){const a=i[0];if(a&&a[0])this.port.postMessage([a[0].slice(0),(a[1]||a[0]).slice(0)]);return true}}registerProcessor('md-rec',R)";
function wav(chunks, sr) {
  let n = 0; chunks.forEach(c => { n += c[0].length; }); const b = new ArrayBuffer(44 + n * 4), v = new DataView(b), str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44; chunks.forEach(c => { for (let i = 0; i < c[0].length; i++) { v.setInt16(o, Math.round(clamp(c[0][i], -1, 1) * 32767), true); v.setInt16(o + 2, Math.round(clamp(c[1][i], -1, 1) * 32767), true); o += 4; } });
  return new Blob([b], { type: 'audio/wav' });
}
function saveFile(blob, ext) {
  const a = document.createElement('a'), d = new Date(), z = x => String(x).padStart(2, '0'); a.href = URL.createObjectURL(blob);
  a.download = 'MD442 ' + (S.preset || 'beat').replace(/[^\w ]+/g, '') + ' ' + Math.round(P.bpm) + 'bpm ' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + '.' + ext;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}
async function recStart() {
  boot(); if (rec) return; rec = { chunks: [], t0: performance.now(), busy: true }; drawAll();
  try {
    if (ac.audioWorklet) {
      if (!E.recReady) { const u = URL.createObjectURL(new Blob([REC_SRC], { type: 'application/javascript' })); await ac.audioWorklet.addModule(u); URL.revokeObjectURL(u); E.recReady = true; }
      const node = new AudioWorkletNode(ac, 'md-rec', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit' }); node.port.onmessage = e => { if (rec) rec.chunks.push(e.data); };
      E.an.connect(node); rec.node = node;
    } else {                                        // older browsers: the browser's own recorder (compressed file)
      const dest = ac.createMediaStreamDestination(), mr = new MediaRecorder(dest.stream), parts = []; E.an.connect(dest); mr.ondataavailable = e => parts.push(e.data); mr.start(); rec.mr = mr; rec.dest = dest; rec.parts = parts;
    }
  } catch (err) { rec = null; drawAll(); return toast('Recording is not available in this browser'); }
  rec.busy = false; rec.t0 = performance.now(); rec.cap = setTimeout(() => { toast('Ten minutes is the longest take. Saving it now.'); recStop(); }, 600000); if (!playing) setPlaying(true); drawAll(); toast('Recording. Press REC again to stop and save.');
}
function recStop() {
  const r = rec; if (!r || r.busy) return; clearTimeout(r.tail); clearTimeout(r.cap); rec = null; drawAll();
  if (r.node) { try { E.an.disconnect(r.node); } catch (_) {} r.node.port.onmessage = null; if (!r.chunks.length) return toast('Nothing was recorded'); saveFile(wav(r.chunks, ac.sampleRate), 'wav'); toast('Saved a WAV to your downloads'); }
  else if (r.mr) { r.mr.onstop = () => { try { E.an.disconnect(r.dest); } catch (_) {} saveFile(new Blob(r.parts, { type: r.mr.mimeType }), /mp4/.test(r.mr.mimeType) ? 'm4a' : 'webm'); toast('Saved the recording to your downloads'); }; r.mr.stop(); }
}
const toggleRec = () => (rec ? recStop() : recStart());
const recKey = () => { const b = key('REC', toggleRec, 'led rec'); return live(b, () => { b.classList.toggle('on', !!rec); b.setAttribute('aria-pressed', !!rec); b.setAttribute('aria-label', rec ? 'Stop recording and save the file' : 'Record what you play to an audio file'); }); };
/* SONG: records the whole performance, not the sound. Press ● SONG and play: every scene change, mute, kill, solo, roll,
   knob and fader move, tempo change, pattern edit (WRITE, the pads, the grid), keyboard note and pad hit is written down
   on the 16th-note grid (notes keep their exact timing). ▶ SONG plays it back exactly, on this machine, and puts your
   beat back as it was when it ends. WAV plays it back and saves it as an audio file. One song is kept on this device. */
const SONG_LS = 'md442-song';
let song = null; try { const s = JSON.parse(localStorage.getItem(SONG_LS) || 'null'); if (s && s.v === 1 && s.len > 0 && Array.isArray(s.steps) && Array.isArray(s.ev)) song = s; } catch (_) {}
function sgState() {
  const o = { style: S.style, sc: S.sc, last: S.last, mute: JSON.stringify(S.mute), kill: JSON.stringify(S.kill), solo: S.solo || null, rep: S.rep.on ? S.rep.len : -1,
    keys: JSON.stringify([S.keys.target, S.keys.mode, S.keys.rate, S.keys.oct, !!S.keys.hold]), scenes: JSON.stringify(S.scenes, (k, v) => (k === 'x' ? undefined : v)) };
  Object.keys(DEF).forEach(k => { o['p:' + k] = P[k]; }); return o;
}
function sgApply(d) {
  let p = false;
  Object.keys(d).forEach(k => {
    const v = d[k];
    if (k.startsWith('p:')) { if (DEF[k.slice(2)]) { P[k.slice(2)] = v; p = true; } }
    else if (k === 'style') { if (STYLES[v]) S.style = v; }
    else if (k === 'sc') S.sc = v; else if (k === 'last') S.last = v; else if (k === 'solo') S.solo = v;
    else if (k === 'mute') S.mute = JSON.parse(v); else if (k === 'kill') S.kill = JSON.parse(v);
    else if (k === 'rep') { S.rep.on = v >= 0; if (v >= 0) S.rep.len = v; }
    else if (k === 'keys') { const a = JSON.parse(v); Object.assign(S.keys, { target: a[0], mode: a[1], rate: a[2], oct: a[3], hold: a[4] }); }
    else if (k === 'scenes') S.scenes = JSON.parse(v).map(fixScene);
  });
  S.sc = clamp(S.sc, 0, S.scenes.length - 1);
  if ('p:sm.bank' in d || 'style' in d) preloadBank(P['sm.bank']);
  if (p) { apply(); refreshKnobs(); }
}
// what ▶ SONG changes, so it can be put back
const sgKeep = () => JSON.parse(JSON.stringify({ P, S: { style: S.style, preset: S.preset, dirty: S.dirty, scenes: S.scenes, sc: S.sc, chain: S.chain, last: S.last, mute: S.mute, kill: S.kill, solo: S.solo, rep: S.rep, keys: { target: S.keys.target, mode: S.keys.mode, rate: S.keys.rate, oct: S.keys.oct, hold: S.keys.hold } } }));
function sgRestore() {
  clearTimeout(sg.restoreT); sg.restoreT = 0; const w = sg.saved; sg.saved = null; if (!w) return;
  Object.keys(DEF).forEach(k => { if (typeof w.P[k] === 'number') P[k] = w.P[k]; }); const keys = w.S.keys; delete w.S.keys; Object.assign(S, w.S); Object.assign(S.keys, keys);
  held = []; arpPos = 0; preloadBank(P['sm.bank']); apply(); refreshKnobs(); drawAll(); drawKbd();
}
const sgSecs = n => { const s = Math.round(n); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// where in the song we are right now, in steps (the scheduler runs a little ahead of what you hear)
function sgPos() { const now = ac ? ac.currentTime : 0, L = sg.log; for (let j = L.length - 1; j >= 0; j--) if (L[j].t <= now) return Math.max(0, L[j].k + Math.min(.999, (now - L[j].t) / stepLen())); return 0; }
function sgEv(type, a, b) { if (sg.mode !== 'rec' || sg.wait || !sg.k) return; sg.ev.push([+sgPos().toFixed(3), type, a, b == null ? 0 : b]); }
// called by the sequencer for every 16th-note step, before it plays. false = the song is over, schedule nothing more.
function songStep(t) {
  if (sg.mode === 'rec') {
    if (sg.wait) { if (cur !== 0) return true; sg.wait = false; toast('Song recording. Press ● SONG again to finish.'); }
    if (!sg.k) sg.t0 = performance.now();
    const st = sgState(), d = {}; let any = false; Object.keys(st).forEach(k => { if (st[k] !== sg.prev[k]) { d[k] = st[k]; any = true; } }); sg.prev = st;
    if (any) sg.steps.push([sg.k, d]); sg.log.push({ k: sg.k, t }); if (sg.log.length > 64) sg.log.shift(); sg.k++; if (sg.k % 4 === 1) drawLite();   // the display's clock and bar
    if (performance.now() - sg.t0 > 600000) { setTimeout(songRecStop, 0); toast('Ten minutes is the longest song. Saving it now.'); }
    return true;
  }
  if (sg.mode !== 'play' || !song) return true;
  if (sg.k >= song.len) { if (!sg.ending) { sg.ending = true; setTimeout(() => { if (sg.mode === 'play') setPlaying(false); }, Math.max(0, (t - ac.currentTime) * 1000)); } return false; }
  let ch = false; while (sg.si < song.steps.length && song.steps[sg.si][0] <= sg.k) { sgApply(song.steps[sg.si++][1]); ch = true; }
  while (sg.ei < song.ev.length && song.ev[sg.ei][0] < sg.k + 1) {
    const e = song.ev[sg.ei++], at = t + Math.max(0, e[0] - sg.k) * stepLen();
    setTimeout(() => { if (sg.mode !== 'play') return; const was = S.keys.rec; S.keys.rec = false;   // WRITE stays out of it: the notes are already in the song
      if (e[1] === 'n') { sg.notes.add(e[2]); noteOn(e[2]); } else if (e[1] === 'f') { sg.notes.delete(e[2]); noteOff(e[2]); } else if (e[1] === 'h') midiHit(e[2], e[3]);
      S.keys.rec = was; }, Math.max(0, (at - ac.currentTime - .01) * 1000));
  }
  sg.k++; if (ch) drawAll(); else if (sg.k % 4 === 1) drawLite(); return true;
}
function songRec() {
  if (sg.mode === 'rec') return songRecStop();
  if (sg.mode === 'play') songEnd();
  boot(); if (sg.restoreT) sgRestore();
  Object.assign(sg, { mode: 'rec', k: 0, steps: [], ev: [], prev: {}, log: [], wait: playing, t0: performance.now() });
  if (playing) toast('Song recording starts on the next bar'); else { setPlaying(true); toast('Song recording. Press ● SONG again to finish.'); }
  drawAll(); buzz(15);
}
function songRecStop() {
  if (sg.mode !== 'rec') return; const was = sg.wait; sg.mode = null; sg.wait = false;
  if (was || sg.k < 2) { drawAll(); return toast('Nothing was recorded. The last song is kept.'); }
  song = { v: 1, len: sg.k, steps: sg.steps, ev: sg.ev, secs: (performance.now() - sg.t0) / 1000, bars: Math.ceil(sg.k / 16), at: Date.now(), name: S.preset || 'My song' };
  let kept = true; try { localStorage.setItem(SONG_LS, JSON.stringify(song)); } catch (_) { kept = false; }
  drawAll(); toast('Song recorded: ' + sgSecs(song.secs) + ', ' + song.bars + ' bars. ▶ SONG plays it, WAV saves it.' + (kept ? '' : ' (Too long to keep after you close the page.)'));
}
function songPlay() {
  if (sg.mode === 'play') { setPlaying(false); return false; }
  if (sg.mode === 'rec') songRecStop();
  if (!song) { toast('Nothing to play yet. Press ● SONG, play your set, press ● SONG again.'); return false; }
  if (playing) setPlaying(false);
  boot(); if (sg.restoreT) sgRestore(); saveNow(); sg.saved = sgKeep();
  Object.assign(sg, { mode: 'play', k: 0, si: 0, ei: 0, ending: false, t0: performance.now() }); sg.notes.clear(); pend = null; S.chain = false; held = [];
  if (song.steps[0] && song.steps[0][0] === 0) { sgApply(song.steps[0][1]); sg.si = 1; }   // the first step's sound is set before anything plays
  drawAll(); return true;
}
function songPlayKey() { if (songPlay()) setPlaying(true); }
async function songBounce() {
  if (sg.mode === 'play' && rec) return setPlaying(false);
  if (sg.mode === 'play') setPlaying(false);
  if (!songPlay()) return; if (rec) recStop();
  await recStart(); if (!playing && sg.mode === 'play') songEnd();
  else toast('Saving the song as a WAV: it plays through once (' + sgSecs(song.secs) + ').');
}
// the song stopped (it ended, or STOP): let go of its notes and put the beat back once the tails have rung out
function songEnd() {
  if (sg.mode !== 'play') return; sg.mode = null; sg.ending = false; const was = S.keys.rec; S.keys.rec = false; sg.notes.forEach(n => noteOff(n)); sg.notes.clear(); S.keys.rec = was; held = [];
  clearTimeout(sg.restoreT); sg.restoreT = setTimeout(sgRestore, rec ? Math.max(1500, P['fx.vdec'] * 1050 + 300) + 400 : 300); drawAll();
}
function songClear() { if (sg.mode) return; song = null; try { localStorage.removeItem(SONG_LS); } catch (_) {} drawAll(); toast('Song deleted'); }
function songLcd() {
  if (sg.mode === 'rec') return sg.wait ? ['● SONG', 'Starts on the next bar'] : ['● SONG REC  ' + sgSecs((performance.now() - sg.t0) / 1000), 'Bar ' + (Math.floor(sg.k / 16) + 1) + ' · Scene ' + (S.sc + 1) + '/' + S.scenes.length];
  if (sg.mode === 'play' && song) return ['▶ SONG  ' + sgSecs((performance.now() - sg.t0) / 1000) + ' / ' + sgSecs(song.secs), 'Bar ' + Math.min(song.bars, Math.floor(sg.k / 16) + 1) + '/' + song.bars + ' · Scene ' + (S.sc + 1)];
  return null;
}
// the three SONG keys at the top: ● SONG records, ▶ plays the song, WAV saves it as audio
function songKeys() {
  const r = key('● SONG', songRec, 'led song'), p = key('▶ SONG', songPlayKey, 'led song'), w = key('WAV', songBounce, 'led song');
  r.title = 'Record the whole performance as a song: scenes, mutes, knobs, keys. Press again to finish.'; p.title = 'Play the recorded song'; w.title = 'Play the song through once and save it as a WAV';
  live(r, () => { const on = sg.mode === 'rec'; r.classList.toggle('on', on); r.classList.toggle('rec', on); r.textContent = on ? '■ SONG' : '● SONG'; r.setAttribute('aria-pressed', on); r.setAttribute('aria-label', on ? 'Finish recording the song' : 'Record a song'); });
  live(p, () => { const on = sg.mode === 'play' && !rec; p.classList.toggle('on', on); p.textContent = on ? '■ SONG' : '▶ SONG'; p.disabled = !song && !on; p.setAttribute('aria-label', on ? 'Stop the song' : 'Play the song'); });
  live(w, () => { const on = sg.mode === 'play' && !!rec; w.classList.toggle('on', on); w.disabled = !song && !on; w.setAttribute('aria-label', on ? 'Stop saving the song' : 'Save the song as a WAV'); });
  return [r, p, w];
}
const metroKey = () => { const b = key('CLICK', toggleMetro, 'led'); return live(b, () => { b.classList.toggle('on', !!S.metro); b.setAttribute('aria-pressed', !!S.metro); b.setAttribute('aria-label', 'Metronome ' + (S.metro ? 'on' : 'off')); }); };

/* keyboard and arpeggiator: plays the bass or the dub stab. Notes are semitones above the Key. */
const ARPM = ['OFF', 'UP', 'DOWN', 'UP-DN', 'RANDOM'], ARPR = [['1/8', 2], ['1/16', 1], ['1/32', .5]];
let held = [], arpPos = 0, arpTimer = 0, arpNt = 0, arpN = 0; const down = new Set(), kbdEls = [];
function arpSeq() {
  const base = held.slice().sort((a, b) => a - b); let n = []; for (let o = 0; o < S.keys.oct; o++) base.forEach(x => n.push(x + 12 * o));
  if (S.keys.mode === 2) n.reverse(); if (S.keys.mode === 3 && n.length > 2) n = n.concat(n.slice(1, -1).reverse()); return n;
}
const slOf = note => ((Math.round(note) % 8) + 8) % 8 + 1;   // the keyboard plays the sampler's slices: C = 1 … G = 8, then round again
function playNote(note, t) { const k = S.keys.target; if (off(k)) return; voice(E, k, t, 0, 1, k === 'SM' ? slOf(note) : note); flashKey(k); }
function arpFire(t) { const n = arpSeq(); if (!n.length) return; playNote(S.keys.mode === 4 ? n[Math.floor(Math.random() * n.length)] : n[arpPos++ % n.length], t); }
function arpAtStep(idx, t) {                        // called once for every 16th-note step
  if (!S.keys.mode || !held.length) return; const r = ARPR[S.keys.rate][1];
  if (r === 2) { if (idx % 2 === 0) arpFire(t); } else if (r === 1) arpFire(t); else { arpFire(t); arpFire(t + stepLen() / 2); }
}
function arpRun() {                                 // keeps the arpeggio going when the drums are stopped
  if (arpTimer || playing || !ac) return; arpNt = ac.currentTime + .03; arpN = 0;
  arpTimer = setInterval(() => { if (playing || !S.keys.mode || !held.length) { clearInterval(arpTimer); arpTimer = 0; return; } if (arpNt < ac.currentTime - .2) arpNt = ac.currentTime + .03; while (arpNt < ac.currentTime + .12) { arpAtStep(arpN++, arpNt); arpNt += stepLen(); } }, 25);
}
function noteOn(note) {
  boot(); if (down.has(note)) return;
  sgEv('n', note);
  if (S.keys.mode) { if (S.keys.hold && down.size === 0) { held = []; arpPos = 0; } down.add(note); if (!held.includes(note)) held.push(note); if (!playing) { if (ac.state === 'running') arpRun(); else ac.resume().then(arpRun).catch(() => {}); } }
  else {
    down.add(note); const go = () => playNote(note, ac.currentTime + .01); if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => {});
    if (S.keys.rec && playing && head >= 0) writeNote(note);
  }
  drawKbd();
}
// WRITE: records what you play (on screen or on the SMK-37) into the looping pattern of the instrument KEYS plays, on the
// nearest step: a note in the second half of a step lands on the next one. Bass keeps the note, the sampler the slice, the
// stab its timing (it plays its chord on the pattern's key). One UNDO takes back a whole take.
const writing = () => !!S.keys.rec && playing && head >= 0;
function writeNote(note, drum) {
  const k = drum || S.keys.target, sc = scene(); if (!sc.g[k]) return;
  const late = ac && headT && ac.currentTime - headT > stepLen() / 2, i = late ? (head + 1) % Math.max(1, S.last) : head;
  if (performance.now() - editT > 1500) keep('keys write'); editT = performance.now();
  sc.g[k][i] = true; if (drum) {} else if (k === 'BS') sc.n[i] = note; else if (k === 'SM') sc.sl[i] = slOf(note);
  mark(); drawAll();
}
function noteOff(note) { if (!down.has(note)) return; sgEv('f', note); down.delete(note); if (S.keys.mode && !S.keys.hold) held = held.filter(x => x !== note); drawKbd(); }
function drawKbd() { kbdEls.forEach(({ el, n }) => { if (el.isConnected) { el.classList.toggle('on', down.has(n)); el.classList.toggle('held', held.includes(n) && !!S.keys.mode); } }); }
function setKeys(o) { Object.assign(S.keys, o); if (!S.keys.mode || (o.hold === false)) { held = held.filter(n => down.has(n)); } if (!S.keys.mode) held = []; drawAll(); drawKbd(); persist(); }
function buildKeys(box, count) {
  const ctl = h('div', 'kctl'), lab = (t, el) => { const w = h('div', 'lab'); w.append(h('span', 'cap', t), el); return w; };
  const hold = key('HOLD', () => setKeys({ hold: !S.keys.hold }), 'led'), rec = key('SEQ REC', toggleWrite, 'led'); rec.title = 'Records what you play into the loop for the instrument above, on the nearest step, while it plays. Turn ARP off to use it.';
  live(hold, () => { hold.classList.toggle('on', S.keys.hold); hold.setAttribute('aria-pressed', S.keys.hold); }); live(rec, () => { rec.classList.toggle('on', S.keys.rec); rec.setAttribute('aria-pressed', S.keys.rec); rec.disabled = !!S.keys.mode; });
  ctl.append(lab('PLAYS', seg([['BS', 'BASS'], ['ST', 'STAB'], ['SM', 'SAMPLE']], () => S.keys.target, v => setKeys({ target: v }))), lab('ARP', seg(ARPM.map((m, j) => [j, m]), () => S.keys.mode, v => setKeys({ mode: v }))),
    lab('RATE', seg(ARPR.map((r, j) => [j, r[0]]), () => S.keys.rate, v => setKeys({ rate: v }))), lab('OCTAVES', seg([[1, '1'], [2, '2']], () => S.keys.oct, v => setKeys({ oct: v }))), hold, rec);
  const kb = h('div', 'kbd'); let shownKey = -1;
  live(kb, () => {
    if (shownKey === P.key) return; shownKey = P.key; kb.textContent = ''; kbdEls.length = 0;
    for (let n = 0; n < count; n++) { const pc = (4 + P.key + n) % 12, b = h('button', 'pk' + ([1, 3, 6, 8, 10].includes(pc) ? ' bl' : ''), NOTES[(P.key + n) % 12]); b.dataset.n = n; b.setAttribute('aria-label', 'Note ' + NOTES[(P.key + n) % 12]); if (!PHONE && n < PIANO.length) b.append(h('i', 'pl', PIANO[n].slice(3))); kb.append(b); kbdEls.push({ el: b, n }); }
    drawKbd();
  }, true);
  const ids = {};
  kb.addEventListener('pointerdown', e => { const b = e.target.closest('.pk'); if (!b || e.button) return; e.preventDefault(); try { kb.setPointerCapture(e.pointerId); } catch (_) {} ids[e.pointerId] = +b.dataset.n; noteOn(+b.dataset.n); });
  kb.addEventListener('pointermove', e => { if (!(e.pointerId in ids)) return; const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest ? el.closest('.pk') : null; if (b && +b.dataset.n !== ids[e.pointerId]) { noteOff(ids[e.pointerId]); ids[e.pointerId] = +b.dataset.n; noteOn(+b.dataset.n); } });
  const up = e => { if (e.pointerId in ids) { noteOff(ids[e.pointerId]); delete ids[e.pointerId]; } }; kb.addEventListener('pointerup', up); kb.addEventListener('pointercancel', up); kb.addEventListener('contextmenu', e => e.preventDefault());
  box.append(ctl, kb);
}
const PIANO = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP'];
function toggleKeys() { S.keys.open = !S.keys.open; if (!S.keys.open) { down.clear(); if (!S.keys.hold) held = []; } drawAll(); persist(); if (S.keys.open) requestAnimationFrame(() => { const k = root.querySelector('.keyp:not([hidden])'); if (k) k.scrollIntoView({ block: 'end', behavior: 'smooth' }); }); }   // the piano sits under the steps: bring it on screen

/* one transport key: PLAY when stopped, STOP while playing (space bar, the SMK-37 and DAW sync still start and stop it) */
/* WRITE next to PLAY: loop record. Arm it, play the keys (screen or SMK-37) and each pass layers into the loop for the instrument
   shown on the key. Pick BASS, STAB or SAMPLE in the drum row (or under PLAYS) between passes. Starts the loop if it is stopped. */
let wrSel = '';
function toggleWrite() {
  const on = !S.keys.rec; if (on && S.keys.mode) S.keys.mode = 0;           // the arp can't be written: plain notes while WRITE is on
  setKeys({ rec: on }); if (on && !playing) { boot(); setPlaying(true); }
  lcdFlash('SEQ REC', on ? 'Recording into the loop' : 'Off'); buzz(15);
}
const writeKey = () => { const b = key('', toggleWrite, 'led wr'); b.title = 'Loop record: everything you play (keys and drum pads, on screen or on the SMK-37) is written into the loop, pass after pass';
  return live(b, () => {
    if (S.sel !== wrSel) { wrSel = S.sel; if (['BS', 'ST', 'SM'].includes(S.sel) && S.keys.target !== S.sel) S.keys.target = S.sel; }   // picking bass, stab or sample also points the keys at it
    b.textContent = 'SEQ REC'; b.classList.toggle('on', !!S.keys.rec); b.setAttribute('aria-pressed', !!S.keys.rec);
    b.setAttribute('aria-label', S.keys.rec ? 'Stop writing into the loop' : 'Write everything you play into the loop'); }); };
function playKey() {
  const b = key('PLAY', () => { if (!learnAct('play')) setPlaying(!playing); }, 'big go play');
  return live(b, () => { b.classList.toggle('on', playing); b.textContent = playing ? (rec ? '■ STOP · REC' : '■ STOP') : '▶ PLAY'; b.classList.toggle('recon', !!rec && playing); b.setAttribute('aria-label', playing ? 'Stop' : 'Play'); b.setAttribute('aria-pressed', playing); });
}
/* instrument keys: tap to pick (and hear) a drum, double-tap (double-click) to mute or unmute it */
const instEls = {};
function instKey(k) {
  const b = h('button', 'key led inst', SHORT[k]); let last = 0;
  b.addEventListener('pointerdown', e => { if (!e.button) boot(); });
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('dblclick', e => e.preventDefault());   // no zoom or text selection on a fast second tap
  b.addEventListener('click', e => {
    if (grp) { if (mq.has(k)) mq.delete(k); else mq.add(k); drawAll(); buzz(8); return; }   // picking a mute group: every tap adds or removes
    const now = performance.now();
    if (now - last < 340) { last = 0; toggleMute(k); buzz(14); return; }   // second tap on the same drum: mute / unmute
    last = now; select(k, true); buzz(6);
  });
  (instEls[k] = instEls[k] || []).push(b);
  if (!PHONE && KEYS.indexOf(k) < DRUM_LET.length) b.append(h('i', 'lt', DRUM_LET[KEYS.indexOf(k)]));
  return live(b, () => { b.classList.toggle('arm', grp && mq.has(k)); b.classList.toggle('ingrp', !grp && mq.has(k)); b.classList.toggle('sel', S.sel === k); b.classList.toggle('mute', !!S.mute[k]); b.classList.toggle('solo', S.solo === k); b.classList.toggle('quiet', !!S.solo && S.solo !== k && k !== 'AC'); b.setAttribute('aria-pressed', S.sel === k); b.setAttribute('aria-label', NAME[k] + (S.mute[k] ? ', muted' : '')); });
}
function flashKey(k) { (instEls[k] || []).forEach(b => { if (!b.isConnected) return; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90); }); }

/* steps: ONE DRUM = 16 big keys for the selected drum, WHOLE PATTERN = every drum as a row of 16 */
const LETTERS = 'QWERTYUIASDFGHJK', DRUM_LET = 'QWERTYUIASDFGHJ', DRUM_CODES = DRUM_LET.split('').map(c => 'Key' + c);   // steps use all 16; the 14 drums use the first 14 with Shift (select) or Alt (mute)
let head = -1, headT = 0, holdT = 0;
const stepBoxes = [];
function buildSteps(box, view) {
  view = view || S.view; if (!stepBoxes.includes(box)) stepBoxes.push(box);
  const sig = view + '|' + (view === 'one' ? S.sel : '');
  if (sig !== box._sig || !box.firstChild) {
    box._sig = sig; box.textContent = ''; box._els = []; box.className = 'steps ' + view;
    const mk = (k, i) => { const b = h('button', 'st' + ((i >> 2) & 1 ? ' alt' : '')), nt = h('i', 'nt'); b.dataset.k = k; b.dataset.i = i; b.append(h('i', 'sn', String(i + 1)), nt); if (!PHONE && view === 'one') b.append(h('i', 'lt', LETTERS[i])); box._els.push({ el: b, k, i, nt }); return b; };
    if (view === 'one') for (let i = 0; i < 16; i++) box.append(mk(S.sel, i));
    else KEYS.forEach(k => { const r = h('div', 'prow'), nm = h('button', 'nm', SHORT[k]); r.dataset.k = k; nm.addEventListener('click', () => { boot(); select(k, true); }); r.append(nm); for (let i = 0; i < 16; i++) r.append(mk(k, i)); box.append(r); });
  }
  const sc = scene();
  box._els.forEach(({ el, k, i, nt }) => {
    const on = sc.g[k][i]; el.classList.toggle('on', on); el.classList.toggle('out', i >= S.last); el.classList.toggle('ph', i === head);
    nt.textContent = k === 'BS' && on && sc.n[i] ? sgn(sc.n[i]) + Math.abs(sc.n[i]) : k === 'SM' && on && sc.sl[i] ? String(sc.sl[i]) : '';
    el.setAttribute('aria-pressed', on); el.setAttribute('aria-label', NAME[k] + ' step ' + (i + 1));
  });
  box.querySelectorAll('.prow').forEach(r => { r.classList.toggle('sel', r.dataset.k === S.sel); r.classList.toggle('mute', !!S.mute[r.dataset.k]); });
  if (PHONE && view === 'all' && box._shown !== S.sel) { box._shown = S.sel; requestAnimationFrame(() => { const r = box.querySelector('.prow.sel'); if (r && S.view === 'all') r.scrollIntoView({ block: 'nearest' }); }); }   // keep the selected drum's row in sight
}
let ovCols = [];
function drawHead() { stepBoxes.forEach(b => { if (b.isConnected && b._els) b._els.forEach(s => s.el.classList.toggle('ph', s.i === head)); }); ovCols.forEach((c, i) => c.classList.toggle('ph', i === head)); }
// tap a step on or off, or press and sweep along a row to paint. scrolly(): on touch, wait and see whether the finger scrolls or slides.
function bindSteps(box, scrolly) {
  let d = null;
  const at = e => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('.st') : null; };
  box.addEventListener('pointerdown', e => {
    const el = e.target.closest('.st'); if (!el || e.button) return;
    if (d && d.pend && !d.moved && !d.held) setStep(d.k, d.i, d.val, true);   // a second finger lands before the first lifts: finish the first tap
    boot(); const k = el.dataset.k, i = +el.dataset.i, was = scene().g[k][i], wait = scrolly() && e.pointerType !== 'mouse';
    d = { k, i, x: e.clientX, y: e.clientY, val: !was, pend: wait || was, moved: false, held: false, id: e.pointerId, wait };
    if (!d.pend) { setStep(k, i, true, true); buzz(6); }
    if (!wait) { e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (_) {} }
    clearTimeout(holdT); if (was && (k === 'BS' || k === 'SM')) holdT = setTimeout(() => { if (d && !d.moved) { d.held = true; if (k === 'SM') cycleSlice(i); else cycleNote(i); } }, 450);   // hold a lit bass step: next note; a lit sample step: next slice
  });
  box.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id || d.held) return;
    if (!d.moved) {
      if (d.wait) { const dx = Math.abs(e.clientX - d.x), dy = Math.abs(e.clientY - d.y); if (dx < 8 || dx < dy) return; }
      else { const el = at(e); if (!el || (el.dataset.k === d.k && +el.dataset.i === d.i)) return; }
      d.moved = true; clearTimeout(holdT); if (d.pend) { setStep(d.k, d.i, d.val); d.pend = false; }
    }
    const el = at(e); if (el && el.dataset.k === d.k) setStep(d.k, +el.dataset.i, d.val);
  });
  const end = e => { if (!d || e.pointerId !== d.id) return; clearTimeout(holdT); if (e.type === 'pointerup' && d.pend && !d.moved && !d.held) { setStep(d.k, d.i, d.val, true); buzz(6); } d = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end); box.addEventListener('contextmenu', e => e.preventDefault());
}
const styleKeys = cls => seg(STYLE_IDS.map(st => [st, STYLES[st].name]), () => S.style, pickStyle, 'style' + (cls ? ' ' + cls : ''));
const presetKeys = box => live(box, () => { if (box._st === S.style) return; box._st = S.style; box.textContent = ''; stylePresets(S.style).forEach(n => { const b = key(n, () => pickPreset(n), 'led'); box.append(b); live(b, () => { b.classList.toggle('on', S.preset === n); b.setAttribute('aria-pressed', S.preset === n); }); }); });
function beatKeys(box) {
  let sig = null;
  return live(box, () => {
    const now = beats.map(b => b.name).join('|') + '#' + S.preset; if (now === sig) return; sig = now;
    box.textContent = '';
    beats.forEach((b, j) => { const w = h('span', 'beat'), a = key(b.name, () => loadBeat(j), 'led' + (S.preset === b.name ? ' on' : '')), x = key('✕', () => delBeat(j), 'x'); x.setAttribute('aria-label', 'Delete ' + b.name); w.append(a, x); box.append(w); });
    if (beats.length < 8) box.append(key('+ SAVE PATTERN', saveBeat, 'next'));
    box.append(beatIO());
  });
}
function sceneKeys(box) {
  for (let n = 0; n < 8; n++) { const b = key(String(n + 1), () => { if (n < S.scenes.length && learnAct('sc:' + n)) return; if (n === S.scenes.length) addScene(); else setScene(n); }, 'led sc'); box.append(b); live(b, () => { const has = n < S.scenes.length, next = n === S.scenes.length; b.disabled = !has && !next; b.classList.toggle('next', next); b.textContent = next ? '+ ' + (n + 1) : String(n + 1); b.classList.toggle('sel', has && n === S.sc); b.classList.toggle('on', has && n === S.sc); b.classList.toggle('pend', pend === n); b.setAttribute('aria-label', next ? 'Save this pattern to scene ' + (n + 1) : 'Scene ' + (n + 1) + (has ? '' : ', empty')); }); }
  return box;
}
const chainKey = () => { const b = key('CHAIN', toggleChain, 'led'); return live(b, () => { b.classList.toggle('on', S.chain); b.setAttribute('aria-pressed', S.chain); }); };
const lcdText = () => (!flashTxt && songLcd()) || (flashTxt ? [flashTxt[0], flashTxt[1]] : [(S.preset || 'My pattern') + (S.dirty ? ' *' : ''), 'Scene ' + (S.sc + 1) + '/' + S.scenes.length + (pend != null ? ' → ' + (pend + 1) : '') + (S.chain ? ' · chain' : '') + (S.last < 16 ? ' · ' + S.last + ' steps' : '')]);

/* ---------- 6. desktop console ---------- */
let palette = null, fitEl = null, conEl = null;
const MACOS = /Mac|iPhone|iPad/.test(navigator.platform || '');
const K = (...p) => p.map(x => MACOS ? ({ Ctrl: '⌘', Alt: '⌥', Shift: '⇧' }[x] || x) : x).join(MACOS ? '' : '+');   // how a key combination is printed on this computer
function fitDesk() {
  // Scale the 1440 px design to the width there is. In full screen it also fits the height, but only while that keeps the console
  // at least 85% of full width: with the keyboard, MIDI panel or guide open it stays legible and the screen scrolls instead of shrinking to a strip.
  if (!fitEl) return; const fs = document.fullscreenElement === fitEl, w = fitEl.clientWidth, ch = conEl.offsetHeight, ws = w / 1440, hs = innerHeight / ch;
  const s = fs ? (hs >= ws * .85 ? Math.min(ws, hs) : ws) : Math.min(2, ws);
  conEl.style.transform = `translate(${Math.max(0, (w - 1440 * s) / 2)}px, ${fs ? Math.max(0, (innerHeight - ch * s) / 2) : 0}px) scale(${s})`; fitEl.style.height = fs ? '' : ch * s + 'px'; fitEl.classList.toggle('fs', fs);
  conEl.style.marginBottom = fs ? (ch * s - ch) + 'px' : '';   // in full screen the scroll height follows the scaled console
}
function fullScreen() { if (!fitEl) return; if (document.fullscreenElement) document.exitFullscreen(); else if (fitEl.requestFullscreen) fitEl.requestFullscreen().catch(() => {}); }
function buildDesk() {
  root.classList.add('md', 'desk');
  fitEl = h('div', 'md-fit'); conEl = h('div', 'md-console'); fitEl.append(conEl); root.append(fitEl);
  const blk = (title, cls) => { const b = h('div', 'blk' + (cls ? ' ' + cls : '')); b.append(h('span', 'cap', title)); return b; };
  // header: logo, display, Random, Save, ⌘K, Start, Stop, full screen
  const hd = h('div', 'row hd'), logo = h('div', 'logo'), lcd = h('div', 'lcd'), l1 = h('span', 'l1'), l2 = h('span', 'l2'), tp = h('span', 'tp'), tl = h('span', 'tl', 'BPM'), txt = h('div', 'lt2');
  const lnum = h('b', '', '|442'), lsw = h('span', 'lsw'); STYLE_IDS.forEach(st => { const b = key(st, () => pickStyle(st), 'sty'); b.title = STYLES[st].name + ' · ' + STYLES[st].tag.toLowerCase(); lsw.append(live(b, () => { b.classList.toggle('on', S.style === st); b.setAttribute('aria-pressed', S.style === st); })); });
  logo.append('MD', live(lnum, () => { lnum.textContent = '|' + S.style; }), lsw); txt.append(l1, l2); lcd.append(txt, tp, tl); tp.title = 'Type a tempo'; tp.addEventListener('click', () => typeBpm(tp));
  live(lcd, () => { const t = lcdText(); l1.textContent = t[0]; l2.textContent = t[1]; tp.textContent = Math.round(P.bpm); }, true);
  const play = playKey(), fs = key('', fullScreen, 'ico');
  fs.setAttribute('aria-label', 'Full screen'); fs.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6M3 3l6.5 6.5M21 3l-6.5 6.5M3 21l6.5-6.5M21 21l-6.5-6.5"/></svg>';
  const hk = h('div', 'hk'); const sck = key('SHORTCUTS', openPalette); sck.title = MACOS ? '⌘K or ?' : 'Ctrl+K or ?';
  const sgk = h('div', 'sgk'); sgk.append(...songKeys());
  hk.append(sck, themeKey(), metroKey(), sgk, recKey(), writeKey(), play, fs); hd.append(logo, lcd, hk);
  // one section per drum: title bar picks the drum, two knobs per column
  const secs = h('div', 'row secs');
  SECT.forEach(s => {
    const el = h('section', 'sec'), t = h('button', 'sec-t', s.t), kn = h('div', 'knobs'); s.k.forEach(([k, l]) => kn.append(mkKnob(k, l)));
    t.addEventListener('click', () => { boot(); const j = s.v.indexOf(S.sel); select(s.v[(j + 1) % s.v.length], true); });
    el.append(t, kn); secs.append(live(el, () => { el.classList.toggle('sel', s.v.includes(S.sel)); t.setAttribute('aria-label', s.t + (s.v.includes(S.sel) ? ', selected' : '')); }));
  });
  // presets, my beats, scenes
  const mid = h('div', 'row mid'), pb = blk("MATHEW'S PATTERNS", 'pats'), bb = blk('MY BEATS', 'beats'), sb = blk('SCENES', 'scn');
  pb.append(presetKeys(h('div', 'keys'))); bb.append(beatKeys(h('div', 'keys'))); const sk = sceneKeys(h('div', 'keys')); sk.append(key('+ SCENE', addScene), chainKey(), key('DELETE', delScene)); sb.append(sk); mid.append(pb, bb); const mid2 = h('div', 'row mid2'); mid2.append(sb);
  // master, effects, hold repeat, kills, output
  const fx = h('div', 'row fxr'), mb = blk('MASTER'), eb = blk('EFFECTS'), hb = blk('HOLD REPEAT', 'rep'), kb = blk('KILL'), ob = blk('OUTPUT', 'out');
  const mk = h('div', 'knobs1'); MASTER.forEach(([k, l]) => mk.append(mkKnob(k, l))); mb.append(mk);
  const ek = h('div', 'knobs1'); FXK.forEach(([k, l]) => ek.append(fxKnob(k, l))); FXMORE.forEach(([k, l]) => ek.append(mkKnob(k, l))); eb.append(ek);
  const hw = h('div', 'repw'); hw.append(holdKey(), repSeg()); hb.append(hw); kb.append(killKeys()); ob.append(meter()); fx.append(mb, eb, hb, kb, ob);
  // tools, the step keys, the instrument row
  const tools = h('div', 'row tools'), nm = h('span', 'selnm'), mute = key('MUTE', () => toggleMute(), 'led');
  live(nm, () => { nm.textContent = NAME[S.sel] + (S.mute[S.sel] ? ' · muted' : ''); }); live(mute, () => { mute.classList.toggle('on', !!S.mute[S.sel]); });
  const lw = h('div', 'lab'); lw.append(h('span', 'cap', 'LAST STEP'), lastCtl());
  const mxk = key('MIXER', toggleMixer, 'led'); live(mxk, () => { mxk.classList.toggle('on', !!S.mixer); mxk.setAttribute('aria-expanded', !!S.mixer); });
  const kyk = key('KEYS', toggleKeys, 'led'); live(kyk, () => { kyk.classList.toggle('on', !!S.keys.open); kyk.setAttribute('aria-expanded', !!S.keys.open); });
  tools.append(seg([['one', 'ONE DRUM'], ['all', 'WHOLE PATTERN']], () => S.view, setView, 'wide'), mxk, kyk, midiKey(), lw, nm, mute, groupKey(), key('UNDO', undo), key('CLEAR DRUM', clearDrum), key('CLEAR SCENE', clearScene), key('RANDOM', randomize));
  const steps = h('div', 'steps'); bindSteps(steps, () => false); live(steps, () => { buildSteps(steps); });
  // the mixer: opens and closes with the MIXER key; built the first time it opens
  const mixp = h('div', 'mixp'), mixb = h('div', 'mixb'), mixx = key('✕', toggleMixer, 'x'); mixx.setAttribute('aria-label', 'Close the mixer'); mixp.append(h('span', 'cap', 'MIXER'), mixx, mixb);
  live(mixp, () => { mixp.hidden = !S.mixer; if (S.mixer && !mixb.firstChild) buildMixer(mixb); });
  const keyp = h('div', 'mixp keyp'), keyb = h('div', 'keyb'), keyx = key('✕', toggleKeys, 'x'); keyx.setAttribute('aria-label', 'Close the keyboard'); keyp.append(h('span', 'cap', 'KEYBOARD · ARP'), keyx, keyb);
  live(keyp, () => { root.classList.toggle('kbopen', !!S.keys.open); keyp.hidden = !S.keys.open; if (S.keys.open && !keyb.firstChild) buildKeys(keyb, 25); });
  const inst = h('div', 'row inst'); KEYS.forEach(k => inst.append(instKey(k)));
  const midp = h('div', 'mixp midp'), midb = h('div', 'keyb'), midx = key('✕', toggleMidi, 'x'); midx.setAttribute('aria-label', 'Close MIDI'); midp.append(h('span', 'cap', 'MIDI · DAW · SMK-37 · MASCHINE'), midx, midb);
  live(midp, () => { midp.hidden = !S.midiOpen; if (S.midiOpen && !midb.firstChild) buildMidi(midb); });
  conEl.append(hd, secs, mid, mid2, fx, mixp, tools, inst, steps, keyp, midp);   // drum keys sit directly above the steps, as on the phone
  if (!hinted) {
    const x = key('✕', hintOff, 'x'); x.setAttribute('aria-label', 'Close the tips'); hintEl = h('div', 'hint'); hintEl.setAttribute('role', 'note');
    hintEl.append(h('span', '', 'DRAG A KNOB UP OR DOWN · DOUBLE-CLICK IT TO RESET · SPACE = START/STOP · CLICK THE MACHINE, THEN THE LETTER ON A STEP TOGGLES IT · ? = ALL SHORTCUTS'), x);
    hd.after(hintEl); live(hintEl, () => { if (playing) hintSeen(); });   /* once a beat has run the line does not come back on the next visit */
  }
  document.addEventListener('keyup', e => { if (e.key === 'Alt' && armed) e.preventDefault(); if (e.code === 'Space' && !palette && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) e.preventDefault(); const n = PIANO.indexOf(e.code); if (n >= 0) noteOff(n); if (e.code === 'KeyB' && S.rep.on) { S.rep.on = false; repStart = null; } });
  // fit the 1440 px design to the space there is
  if (window.ResizeObserver) { const ro = new ResizeObserver(fitDesk); ro.observe(fitEl); ro.observe(conEl); }
  addEventListener('resize', fitDesk); document.addEventListener('fullscreenchange', () => { fitDesk(); setTimeout(fitDesk, 120); }); fitDesk();
  document.addEventListener('pointerdown', e => { armed = root.contains(e.target); root.classList.toggle('armed', armed); }, true);
  document.addEventListener('keydown', onKey);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});   // makes the desktop page installable and usable offline
  addEventListener('blur', () => { down.clear(); if (!S.keys.hold) held = []; drawKbd(); if (S.rep.on) { S.rep.on = false; repStart = null; } });   // the key-up never arrives when the window loses focus
}
// ⌘K: every command with its key, and a few tips
const CMDS = [
  ['Play', 'Play or stop (the ▶ PLAY / ■ STOP key)', 'Space', () => setPlaying(!playing)], ['Play', 'Tempo down / up', '← →  (' + K('Shift') + ' = 5)', () => {}], ['Play', 'Tap the tempo', '0', tapTempo], ['Play', 'Metronome on or off', '9', toggleMetro], ['Play', 'Hold repeat (while held)', 'B', () => toast('Hold B while it plays')],
  ['Steps', 'Steps 1–8 of the selected drum', 'Q W E R T Y U I', () => {}], ['Steps', 'Steps 9–16 of the selected drum', 'A S D F G H J K', () => {}], ['Steps', 'Undo', K('Ctrl', 'Z'), undo], ['Steps', 'Redo', K('Ctrl', 'Shift', 'Z'), redo],
  ['Steps', 'One step shorter / longer', '[ ]', () => {}], ['Steps', 'Last step 16', '', () => setLast(16)], ['Steps', 'Last step 8', '', () => setLast(8)], ['Steps', 'Last step 4', '', () => setLast(4)],
  ['Drums', 'Previous / next drum', '↑ ↓', () => {}], ['Drums', 'Select a drum: Kick Q, Snare W, Clap E, Rim R, toms T Y U, hats I A, Crash S, Ride D, Bass F, Stab G, Accent H', K('Shift', 'letter'), () => {}],
  ['Drums', 'Clear the selected drum', K('Shift', '⌫'), clearDrum], ['Drums', 'Random beat', K('Shift', 'Z'), randomize],
  ['Mutes', 'Mute a drum (same letters as select)', K('Alt', 'letter'), () => {}], ['Mutes', 'Solo a drum', K('Alt', 'Shift', 'letter'), () => {}], ['Mutes', 'Mute the selected drum', 'M', () => toggleMute()], ['Mutes', 'Solo the selected drum', K('Shift', 'M'), () => toggleSolo()],
  ['Scenes', 'Go to scene 1–8', '1–8  or  ' + K('Alt', '1–8'), () => {}], ['Scenes', 'Save this pattern to a new scene', 'N', addScene], ['Scenes', 'Chain the scenes', 'L', toggleChain], ['Scenes', 'Delete this scene', K('Alt', '⌫'), delScene], ['Scenes', 'Clear the scene', '', clearScene],
  ['Patterns', 'Save as My beat', K('Ctrl', 'S'), saveBeat],
  ['Patterns', 'Import a beat (.md442.json)', '', importBeat],
  ['Patterns', 'Export this beat (.md442.json)', '', exportBeat],
  ['Patterns', 'Export a MIDI clip (.mid)', '', exportMidi]
].concat(STYLE_IDS.map(st => ['Patterns', 'Switch to ' + STYLES[st].name + ' (' + STYLES[st].tag.toLowerCase() + ')', '', () => pickStyle(st)])).concat(STYLE_IDS.flatMap(st => stylePresets(st).map(n => ['Patterns', 'Load ' + n + ' · ' + STYLES[st].name, '', () => pickPreset(n)]))).concat([
  ['Sound and effects', 'Kill the lows / mids / highs', K('Alt', 'Z') + '  ' + K('Alt', 'X') + '  ' + K('Alt', 'C'), () => {}],
  ['Sound and effects', 'Filter / reverb / echo / drive on or off', K('Alt', 'V') + '  ' + K('Alt', 'B') + '  ' + K('Alt', 'N') + '  ' + K('Alt', 'M'), () => {}],
  ['Sound and effects', 'Fine adjust a knob', K('Shift', 'drag'), () => {}], ['Sound and effects', 'Back to the pattern’s value', 'Double-click', () => {}],
  ['Recording', 'Record to a WAV file (press again to save)', K('Ctrl', 'Enter'), toggleRec],
  ['Recording', 'Record a song: the whole set, to play back (press again to finish)', '', songRec], ['Recording', 'Play the recorded song', '', songPlayKey], ['Recording', 'Save the song as a WAV', '', songBounce],
  ['Views', 'One drum / whole pattern', 'V', () => nextView()], ['Views', 'Mixer', 'X', toggleMixer], ['Views', 'Keyboard and arp', 'C', toggleKeys], ['Views', 'Play notes (keyboard open)', 'A W S E D F T G Y H U J K', () => { if (!S.keys.open) toggleKeys(); }],
  ['Views', 'Full screen', 'P', fullScreen], ['Views', 'Close a panel', 'Esc', () => {}], ['Views', 'This list', K('Ctrl', 'K') + '  or  ?', () => {}],
  ['Rarely used', 'Light or dark look', '', toggleTheme], ['Rarely used', 'MIDI controllers', '', toggleMidi], ['Rarely used', 'MIDI learn: tie a hardware control to a knob', '', midiLearn], ['Rarely used', 'Send this beat to the keyboard', '', () => sendToKeyboard(false)], ['Rarely used', 'MIDI clock out on or off (an FM-1 or a DAW follows MD|442)', '', () => { midi.cko = !midi.cko; midiKeep(); if (midi.cko && !midi.access) midiConnect(); if (!midi.cko) clockStop(); drawAll(); toast(midi.cko ? 'Clock out on' : 'Clock out off'); }], ['Rarely used', 'Install as a desktop app', '', install]
]);
const TIPS = ['One idea per modifier: a plain letter is a step, ' + K('Shift') + ' + letter selects a drum, ' + K('Alt') + ' + letter mutes it.', 'Steps 1–8 are Q W E R T Y U I, steps 9–16 are A S D F G H J K, for the drum that is selected.', 'Made a pattern you like? Press the scene key marked + (or N) to save it to the next scene, then change it there. Keys 1–8 pick a scene; while it plays, the change waits for the bar line. Chain plays them in order.',
  'Hold a lit bass step to change its note.', 'With the keyboard open, A W S E D F T G Y H U J K play notes (the step letters come back when you close it). ARP plays the notes you hold in time with the tempo; HOLD keeps them going; REC writes what you play into the bass line.', 'Double-tap a drum key to mute or unmute it (double-click on a computer).', 'Drag a knob up or right. Shift = fine. Double-click = back to the pattern’s value. The wheel and the arrow keys step.', 'Shortcuts work once you have clicked the machine; Space works anywhere.'];
function openPalette() {
  if (palette) return closePalette();
  palette = h('div', 'pal'); const box = h('div', 'pal-box'), inp = h('input', 'pal-in'), list = h('div', 'pal-list'), tips = h('div', 'pal-tips'); let rows = [], cur0 = 0;
  inp.type = 'text'; inp.placeholder = 'Search shortcuts and commands'; inp.setAttribute('aria-label', 'Search commands'); palette.setAttribute('role', 'dialog'); palette.setAttribute('aria-label', 'Shortcut library');
  tips.append(h('span', 'cap', 'TIPS')); TIPS.forEach(t => tips.append(h('p', '', t)));
  const run = c => { closePalette(); boot(); c[3](); };
  const draw = () => { const q = inp.value.trim().toLowerCase(); list.textContent = ''; rows = CMDS.filter(c => !q || (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase().includes(q)); cur0 = clamp(cur0, 0, Math.max(0, rows.length - 1));
    let grp = ''; rows.forEach((c, j) => { if (c[0] !== grp) { grp = c[0]; list.append(h('div', 'pal-grp', grp)); } const r = h('button', 'pal-row' + (j === cur0 ? ' on' : '')); r.append(h('span', '', c[1]), h('kbd', '', c[2])); r.addEventListener('click', () => run(c)); list.append(r); if (j === cur0) r.scrollIntoView({ block: 'nearest' }); });
    if (!rows.length) list.append(h('p', 'none', 'Nothing matches')); };
  inp.addEventListener('input', () => { cur0 = 0; draw(); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); closePalette(); } else if (e.key === 'ArrowDown') { e.preventDefault(); cur0++; draw(); } else if (e.key === 'ArrowUp') { e.preventDefault(); cur0--; draw(); } else if (e.key === 'Enter' && rows[cur0]) run(rows[cur0]); });
  palette.addEventListener('pointerdown', e => { if (e.target === palette) closePalette(); });
  box.append(inp, list, tips); palette.append(box); (document.fullscreenElement === fitEl ? fitEl : root).append(palette); draw(); inp.focus();
}
function closePalette() { if (palette) { palette.remove(); palette = null; } }
function onKey(e) {
  const mod = e.metaKey || e.ctrlKey, kk = (e.key || '').toLowerCase(), tg = e.target;
  const typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
  if (palette) { if (e.key === 'Escape') { e.preventDefault(); closePalette(); } return; }
  if (root.querySelector('.dlg')) return;                                   // a dialog is open: its own keys only
  // file-like actions: matched by the letter typed, so they are right on every keyboard layout
  if (mod && !e.altKey) {
    if (kk === 'k' && !e.shiftKey) { e.preventDefault(); armed = true; root.classList.add('armed'); openPalette(); return; }
    if (typing) return;
    if (kk === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (kk === 'y') { e.preventDefault(); redo(); }
    else if (kk === 's') { e.preventDefault(); boot(); saveBeat(); }
    else if (e.key === 'Enter') { e.preventDefault(); toggleRec(); }
    return;
  }
  if (typing) return;
  if (e.code === 'Space' && !e.altKey) { e.preventDefault(); if (!e.repeat) { boot(); setPlaying(!playing); } return; }   // Space always starts and stops
  if (!armed) { if (/^Key[A-Z]$/.test(e.code) && !e.repeat && !warned && inView()) { warned = true; toast('Click the machine to use the keys'); } return; }
  if (e.key === 'Alt') { e.preventDefault(); if (!e.repeat) lcdFlash(K('Alt') + ' + letter', 'Mute · with ' + K('Shift') + ': solo'); return; }   // also stops Windows putting focus on the browser menu
  if (e.key === 'Shift') { if (!e.repeat) lcdFlash(K('Shift') + ' + letter', 'Select a drum'); return; }
  const di = DRUM_CODES.indexOf(e.code), st = LETTERS.indexOf(e.code.startsWith('Key') ? e.code.slice(3) : '?');
  if (e.altKey) {                                                           // Alt = mute (physical key position, because Option changes the letter typed on a Mac)
    e.preventDefault(); if (e.repeat || (e.getModifierState && e.getModifierState('AltGraph'))) return;
    if (/^Digit[1-8]$/.test(e.code)) setScene(+e.code.slice(5) - 1);
    else if (e.key === 'Backspace') delScene();
    else if (di >= 0) { if (e.shiftKey) toggleSolo(KEYS[di]); else toggleMute(KEYS[di]); }
    else if (e.code === 'KeyZ') toggleKill('LOW'); else if (e.code === 'KeyX') toggleKill('MID'); else if (e.code === 'KeyC') toggleKill('HI');
    else if (e.code === 'KeyV') fxToggle('fx.filter'); else if (e.code === 'KeyB') fxToggle('fx.verb'); else if (e.code === 'KeyN') fxToggle('fx.space'); else if (e.code === 'KeyM') fxToggle('fx.drive');
    return;
  }
  let done = true;
  if (e.key === 'Escape') { if (S.keys.open) toggleKeys(); else if (S.mixer) toggleMixer(); else if (S.midiOpen) toggleMidi(); else done = false; }
  else if (e.key === '?') openPalette();
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { boot(); select(KEYS[(KEYS.indexOf(S.sel) + (e.key === 'ArrowUp' ? KEYS.length - 1 : 1)) % KEYS.length], true); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') set('bpm', P.bpm + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1));
  else if (/^Digit[1-8]$/.test(e.code)) setScene(+e.code.slice(5) - 1);
  else if (e.code === 'Digit9') toggleMetro();
  else if (e.code === 'Digit0') tapTempo();
  else if (e.shiftKey) {                                                    // Shift = select
    if (e.key === 'Backspace') clearDrum();
    else if (di >= 0) { boot(); select(KEYS[di], true); }
    else if (e.code === 'KeyZ') { boot(); randomize(); }
    else if (e.code === 'KeyM') toggleSolo();
    else done = false;
  }
  else if (S.keys.open && PIANO.includes(e.code)) { if (!e.repeat) noteOn(PIANO.indexOf(e.code)); }     // keyboard open: the letter keys are a piano
  else if (st >= 0) { if (S.keys.open) return; boot(); if (!e.repeat) setStep(S.sel, st, !scene().g[S.sel][st], true); }
  else if (e.code === 'KeyN') addScene(); else if (e.code === 'KeyL') toggleChain(); else if (e.code === 'KeyM') toggleMute();
  else if (e.code === 'KeyV') nextView(); else if (e.code === 'KeyX') toggleMixer(); else if (e.code === 'KeyC') toggleKeys(); else if (e.code === 'KeyP') fullScreen();
  else if (e.code === 'KeyB') { if (!e.repeat) { boot(); if (!playing) setPlaying(true); S.rep.on = true; repStart = null; } }
  else if (e.code === 'BracketLeft') setLast(S.last - 1); else if (e.code === 'BracketRight') setLast(S.last + 1);
  else done = false;
  if (done) e.preventDefault();
}
let warned = false;
const inView = () => { if (!conEl) return false; const r = conEl.getBoundingClientRect(); return r.top < innerHeight * .5 && r.bottom > innerHeight * .5; };

/* ---------- 7. phone app ---------- */
let sheetEl = null, scrimEl = null;
function closeSheet() { down.clear(); if (!S.keys.hold) held = []; if (sheetEl) { sheetEl.hidden = true; sheetEl.textContent = ''; scrimEl.hidden = true; meterEls = meterEls.filter(m => m.isConnected); } }
function openSheet(title, fill) {
  sheetEl.textContent = ''; const hd = h('div', 'sh-hd'), x = key('✕', closeSheet, 'x'), body = h('div', 'sh-body'); x.setAttribute('aria-label', 'Close'); hd.append(h('strong', '', title), x);
  sheetEl.append(hd, body); sheetEl.setAttribute('aria-label', title); sheetEl.hidden = false; scrimEl.hidden = false; fill(body); drawAll();
}
const SHEETS = {
  patterns: ["MATHEW'S PATTERNS", b => { b.append(styleKeys('three'), presetKeys(h('div', 'keys two')), h('span', 'cap', 'MY BEATS'), beatKeys(h('div', 'keys two'))); }],
  scenes: ['SCENES', b => { const t = h('div', 'keys three'); t.append(key('+ SCENE', addScene), chainKey(), key('DELETE', delScene)); b.append(sceneKeys(h('div', 'keys four')), t, h('span', 'cap', 'LAST STEP'), lastCtl(), h('p', 'note', 'Tap the key marked + to save this pattern to the next scene, then change it there. Each scene keeps its own mutes, filter, effects and mixer too, so a scene can be a breakdown or a drop. Chain plays the scenes one after another. A change waits for the bar line.')); }],
  master: ['MASTER', b => { const k = h('div', 'knobs1'); MASTER.forEach(([p, l]) => k.append(mkKnob(p, l))); const t = h('div', 'keys two'); const sgt = h('div', 'keys three'); sgt.append(...songKeys()); t.append(metroKey(), recKey(), themeKey(), key('MIDI · DAW', () => { closeSheet(); openSheet('MIDI · DAW · SMK-37', buildMidi); })); b.append(k, h('span', 'cap', 'SONG'), sgt, t, h('p', 'note', '● SONG records your whole set (scenes, mutes, knobs, keys) and ▶ SONG plays it back; WAV saves it as audio. CLICK is a metronome; it is never in a recording. REC records what you hear and saves a WAV when you press it again.')); }],
  mixer: ['MIXER', b => { const k = h('div', 'knobs1 mix'); SOUND.forEach(v => { const box = mkKnob('lvl.' + v, SHORT[v]), m = key('M', () => toggleMute(v), 'sw'); m.setAttribute('aria-label', 'Mute ' + NAME[v]); box.append(live(m, () => { m.classList.toggle('on', !S.mute[v]); m.textContent = S.mute[v] ? 'MUTED' : 'ON'; })); k.append(box); }); b.append(k); }],
  fx: ['EFFECTS', b => { const k = h('div', 'knobs1'); FXK.forEach(([p, l]) => k.append(fxKnob(p, l))); FXMORE.forEach(([p, l]) => k.append(mkKnob(p, l))); const r = h('div', 'repw'); r.append(holdKey(), repSeg()); b.append(k, r, h('span', 'cap', 'KILL'), killKeys(), h('span', 'cap', 'OUTPUT'), meter()); }],
  keys: ['KEYBOARD · ARP', b => { buildKeys(b, 13); }],
  menu: ['MD|442 · MD|187 · MD|888', b => {
    b.append(h('span', 'cap', 'MACHINE'), styleKeys('three'));
    const k = h('div', 'keys'), go = (t, href) => { const a = h('a', 'key next navk', t); a.href = href; return a; };
    k.append(key('CONNECT MIDI · ABLETON · MASCHINE · SMK-37', () => { closeSheet(); openSheet('MIDI · DAW · SMK-37', buildMidi); }, 'next'), go('DOWNLOAD · DESKTOP · ANDROID · FIRMWARE', '/md442/download/'), go('MD|442 HOME', '/md442/'), go("MATHEW'S DJ PAGE", '/mathew-dj/'), key('SHORTCUTS AND TIPS', () => { closeSheet(); openSheet('TIPS', tb => { tb.append(h('p', 'note', 'Tap a drum, then tap the steps. Drag a knob up or down; double-tap resets it. Double-tap a drum key to mute or unmute it (double-click on a computer). MUTE GROUP: hold it, tap several drums, DONE, then FLIP mutes them together on the next bar. Scenes keep their own mutes, filter, FX and mixer. IMPORT and EXPORT under My beats move beats between every MD|442 and the DAW plugin; MIDI ↓ saves a clip for your DAW.')); }); }));
    b.append(k, h('p', 'note', 'MD|442 · free · developed by Mathew · 442 is binary for NEST'));
  }],
  clear: ['CLEAR · UNDO', b => { b.append(key('UNDO THE LAST CHANGE', () => { undo(); closeSheet(); }, 'next')); const k = h('div', 'keys'), cd = key('', () => { clearDrum(); closeSheet(); }); live(cd, () => { cd.textContent = 'CLEAR ' + SHORT[S.sel]; }); k.append(cd, key('CLEAR SCENE', () => { clearScene(); closeSheet(); }), key('RANDOM BEAT', () => { randomize(); closeSheet(); })); b.append(k); }]
};
function buildPhone() {
  root.classList.add('md', 'phone');
  const hd = h('header', 'phd'), play = playKey(), lcd = h('button', 'lcd'), l1 = h('span', 'l1'), l2 = h('span', 'l2'), tp = h('span', 'tp'), txt = h('span', 'lt2'), logo = h('span', 'logo');
  txt.append(l1, l2); lcd.append(txt, tp); lcd.setAttribute('aria-label', "Mathew's patterns"); lcd.addEventListener('click', e => { boot(); if (e.target === tp) openSheet(...SHEETS.master); else openSheet(...SHEETS.patterns); });   // the number opens tempo, the name opens patterns logo.append('MD', h('b', '', '|442'));
  live(lcd, () => { const t = lcdText(); l1.textContent = t[0]; l2.textContent = t[1]; tp.textContent = Math.round(P.bpm); }, true);
  const menu = h('button', 'key menu'), lnum = h('b'); logo.append('MD', live(lnum, () => { lnum.textContent = '|' + S.style; })); menu.append(h('i', 'mi', '☰'), logo); menu.setAttribute('aria-label', 'Menu: MIDI and DAW help, downloads, other pages'); menu.addEventListener('click', () => openSheet(...SHEETS.menu));
  hd.append(play, lcd, menu);
  // the selected drum's knobs: its sound on the top row, its channel tools underneath. Nothing is hidden off to the side.
  const kn = h('div', 'pkn'), nm = h('div', 'pknm'), nt = h('span'), r1 = h('div', 'krow'), r2 = h('div', 'krow'); nm.append(nt); kn.append(nm, r1, r2); let shown = '';
  if (!hinted) {   /* the tips share the drum-name line, so nothing moves */
    hintEl = h('button', 'hint'); hintEl.setAttribute('aria-label', 'Tips: drag a knob up or down, double-tap it to reset, double-tap a drum key to mute it. Tap to close.');
    hintEl.append(h('span', '', 'DRAG KNOBS UP/DOWN · DOUBLE-TAP RESETS · DOUBLE-TAP DRUM = MUTE'), h('i', '', '✕')); hintEl.addEventListener('click', () => { hintOff(); buzz(6); });
    nm.append(hintEl); live(hintEl, () => { if (playing) hintOff(); });
  }
  live(kn, () => {
    nt.textContent = NAME[S.sel] + (S.mute[S.sel] ? ' · muted' : '');
    if (shown !== S.sel) { shown = S.sel; r1.textContent = ''; r2.textContent = ''; KN[S.sel].forEach(([k, l]) => r1.append(mkKnob(k, l))); if (S.sel !== 'AC') TOOLS(S.sel).forEach(([k, l]) => r2.append(mkKnob(k, l))); r2.style.visibility = S.sel === 'AC' ? 'hidden' : ''; }   // the row keeps its height, so nothing below jumps
  });
  const sw = h('div', 'pview'); sw.append(seg([['one', 'ONE DRUM'], ['all', 'WHOLE PATTERN']], () => S.view, setView, 'wide'));
  // overview of the whole pattern: look at it, or press and slide up and down on it to pick a drum
  const mid = h('div', 'pmid'), ov = h('div', 'pov'), side = h('div', 'pside'), ovRows = {}; ov.setAttribute('role', 'img'); ov.setAttribute('aria-label', 'Whole pattern overview. Slide to pick a drum.'); ovCols = [];
  KEYS.forEach(k => { const r = h('div', 'ovr'), cells = []; r.dataset.k = k; r.append(h('span', 'ovn', SHORT[k])); for (let i = 0; i < 16; i++) { const c = h('i', (i >> 2) & 1 ? 'alt' : ''); cells.push(c); r.append(c); } ovRows[k] = { r, cells }; ov.append(r); });
  const ovHead = h('div', 'ovh'); for (let i = 0; i < 16; i++) { const c = h('i'); ovCols.push(c); ovHead.append(c); } ov.append(ovHead);
  live(ov, () => { const sc = scene(); KEYS.forEach(k => { const o = ovRows[k]; o.r.classList.toggle('sel', k === S.sel); o.r.classList.toggle('mute', !!S.mute[k]); o.cells.forEach((c, i) => { c.classList.toggle('on', sc.g[k][i]); c.classList.toggle('out', i >= S.last); }); }); });
  const pick = e => { const el = document.elementFromPoint(e.clientX, e.clientY), r = el && el.closest ? el.closest('.ovr') : null; if (r && r.dataset.k !== S.sel) { select(r.dataset.k, false); buzz(4); } };
  let ovDown = false;
  ov.addEventListener('pointerdown', e => { boot(); ovDown = true; try { ov.setPointerCapture(e.pointerId); } catch (_) {} pick(e); });
  ov.addEventListener('pointermove', e => { if (ovDown) pick(e); }); const ovUp = () => { if (ovDown) { ovDown = false; if (!playing) hit(S.sel); } }; ov.addEventListener('pointerup', ovUp); ov.addEventListener('pointercancel', () => { ovDown = false; });
  const lastK = key('', () => setLast(S.last === 16 ? 8 : S.last === 8 ? 4 : 16)), mute = key('MUTE', () => toggleMute(), 'led');
  live(lastK, () => { lastK.textContent = 'LAST ' + S.last; lastK.setAttribute('aria-label', 'Last step ' + S.last + '. Tap for 16, 8 or 4.'); }); live(mute, () => { mute.classList.toggle('on', !!S.mute[S.sel]); mute.setAttribute('aria-pressed', !!S.mute[S.sel]); mute.setAttribute('aria-label', 'Mute ' + NAME[S.sel]); });
  side.append(chainKey(), lastK, mute, groupKey()); mid.append(ov, side);
  // WHOLE PATTERN view: every drum as a row you can paint
  const grid = h('div', 'steps'), gridw = h('div', 'pgrid'); gridw.append(grid); bindSteps(grid, () => true); live(grid, () => { if (S.view === 'all') buildSteps(grid, 'all'); else grid._shown = ''; });
  // scenes: the ones you have, then one key that saves the pattern as the next scene
  const scn = h('div', 'pscn'); let scSig = '';
  live(scn, () => {
    const sig = S.scenes.length + '|' + S.sc + '|' + pend; if (sig === scSig) return; scSig = sig; scn.textContent = '';
    S.scenes.forEach((_, n) => { const b = key(String(n + 1), () => { if (!learnAct('sc:' + n)) setScene(n); }, 'sc' + (n === S.sc ? ' sel' : '') + (pend === n ? ' pend' : '')); b.setAttribute('aria-label', 'Scene ' + (n + 1)); b.setAttribute('aria-pressed', n === S.sc); scn.append(b); });
    if (S.scenes.length < 8) { const add = key(S.scenes.length < 5 ? '+ SAVE AS SCENE ' + (S.scenes.length + 1) : '+ ' + (S.scenes.length + 1), addScene, 'next add'); add.setAttribute('aria-label', 'Save this pattern as scene ' + (S.scenes.length + 1)); scn.append(add); }
  });
  // drum keys sit directly above the steps: pick a drum, step it, without moving the hand
  const inst = h('div', 'pinst'); KEYS.forEach(k => inst.append(instKey(k)));
  const steps = h('div', 'steps'), wrap = h('div', 'pstepw'); wrap.append(steps); bindSteps(steps, () => false); live(steps, () => buildSteps(steps, 'one'));
  live(root, () => { root.classList.toggle('vall', S.view === 'all'); });
  const bar = h('nav', 'pbar'); [['scenes', 'SCENES'], ['master', 'MASTER'], ['mixer', 'MIXER'], ['fx', 'FX'], ['keys', 'KEYS'], ['clear', 'CLEAR']].forEach(([id, t]) => bar.append(key(t, () => openSheet(...SHEETS[id]))));
  scrimEl = h('div', 'scrim'); scrimEl.hidden = true; scrimEl.addEventListener('click', closeSheet); sheetEl = h('div', 'sheet'); sheetEl.hidden = true; sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'true');
  root.append(hd, kn, sw, mid, gridw, scn, inst, wrap, bar, scrimEl, sheetEl);
  // installed on Android: take the whole screen on the first touch
  const installed = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  if (installed) document.addEventListener('pointerup', () => { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); }, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.rep.on) { S.rep.on = false; repStart = null; } });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ---------- 7b. theme, desktop install, sign-up after the free minutes, MIDI controllers ---------- */
// THEME: dark (matte) or light (aluminium). One switch for the whole machine, remembered on this device.
const THEME_LS = 'md442-theme';
let theme = 'light'; try { theme = localStorage.getItem(THEME_LS) || root.dataset.themeDefault || 'light'; } catch (_) {}
function applyTheme() {
  root.dataset.theme = theme; root.dataset.style = S.style; document.documentElement.dataset.mdTheme = theme;
  const m = document.querySelector('meta[name="theme-color"]'); if (m && PHONE) m.content = theme === 'dark' ? '#202225' : '#dcdddf';
  if (PHONE) { document.documentElement.style.background = document.body.style.background = theme === 'dark' ? '#202225' : '#c9cbce'; }
}
function toggleTheme() { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_LS, theme); } catch (_) {} applyTheme(); drawAll(); }
const themeKey = () => { const b = key('', toggleTheme); return live(b, () => { b.textContent = theme === 'dark' ? 'LIGHT' : 'DARK'; b.setAttribute('aria-label', 'Switch to the ' + (theme === 'dark' ? 'light' : 'dark') + ' look'); }); };

// INSTALL: MD|442 installs as its own desktop app (own window, Dock or taskbar icon, works offline). Chrome and Edge offer a
// prompt; Safari and others need two clicks in a menu, so they get the exact steps instead.
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; document.documentElement.dataset.mdInstall = 'ready'; });
addEventListener('appinstalled', () => { installEvt = null; document.documentElement.dataset.mdInstall = 'done'; toast('MD|442 is installed. Open it from your Dock, taskbar or apps list.'); });
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
function dialog(title, fill) {
  const ov = h('div', 'dlg'), box = h('div', 'dlg-box'), x = key('✕', () => close(), 'x'), hd = h('div', 'dlg-hd'), body = h('div', 'dlg-body'); x.setAttribute('aria-label', 'Close');
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', title); hd.append(h('strong', '', title), x); box.append(hd, body); ov.append(box);
  const esc = e => { if (e.key === 'Tab' && ov.dataset.locked) { const f = [...ov.querySelectorAll('input, button')].filter(el => !el.hidden && !el.disabled), a = document.activeElement, i = f.indexOf(a); if (f.length && (i < 0 || (e.shiftKey ? i === 0 : i === f.length - 1))) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); } }   /* a locked dialog keeps the focus: Tab cannot reach the machine behind it */
    if (e.key === 'Escape' && !ov.dataset.locked) { e.stopPropagation(); close(); } };
  function close() { ov.remove(); document.removeEventListener('keydown', esc, true); }
  ov.addEventListener('pointerdown', e => { if (e.target === ov && !ov.dataset.locked) close(); }); document.addEventListener('keydown', esc, true);
  fill(body, close, ov); (fitEl && document.fullscreenElement === fitEl ? fitEl : root).append(ov); const f = ov.querySelector('input, button.go'); if (f) f.focus(); return { ov, close, x };
}
function install() {
  if (isInstalled()) return toast('You are already in the installed app.');
  if (installEvt) { const e = installEvt; installEvt = null; e.prompt(); return; }
  const ua = navigator.userAgent, safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua), ios = /iPhone|iPad|iPod/.test(ua), ff = /Firefox/.test(ua);
  dialog('Install MD|442', b => {
    const p = t => b.append(h('p', '', t));
    if (ios) { p('On iPhone or iPad: tap the Share button, then “Add to Home Screen”.'); }
    else if (safari) { p('In Safari on a Mac: open the File menu and choose “Add to Dock”. MD|442 then opens as its own app from the Dock.'); p('Needs macOS Sonoma (14) or newer. On older Macs, open this page in Chrome or Edge and press this button again.'); }
    else if (ff) { p('Firefox cannot install web apps. Open this page in Chrome or Edge and press this button again: it installs in one click.'); }
    else { p('Look for the install icon at the right end of the address bar (a small screen with an arrow), or open the browser menu and choose “Install MD|442” (in Chrome it is under “Cast, save and share”).'); p('If you do not see it, MD|442 may already be installed: check your apps list.'); }
    p('The installed app has its own window and icon and works offline.');
  });
}

// SIGN-UP: the website is free to play for a few minutes; after that it asks once for a name and an email, then never again
// on this device. Switched on only when the page names where sign-ups go (data-signup on the root element).
const SIGNUP_URL = root.dataset.signup || '', FREE_SECS = +(root.dataset.freeSecs || 180), SIGN_LS = 'md442-signed', USED_LS = 'md442-played';
let usedSecs = 0, signed = false, askOpen = false; try { usedSecs = +localStorage.getItem(USED_LS) || 0; signed = !!localStorage.getItem(SIGN_LS); } catch (_) {}
setInterval(() => {
  if (!playing || signed || !SIGNUP_URL || askOpen) return;
  usedSecs++; if (usedSecs % 5 === 0) { try { localStorage.setItem(USED_LS, usedSecs); } catch (_) {} }
  if (usedSecs >= FREE_SECS) askSignup();
}, 1000);
function askSignup() {
  if (askOpen || signed) return; askOpen = true; const was = playing; if (rec) recStop(); setPlaying(false);
  const d = dialog('Keep playing', (b, close, ov) => {
    ov.dataset.locked = '1';
    const form = h('form', 'su'), nm = h('input'), em = h('input'), go = h('button', 'key big go', 'KEEP PLAYING'), msg = h('p', 'su-msg'), lab = (t, inp) => { const l = h('label', 'su-l'); l.append(h('span', 'cap', t), inp); return l; };
    form.noValidate = true;                     // our own messages, in plain words
    nm.type = 'text'; nm.name = 'name'; nm.autocomplete = 'name'; nm.required = true; nm.maxLength = 80; nm.placeholder = 'Your name'; em.type = 'email'; em.name = 'email'; em.autocomplete = 'email'; em.required = true; em.maxLength = 120; em.placeholder = 'you@example.com'; go.type = 'submit'; msg.setAttribute('role', 'status');
    b.append(h('p', '', 'You have had ' + Math.round(FREE_SECS / 60) + ' minutes on MD|442. Tell Mathew who you are and it stays unlocked on this device. Your beat is safe.'));
    form.append(lab('NAME', nm), lab('EMAIL', em), go, msg, h('p', 'su-note', 'Your name and email go to Mathew (NEST Group), who may email you about MD|442 and his music. Nothing else is collected.'));
    let tries = 0;
    form.addEventListener('submit', async e => {
      e.preventDefault(); const name = nm.value.trim(), email = em.value.trim();
      if (name.length < 2) { msg.textContent = 'Add your name to carry on.'; nm.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'That email does not look right. Check it and try again.'; em.focus(); return; }
      go.disabled = true; msg.textContent = 'Sending…'; let ok = false;
      try { const r = await fetch(SIGNUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name, email, _subject: 'MD|442 sign-up: ' + name, source: location.host + location.pathname }) }); ok = r.ok && ((await r.json().catch(() => null)) || {}).success + '' !== 'false'; } catch (_) {}   /* FormSubmit can answer 200 with success "false" (form not activated yet) */
      if (!ok && ++tries < 2) { go.disabled = false; msg.textContent = 'That did not send. Check your connection and press Keep playing again.'; return; }
      // sent, or failed twice: either way the player is not locked out. An unsent sign-up is kept and retried on the next visit.
      try { localStorage.setItem(SIGN_LS, ok ? '1' : JSON.stringify({ name, email })); } catch (_) {}
      signed = true; askOpen = false; delete ov.dataset.locked; close(); toast(ok ? 'Thanks, ' + name.split(' ')[0] + '. MD|442 is unlocked.' : 'Unlocked. Your details will be sent next time you are online.'); if (was) setPlaying(true);
    });
    b.append(form);
  });
  d.x.hidden = true;
}
if (SIGNUP_URL) { try { const pendingSign = localStorage.getItem(SIGN_LS); if (pendingSign && pendingSign !== '1') { const v = JSON.parse(pendingSign); fetch(SIGNUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ _subject: 'MD|442 sign-up: ' + v.name, source: location.host + location.pathname }, v)) }).then(r => r.ok ? r.json().catch(() => null) : { success: 'false' }).then(j => { if ((j || {}).success + '' !== 'false') localStorage.setItem(SIGN_LS, '1'); }).catch(() => {}); } } catch (_) {} }

// MIDI: any controller the browser can see. Pads play the drums, keys play the bass or the stab, and any hardware knob or
// fader can be tied to any knob on screen with LEARN. Works over USB, and over Bluetooth once the computer has paired it.
const MIDI_LS = 'md442-midi';
const NOMIDI_DEV = /iPhone|iPad|iPod/.test(navigator.userAgent);
const NOMIDI = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ? 'iPhone and iPad browsers cannot use MIDI. Use a computer with Chrome or Edge, or an Android phone with Chrome.' : /Firefox/.test(navigator.userAgent) && /Android/.test(navigator.userAgent) ? 'Firefox on Android cannot use MIDI. Open MD|442 in Chrome to use a controller.' : 'This browser cannot use MIDI controllers. Use Chrome or Edge (desktop Firefox works too and asks you to allow it).';
const GM = { 35: 'BD', 36: 'BD', 37: 'RS', 38: 'SD', 40: 'SD', 39: 'CP', 41: 'LT', 43: 'LT', 45: 'MT', 47: 'MT', 48: 'HT', 50: 'HT', 42: 'CH', 44: 'CH', 46: 'OH', 49: 'CR', 57: 'CR', 51: 'RD', 59: 'RD', 53: 'RD' };
const midi = { on: false, access: null, names: [], learn: false, armP: null, armD: null, armA: null, cc: {}, note: {}, last: '', ck: [], ccHi: {}, synced: false };
// actions a pad or button can be learned to: a scene, a drum's mute, the mute group
const isAct = a => typeof a === 'string' && (a === 'wr' || a === 'grp' || a === 'play' || a === 'prev' || a === 'next' || /^(sc|m|vw):/.test(a));
function stepDrum(d) { const i = KEYS.indexOf(S.sel); select(KEYS[(i + d + KEYS.length) % KEYS.length]); lcdFlash(NAME[S.sel], 'Selected'); }
const actName = a => a === 'wr' ? 'SEQ REC (loop record)' : a === 'vw:fx' ? 'FX on the faders (FX)' : a === 'vw:keys' ? 'Keyboard mode (CHORD)' : a === 'vw:seq' ? 'Sequencer mode (SEQ)' : a === 'play' ? 'Play / stop' : a === 'prev' ? 'Previous drum' : a === 'next' ? 'Next drum' : a === 'grp' ? 'Mute group' : a.startsWith('sc:') ? 'Scene ' + (+a.slice(3) + 1) : a.startsWith('m:') ? 'Mute ' + (NAME[a.slice(2)] || '') : (NAME[a] || a);
function doAct(a) { if (a === 'wr') return toggleWrite(); if (a === 'vw:fx') return fxLayer(); if (a === 'vw:keys' || a === 'vw:seq') return eliteView(a === 'vw:keys'); if (a === 'play') { boot(); setPlaying(!playing); } else if (a === 'prev' || a === 'next') stepDrum(a === 'prev' ? -1 : 1); else if (a === 'grp') { if (mq.size) fireGroup(); else toast('Make a mute group first: hold MUTE GROUP and tap the drums.'); } else if (a.startsWith('sc:')) setScene(+a.slice(3)); else if (a.startsWith('m:') && KEYS.includes(a.slice(2))) toggleMute(a.slice(2)); }
function learnAct(a) { if (!midi.learn) return false; midi.armA = a; midi.armP = midi.armD = null; drawAll(); toast('LEARN: now press the pad or button for ' + actName(a)); return true; }
function clockTick(t) { midi.lastCk = performance.now(); const c = midi.ck; c.push(t); if (c.length > 25) c.shift(); if (c.length < 25 || (midi.ckN = (midi.ckN || 0) + 1) % 24) return; const bpm = 60000 / ((c[24] - c[0]) / 24 * 24); if (bpm >= DEF.bpm.mn && bpm <= DEF.bpm.mx) { if (!midi.synced) { midi.synced = true; drawAll(); } if (Math.abs(bpm - P.bpm) > .6) set('bpm', Math.round(bpm), true); } }
// built-in map for Mathew's M-VAVE SMK-37 Elite: knobs on channel 1, two pads for the bass and the stab. Used only while nothing has been learned.
const MIDI_DEF = { cc: { '1:20': 'bd.decay', '1:21': 'sd.snappy', '1:22': 'ch.decay', '1:23': 'hh.tone', '1:24': 'bs.cutoff', '1:25': 'bs.reso', '1:26': 'bs.acid', '1:27': 'st.tone', '1:28': 'fx.filter', '1:29': 'fx.verb', '1:30': 'fx.efb', '1:31': 'vol',
  '1:40': 'lvl.BD', '1:41': 'lvl.SD', '1:42': 'lvl.CP', '1:43': 'lvl.CH', '1:44': 'lvl.OH', '1:45': 'lvl.BS', '1:46': 'lvl.ST', '1:47': 'fx.drive', '1:48': 'shuffle', '1:49': 'fx.space', '1:50': 'accent', '1:51': 'fx.etime' }, note: { '10:62': 'BS', '10:63': 'ST' } };
const midiMap = () => (Object.keys(midi.cc).length || Object.keys(midi.note).length ? midi : MIDI_DEF);
try { const m = JSON.parse(localStorage.getItem(MIDI_LS) || '{}'); if (m && m.cc) midi.cc = m.cc; if (m && m.note) midi.note = m.note; if (m && m.cko) midi.cko = true; if (m && Array.isArray(m.pads) && m.pads.length) midi.pads = m.pads; if (m && m.lights === false) midi.lights = false; } catch (_) {}
const midiKeep = () => { try { localStorage.setItem(MIDI_LS, JSON.stringify({ cc: midi.cc, note: midi.note, cko: !!midi.cko, pads: midi.pads, lights: midi.lights !== false })); } catch (_) {} };
function midiHit(k, v) { if (!SOUND.includes(k)) return; sgEv('h', k, v); if (off(k)) return; boot(); const g = .35 + .65 * (v / 127), go = () => voice(E, k, ac.currentTime + .005, 0, g); if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => {}); flashKey(k); if (writing()) writeNote(0, k); }
// started by the keyboard or a DAW: follow it, and send it nothing back (no second Start, no clock of our own)
function follow() { if (playing) return; boot(); midi.ext = true; setPlaying(true); if (!playing) midi.ext = false; }
function onMidi(e) {
  const d = e.data; if (!d || !d.length) return; const st = d[0];
  if (st === 0xF8) { clockTick(e.timeStamp || performance.now()); return; }
  if (st === 0xFA || st === 0xFB) { follow(); return; } if (st === 0xFC) { setPlaying(false); return; }
  if (st === 0xF0 && d[1] === 0x7F && d[3] === 0x06) { const c = d[4]; midi.last = 'MMC ' + c; if (c === 2 || c === 3) follow(); else if (c === 1 || c === 9) setPlaying(false); else if (c === 6 && !S.keys.rec) toggleWrite(); else if (c === 7 && S.keys.rec) toggleWrite(); return; }   // MMC record in / out: SEQ REC
  if (st >= 0xF0) return;
  const type = st & 0xF0, ch = (st & 15) + 1, a = d[1], b = d[2] || 0;
  if (type === 0x90 && b > 0) {
    const id = ch + ':' + a; midi.last = 'note ' + a + ' ch ' + ch;
    if (padLearnTake(id)) return;
    if (midi.learn && midi.armA) { midi.note[id] = midi.armA; midiKeep(); toast('Pad (note ' + a + ') now does: ' + actName(midi.armA)); midi.armA = null; drawAll(); return; }
    if (midi.learn && midi.armD) { midi.note[id] = midi.armD; midiKeep(); toast('Pad (note ' + a + ') now plays ' + NAME[midi.armD]); midi.armD = null; drawAll(); return; }
    if (padStep(id)) return;                                              // SEQ view: the Elite's pads are the selected drum's 16 steps
    const k = midiMap().note[id] || (ch === 10 ? GM[a] : null);
    if (isAct(k)) doAct(k); else if (k) midiHit(k, b); else { boot(); noteOn(clamp(a - 40, 0, 36)); }        // everything else is the keyboard: E below middle C's octave is the root
  } else if (type === 0x80 || (type === 0x90 && b === 0)) { padUp(ch + ':' + a); noteOff(clamp(a - 40, 0, 36)); }
  else if (type === 0xC0) {                                                // some buttons send a program change: learnable like a pad
    const id = 'pc' + ch + ':' + a; midi.last = 'program ' + a + ' ch ' + ch;
    if (midi.learn && midi.armA) { midi.note[id] = midi.armA; midiKeep(); toast('Button (program ' + a + ') now does: ' + actName(midi.armA)); midi.armA = null; drawAll(); return; }
    const k = midi.note[id]; if (isAct(k)) doAct(k);
  }
  else if (type === 0xB0) {
    const id = ch + ':' + a; midi.last = 'CC ' + a + ' ch ' + ch;
    if (midi.learn && midi.armA && b > 63) { midi.cc[id] = midi.armA; midiKeep(); toast('Button (CC ' + a + ') now does: ' + actName(midi.armA)); midi.armA = null; drawAll(); return; }
    if (midi.learn && midi.armP) { midi.cc[id] = midi.armP; midiKeep(); toast('Control ' + a + ' now turns ' + DEF[midi.armP].lb); midi.armP = null; drawAll(); return; }
    const k = midiMap().cc[id]; if (k === 'vw:fx') { const hi = b > 63; if (hi && !midi.ccHi[id]) { midi.fxT = performance.now(); fxLayer(); } else if (!hi && midi.ccHi[id] && midi.fxl && performance.now() - midi.fxT > 400) fxLayer(); midi.ccHi[id] = hi; return; }   // a latching FX button sends on then off; a held one is FX while held
    if (isAct(k)) { const hi = b > 63; if (hi && !midi.ccHi[id]) doAct(k); midi.ccHi[id] = hi; return; } const kk = fxOf(k); if (kk && DEF[kk]) { midi.busy = true; set(kk, toVal(kk, b / 127)); midi.busy = false; }
  }
}
/* ELITE FOLLOWS THE SCREEN. The laptop is the main surface; the SMK-37 Elite (stock M-VAVE firmware, nothing on it is changed)
   follows whatever view is open:
   - Pads 1-16 are always the selected drum's 16 steps: tap one to turn its step on or off, like a step on screen. Pick another
     drum on screen (or with a learned < >) and the pads follow it. While SEQ REC records, the pads play the drums into the loop.
   - Keys always play the selected instrument (bass, stab or sampler), never steps.
   Pad lights: only plain note-on / note-off messages go back, only to an output named SMK-37 / M-VAVE, on the pad's own note and
   channel. No SysEx, no CC, no settings. If the stock firmware ignores them nothing happens; turn PAD LIGHTS off in the MIDI panel. */
const PADS_DEF = Array.from({ length: 16 }, (_, i) => '10:' + (36 + i));      // the setup guide's stock layout: 16 pads, channel 10, notes 36-51
const padIds = () => (midi.pads && midi.pads.length ? midi.pads : PADS_DEF);
const eliteMode = () => 'seq';                                                // as on MD firmware 1.6: the pads are always the steps (drums from the pads only while SEQ REC records)
const eliteOuts = () => (midi.access ? [...midi.access.outputs.values()].filter(o => /smk|m-?vave/i.test(o.name || '') && !(kbx.out && o.name === kbx.out.name)) : []);   // never to a keyboard that answered as MD firmware: there a note plays a drum
function padStep(id) {
  if (midi.learn || eliteMode() !== 'seq' || writing()) return false;   // WRITE recording: pads play the drums into the loop
  if (isAct(midiMap().note[id])) return false;                               // a pad learned as PLAY, a scene or a mute keeps doing that
  const i = padIds().indexOf(id); if (i < 0 || i > 15) return false;
  boot(); setStep(S.sel, i, !scene().g[S.sel][i], true); elite.force = true; return true;
}
function padUp(id) { if (padIds().includes(id)) { clearTimeout(elite.upT); elite.upT = setTimeout(() => { elite.force = true; }, 40); } }   // the pad's own light goes out on release: put ours back
// CHORD and SEQ on the Elite: once learned (MIDI panel: CHORD BUTTON, SEQ BUTTON), CHORD opens the keyboard for the selected
// instrument (bass, stab or sampler; a drum keeps the last one) and SEQ closes it, so the pads are steps again.
// FX on the Elite: once FX BUTTON is learned, FX on turns the faders (every control set to a track level) into the global
// effects, FX off puts them back on the track levels. Knobs are not changed.
const FXL = { 'lvl.BD': 'fx.verb', 'lvl.SD': 'fx.space', 'lvl.CP': 'fx.drive', 'lvl.CH': 'fx.filter', 'lvl.OH': 'fx.vdec', 'lvl.BS': 'fx.etime', 'lvl.ST': 'fx.efb' };   // same order as MD firmware 1.6: REVERB, DELAY, DRIVE, FILTER, then the rest
const fxOf = k => (midi.fxl && typeof k === 'string' && k.startsWith('lvl.') ? FXL[k] || 'vol' : k);
function fxLayer() { midi.fxl = !midi.fxl; drawAll(); lcdFlash('SMK-37 faders', midi.fxl ? 'Global FX' : 'Track levels'); }
function eliteView(keys) {
  if (keys && ['BS', 'ST', 'SM'].includes(S.sel) && S.keys.target !== S.sel) S.keys.target = S.sel;
  if (!!S.keys.open !== keys) toggleKeys(); else drawAll();
  lcdFlash('SMK-37', keys ? 'Keys: ' + (NAME[S.keys.target] || 'bass') : 'Pads: ' + SHORT[S.sel] + ' steps');
}
function learnView(a) { if (!midi.learn) { midi.learn = true; midi.armP = midi.armD = null; if (!midi.access) midiConnect(); } midi.armA = a; drawAll(); toast('Now press ' + (a === 'play' ? 'SEQ PLAY' : a === 'wr' ? 'SEQ REC' : a === 'vw:keys' ? 'CHORD' : a === 'vw:fx' ? 'FX' : 'SEQ') + ' on the Elite. If nothing happens, that button sends no MIDI on stock firmware: use any free pad or button instead.'); }
function padLearn() {
  if (midi.padLearn) { midi.padLearn = null; drawAll(); return toast('Pad setup cancelled. Pads use ' + (midi.pads ? 'your saved order' : 'channel 10, notes 36-51') + '.'); }
  if (!midi.access) midiConnect(); midi.padLearn = []; drawAll(); toast('PADS: hit the Elite\'s pads 1 to 16 in order (switch pad bank half way if you need to).');
}
function padLearnTake(id) {
  const L = midi.padLearn; if (!L) return false; if (!L.includes(id)) L.push(id);
  if (L.length >= 16) { midi.pads = L.slice(0, 16); midi.padLearn = null; midiKeep(); elite.force = true; toast('Pads saved: in the sequencer they are steps 1 to 16'); }
  else lcdFlash('SMK-37 pads', 'Pad ' + (L.length + 1) + ' of 16');
  drawAll(); return true;
}
const elite = { lit: {}, mode: '', sel: '', force: true, upT: 0 };
function eliteSend(outs, id, on) { const [c, n] = id.split(':').map(Number); if (!(c >= 1 && c <= 16 && n >= 0 && n < 128)) return; const m = on ? [0x8F + c, n, 127] : [0x8F + c, n, 0]; outs.forEach(o => { try { o.send(m); } catch (_) {} }); }
function eliteDark(outs) { Object.keys(elite.lit).forEach(id => { if (elite.lit[id]) eliteSend(outs, id, false); }); elite.lit = {}; }
function eliteTick() {
  if (!midi.access || !midi.names.length) return;
  const mode = eliteMode(), outs = midi.lights === false ? [] : eliteOuts();
  if (mode !== elite.mode || S.sel !== elite.sel) {
    if (elite.mode && mode !== elite.mode) lcdFlash('SMK-37', mode === 'seq' ? 'Pads: ' + SHORT[S.sel] + ' steps' : 'Pads play drums');
    elite.mode = mode; elite.sel = S.sel; elite.force = true; drawLite();
  }
  if (!outs.length) return;
  if (mode !== 'seq') { if (elite.force) { eliteDark(outs); elite.force = false; } return; }
  const g = scene().g[S.sel], ids = padIds(), want = {};
  for (let i = 0; i < 16 && i < ids.length; i++) { const on = !!g[i], ph = playing && i === head && i < S.last; want[ids[i]] = ph ? !on : on; }   // the step that is playing flips, so the run is visible
  Object.keys(want).forEach(id => { if (elite.force || !!elite.lit[id] !== want[id]) { eliteSend(outs, id, want[id]); elite.lit[id] = want[id]; } });
  Object.keys(elite.lit).forEach(id => { if (!(id in want)) { if (elite.lit[id]) eliteSend(outs, id, false); delete elite.lit[id]; } });
  elite.force = false;
}
setInterval(eliteTick, 30);
function togglePadLights() { midi.lights = midi.lights === false; midiKeep(); if (midi.lights === false) eliteDark(eliteOuts()); else elite.force = true; drawAll(); toast(midi.lights !== false ? 'Pad lights on: the Elite shows the steps (if its firmware lights pads from MIDI)' : 'Pad lights off: nothing is sent back to the Elite'); }
function midiScan() { const acc = midi.access; if (!acc) return; const was = midi.names.slice(); midi.names = []; acc.inputs.forEach(inp => { inp.onmidimessage = onMidi; midi.names.push(inp.name || 'MIDI device'); }); midi.on = true; elite.force = true;
  const add = midi.names.filter(n => !was.includes(n)), gone = was.filter(n => !midi.names.includes(n));
  if (midi.scanned && add.length) toast('Connected: ' + add.join(', ')); else if (midi.scanned && gone.length) toast('Unplugged: ' + gone.join(', ') + (/smk|m-?vave/i.test(gone.join(' ')) ? '. It runs on its own firmware again.' : ''));
  midi.scanned = true; drawAll(); kbAuto(); }
// an MD keyboard plugged in: put this beat on it (patterns 9+) and keep LIVE on it, so both play the same beat from one PLAY. Once per plug-in.
function kbAuto() {
  const outs = midi.access ? [...midi.access.outputs.values()].filter(o => o.state !== 'disconnected' && isKb(o)) : [];
  if (kbx.out && kbx.out.state === 'disconnected') kbx.out = null;
  if (!outs.length) { kbx.auto = false; return; }
  if (kbx.auto || !kbx.live || kbx.out) return;
  kbx.auto = true; setTimeout(() => sendToKeyboard(true), 300);
}
async function midiConnect(quiet) {
  if (!navigator.requestMIDIAccess) { if (quiet !== true) toast(NOMIDI); return false; }
  if (midi.access) { midiScan(); return true; }
  if (midi.asking) return midi.asking;                                       // the auto-connects and CONNECT never ask twice at once
  midi.asking = midiAsk(quiet).finally(() => { midi.asking = null; }); return midi.asking;
}
async function midiAsk(quiet) {
  try { midi.access = await navigator.requestMIDIAccess({ sysex: true }).catch(() => navigator.requestMIDIAccess()); midi.access.addEventListener('statechange', midiScan); midiScan(); try { localStorage.setItem(MIDI_LS + '-auto', '1'); } catch (_) {} if (quiet !== true) toast(midi.names.length ? 'MIDI: ' + midi.names.join(', ') : 'MIDI is on. Plug in or pair a controller and it will appear.'); return true; }
  catch (_) { if (quiet !== true) toast('MIDI was not allowed. Allow it in the browser to use a controller.'); return false; }
}
// AUTO-CONNECT: once MIDI has been allowed (or CONNECT pressed once), MD|442 connects by itself on every load, and a keyboard
// plugged in later appears on its own (no CONNECT). Unplugged, the SMK-37 just runs its own firmware.
setTimeout(async () => {
  if (!navigator.requestMIDIAccess || NOMIDI_DEV) return;
  let ok = false; try { ok = localStorage.getItem(MIDI_LS + '-auto') === '1'; } catch (_) {}
  try { if (navigator.permissions) { const st = await navigator.permissions.query({ name: 'midi', sysex: true }); if (st.state === 'granted') ok = true; else if (st.state === 'denied') ok = false; } } catch (_) {}
  if (ok) midiConnect(true);
}, 300);
function toggleMidi() { S.midiOpen = !S.midiOpen; if (S.midiOpen && !midi.access) midiConnect(); drawAll(); persist(); }
function midiLearn() { midi.learn = !midi.learn; midi.armP = midi.armD = midi.armA = null; if (midi.learn && !midi.access) midiConnect(); drawAll(); if (midi.learn) toast('LEARN: touch a knob, a drum, a scene, MUTE or MUTE GROUP on screen, then move the control or hit the pad on your controller.'); }

// CONNECT GUIDE: short, exact steps for Mathew's gear (SMK-37, Ableton, Maschine) and for phones
const GUIDE = [
  ['SMK-37', [
    'Plug the SMK-37 in with USB, press CONNECT above and allow MIDI. Chrome or Edge work best.',
    'Keys play the bass, or the stab (choose in KEYS). Pads play the drums when they send on MIDI channel 10: 36 kick, 38 snare, 39 clap, 42 and 46 hats.',
    'The Elite works like MD firmware: pads 1-16 are always the selected drum\'s steps (tap to turn them on or off; they light when the firmware lights pads from MIDI), keys always play the instrument. While SEQ REC records, the pads play the drums into the loop. Pads not on channel 10, notes 36-51? Press SET PADS and hit them 1 to 16.',
    'CHORD, SEQ and FX on the Elite: press CHORD BUTTON, SEQ BUTTON or FX BUTTON in this panel, then that button on the Elite. CHORD then opens the keyboard for the selected instrument, SEQ goes back to the steps, FX puts the global effects on the faders (off: track levels). A button that sends no MIDI on stock firmware cannot be learned: use a free pad or button instead.',
    'To set the pads that way, open the M-VAVE editor, set the pads to channel 10 and notes 36 to 51, send it to the keyboard, then close the editor.',
    'Running MD|442 firmware 1.1 on the keyboard? Press SEND TO KEYBOARD to copy this beat\'s scenes onto it (patterns 9 to 16). Saving a beat sends it again automatically.',
    'Or press LEARN, touch anything here (a knob, a drum, a scene, MUTE or MUTE GROUP) and press the pad or turn the knob. Mappings stay on this device.',
    'Sync with an M-VAVE FM-1 (or any box with MIDI in): plug it in with USB, press CONNECT, then CLOCK OUT. It follows MD|442\'s tempo, start and stop. To have MD|442 follow the FM-1 instead, leave CLOCK OUT off and let the FM-1 send clock.',
    'Windows lets only one app use the keyboard at a time. Close the M-VAVE editor and your DAW first, or the SMK-37 will not appear here.',
    ['Want MD|442 inside the keyboard itself? Install the firmware', '/md442/install.html']]],
  ['ABLETON', [
    'Mac: open Audio MIDI Setup, Window, Show MIDI Studio, double-click IAC Driver and tick "Device is online". Windows: install the free loopMIDI and add a port.',
    'In Live: Settings, Link Tempo MIDI. Under MIDI Ports, set Sync to On for the IAC Driver (or loopMIDI) output.',
    'Press CONNECT here. Press play in Live: MD|442 starts with it and follows its tempo.',
    'To get the sound into Live, press REC here, play, press REC again and drag the WAV onto a track. To record it live, route your computer audio into Live with BlackHole (Mac) or VB-CABLE (Windows).',
    'Your SMK-37 can play MD|442 and Live together on a Mac. In Live, MIDI Ports: Track On for the SMK-37.',
    'To get the beat into Live as notes, press MIDI ↓ under MY BEATS and drop the .mid file on a track (in Chrome or Edge you can drag the key straight onto it). Drums are on channel 1 from C1, bass on 2, stab on 3, the sampler slices on notes 49 to 56 (the plugin slice pads), so it plays the MD|442 plugin or a Drum Rack.']],
  ['MASCHINE', [
    'Turn on the IAC Driver (Mac) or a loopMIDI port (Windows), as in the Ableton steps.',
    'In Maschine: Preferences, MIDI, Output: enable the IAC Driver. Then File, Sync: Send MIDI Clock.',
    'Press CONNECT here and press play in Maschine. MD|442 starts with it and follows its tempo.',
    'To play MD|442 from the Mikro MK3 pads, press SHIFT + PROJECT on the Mikro to switch it to MIDI mode. Its pads then show up here: press LEARN to give each pad a drum, a scene or a mute. SHIFT + PROJECT again goes back to Maschine.']],
  ['PHONE', [
    'iPhone: the phone app plays with the silent switch on. Turn the volume up. iPhone browsers cannot use MIDI.',
    'Android: Chrome can use a USB keyboard such as the SMK-37 through a USB-C adapter. Plug it in, open MIDI and press CONNECT.',
    'Firefox on Android cannot use MIDI. Use Chrome for controllers; everything else works in Firefox.',
    ['Install the app on your phone', '/md442/download/#phone']]],
  ['BEATS', [
    'Every MD|442 reads the same beat file: this page, the phone app, the desktop app and the DAW plugin.',
    'EXPORT (under MY BEATS) saves the beat on screen as a .md442.json file, with all its scenes, sounds and each scene\'s mutes and mix.',
    'IMPORT opens one or more .md442.json files, from the plugin or another device, into MY BEATS and loads the first one. Up to 8 beats fit.',
    'In the plugin, EXPORT saves to Documents/MD-442/Beats and IMPORT opens from there. On a phone, send the file to yourself (AirDrop, email, Drive) and import it from Files.',
    'MIDI ↓ saves the beat as a MIDI clip, every scene in order, for Ableton, Maschine or any DAW.',
    ['Get the plugin', '/md442/download/#plugin']]]
];
function guide() {
  const box = h('div', 'guide'), tabs = h('div', 'seg gtabs'), body = h('ol', 'gsteps'); let on = /iPhone|iPad|Android/.test(navigator.userAgent) ? 3 : 0;
  const show = () => { body.textContent = ''; [...tabs.children].forEach((b, j) => { b.classList.toggle('on', j === on); b.setAttribute('aria-pressed', j === on); }); GUIDE[on][1].forEach(s => { const li = h('li'); if (Array.isArray(s)) { const a = h('a', '', s[0] + ' →'); a.href = s[1]; li.append(a); } else li.textContent = s; body.append(li); }); };
  GUIDE.forEach(([t], j) => tabs.append(key(t, () => { on = j; show(); })));
  box.append(h('span', 'cap', 'HOW TO CONNECT'), tabs, body); show(); return box;
}
// SEND TO KEYBOARD: MD|442 → keyboard
// Sends this beat's scenes to an SMK-37 / FM-1 running MD|442 firmware 1.1+, over USB-MIDI SysEx, no reflash.
// Scene 1..8 → keyboard patterns 9..16 (patterns 1-7 keep Mathew's factory beats). Firmware cmd 50 (see firmware/src/app/editor.c).
// Saving a beat (saveBeat) sends it automatically when an MD|442 keyboard has answered once this session.
const KB_ROWS = ['BD', 'SD', 'LT', 'MT', 'HT', 'RS', 'CP', 'CH', 'OH', 'CR', 'RD', 'AC', 'BS'];   // firmware drum909.h order, then accent, bass
const kbx = { sx: null, outs: [], ok: false, wait: null, out: null, live: true, lastF: '', lastM: '' };
try { kbx.live = localStorage.getItem('md442-kblive') !== '0'; } catch (_) {}
// LIVE: once a keyboard has answered, every change to the scene on screen (steps, accents, bass, tempo, swing, scene switch)
// is written into its pattern 9+ and cued there, and drum mutes follow. Checked every 150 ms, sent only when something changed.
const KB_DRUMS = KB_ROWS.slice(0, 11);
function kbMuteMask() { let m = 0; KB_DRUMS.forEach((k, i) => { if (S.mute[k] || (S.solo && S.solo !== k)) m |= 1 << i; }); return m; }
setInterval(() => {
  if (!kbx.live || !kbx.out || !S.scenes || !S.scenes[S.sc] || S.sc > 7) return;
  try {
    const f = kbFrame(0x20 | (8 + S.sc), S.scenes[S.sc]), fb = kbBreak(0x20 | (8 + S.sc), S.scenes[S.sc]), fs = f.join(',') + '|' + fb.join(',');
    if (fs !== kbx.lastF) { kbx.lastF = fs; kbx.out.send(f); kbx.out.send(fb); }
    const m = kbMuteMask(), ms = String(m);
    if (ms !== kbx.lastM) { kbx.lastM = ms; kbx.out.send([0xF0, 0x7D, 0x46, 0x4C, 51, m & 0x7F, (m >> 7) & 0x0F, 0xF7]); }
  } catch (_) { kbx.out = null; }
}, 150);
function kbLive() {
  kbx.live = !kbx.live; try { localStorage.setItem('md442-kblive', kbx.live ? '1' : '0'); } catch (_) {}
  kbx.lastF = kbx.lastM = ''; drawAll();
  if (kbx.live && !kbx.out) sendToKeyboard(false).then(() => { if (kbx.out) toast('LIVE: the keyboard now follows this scene and its mutes.'); });
  else toast(kbx.live ? 'LIVE: the keyboard follows this scene and its mutes.' : 'LIVE off: the keyboard keeps its own patterns.');
}
const kbBits = row => { let m = 0; row.forEach((on, i) => { if (on) m |= 1 << i; }); return [m & 127, (m >> 7) & 127, (m >> 14) & 3]; };
function kbFrame(slot, sc) {
  const bpm = Math.round(P.bpm), sw = clamp(Math.round((P.shuffle - 50) / 25 * 100), 0, 100), root = 40 + Math.round(P.key), acid = Math.round(P['bs.acid'] || 0);
  const f = [0xF0, 0x7D, 0x46, 0x4C, 50, slot, bpm & 127, bpm >> 7, sw, root, acid];
  KB_ROWS.forEach(k => f.push(...kbBits(sc.g[k] || Array(16).fill(false))));
  sc.n.forEach(n => f.push(clamp(Math.round(n) + 64, 0, 127)));
  f.push(0xF7); return f;
}
// MD|187 / MD|888 firmware (cmd 52): the SAMPLE row as the keyboard's break track, which bank slot, the chop, and (MD|187) the kick on the 808.
// Sent after cmd 50 for the same slot, without waiting for an answer: firmware without it simply ignores it.
//   F0 7D 46 4C 52 slot brk_slot complex steps[3 x 7 bits] slices[16] flags F7
function kbBreak(slot, sc) {
  const f = [0xF0, 0x7D, 0x46, 0x4C, 52, slot, Math.round(P['sm.bank']) % 4, clamp(Math.round(P['sm.chop']), 0, 100), ...kbBits(sc.g.SM || Array(16).fill(false))];
  for (let i = 0; i < 16; i++) f.push(sc.g.SM && sc.g.SM[i] ? clamp(sc.sl ? sc.sl[i] | 0 : 0, 0, 8) : 0);
  f.push(S.style === '187' ? 1 : 0, 0xF7); return f;
}
function kbIn(e) {
  const d = e.data; if (!d || d[0] !== 0xF0 || d[1] !== 0x7D || d[2] !== 0x46 || d[3] !== 0x4C) return;
  if (d[4] === 50 && kbx.wait) { const w = kbx.wait; kbx.wait = null; w(d[6] === 0); }
  if (d[4] === 25 && d.length >= 8) { const v = String((d[6] << 7) | d[7]); if (STYLES[v]) { kbx.variant = v; if (v !== S.style) toast('This keyboard runs ' + STYLES[v].name + ' firmware: the beat plays there with the ' + STYLES[v].name + ' sounds and sample bank.'); } }   // PING: which firmware the keyboard runs (MD|187 / MD|888 builds 1.3+)
}
async function kbAccess() {
  if (kbx.sx) return true;
  if (!navigator.requestMIDIAccess) { toast('Sending to the keyboard needs Chrome or Edge.'); return false; }
  try { kbx.sx = await navigator.requestMIDIAccess({ sysex: true }); } catch (_) { toast('Allow MIDI (with SysEx) in the browser to send beats to the keyboard.'); return false; }
  const scan = () => { kbx.outs = []; kbx.sx.outputs.forEach(o => kbx.outs.push(o)); kbx.sx.inputs.forEach(i => i.addEventListener('midimessage', kbIn)); };
  kbx.sx.addEventListener('statechange', scan); scan();
  if (!midi.access) { midi.access = kbx.sx; midi.access.addEventListener('statechange', midiScan); midiScan(); }   // the keyboard's PLAY/STOP and clock reach the page too: one transport
  return true;
}
const kbAsk = (out, f) => new Promise(res => { kbx.wait = res; try { out.send(f); } catch (_) { kbx.wait = null; res(false); } setTimeout(() => { if (kbx.wait === res) { kbx.wait = null; res(false); } }, 1500); });
async function sendToKeyboard(quiet) {
  if (!(await kbAccess())) return;
  kbx.out = null;                                   // LIVE pauses while the scenes go over, so its replies don't mix in
  const scenes = S.scenes.slice(0, 8);
  for (const out of kbx.outs) {                     // the first output that answers is the keyboard
    if (!(await kbAsk(out, kbFrame(8, scenes[0])))) continue;
    try { out.send(kbBreak(8, scenes[0])); } catch (_) {}
    for (let i = 1; i < scenes.length; i++) { await kbAsk(out, kbFrame(8 + i, scenes[i])); try { out.send(kbBreak(8 + i, scenes[i])); } catch (_) {} }
    kbx.ok = true; kbx.out = out; kbx.lastF = kbx.lastM = ''; drawAll();
    setTimeout(() => { try { out.send([0xF0, 0x7D, 0x46, 0x4C, 25, 0xF7]); } catch (_) {} }, 2400);   // ask which machine it is, after the toast below has been read
    toast('Sent to ' + (out.name || 'the keyboard') + ': ' + scenes.length + (scenes.length > 1 ? ' scenes on patterns 9–' + (8 + scenes.length) : ' scene on pattern 9') + '. The dub stab stays on the computer' + (S.style === '442' ? '.' : '; the SAMPLE row plays the keyboard\'s own ' + STYLES[S.style].name + ' bank.'));
    return;
  }
  if (!quiet) toast('No MD|442 keyboard answered. Connect it by USB and check it runs MD|442 firmware 1.1 or newer.');
}
function buildMidi(box) {
  const stat = h('p', 'mstat'), row = h('div', 'kctl'), list = h('div', 'mlist'), lk = key('LEARN', midiLearn, 'led'), ck = key('CLEAR MAPPINGS', () => { midi.cc = {}; midi.note = {}; midiKeep(); drawAll(); toast('MIDI mappings cleared'); }), con = key('CONNECT', midiConnect), sk = key('SEND TO KEYBOARD', () => sendToKeyboard(false)), pk = key('SET PADS', padLearn, 'led'), vk = key('CHORD BUTTON', () => learnView('vw:keys'), 'led'), vs = key('SEQ BUTTON', () => learnView('vw:seq'), 'led'), vf = key('FX BUTTON', () => learnView('vw:fx'), 'led'), vp = key('SEQ PLAY BUTTON', () => learnView('play'), 'led'), vr = key('SEQ REC BUTTON', () => learnView('wr'), 'led'), pl = key('PAD LIGHTS', togglePadLights, 'led'), lv = key('LIVE', kbLive, 'led'), cko = key('CLOCK OUT', () => { midi.cko = !midi.cko; midiKeep(); if (midi.cko && !midi.access) midiConnect(); if (!midi.cko) clockStop(); drawAll(); toast(midi.cko ? 'Clock out on: MIDI devices follow MD|442\'s tempo, start and stop' : 'Clock out off'); }, 'led');
  live(cko, () => { cko.classList.toggle('on', !!midi.cko); cko.setAttribute('aria-pressed', !!midi.cko); });
  const dp = key('◀ DRUM', () => { if (!learnAct('prev')) stepDrum(-1); }), dn = key('DRUM ▶', () => { if (!learnAct('next')) stepDrum(1); });
  live(lv, () => { lv.classList.toggle('on', !!(kbx.live && kbx.out)); lv.setAttribute('aria-pressed', !!(kbx.live && kbx.out)); });
  live(pk, () => { pk.classList.toggle('on', !!midi.padLearn); pk.textContent = midi.padLearn ? 'PADS ' + midi.padLearn.length + '/16 · CANCEL' : 'SET PADS'; }); live(pl, () => { pl.classList.toggle('on', midi.lights !== false); pl.setAttribute('aria-pressed', midi.lights !== false); });
  const vwOn = a => Object.values(midi.cc).concat(Object.values(midi.note)).includes(a); [[vp, 'play'], [vr, 'wr'], [vk, 'vw:keys'], [vs, 'vw:seq'], [vf, 'vw:fx']].forEach(([b, a]) => live(b, () => { b.classList.toggle('arm', midi.learn && midi.armA === a); b.classList.toggle('on', vwOn(a)); }));
  row.append(con, lk, ck, cko, pk, pl, vp, vr, vk, vs, vf, sk, lv, dp, dn); box.append(stat, row, list, guide(), h('p', 'note', 'Pads on MIDI channel 10 play the drums with the standard drum notes (36 kick, 38 snare, 39 clap, 42 and 46 hats…). Keys play the bass or the stab, whichever the keyboard panel is set to. LEARN ties any hardware knob, fader, pad or button to anything on screen: a drum, a knob, ▶ PLAY, ◀ DRUM / DRUM ▶, MUTE or a scene. Press LEARN, click it on screen, then press the control. Start, stop, continue and the tempo (MIDI clock) from a controller or a DAW are followed. LIVE (on once a keyboard with MD|442 firmware 1.2 has answered SEND TO KEYBOARD) keeps the keyboard on the scene you are editing, with the same mutes. CLOCK OUT does the opposite: an FM-1, an SMK-37 with MD|442 firmware, Maschine or Ableton follow MD|442\'s tempo, start and stop.'));
  live(lk, () => { lk.classList.toggle('on', midi.learn); lk.setAttribute('aria-pressed', midi.learn); });
  live(stat, () => {
    stat.textContent = !navigator.requestMIDIAccess ? NOMIDI : !midi.access ? 'Press CONNECT and allow MIDI.' : (midi.names.length ? 'Connected: ' + midi.names.join(', ') : 'MIDI is on. No controller found yet.') + (midi.learn ? (midi.armP ? ' · LEARN: now move a hardware control for ' + DEF[midi.armP].lb : midi.armD ? ' · LEARN: now hit a pad for ' + NAME[midi.armD] : midi.armA ? ' · LEARN: now press a pad for ' + actName(midi.armA) : ' · LEARN: touch a knob, drum, scene or MUTE on screen') + (midi.synced ? ' · following MIDI clock' : '') : '') + (midi.access && midi.names.length ? (writing() ? ' · Elite pads: recording drums' : ' · Elite pads: ' + NAME[S.sel] + ' steps 1-16') + (midi.fxl ? ' · faders: global FX' : '') : '') + (midi.last ? ' · last: ' + midi.last : '');
    const sig = JSON.stringify([midi.cc, midi.note]); if (list._sig === sig) return; list._sig = sig; list.textContent = '';
    Object.entries(midi.cc).forEach(([id, k]) => { if (isAct(k)) { const b = key('CC ' + id.split(':')[1] + ' → ' + actName(k) + '  ✕', () => { delete midi.cc[id]; midiKeep(); drawAll(); }); list.append(b); return; } if (!DEF[k]) return; const b = key('CC ' + id.split(':')[1] + ' → ' + DEF[k].lb + '  ✕', () => { delete midi.cc[id]; midiKeep(); drawAll(); }); b.setAttribute('aria-label', 'Remove mapping of control ' + id.split(':')[1] + ' to ' + DEF[k].lb); list.append(b); });
    Object.entries(midi.note).forEach(([id, k]) => { const b = key('NOTE ' + id.split(':')[1] + ' → ' + actName(k) + '  ✕', () => { delete midi.note[id]; midiKeep(); drawAll(); }); list.append(b); });
    if (!list.firstChild) list.append(h('span', 'none', 'No learned mappings yet'));
  }, true);
}
const midiKey = () => { const b = key('MIDI · DAW', toggleMidi, 'led'); return live(b, () => { b.classList.toggle('on', midi.on && midi.names.length > 0); b.setAttribute('aria-expanded', !!S.midiOpen); }); };

/* ---------- 8. start-up ---------- */
if (!restore()) loadPreset(FIRST);
applyTheme();
(PHONE ? buildPhone : buildDesk)();
live(root, () => { if (root.dataset.style !== S.style) root.dataset.style = S.style; });   // MD|442 green, MD|187 amber, MD|888 red, as on the keyboards
preloadBank(P['sm.bank']);
// MIDI allowed here before: listen straight away, so a plugged-in keyboard's PLAY starts this page in step (no CONNECT needed, no prompt)
try { if (navigator.requestMIDIAccess && navigator.permissions) navigator.permissions.query({ name: 'midi', sysex: true }).then(p => { if (p.state === 'granted') midiConnect(true); }).catch(() => {}); } catch (_) {}
let mbuf = null, cbuf = null, lvl = 0; const chLvl = {};
function frame() {
  requestAnimationFrame(frame);
  if (!ac) return;
  let moved = false;
  while (queue.length && queue[0].t <= ac.currentTime) { const q = queue.shift(); head = q.i; headT = q.t; moved = true; q.hits.forEach(flashKey); if (q.hits.includes('BD') && window.MDStrobe && window.MDStrobe.flash) window.MDStrobe.flash(true); }
  if (moved) drawHead();
  if (S.mixer && !PHONE) { if (!cbuf) cbuf = new Float32Array(256); SOUND.forEach(k => { const el = chMeters[k]; if (!el || !el.isConnected) return; E.chAn[k].getFloatTimeDomainData(cbuf); let pk = 0; for (let i = 0; i < 256; i++) pk = Math.max(pk, Math.abs(cbuf[i])); const v = chLvl[k] = Math.max(pk, (chLvl[k] || 0) * .88); el.style.height = clamp(Math.sqrt(v) * 100, 0, 100) + '%'; }); if (chMeters.master && chMeters.master.isConnected) chMeters.master.style.height = clamp(Math.sqrt(lvl) * 100, 0, 100) + '%'; }
  if (meterEls.length) { if (!mbuf) mbuf = new Float32Array(E.an.fftSize); E.an.getFloatTimeDomainData(mbuf); let pk = 0; for (let i = 0; i < mbuf.length; i++) pk = Math.max(pk, Math.abs(mbuf[i])); lvl = Math.max(pk, lvl * .9); const w = clamp(lvl, 0, 1) * 100 + '%'; meterEls.forEach(m => { m.style.width = w; m.classList.toggle('hot', lvl > .92); }); }
}
requestAnimationFrame(frame);
root.addEventListener('pointerdown', boot, { capture: true, once: true });
['touchend', 'click'].forEach(ev => root.addEventListener(ev, () => { if (!ac || ac.state !== 'running') boot(); }, { capture: true, passive: true }));   // iOS only starts sound from a touch that ends, so make sure that one counts too      // build the sound engine on the first touch, before the finger lifts
window.MD442 = { P, S, DEF, KEYS, PRESETS, VPRESETS, STYLES, BANKS, pickStyle, preloadBank, midiBytes, normBeat, kbFrame, kbBreak, beatFile, mkEngine, apply, playStep, scene, set, select, setStep, setPlaying, pickPreset, render, renderLR, install, toggleTheme, askSignup, midi, onMidi, fit: fitDesk, get playing() { return playing; }, get beats() { return beats; }, get ac() { return ac; }, get E() { return E; } };
})();
