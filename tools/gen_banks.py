"""MD|187 / MD|888 sampler banks, synthesised from scratch (no recordings): 44.1 kHz mono 16-bit.
Each bank is 1 or 2 bars at its BPM, cut into 8 equal slices; every slice starts on a hit so slices and the loop both work.
usage: python3 gen_banks.py <outdir>   (writes <outdir>/md187/*.wav and <outdir>/md888/*.wav)"""
import sys, os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(442)

def T(sec): return np.arange(int(SR * sec)) / SR
def filt(x, kind, f, order=2):
    if kind == 'bp': sos = butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], 'band', output='sos')
    else: sos = butter(order, f / (SR / 2), kind, output='sos')
    return sosfilt(sos, x)
def env(n, att, tau):
    t = np.arange(n) / SR; a = np.minimum(1, t / max(att, 1e-5)); return a * np.exp(-np.maximum(0, t - att) / tau)
def sat(x, k): return np.tanh(k * x) / np.tanh(k)
def noise(sec): return rng.uniform(-1, 1, int(SR * sec))
def norm(x, pk=.89): m = np.abs(x).max(); return x / m * pk if m > 0 else x
def place(buf, x, at, g=1.0):
    i = int(at * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * g
def fadeout(x, ms=4):
    n = int(SR * ms / 1000); x = x.copy(); x[-n:] *= np.linspace(1, 0, n); return x
def crush(x, rate=26040, bits=12):
    """the SP-1200 / MPC60 grit: hold every sample at a lower rate, quantise; then take the aliasing down a bit above 13 k (not a dull low-pass)."""
    step = SR / rate; idx = (np.floor(np.arange(len(x)) / step) * step).astype(int)
    y = x[np.minimum(idx, len(x) - 1)]; q = 2 ** (bits - 1); y = np.round(y * q) / q
    return filt(y, 'low', 15000, 2) * .85 + x * .15

# ---------------- drum voices ----------------
def kick(f0=52, f1=230, pdec=.03, dec=.35, click=.6, drive=2.5, sec=.6, knock=.3):
    t = T(sec); f = f0 + (f1 - f0) * np.exp(-t / pdec); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(len(t), .0015, dec)
    kn = np.sin(2 * np.pi * np.cumsum(f * 2.7) / SR) * env(len(t), .0005, .012) * knock
    ck = filt(noise(sec), 'bp', (2000, 9000)) * env(len(t), .0002, .003) * click
    return fadeout(sat(body + kn + ck, drive))
def snare(f=200, tone=.5, snap=.7, dec=.18, sec=.45, crack=1.0):
    t = T(sec); b = (np.sin(2 * np.pi * f * t) * .7 + np.sin(2 * np.pi * f * 1.6 * t) * .35) * env(len(t), .001, .05)
    n = noise(sec); nz = filt(n, 'high', 1500 + tone * 1500) * env(len(t), .0008, dec) * snap
    cr = filt(n, 'bp', (4000, 9000)) * env(len(t), .0003, .012) * crack   # the crack you hear on top
    sm = filt(n, 'bp', (1100, 3200)) * env(len(t), .0005, .035) * crack * 1.3   # the smack in the middle: what cuts through on a phone
    return fadeout(sat(b + nz + cr + sm, 1.8))
def hat(dec=.04, sec=.25, hp=7000, g=1.0):
    t = T(sec); fs = [205.3, 304.4, 369.6, 522.7, 540, 800]; m = sum(np.sign(np.sin(2 * np.pi * f * 1.9 * t)) for f in fs)
    x = filt(m, 'bp', (6500, 16000)) * .4 + filt(noise(sec), 'high', hp) * .8
    return fadeout(x * env(len(t), .0005, dec) * g)
def shaker(sec=.18):
    t = T(sec); return fadeout(filt(noise(sec), 'bp', (5000, 14000)) * env(len(t), .012, .03))
def rim(sec=.12):
    t = T(sec); x = np.sin(2 * np.pi * 1700 * t) * env(len(t), .0002, .006) + np.sin(2 * np.pi * 500 * t) * env(len(t), .0003, .01) * .7
    return fadeout(x + filt(noise(sec), 'bp', (3000, 8000)) * env(len(t), .0002, .004) * .6)
def clap(sec=.4, tone=1400, dec=.09):
    t = T(sec); n = filt(noise(sec), 'bp', (tone * .7, tone * 3.5)); e = np.zeros(len(t))
    for o in (0, .009, .018, .027):
        i = int(o * SR); e[i:] += np.exp(-np.arange(len(t) - i) / SR / (.006 if o < .027 else dec))
    return fadeout(sat(n * e, 2))
def metal(f=420, sec=.4, dec=.12, ratios=(1, 1.47, 2.09, 2.56, 3.1, 4.3)):
    t = T(sec); x = sum(np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) / (1 + j * .3) for j, r in enumerate(ratios))
    return fadeout(sat(x * env(len(t), .0005, dec), 3))
