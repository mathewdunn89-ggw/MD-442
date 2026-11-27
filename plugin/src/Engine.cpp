#include "Engine.h"
#include "Styles.h"

namespace md442 {

static const double BUS = .4, CLIPIN = .56, OUT = .79, DUCK = .75, BDUCK = .72, SM_GAIN = 2.2;
static const double LEVEL_SM = -4;
// where each channel's drive starts to bite: about where that drum peaks
static inline double cda(int k) { return k == BD ? .9 : k == BS ? .6 : k == LT || k == MT ? .5 : k == HT || k == SD || k == CP ? .45 : .35; }
static const double HAT_F[] = {205.3, 304.4, 369.6, 522.7, 540, 800}, RIDE_F[] = {263, 400, 421, 474, 587, 845};
static inline double lin(double db) { return db <= -40 ? 0 : std::pow(10, db / 20); }

// ---------------------------------------------------------------- the parts a hit is made of
// capacitor-style envelope: fast rise, true exponential fall
static Param eg(double t, double pk, double tau, double att = .0008) {
    Param e(0); e.setValueAtTime(0, t); e.linearRampToValueAtTime(pk, t + att); e.setTargetAtTime(0, t + att, tau); return e;
}
struct FilterChain {
    std::vector<Biquad> f;
    inline double run(double x) { for (auto& b : f) x = b.process(x); return x; }
};
// a sine that starts sharp and settles onto its note
struct RingPart : Part {
    Osc o; Param freq, env;
    double tick(double t) override { double f = freq.next(t), e = env.next(t); return o.tick(f, sr) * e; }
    double sr;
};
struct ClickPart : Part {
    const std::vector<float>* pulse; size_t i = 0; Biquad lp; double pk;
    double tick(double) override { double x = i < pulse->size() ? (*pulse)[i] : 0; ++i; return lp.process(x) * pk; }
};
struct HissPart : Part {
    Rng r; FilterChain fc; Param env;
    double tick(double t) override { double e = env.next(t); return fc.run(r.next()) * e; }
};
struct ClapPart : Part {
    Rng r; Biquad bp, hp; Param env;
    double tick(double t) override { double e = env.next(t); return hp.process(bp.process(r.next())) * e; }
};
struct MetalPart : Part {
    const double* bank; FilterChain fc; Param env;
    double tick(double t) override { double e = env.next(t); return fc.run(*bank) * e; }
};
struct HatPart : Part {
    // bank -> two band-passes -> tone high-pass -> shelf -> envelope; a layer of band-passed noise joins at the shelf
    const double* bank; Rng r; Biquad lo, hi, hp, sm, nh; double lg, hg, ng; Param env; double noiseStop;
    double tick(double t) override {
        double b = *bank, x = hp.process(lo.process(b) * lg + hi.process(b) * hg);
        double n = nh.process(t < noiseStop ? r.next() * ng : 0);
        return sm.process(x + n) * env.next(t);
    }
};
// Bass: an oscillator (square an octave up for acid, else saw) through two low-passes that sweep down, plus a sine sub
struct BassPart : Part {
    Osc o1, o2, f1, f2; bool fat = false; double fr1, fr2, detA, detB, og, fg, sub; Biquad l1, l2; Param cut, env; double sr; int cnt = 0;
    double tick(double t) override {
        double c = cut.next(t); if (cnt++ % 4 == 0) { l1.set(c, l1.q, 0); l2.set(c, l2.q, 0); }
        double a = o1.tick(fr1, sr) * og;
        if (fat) a += (f1.tick(fr1 * detA, sr) + f2.tick(fr1 * detB, sr)) * fg;
        double y = l2.process(l1.process(a)) + o2.tick(fr2, sr) * sub;
        return y * env.next(t);
    }
};
struct StabPart : Part {
    std::vector<Osc> o; std::vector<double> fr; Biquad lp; Param cut, env; double sr; int cnt = 0;
    double tick(double t) override {
        double c = cut.next(t); if (cnt++ % 4 == 0) lp.set(c, lp.q, 0);
        double s = 0; for (size_t i = 0; i < o.size(); ++i) s += o[i].tick(fr[i], sr);
        return lp.process(s) * env.next(t);
    }
};

// ---------------------------------------------------------------- engine
Engine::Engine() {
    P.resize(defs().size()); for (size_t i = 0; i < defs().size(); ++i) P[i] = defs()[i].df;
    scenes.push_back(Scene()); loadPreset(0);
}
Engine::~Engine() { if (irThread.joinable()) irThread.join(); }

int Engine::numPresets() { return (int)(presetSources().size() + stylePresets().size()); }
std::string Engine::presetName(int idx) {
    int n = (int)presetSources().size(); if (idx < n) return presetSources()[(size_t)idx].name;
    return idx - n < (int)stylePresets().size() ? stylePresets()[(size_t)(idx - n)].name : "";
}
std::string Engine::presetStyle(int idx) { int n = (int)presetSources().size(); return idx < n ? "MD442" : stylePresets()[(size_t)(idx - n)].style; }
const char* Engine::loopName(int kit, int slot) const {
    static const char* N[3][4] = {{"-", "-", "-", "-"}, {"BOOMBP", "DRUMS", "STABS", "VOX"}, {"RUMBLE", "GABBA", "TRANCE", "HITS"}};
    return N[std::clamp(kit, 0, 2)][std::clamp(slot, 0, 3)];
}

void Engine::loadPreset(int idx) {
    const auto& src = presetSources();
    if (idx >= (int)src.size() && idx < numPresets()) {   // an MD187 or MD888 pattern
        const auto& sp = stylePresets()[(size_t)(idx - (int)src.size())]; double vol = pv("vol");
        for (size_t i = 0; i < defs().size(); ++i) P[i] = defs()[i].df;
        for (auto& kv : sp.P) { int j = defIndex(kv.first); if (j >= 0) P[(size_t)j] = kv.second; }
        p("vol") = vol; preset = sp.name; hasBeatTrim = true; beatTrim = sp.trim;
        Scene sc; for (int k = 0; k < NUM_KEYS; ++k) for (int i = 0; i < 16; ++i) sc.g[(size_t)k][(size_t)i] = sp.g[(size_t)k][i] == 'x';
        for (int i = 0; i < 16; ++i) { sc.n[(size_t)i] = sp.n[(size_t)i]; sc.brk[(size_t)i] = sp.brk[i]; }
        scenes.assign(1, sc); this->sc = 0; chain = false; last = 16; mute.fill(false); pend = -1;
        return;
    }
    if (idx < 0 || idx >= (int)src.size()) return;
    auto c = convertPreset(src[(size_t)idx]); double vol = pv("vol");
    for (size_t i = 0; i < defs().size(); ++i) P[i] = defs()[i].df;
    for (auto& kv : c.v) { int j = defIndex(kv.first); if (j >= 0) P[(size_t)j] = kv.second; }
    p("vol") = vol; preset = src[(size_t)idx].name; hasBeatTrim = false;
    scenes.assign(1, c.sc); sc = 0; chain = false; last = 16; mute.fill(false); pend = -1;
}
double Engine::trim() const { if (hasBeatTrim) return beatTrim; for (auto& s : presetSources()) if (preset == s.name) return s.trim; return 0; }

void Engine::prepare(double sampleRate, bool isLive) {
    sr = sampleRate; live = isLive; now = 0; parts.clear(); pending.clear(); brk.reset();
    pulse.assign((size_t)std::ceil(sr * .004), 0.f); { double n = sr * .0008; for (size_t i = 0; i < pulse.size(); ++i) pulse[i] = (float)(i < n ? 1 : std::exp(-(i - n) / (n * .6))); }
    for (int i = 0; i < 6; ++i) { hat.o[i] = Osc(); hat.o[i].type = Osc::SQUARE; hat.f[i].snap(HAT_F[i]); crb.o[i].type = Osc::SQUARE; crb.f[i].snap(HAT_F[i]); rdb.o[i].type = Osc::SQUARE; rdb.f[i].snap(RIDE_F[i]); }
    for (int k = 0; k < NUM_SOUND; ++k) {
        auto& c = chs[k]; c = Channel();
        c.clp.init(Biquad::LOWPASS, sr, 22000, -3); c.chp.init(Biquad::HIGHPASS, sr, 10, -3);
        c.gain.snap(1); c.pan.snap(0); c.sv.snap(0); c.sd.snap(0);
    }
    bch = Channel(); bch.clp.init(Biquad::LOWPASS, sr, 22000, -3); bch.chp.init(Biquad::HIGHPASS, sr, 10, -3); bch.pan.snap(0); bch.sv.snap(0); bch.sd.snap(0);
    chs[BD].entry.os2 = true; chs[BS].entry.os2 = true; chs[ST].stHp = Biquad(Biquad::HIGHPASS, sr, 170, .7);
    rumLp = Biquad(Biquad::LOWPASS, sr, 130, .7); rum.snap(0);
    duck = Param(1); bduck = Param(1); smEnd = -1; smLoop = false;
    // reverb: the convolver's block latency comes out of the 18 ms pre-delay
    pre.init(.1, sr); for (auto& c : cv) c.reset(); cvg[0] = Param(1); cvg[1] = Param(0); cvA = 0; irSecs = 0; irPending = false; dropOld = -1;
    for (int c = 0; c < 2; ++c) { rvf[c] = Biquad(Biquad::HIGHPASS, sr, 320, .7); rvShelf[c] = Biquad(Biquad::HIGHSHELF, sr, 5000, 1, -2); rvLp[c] = Biquad(Biquad::LOWPASS, sr, 12000, .7); }
    dl.init(2, sr); dlp.init(Biquad::LOWPASS, sr, 2000, -3); dhp.init(Biquad::HIGHPASS, sr, 140, -3); dret = Biquad(Biquad::HIGHPASS, sr, 300, .7); fb.snap(.4); dtime.snap(.1);
    for (int c = 0; c < 2; ++c) {
        lo[c].init(Biquad::LOWSHELF, sr, 300, 1, 0); mid[c].init(Biquad::PEAKING, sr, 1000, .7, 0); hi[c].init(Biquad::HIGHSHELF, sr, 4000, 1, 0);
        lp1[c].init(Biquad::LOWPASS, sr, 22000, -3); lp2[c].init(Biquad::LOWPASS, sr, 22000, -3); hp1[c].init(Biquad::HIGHPASS, sr, 18, -3); hp2[c].init(Biquad::HIGHPASS, sr, 10, -3);
        drv[c] = Shaper(); drv[c].os2 = true;
    }
    mst.snap(.7);
    comp.init(sr, -12, 12, 2.5, .03, .12);
    effBpm = pv("bpm");
    apply(true);
}

std::shared_ptr<ImpulseResponse> Engine::makeIR(double secs, uint32_t seed) {
    // the reverb's room: noise that dies away to -60 dB in 'secs', getting darker as it goes
    size_t len = (size_t)std::max(64.0, std::floor(sr * secs * 1.05));
    std::vector<float> ch[2]; Rng r(seed); double power = 0;
    for (int c = 0; c < 2; ++c) {
        ch[c].resize(len); double lp = 0;
        for (size_t i = 0; i < len; ++i) {
            double t = i / sr, a = std::exp(-2 * PI * (1400 + 9000 * std::exp(-t * 3.2 / secs)) / sr);
            lp += (1 - a) * (r.next() - lp);
            double v = lp * std::exp(-6.9 * t / secs) * std::min({1.0, i / 130.0, (double)(len - i) / 2000});
            ch[c][i] = (float)v; power += v * v;
        }
    }
    // ConvolverNode normalises its impulse (normalize = true), as the spec describes
    power = std::sqrt(power / (2.0 * len)); if (!std::isfinite(power) || power < .000125) power = .000125;
    double scale = 1 / power * .00125 * (44100 / sr);
    return Convolver::prepare(ch[0], ch[1], scale);
}
void Engine::requestIR(double secs) {
    if (!live) { cv[cvA].setIR(makeIR(secs, rng.s)); return; }
    if (irBusy) { irPending = true; return; }
    if (irThread.joinable()) irThread.join();
    irBusy = true; uint32_t seed = (uint32_t)(rng.next() * 1e9) | 1u;
    irThread = std::thread([this, secs, seed] {
        auto ir = makeIR(secs, seed);
        std::lock_guard<std::mutex> l(irMutex); irReady = ir; irTrash.clear(); irBusy = false;
    });
}

void Engine::filt(MovingBiquad& lp, MovingBiquad& hp, double v, bool snap) {
    bool lo_ = v < -4, hi_ = v > 4;
    double lf = lo_ ? lpHz(v) : 22000, lq = lo_ ? 1 + (-v / 100) * 3 : -3, hf = hi_ ? hpHz(v) : 10, hq = hi_ ? 1 + (v / 100) * 3 : -3;
    if (snap) { lp.snap(lf, lq); hp.snap(hf, hq); } else { lp.target(lf, lq, .03, sr); hp.target(hf, hq, .03, sr); }
}

void Engine::apply(bool snap) {
    snap = snap || !live;
    setT(mst, lin(pv("vol")) * std::pow(10, trim() / 20), .02, snap);
    for (int k = 0; k < NUM_SOUND; ++k) setT(chs[k].gain, off(k) ? 0 : lin(P[(size_t)defIndex(std::string("lvl.") + voices()[k].id)]), .012, snap);
    auto kg = [&](MovingBiquad& b, bool killed) { if (snap) b.snapGain(killed ? -40 : 0); else b.targetGain(killed ? -40 : 0, .01, sr); };
    for (int c = 0; c < 2; ++c) { kg(lo[c], kill[0]); kg(mid[c], kill[1]); kg(hi[c], kill[2]); }
    if (irSecs != pv("fx.vdec")) {   // rebuilt a moment after the Decay knob stops, then faded in over the old room
        irSecs = pv("fx.vdec");
        if (!live || !cv[cvA].hasIR()) { if (!live) requestIR(irSecs); else { cv[cvA].setIR(makeIR(irSecs, 12345)); } }
        else irWantAt = now + .18;
    }
    double va = std::pow(pv("fx.verb") / 100, .8) * 2.2, sa = std::pow(pv("fx.space") / 100, .7) * 1.3;
    for (int k = 0; k < NUM_SOUND; ++k) {
        std::string id = voices()[k].id; auto& c = chs[k];
        double v = k == ST ? pv("st.verb") / 100 * .5 : P[(size_t)defIndex("rev." + id)] / 100 * (k == BS ? .4 : va);
        double d = k == BS ? pv("bs.echo") / 100 * .8 : k == ST ? pv("st.echo") / 100 * 1.1 : P[(size_t)defIndex("ech." + id)] / 100 * sa;
        setT(c.pan, P[(size_t)defIndex("pan." + id)] / 100, .02, snap);
        double cd = P[(size_t)defIndex("drv." + id)] / 100; if (cd > .01) c.cdrv.setSoft(cd, cda(k)); else c.cdrv.clear();
        filt(c.clp, c.chp, P[(size_t)defIndex("flt." + id)], snap);
        setT(c.sv, v, .04, snap); setT(c.sd, d, .04, snap);
    }
    setT(brkGain, lin(halfR(LEVEL_SM + 20 * std::log10(std::max(1.0, pv("brk.level")) / 100))), .012, snap);   // the web sampler's level: 100 = its -4 dB
    {   auto& c = bch; setT(c.pan, pv("pan.BRK") / 100, .02, snap); double cd = pv("drv.BRK") / 100; if (cd > .01) c.cdrv.setSoft(cd, .35); else c.cdrv.clear();
        filt(c.clp, c.chp, pv("flt.BRK"), snap); setT(c.sv, pv("rev.BRK") / 100 * va, .04, snap); setT(c.sd, pv("ech.BRK") / 100 * sa, .04, snap); }
    setT(fb, pv("fx.efb") / 100 * .9, .05, snap);
    setT(dtime, std::min(1.95, 60 / effBpm / 4 * ETIMES[std::clamp((int)std::lround(pv("fx.etime")), 0, 5)].sixteenths), .08, snap);
    double v = pv("fx.filter"); bool lo_ = v < -4, hi_ = v > 4;   // 24 dB per octave either way
    auto mt = [&](MovingBiquad& b, double f, double q, double tc) { if (snap) b.snap(f, q); else b.target(f, q, tc, sr); };
    for (int c = 0; c < 2; ++c) {
        mt(lp1[c], lo_ ? lpHz(v) : 22000, -3, .03); mt(lp2[c], lo_ ? lpHz(v) : 22000, lo_ ? 1 + (-v / 100) * 4.5 : -3, .03);
        mt(hp1[c], hi_ ? hpHz(v) : 18, -3, .03); mt(hp2[c], hi_ ? hpHz(v) : 10, hi_ ? 1 + (v / 100) * 4.5 : -3, .03);
    }
    double pun = pv("bd.punch") / 100, rmb = pv("bd.rumble") / 100, depth = std::clamp((60 - pv("bd.tune")) / 18, 0.0, 1.0);
    chs[BD].entry.set(1 + pun + rmb * .4, .95);
    setT(rum, (.02 + rmb * (.1 + depth * .07)) / 9, .05, snap);
    double dr = pv("bs.drive") / 100; chs[BS].entry.set(1 + dr * 18, 1 - dr * .32);
    double da = pv("fx.drive") / 100; for (auto& dv : drv) { if (da > .01) dv.setSoft(da, .5); else dv.clear(); }
    double cr = std::pow(2, pv("cr.tune") / 12), rd = std::pow(2, pv("rd.tune") / 12);
    for (int i = 0; i < 6; ++i) { setT(crb.f[i], HAT_F[i] * 1.12 * cr, .01, snap); setT(rdb.f[i], RIDE_F[i] * 1.5 * rd, .01, snap); }
}

void Engine::stopAll() { parts.clear(); pending.clear(); brk.reset(); }

void Engine::voice(int k, double t, int stepIdx, double vel, const int* note) {
    if (k < 0 || k >= NUM_SOUND) return;
    hitFlags.fetch_or(1u << k);
    auto add = [&](Part* pp, double stop) { pp->ch = k; pp->vel = vel; pp->start = t - .5 / sr; pp->stop = stop; pp->id = nextId++; parts.emplace_back(pp); return pp; };
    auto ring = [&](double f, double tau, double pk, double bend = 1, double bendT = .01, double sag = 1) {
        auto* r = new RingPart(); r->sr = sr; r->o.type = Osc::SINE;
        r->freq = Param(f * bend); r->freq.setValueAtTime(f * bend, t);
        if (bend != 1) r->freq.exponentialRampToValueAtTime(f, t + bendT);
        if (sag != 1) r->freq.exponentialRampToValueAtTime(f * sag, t + bendT + tau * 3);
        r->env = eg(t, pk, tau); add(r, t + tau * 12 + .05);
    };
    auto click = [&](double pk, double cutoff) { auto* c = new ClickPart(); c->pulse = &pulse; c->lp = Biquad(Biquad::LOWPASS, sr, cutoff, .7); c->pk = pk; add(c, t + pulse.size() / sr + .05); };
    auto bq = [&](Biquad::Type ty, double f, double q = 1, double g = 0) { return Biquad(ty, sr, f, q, g); };
    auto hiss = [&](double pk, double tau, std::vector<Biquad> f, double att = .0008) {
        auto* h = new HissPart(); h->r = Rng((uint32_t)(rng.next() * 2e9) | 1u); h->fc.f = std::move(f); h->env = eg(t, pk, tau, att); add(h, t + tau * 12 + .05); return h;
    };
    auto metal = [&](const double* bank, std::vector<Biquad> f, Param env, double life) {
        auto* m = new MetalPart(); m->bank = bank; m->fc.f = std::move(f); m->env = env; add(m, t + life + .2);
    };
    if (k == BD) {
        double f = pv("bd.tune"), tau = pv("bd.decay") / 3300, pu = pv("bd.punch") / 100, at = pv("bd.attack") / 100;
        ring(f, tau, .8, 1.9 + pu * 4.2, .007 + (1 - pu) * .022, .955); ring(f * 2, tau * .28, .16 + pu * .2, 1.5, .006);   // a little second harmonic for weight on small speakers
        if (at > .02) { click(at * .55, 600 + at * 3400); hiss(at * .5 + pu * .2, .0042, {bq(Biquad::BANDPASS, 3300 + at * 1400, 1.5)}, .0004); }   // the beater
        ring(f * 3.1, .014 + pu * .008, .08 + pu * .14, 1.3, .004);   // knock: the short mid punch of a hard kick
        bduck.cancelAndHoldAtTime(t); bduck.setTargetAtTime(BDUCK, t, .003); bduck.setTargetAtTime(1, t + .07, .045);   // the bass dips a bit further, so kick and bass never fight
        duck.cancelAndHoldAtTime(t); duck.setTargetAtTime(DUCK, t, .004); duck.setTargetAtTime(1, t + .06, .06);   // everything else dips for a moment
    } else if (k == SD) {
        double f = 238 * std::pow(2, pv("sd.tune") / 12), sn = pv("sd.snappy") / 100, tn = pv("sd.tone") / 100 - .5;
        ring(f, .055, .75, 1.7, .008); ring(f * 2, .032, .4, 1.4, .006);
        hiss((.12 + sn * .34) * 1.7, pv("sd.decay") / 3670, {bq(Biquad::HIGHPASS, (1700 + sn * 900) * std::pow(2, tn * 1.6), .7), bq(Biquad::PEAKING, 5200, .8, tn * 14)});
    } else if (k == CP) {
        auto* c = new ClapPart(); double tail = pv("cp.decay") / 3500;
        c->r = Rng((uint32_t)(rng.next() * 2e9) | 1u); c->bp = bq(Biquad::BANDPASS, pv("cp.tone"), 1.4); c->hp = bq(Biquad::HIGHPASS, 450, .7);
        c->env = Param(0); c->env.setValueAtTime(0, t);
        for (double o : {0.0, .0105, .021}) { c->env.setValueAtTime(3, t + o); c->env.linearRampToValueAtTime(.32, t + o + .0095); }   // three quick bursts
        c->env.setValueAtTime(2.3, t + .032); c->env.setTargetAtTime(0, t + .032, tail);                                         // then the room-like tail
        add(c, t + .04 + tail * 8);
    } else if (k == RS) {
        double f = std::pow(2, pv("rs.tune") / 12);
        ring(1720 * f, .0075, .5); ring(497 * f, .011, .42, 1.3, .004); ring(1060 * f, .006, .22); click(.5, 7000);
    } else if (k == LT || k == MT || k == HT) {
        const char* tk = k == LT ? "lt" : k == MT ? "mt" : "ht"; double base = k == LT ? 110 : k == MT ? 165 : 247;
        double f = base * std::pow(2, pv((std::string(tk) + ".tune").c_str()) / 12), tau = pv((std::string(tk) + ".decay").c_str()) / 4000;
        ring(f, tau, .55, k == LT ? 1.45 : 1.28, k == LT ? .02 : .012); ring(f * 2.02, tau * .3, .08); click(.2, 2600);
    } else if (k == CH || k == OH) {
        bool open = k == OH; double tn = pv("hh.tone") / 100, tau = open ? pv("oh.decay") / 3450 : pv("ch.decay") / 4160, life = tau * 9;
        for (auto& pp : parts) if (pp->id == openHat) { auto* h = static_cast<HatPart*>(pp.get()); h->env.cancelAndHoldAtTime(t); h->env.setTargetAtTime(0, t, .006); }   // a new hat chokes the open one
        openHat = 0;
        auto* h = new HatPart(); h->bank = &hat.v; h->r = Rng((uint32_t)(rng.next() * 2e9) | 1u);
        h->env = eg(t, open ? .36 : .6, tau, .0015);
        h->hp = bq(Biquad::HIGHPASS, 2400 + tn * 4600, .7); h->lo = bq(Biquad::BANDPASS, 3440, 1.1); h->hi = bq(Biquad::BANDPASS, 7100, 1); h->sm = bq(Biquad::HIGHSHELF, 9500, 1, -2);
        h->lg = 6 * (1 - tn * .6); h->hg = 8; h->ng = 1.6 + tn * .6; h->nh = bq(Biquad::BANDPASS, 7000 + tn * 3000, .9); h->noiseStop = t + life + .1;
        add(h, t + life + .2);
        if (open) openHat = h->id;
    } else if (k == CR) {
        double tau = pv("cr.decay") / 3450, f = std::pow(2, pv("cr.tune") / 12), ctn = std::pow(2, (pv("cr.tone") / 100 - .5) * 1.4);
        metal(&crb.v, {bq(Biquad::HIGHPASS, 3400 * f * ctn, .7), bq(Biquad::PEAKING, 7200 * f * ctn, .9, 4)}, eg(t, 1.1, tau, .002), tau * 9);
        hiss(.45, tau * .55, {bq(Biquad::HIGHPASS, 6200 * f * ctn, .7)}, .002); hiss(.5, .02, {bq(Biquad::BANDPASS, 4200 * f, .8)}, .001);
    } else if (k == RD) {
        double tau = pv("rd.decay") / 3450, f = std::pow(2, pv("rd.tune") / 12), rtn = std::pow(2, (pv("rd.tone") / 100 - .5) * 1.4);
        auto fl = [&] { return std::vector<Biquad> {bq(Biquad::BANDPASS, 6800 * f * rtn, 1.6), bq(Biquad::HIGHPASS, 4200 * f * rtn, .7)}; };
        metal(&rdb.v, fl(), eg(t, 2.6, .028, .0006), .4); metal(&rdb.v, fl(), eg(t, 1.2, tau, .001), tau * 9);   // the ping, then the wash
        hiss(.32, tau * .8, {bq(Biquad::BANDPASS, 7400 * f * rtn, .7), bq(Biquad::HIGHPASS, 4200 * f, .7)}, .002);
    } else if (k == BS) {
        int nn = note ? *note : scene().n[(size_t)std::clamp(stepIdx, 0, 15)];
        double fr = 41.2 * std::pow(2, (pv("key") + nn) / 12), sd = 60 / effBpm / 4, acid = pv("bs.acid") / 100, len = sd * (acid > .3 ? 1.05 : 1.6);
        double res = pv("bs.reso") / 100, base = pv("bs.cutoff"), peak = std::min(14000.0, base * (2 + acid * 8 + res * 2));
        auto* b = new BassPart(); b->sr = sr;
        b->l1 = bq(Biquad::LOWPASS, peak, .5); b->l2 = bq(Biquad::LOWPASS, peak, .7 + res * (acid > .3 ? 16 : 9));
        b->cut = Param(peak); b->cut.setValueAtTime(peak, t); b->cut.exponentialRampToValueAtTime(std::min(base, peak), t + pv("bs.decay") / 1000);
        b->o1.type = acid > .3 ? Osc::SQUARE : Osc::SAW; b->fr1 = fr * (acid > .3 ? 2 : 1); b->o2.type = Osc::SINE; b->fr2 = fr; b->og = acid > .3 ? .42 : .9;
        double fat = pv("bs.fat") / 100; b->sub = 1 + fat * .5;
        if (fat > .01) { b->fat = true; b->fg = b->og * (.35 + fat * .45); b->f1.type = b->f2.type = b->o1.type; b->detA = std::pow(2, -(5 + fat * 17) / 1200); b->detB = std::pow(2, (5 + fat * 17) / 1200); b->og *= 1 - fat * .2; }
        b->env = Param(0); b->env.setValueAtTime(0, t); b->env.linearRampToValueAtTime(.5, t + .004); b->env.setTargetAtTime(.34, t + .004, .05); b->env.setTargetAtTime(0, t + len, .025);
        add(b, t + len + .2);
    } else if (k == ST) {
        double top = pv("st.tone"), tn = std::log2(top / 300) / 5.5, dur = pv("st.decay") / 1000; int nn = note ? *note : 0;
        auto* s = new StabPart(); s->sr = sr; s->lp = bq(Biquad::LOWPASS, std::min(top, 16000.0), 2 + tn * 5);
        s->cut = Param(std::min(top, 16000.0)); s->cut.setValueAtTime(std::min(top, 16000.0), t); s->cut.exponentialRampToValueAtTime(std::max(140.0, top * .15), t + dur * .85);
        for (int iv : chords()[(size_t)std::clamp((int)std::lround(pv("st.chord")), 0, 6)].iv) for (int dt : {-8, 8}) {
            Osc o; o.type = Osc::SAW; s->o.push_back(o); s->fr.push_back(41.2 * 4 * std::pow(2, (pv("key") + iv + nn) / 12) * std::pow(2, dt / 1200.0));
        }
        s->env = Param(0); s->env.setValueAtTime(0, t); s->env.linearRampToValueAtTime(.24, t + .004); s->env.exponentialRampToValueAtTime(.0005, t + .004 + dur); s->env.setTargetAtTime(0, t + .004 + dur, .012);
        add(s, t + dur + .1 + .1);
    }
}

// ---------------------------------------------------------------- the BREAK: the web app's sampler
// one voice playing a piece of a bank in time with the tempo; a new hit cuts the last
struct Engine::BrkPart : Part {
    const Loop* L = nullptr; double pos = 0, rate = 1; Param env { 0 };
    double tick(double t) override {
        double e = env.next(t); if (!L) return 0;
        size_t i = (size_t)pos; if (i + 1 >= L->data.size()) return 0;
        double f = pos - (double)i, x = L->data[i] * (1 - f) + L->data[i + 1] * f;
        pos += rate; return x * e;
    }
};
void Engine::brkStop(double t) { if (brk) { auto* b = static_cast<BrkPart*>(brk.get()); b->env.cancelAndHoldAtTime(t); b->env.setTargetAtTime(0, t, .003); b->stop = std::min(b->stop, t + .05); smEnd = -1; } }
// sl > 0: that slice (1-8) of the bank; sl < 0: the loop from step -sl - 1; else the loop where this step falls (two-bar banks follow the bar count)
bool Engine::sampler(double t, int idx, long long bar, double vel, int sl) {
    int kit = (int)std::lround(pv("brk.kit")), slot = (int)std::lround(pv("brk.slot"));
    if (kit < 1 || kit > 2) return false; const Loop& L = loops[(size_t)kit][(size_t)std::clamp(slot, 0, 3)]; if (L.data.empty()) return false;
    double secs = (double)L.data.size() / L.sr, rate = effBpm / L.bpm * std::pow(2, pv("brk.pitch") / 12); int bars = std::max(1, L.bars), steps = 16 * bars;
    double off, dur;
    if (sl > 0) { off = (sl - 1) * secs / 8; dur = secs / 8; smLoop = false; }
    else { int pos = sl < 0 ? (-sl - 1) % steps : (int)((idx + 16 * (((bar % bars) + bars) % bars)) % steps); off = pos * secs / steps; dur = secs - off; smLoop = true; }
    if (brk) {   // the old sound fades out over a few ms while the new one starts: it lives on as an ordinary part
        auto* o = static_cast<BrkPart*>(brk.release()); if (smEnd > t) { o->env.cancelAndHoldAtTime(t); o->env.setTargetAtTime(0, t, .003); o->stop = std::min(o->stop, t + .05); }
        parts.emplace_back(o);
    }
    auto* b = new BrkPart(); double end = t + dur / rate; b->L = &L; b->pos = off * L.sr; b->rate = rate * L.sr / sr;
    b->env.setValueAtTime(0, t); b->env.linearRampToValueAtTime(vel * SM_GAIN, t + .002); b->env.setValueAtTime(vel * SM_GAIN, std::max(t + .002, end - .006)); b->env.linearRampToValueAtTime(0, end);
    b->vel = 1; b->ch = -1; b->start = t - .5 / sr; b->stop = end + .02; b->id = nextId++;
    brk.reset(b); smEnd = end; hitFlags.fetch_or(1u << 14); return true;
}
void Engine::slice(int n, double vel) { if (n < 0 || n > 7) return; sampler(now + 1 / sr, 0, 0, vel, n + 1); }
// a BREAK step in a pattern: a slice plays and rings through the steps after it ("-"); a run of loop steps plays on and is only
// lined up again every beat, unless CHOP makes it jump somewhere else in the loop
void Engine::smStep(const Scene& s, int idx, long long bar, double t, double vel) {
    auto on = [&](int i) { return s.brk[(size_t)i] != '.'; }; auto sl = [&](int i) { char c = s.brk[(size_t)i]; return c >= '1' && c <= '8' ? c - '0' : 0; };
    if (!on(idx)) return;
    if (sl(idx)) { sampler(t, idx, bar, vel, sl(idx)); return; }
    bool prevOn = idx > 0 && on(idx - 1); int j = idx - 1; while (j >= 0 && on(j) && !sl(j)) --j;
    if (prevOn && j >= 0 && on(j) && sl(j)) return;
    int kit = (int)std::lround(pv("brk.kit")), slot = (int)std::lround(pv("brk.slot")); if (kit < 1 || kit > 2) return;
    double chop = pv("brk.complex") / 100; int bars = std::max(1, loops[(size_t)kit][(size_t)std::clamp(slot, 0, 3)].bars);
    if (chop > 0 && idx % 2 == 0 && brkRng.next() * .5 + .5 < chop * .7) { sampler(t, idx, bar, vel, -(1 + 2 * (int)std::floor((brkRng.next() * .5 + .5) * 8 * bars))); return; }
    if (prevOn && idx % 4 && smLoop && smEnd > t) return;
    sampler(t, idx, bar, vel, 0);
}

bool Engine::writeStep(int k, int note) {
    if (!wasRunning || headIdx < 0 || k < 0 || k > NUM_KEYS || k == AC) return false;
    int L = std::max(1, last), i = now - headT > 60 / effBpm / 4 / 2 ? (headIdx + 1) % L : headIdx; auto& s = scene();
    if (k == NUM_KEYS) { s.brk[(size_t)i] = (char)('1' + std::clamp(note, 0, 7)); return true; }
    s.g[(size_t)k][(size_t)i] = true; if (k == BS) s.n[(size_t)i] = std::clamp(note, -24, 24);
    return true;
}

void Engine::playStep(int idx, double t, long long bar) {
    auto& s = scene(); double acc = s.g[AC][(size_t)idx] && !mute[AC] ? std::pow(10, pv("accent") / 20) : 1;
    for (int k = 0; k < NUM_SOUND; ++k) if (s.g[(size_t)k][(size_t)idx] && !off(k)) voice(k, t, idx, acc);
    smStep(s, idx, bar, t, acc);
}

// steps fall on 16th notes of the DAW's timeline (or the plugin's own clock while the DAW is stopped)
void Engine::runSequencer(int n, const Transport& tr) {
    bool host = tr.hostKnown && tr.hostPlaying && seqOn, running = host || internalPlay;
    if (tr.hostKnown && tr.bpm > 0 && std::fabs(tr.bpm - effBpm) > 1e-6) { effBpm = tr.bpm; apply(); }
    else if (!tr.hostKnown && std::fabs(pv("bpm") - effBpm) > 1e-6) { effBpm = pv("bpm"); apply(); }
    if (!running) {
        if (wasRunning) { pending.clear(); brkStop(now); playhead = -1; if (pend >= 0) { sc = pend; pend = -1; } }
        wasRunning = false; lastStep = -1; headIdx = -1; return;
    }
    double ppq0 = host ? tr.ppq : seqPpq;
    if (!host && !wasRunning) ppq0 = seqPpq = 0;
    double bpm = host ? tr.bpm : effBpm, ppqPerSample = bpm / 60 / sr, ppq1 = ppq0 + n * ppqPerSample, stepLen = 60 / bpm / 4;
    if (host && wasRunning && lastStep >= 0 && std::floor(ppq0 * 4) < (double)lastStep - 1) { pending.clear(); lastStep = -1; }   // the DAW jumped back (a loop): carry on from there
    long long first = (long long)std::ceil(ppq0 * 4 - 1e-9);
    for (long long st = first; (double)st / 4 < ppq1; ++st) {
        if (st <= lastStep) continue;
        lastStep = st;
        int L = std::max(1, last), idx = (int)(((st % L) + L) % L);
        if (idx == 0) {
            if (pend >= 0) { sc = std::clamp(pend, 0, (int)scenes.size() - 1); pend = -1; }
            else if (chain && scenes.size() > 1) sc = (int)((st / L) % (long long)scenes.size());
        }
        double at = now + ((double)st / 4 - ppq0) / ppqPerSample / sr;
        double sh = idx % 2 ? (pv("shuffle") / 100 - .5) * 2 * stepLen : 0;
        pending.push_back({std::max(at + sh, now), idx, st / L});
    }
    if (!host) seqPpq = ppq1;
    wasRunning = true;
}

void Engine::process(float* L, float* R, int n, const Transport& tr) {
    runSequencer(n, tr);
    // a new room is built in the background, then faded in over the old one
    if (live) {
        if (irWantAt >= 0 && now >= irWantAt) { irWantAt = -1; requestIR(irSecs); }
        std::shared_ptr<ImpulseResponse> got;
        { std::unique_lock<std::mutex> l(irMutex, std::try_to_lock); if (l.owns_lock() && irReady) { got = irReady; irReady.reset(); } }
        if (got) {
            int nx = 1 - cvA; cv[nx].reset(); cv[nx].setIR(got);
            cvg[nx].cancelAndHoldAtTime(now); cvg[cvA].cancelAndHoldAtTime(now);
            cvg[nx].setTargetAtTime(1, now + .02, .08); cvg[cvA].setTargetAtTime(0, now + .02, .08);
            dropOld = cvA; dropOldAt = now + .9; cvA = nx;
            if (irPending) { irPending = false; irWantAt = now + .18; }
        }
        if (dropOld >= 0 && now >= dropOldAt) {
            if (dropOld != cvA) { std::lock_guard<std::mutex> l(irMutex); cv[dropOld].setIR(nullptr); }
            dropOld = -1;
        }
    }
    const double dt = 1 / sr, preSecs = .018 - Convolver::B / sr;
    float peak = 0; int head = -1;
    for (int s = 0; s < n; ++s) {
        double t = now;
        // hits that are due
        if (!pending.empty()) {
            for (size_t i = 0; i < pending.size();) {
                if (pending[i].t <= t + dt * .5) { playStep(pending[i].idx, t, pending[i].bar); head = headIdx = pending[i].idx; headT = t; pending.erase(pending.begin() + (long)i); }
                else ++i;
            }
        }
        hat.tick(sr); crb.tick(sr); rdb.tick(sr);
        for (auto& c : chs) c.in = 0;
        double brkIn = 0;
        for (size_t i = 0; i < parts.size();) {
            auto& pp = parts[i];
            if (t >= pp->stop) { parts[i] = std::move(parts.back()); parts.pop_back(); continue; }
            if (t < pp->start) { ++i; continue; }
            if (pp->ch < 0) brkIn += pp->tick(t) * pp->vel; else chs[pp->ch].in += pp->tick(t) * pp->vel;
            ++i;
        }
        if (brk) { if (t >= brk->stop) brk.reset(); else if (t >= brk->start) brkIn += brk->tick(t); }
        double duckG = duck.next(t);
        double mixL = 0, mixR = 0, dkL = 0, dkR = 0, revIn = 0, dlyIn = 0;
        for (int k = 0; k < NUM_SOUND; ++k) {
            auto& c = chs[k]; double x = c.in;
            if (k == BD) x = c.entry.process(x * .62);
            else if (k == BS) x = c.entry.process(x);
            else if (k == ST) x = c.stHp.process(x);
            x = c.cdrv.process(x); x = c.clp.process(x); x = c.chp.process(x);
            double y = x * c.gain.next(), pn = c.pan.next(), a = (pn + 1) / 2, gl = std::cos(a * PI / 2), gr = std::sin(a * PI / 2);
            if (k == BD) { mixL += y * gl; mixR += y * gr; revIn += rumLp.process(y * rum.next()); }
            else { double z = k == BS ? y * bduck.next(t) : y; dkL += z * gl; dkR += z * gr; }
            revIn += y * c.sv.next(); dlyIn += y * c.sd.next();
        }
        // the BREAK sits in the middle, under the kick's duck, with a touch of the room
        {   // through its own channel: drive, filter, level, pan, and the room and echo sends, like every drum
            auto& c = bch; double x = c.chp.process(c.clp.process(c.cdrv.process(brkIn)));
            double y = x * brkGain.next(), pn = c.pan.next(), a = (pn + 1) / 2;
            dkL += y * std::cos(a * PI / 2); dkR += y * std::sin(a * PI / 2);
            revIn += y * c.sv.next(); dlyIn += y * c.sd.next();
        }
        // dub delay: every repeat darker than the last, a little of it into the room
        double d = dl.read(dtime.next()), f = dhp.process(dlp.process(d));
        dl.write(dlyIn + f * fb.next());
        double dret_ = dret.process(f) * 1.6; dkL += dret_; dkR += dret_; revIn += dret_ * .18;
        // reverb
        double pr = pre.read(preSecs); pre.write(revIn);
        double rl = 0, rr = 0;
        for (int j = 0; j < 2; ++j) { double g = cvg[j].next(t); if (cv[j].hasIR()) { double a, b; cv[j].process(pr, a, b); rl += a * g; rr += b * g; } }
        rl = rvLp[0].process(rvShelf[0].process(rvf[0].process(rl))); rr = rvLp[1].process(rvShelf[1].process(rvf[1].process(rr)));
        dkL += rl * 11; dkR += rr * 11;
        mixL += dkL * duckG; mixR += dkR * duckG;
        mixL *= BUS; mixR *= BUS;
        // master: EQ kills, DJ filter, overdrive, volume, glue compressor, soft clip
        double ch2[2] = {mixL, mixR};
        for (int c = 0; c < 2; ++c) {
            double x = ch2[c];
            x = lo[c].process(x); x = mid[c].process(x); x = hi[c].process(x);
            x = lp1[c].process(x); x = lp2[c].process(x); x = hp1[c].process(x); x = hp2[c].process(x);
            ch2[c] = drv[c].process(x);
        }
        double g = mst.next(); double l = ch2[0] * g, r = ch2[1] * g;
        comp.process(l, r);
        auto clip = [](double x) { x = std::clamp(x * CLIPIN, -1.0, 1.0); return std::tanh(1.4 * 2.5 * x) / std::tanh(1.4) * OUT; };
        l = clip(l); r = clip(r);
        L[s] = (float)l; R[s] = (float)r; peak = std::max(peak, (float)std::max(std::fabs(l), std::fabs(r)));
        now += dt;
    }
    if (head >= 0) playhead = head;
    meter = std::max(peak, meter.load() * .9f);
}

} // namespace md442