def room(x, secs=.5, mix=.18, bright=7000):
    ir = filt(noise(secs), 'low', bright) * np.exp(-np.arange(int(SR * secs)) / SR * 6.9 / secs)
    w = np.convolve(x, ir)[:len(x)]; return x + norm(w, np.abs(x).max()) * mix

# ---------------- tonal voices ----------------
def nfreq(m): return 440 * 2 ** ((m - 69) / 12)
def rhodes(notes, sec=.6, dec=.5, bright=1.7):
    t = T(sec); out = 0
    for m in notes:
        f = nfreq(m); mod = np.sin(2 * np.pi * f * 1 * t) * (1.8 * bright) * env(len(t), .001, .15)
        out = out + np.sin(2 * np.pi * f * t + mod) * env(len(t), .003, dec) + np.sin(2 * np.pi * f * 14 * t) * env(len(t), .0005, .01) * .08 * bright
    return fadeout(sat(out / len(notes), 1.4))
def brass(notes, sec=.45, dec=.3):
    t = T(sec); out = 0
    for m in notes:
        for dt in (-.006, 0, .006):
            f = nfreq(m) * (1 + dt); out = out + (2 * ((f * t) % 1) - 1)
    cut = 900 + 5000 * env(len(t), .015, .08)   # the filter opens, then settles: a horn's blare
    y = np.zeros(len(t)); blk = 256
    for i in range(0, len(t), blk):
        y[i:i + blk] = filt(out[max(0, i - 2048):i + blk], 'low', min(cut[i], 18000))[-len(out[i:i + blk]):]
    return fadeout(sat(y * env(len(t), .01, dec) / (3 * len(notes)), 1.8))
def supersaw(notes, sec=.7, dec=.25, cut=9000):
    t = T(sec); out = 0
    for m in notes:
        for dt in (-.012, -.006, -.002, .002, .006, .012):
            f = nfreq(m) * (1 + dt); out = out + (2 * ((f * t + rng.uniform()) % 1) - 1)
    y = filt(out, 'low', cut) * env(len(t), .002, dec); return fadeout(sat(y / (4 * len(notes)), 1.5))
def vowel(f0=150, formants=((700, 1200, 2600)), sec=.4, dec=.25, glide=0.0):
    t = T(sec); f = f0 * (1 + glide * np.exp(-t / .05)); ph = np.cumsum(f) / SR
    src = 2 * (ph % 1) - 1; src = src + filt(noise(sec), 'high', 4000) * .25     # breath on top
    y = sum(filt(src, 'bp', (fm * .88, fm * 1.12)) * g for fm, g in zip(tuple(formants) + (3400, 4500), (1, 1.1, .8, .5, .3)))
    return fadeout(sat(y * env(len(t), .01, dec), 1.5))
def scratch(base, sec=.3):
    """a baby scratch: the record pushed forward and pulled back over a hit"""
    t = T(sec); speed = np.sin(np.pi * t / sec * 2) ; pos = np.cumsum(np.abs(speed) * 1.6 + .05) % len(base)
    y = base[pos.astype(int) % len(base)] * env(len(t), .003, sec)
    return fadeout(filt(y, 'high', 250))

# ---------------- banks ----------------
def bar(bpm, bars=1): return 60 / bpm * 4 * bars
def write(path, x):
    x = norm(x); d = (np.clip(x, -1, 1) * 32767).astype('<i2')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())

def b187(out):
    bpm = 96; L = bar(bpm); st = L / 16; sw = st * .16   # every off 16th lands late: the MPC swing of a Tribe or Premier beat
    at = lambda s: s * st + (sw if s % 2 else 0)
    K, K2 = kick(f0=55, f1=190, pdec=.025, dec=.22, click=.5, drive=2.2, knock=.5), kick(f0=48, f1=160, pdec=.03, dec=.33, click=.35, drive=1.8, knock=.3)
    S = snare(f=190, tone=.6, snap=.85, dec=.16, crack=1.1); GS = snare(f=200, tone=.5, snap=.4, dec=.06, crack=.4)
    # BOOMBP: one bar break; slices (2 steps each) start on kick, kick, snare, kick, kick, kick, snare, kick
    br = np.zeros(int(SR * L))
    for s in (0, 2, 6, 8, 10, 14): place(br, K if s in (0, 10) else K2, at(s), .75 if s in (0, 10) else .6)
    for s in (4, 12): place(br, S, at(s), 1.25); place(br, clap(tone=1100, dec=.03), at(s), .45)   # a clap under the snare: the fat 2 and 4 of a 90s New York record
    for s in (7, 15): place(br, GS, at(s), .35)
    for s in range(16): place(br, hat(dec=.03 if s % 4 != 2 else .09), at(s), .38 if s % 2 == 0 else .22)
    br = filt(br, 'high', 70) * .7 + br * .3   # less sub than a kick on its own: the break sits on top of MD|187's kick instead of doubling it
    write(f'{out}/md187/BOOMBP.wav', room(crush(br), .35, .12))
    # DRUMS: 8 one-shots, one per slice: kick, deep kick, snare, crack snare, closed hat, open hat, shaker, rim
    dr = np.zeros(int(SR * L)); sl = L / 8
    for j, x in enumerate([K, K2, S, snare(f=230, tone=.8, snap=.7, dec=.11, crack=1.4), hat(dec=.035), hat(dec=.18, sec=.3), shaker(), rim()]):
        place(dr, crush(x[:int(sl * SR)]), j * sl, [.85, .85, 1, 1, .55, .5, .5, .8][j])
    write(f'{out}/md187/DRUMS.wav', dr)
    # STABS: Rhodes minor 9 / maj 7 chords, slices 3 and 4 are horn stabs (the Horns pattern plays them)
    E = 40   # E2, the machines' bottom note
    ch = [rhodes([E + 12, E + 15, E + 19, E + 22, E + 26]), rhodes([E + 17, E + 20, E + 24, E + 27]), brass([E + 24, E + 27, E + 31]), brass([E + 22, E + 26, E + 29]),
          rhodes([E + 14, E + 17, E + 21, E + 24]), rhodes([E + 19, E + 22, E + 26, E + 29]), rhodes([E + 12, E + 19, E + 22, E + 26], dec=.8), rhodes([E + 10, E + 14, E + 17, E + 21])]
    sb = np.zeros(int(SR * L))
    for j, x in enumerate(ch): place(sb, x[:int(sl * SR)], j * sl)
    write(f'{out}/md187/STABS.wav', room(crush(sb, 32000, 12), .6, .14, 9000))
    # VOX: synthesised vowel shouts ("hey", "ho", "uh", "yeah"...), slice 8 is a scratch
    V = [((730, 1090, 2440), 170, .25), ((570, 840, 2410), 150, .4), ((300, 870, 2240), 140, -.2), ((660, 1700, 2400), 190, .3),
         ((270, 2290, 3010), 210, .15), ((640, 1190, 2390), 130, -.3), ((490, 1350, 1690), 165, .2)]
    vb = np.zeros(int(SR * L))
    for j, (fm, f0, gl) in enumerate(V): place(vb, vowel(f0, fm, sec=.3, dec=.13, glide=gl), j * sl)
    place(vb, scratch(vowel(160, (700, 1200, 2600), .3, .2)), 7 * sl, 1.6)
    write(f'{out}/md187/VOX.wav', room(crush(filt(vb, 'high', 220), 32000, 12), .4, .12))

def b888(out):
    bpm = 155; L = bar(bpm); st = L / 16; sl = L / 8
    # RUMBLE: the hard-techno rumble between the kicks, tuned to E, ducked hard under every beat so it never smears the kick,
    # with a little drive on top so it has mid bite instead of mud
    t = T(L); f = nfreq(28 + 12); r = np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2 * t)
    duck = np.ones(len(t))
    for b in range(4):
        i = int(b * 4 * st * SR); n = int(st * 4 * SR); x = np.arange(n) / SR
        duck[i:i + n] = np.clip((x - .045) / .06, 0, 1) * np.exp(-np.maximum(0, x - .1) / .18)
    ru = sat(r * duck, 3); ru = ru + filt(ru, 'bp', (300, 2500)) * .6
    ru = ru + sum(np.roll(np.pad(hat(dec=.02, hp=9000), (0, len(t)))[:len(t)], int((s * st) * SR)) * .25 for s in range(1, 16, 2))   # a tick on every off 16th: crisp, not boomy
    write(f'{out}/md888/RUMBLE.wav', ru)
    # GABBA: four distorted kicks a bar (slices alternate kick / tail)
    G = kick(f0=58, f1=400, pdec=.02, dec=.2, click=1.0, drive=7, sec=st * 4, knock=.6)
    G = filt(G, 'high', 35) + sat(filt(G, 'bp', (600, 5000)) * 4, 2.5) * .9   # the gabba 'scream': the kick's distortion carried up into the mids
    gb = np.zeros(int(SR * L))
    for b in range(4): place(gb, G, b * 4 * st)
    write(f'{out}/md888/GABBA.wav', sat(gb, 1.5))
    # TRANCE: 2 bars, 8 supersaw stabs (each 4 steps)
    E = 40; L2 = bar(bpm, 2); sl2 = L2 / 8
    chords = [[E + 24, E + 27, E + 31, E + 36], [E + 24, E + 27, E + 31, E + 36], [E + 22, E + 26, E + 29, E + 34], [E + 20, E + 24, E + 27, E + 32],
              [E + 19, E + 22, E + 26, E + 31], [E + 27, E + 31, E + 34, E + 39], [E + 29, E + 32, E + 36, E + 41], [E + 24, E + 31, E + 36]]
    tb = np.zeros(int(SR * L2))
    for j, c in enumerate(chords): place(tb, supersaw(c, sec=sl2, dec=.16, cut=12000), j * sl2)
    write(f'{out}/md888/TRANCE.wav', room(tb, .8, .2, 12000))
    # HITS: the schranz loop. 8 industrial hits on the even 16ths (one per slice), tight 16th noise hats in between,
    # clap on 2 and 4; driven hard but kept bright: this is what the Schranz pattern loops under the kick.
    hb = np.zeros(int(SR * L))
    hits = [metal(380, dec=.07), filt(noise(.15), 'bp', (1500, 6000)) * env(int(SR * .15), .0005, .03), clap(tone=1600, dec=.05), metal(610, dec=.05, ratios=(1, 1.71, 2.4, 3.3)),
            metal(300, dec=.09, ratios=(1, 1.33, 2.2, 2.9)), sat(np.sin(2 * np.pi * 180 * T(.2)) * env(int(SR * .2), .0005, .04), 4) * .8, clap(tone=1900, dec=.04), metal(820, dec=.04)]   # claps fall on 2 and 4 (slices 3 and 7)
    for j, x in enumerate(hits): place(hb, x[:int(sl * SR)], j * sl)
    for s in range(16): place(hb, hat(dec=.018 if s % 2 else .03, hp=8000), s * st, .35 if s % 2 else .2)
    hb = sat(hb * 1.4, 2.2); hb = hb + filt(hb, 'high', 5000) * .35       # bite on top after the drive
    write(f'{out}/md888/HITS.wav', hb)

if __name__ == '__main__':
    o = sys.argv[1]; b187(o); b888(o); print('ok', o)
