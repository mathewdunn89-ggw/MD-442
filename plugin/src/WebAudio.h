// The handful of Web Audio building blocks the MD|442 engine uses, written to the Web Audio spec
// (and to Chrome's implementation where the spec leaves room), so the C++ engine sounds like the web one.
#pragma once
#include <vector>
#include <cmath>
#include <cstdint>
#include <algorithm>
#include <memory>
#include <complex>

namespace md442 {

constexpr double PI = 3.14159265358979323846;

// ---------- AudioParam automation: setValueAtTime, linear / exponential ramps, setTargetAtTime, cancelAndHoldAtTime ----------
class Param {
public:
    explicit Param(double v = 0) : val(v), prevV(v) {}
    enum Type { SET, LIN, EXP, TARGET };
    struct Ev { Type type; double t, v, tau; };
    void setValue(double v) { val = prevV = v; mode = CONST; events.clear(); }
    void setValueAtTime(double v, double t) { add({SET, t, v, 0}); }
    void linearRampToValueAtTime(double v, double t) { add({LIN, t, v, 0}); }
    void exponentialRampToValueAtTime(double v, double t) { add({EXP, t, v, 0}); }
    void setTargetAtTime(double v, double t, double tau) { add({TARGET, t, v, tau}); }
    // freeze the automation at t: drop what comes after, keep the value it would have had
    void cancelAndHoldAtTime(double t) {
        double v = valueAt(t);
        events.erase(std::remove_if(events.begin(), events.end(), [t](const Ev& e) { return e.t >= t; }), events.end());
        // a ramp still running at t is cut short there
        add({SET, t, v, 0});
    }
    bool idle() const { return events.empty() && mode == CONST; }
    // value at time t; t only moves forward between calls
    double next(double t) {
        while (!events.empty() && events.front().t <= t) consume(events.front()), events.erase(events.begin());
        val = compute(t);
        return val;
    }
    double current() const { return val; }
private:
    enum Mode { CONST, TGT };
    std::vector<Ev> events;
    double val, prevV, prevT = -1e9; Mode mode = CONST; double tgt = 0, tgtTau = 1, tgtT0 = 0, tgtV0 = 0;
    void add(Ev e) {
        auto it = std::upper_bound(events.begin(), events.end(), e.t, [](double t, const Ev& x) { return t < x.t; });
        events.insert(it, e);
    }
    double held(double t) const { return mode == TGT ? tgt + (tgtV0 - tgt) * std::exp(-(t - tgtT0) / tgtTau) : prevV; }
    double compute(double t) const {
        if (!events.empty()) {
            const Ev& n = events.front();
            if (n.type == LIN || n.type == EXP) {
                double T0 = prevT, V0 = mode == TGT ? held(prevT) : prevV;
                if (mode == TGT) { T0 = prevT; V0 = tgtV0; }
                double span = n.t - T0; if (span <= 0) return n.v;
                double f = (t - T0) / span;
                if (n.type == LIN) return V0 + (n.v - V0) * f;
                if (V0 * n.v <= 0) return V0;   // the spec: an exponential ramp from or to zero holds its start value
                return V0 * std::pow(n.v / V0, f);
            }
        }
        return held(t);
    }
    void consume(const Ev& e) {
        switch (e.type) {
            case SET: prevV = e.v; mode = CONST; break;
            case LIN: case EXP: prevV = e.v; mode = CONST; break;
            case TARGET: tgtV0 = compute(e.t); tgt = e.v; tgtTau = std::max(1e-6, e.tau); tgtT0 = e.t; mode = TGT; break;
        }
        prevT = e.t;
    }
public:
    // value at a future time, without disturbing this param (used by cancelAndHold)
    double valueAt(double t) const { Param c = *this; return c.next(t); }
};

// one-pole glide toward a target, the way setTargetAtTime(v, now, tc) moves a live knob
struct Smooth {
    double cur = 0, target = 0, coef = 0;
    void snap(double v) { cur = target = v; }
    void set(double v, double tc, double sr) { target = v; coef = std::exp(-1.0 / (std::max(1e-5, tc) * sr)); }
    double next() { cur = target + (cur - target) * coef; if (std::fabs(cur - target) < 1e-9) cur = target; return cur; }
    bool moving() const { return cur != target; }
};

// ---------- BiquadFilterNode, coefficients exactly as the Web Audio spec gives them ----------
struct Biquad {
    enum Type { LOWPASS, HIGHPASS, BANDPASS, PEAKING, LOWSHELF, HIGHSHELF };
    Type type = LOWPASS; double sr = 48000;
    double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    double f = 350, q = 1, g = 0;
    Biquad() = default;
    Biquad(Type t, double s, double freq, double Q = 1, double gain = 0) : type(t), sr(s) { set(freq, Q, gain); }
    void set(double freq, double Q, double gain) {
        f = freq; q = Q; g = gain;
        double nyq = sr / 2, fn = std::clamp(freq, 0.0, nyq) / sr, w0 = 2 * PI * fn, cw = std::cos(w0), sw = std::sin(w0);
        double A = std::pow(10, gain / 40), B0 = 1, B1 = 0, B2 = 0, A0 = 1, A1 = 0, A2 = 0;
        switch (type) {
            case LOWPASS: case HIGHPASS: {
                if (fn >= .5) { setCoefs(1, 0, 0, 1, 0, 0); return; }
                if (fn <= 0) { if (type == LOWPASS) setCoefs(0, 0, 0, 1, 0, 0); else setCoefs(1, 0, 0, 1, 0, 0); return; }
                double al = sw / (2 * std::pow(10, Q / 20));
                if (type == LOWPASS) { B0 = (1 - cw) / 2; B1 = 1 - cw; B2 = (1 - cw) / 2; }
                else { B0 = (1 + cw) / 2; B1 = -(1 + cw); B2 = (1 + cw) / 2; }
                A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
            }
            case BANDPASS: {
                if (fn <= 0 || fn >= .5) { setCoefs(0, 0, 0, 1, 0, 0); return; }
                if (Q <= 0) { setCoefs(1, 0, 0, 1, 0, 0); return; }
                double al = sw / (2 * Q); B0 = al; B1 = 0; B2 = -al; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
            }
            case PEAKING: {
                if (fn <= 0 || fn >= .5) { setCoefs(1, 0, 0, 1, 0, 0); return; }
                if (Q <= 0) { setCoefs(A * A, 0, 0, 1, 0, 0); return; }
                double al = sw / (2 * Q); B0 = 1 + al * A; B1 = -2 * cw; B2 = 1 - al * A; A0 = 1 + al / A; A1 = -2 * cw; A2 = 1 - al / A; break;
            }
            case LOWSHELF: case HIGHSHELF: {
                if (fn >= .5) { setCoefs(type == LOWSHELF ? A * A : 1, 0, 0, 1, 0, 0); return; }
                if (fn <= 0) { setCoefs(type == LOWSHELF ? 1 : A * A, 0, 0, 1, 0, 0); return; }
                double al = sw / 2 * std::sqrt(2.0), sa = 2 * std::sqrt(A) * al;
                if (type == LOWSHELF) {
                    B0 = A * ((A + 1) - (A - 1) * cw + sa); B1 = 2 * A * ((A - 1) - (A + 1) * cw); B2 = A * ((A + 1) - (A - 1) * cw - sa);
                    A0 = (A + 1) + (A - 1) * cw + sa; A1 = -2 * ((A - 1) + (A + 1) * cw); A2 = (A + 1) + (A - 1) * cw - sa;
                } else {
                    B0 = A * ((A + 1) + (A - 1) * cw + sa); B1 = -2 * A * ((A - 1) + (A + 1) * cw); B2 = A * ((A + 1) + (A - 1) * cw - sa);
                    A0 = (A + 1) - (A - 1) * cw + sa; A1 = 2 * ((A - 1) - (A + 1) * cw); A2 = (A + 1) - (A - 1) * cw - sa;
                }
                break;
            }
        }
        setCoefs(B0, B1, B2, A0, A1, A2);
    }
    void setCoefs(double B0, double B1, double B2, double A0, double A1, double A2) { b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0; }
    inline double process(double x) {
        double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        if (std::fabs(y1) < 1e-25) y1 = 0; if (std::fabs(y2) < 1e-25) y2 = 0;   // no denormals
        return y;
    }
    void reset() { x1 = x2 = y1 = y2 = 0; }
};

// A biquad whose frequency (and Q) follow smoothed or automated values; coefficients are refreshed every few samples while they move
struct MovingBiquad {
    Biquad bq; Smooth fs, qs, gs; int cnt = 0;
    void init(Biquad::Type t, double sr, double f, double q, double g = 0) { bq = Biquad(t, sr, f, q, g); fs.snap(f); qs.snap(q); gs.snap(g); }
    void target(double f, double q, double tc, double sr) { fs.set(f, tc, sr); qs.set(q, tc, sr); }
    void targetGain(double g, double tc, double sr) { gs.set(g, tc, sr); }
    void snap(double f, double q) { fs.snap(f); qs.snap(q); bq.set(f, q, gs.cur); }
    void snapGain(double g) { gs.snap(g); bq.set(fs.cur, qs.cur, g); }
    inline double process(double x) {
        if (fs.moving() || qs.moving() || gs.moving()) {
            double f = fs.next(), q = qs.next(), g = gs.next();
            if (++cnt >= 8 || !(fs.moving() || qs.moving() || gs.moving())) { cnt = 0; bq.set(f, q, g); }
        }
        return bq.process(x);
    }
};

// ---------- OscillatorNode: sine, and band-limited square and sawtooth (PolyBLEP), scaled like Chrome's normalised tables ----------
struct Osc {
    enum Type { SINE, SQUARE, SAW };
    Type type = SINE; double phase = 0;   // in cycles
    static constexpr double NORM = .85;   // Chrome normalises its square and saw tables to a peak of 1, Gibbs overshoot included
    static inline double blep(double t, double dt) {
        if (t < dt) { t /= dt; return t + t - t * t - 1; }
        if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
        return 0;
    }
    inline double tick(double freq, double sr) {
        double dt = std::clamp(freq / sr, 0.0, .5), p = phase, y;
        switch (type) {
            case SINE: y = std::sin(2 * PI * p); break;
            case SQUARE: { y = p < .5 ? 1 : -1; y += blep(p, dt); double p2 = p + .5; if (p2 >= 1) p2 -= 1; y -= blep(p2, dt); y *= NORM; break; }
            default: { double p2 = p + .5; if (p2 >= 1) p2 -= 1; y = 2 * p2 - 1; y -= blep(p2, dt); y *= NORM; break; }
        }
        phase += dt; if (phase >= 1) phase -= 1;
        return y;
    }
};

// ---------- WaveShaperNode: a curve over -1..1, optionally run at twice the rate ----------
struct HalfBand {   // 2x up / down sampling with a windowed-sinc low-pass
    static constexpr int N = 31;
    double h[N]; double up[N] {}, dn[N] {}; int ui = 0, di = 0;
    HalfBand() {
        for (int i = 0; i < N; ++i) {
            double m = i - (N - 1) / 2.0, s = m == 0 ? .5 : std::sin(PI * m / 2) / (PI * m), w = .42 - .5 * std::cos(2 * PI * i / (N - 1)) + .08 * std::cos(4 * PI * i / (N - 1));
            h[i] = s * w;
        }
        double sum = 0; for (double v : h) sum += v; for (double& v : h) v /= sum;
    }
    static inline double fir(const double* hh, const double* buf, int idx) { double y = 0; for (int i = 0; i < N; ++i) { int j = idx - i; if (j < 0) j += N; y += hh[i] * buf[j]; } return y; }
    template <class F> inline double run(double x, F&& shape) {
        double out = 0;
        for (int s = 0; s < 2; ++s) {
            up[ui] = s == 0 ? 2 * x : 0; double u = fir(h, up, ui); ui = (ui + 1) % N;
            dn[di] = shape(u); double d = fir(h, dn, di); di = (di + 1) % N;
            if (s == 1) out = d;
        }
        return out;
    }
};
struct Shaper {   // y = comp * tanh(k x) / tanh(k), with x held to -1..1 like the end of a curve; k = 0 means no curve (straight through)
    double k = 0, comp = 1, nrm = 1; bool os2 = false; HalfBand hb;
    void set(double kk, double cc) { k = kk; comp = cc; nrm = kk > 0 ? std::tanh(kk) : 1; }
    // drive that adds grit without jumping in level: a signal peaking at A is rounded off, the quiet parts only come up a little
    void setSoft(double amt, double A) { double kA = .05 + amt * 3; k = kA / A; nrm = std::tanh(kA); comp = A * std::pow(std::tanh(kA) / kA, .5); }
    void clear() { k = 0; }
    inline double curve(double x) const { x = std::clamp(x, -1.0, 1.0); return std::tanh(k * x) / nrm * comp; }
    inline double process(double x) {
        if (k <= 0) return x;
        if (!os2) return curve(x);
        return hb.run(x, [this](double u) { return curve(u); });
    }
};

// ---------- noise and a fast random number ----------
struct Rng { uint32_t s = 22222; explicit Rng(uint32_t seed = 22222) : s(seed ? seed : 1) {} inline double next() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s / 4294967296.0) * 2 - 1; } };

// ---------- DelayNode with linear interpolation ----------
struct DelayLine {
    std::vector<double> buf; size_t w = 0; double sr = 48000;
    void init(double maxSecs, double s) { sr = s; buf.assign((size_t)(maxSecs * s) + 4, 0.0); w = 0; }
    inline double read(double secs) const {
        double d = std::clamp(secs * sr, 1.0, (double)buf.size() - 2); double r = (double)w - d; while (r < 0) r += (double)buf.size();
        size_t i = (size_t)r; double f = r - (double)i; size_t j = (i + 1) % buf.size();
        return buf[i] * (1 - f) + buf[j] * f;
    }
    inline void write(double x) { buf[w] = x; w = (w + 1) % buf.size(); }
};

// ---------- DynamicsCompressorNode: a port of Chrome's compressor kernel (makeup gain, 6 ms look-ahead, adaptive release) ----------
struct Compressor {
    double sr = 48000; double threshold = -24, knee = 30, ratio = 12, attack = .003, release = .25;
    double linThr = 0, kneeThrDb = 0, kneeThrLin = 0, ykneeThrDb = 0, slope = 1, K = 1, makeup = 1;
    double detectorAverage = 0, compressorGain = 1, maxAttackDiff = -1;
    double kA = 0, kB = 0, kC = 0, kD = 0, kE = 0, satReleaseFrames = 0, attackFrames = 0, envelopeRate = 1;
    std::vector<double> preL, preR; size_t pw = 0, predelay = 0; int frameInDiv = 0;
    static double db2lin(double d) { return std::pow(10, d / 20); }
    static double lin2db(double l) { return l <= 0 ? -1000 : 20 * std::log10(l); }
    double kneeCurve(double x, double k) const { if (x < linThr) return x; return linThr + (1 - std::exp(-k * (x - linThr))) / k; }
    double saturate(double x, double k) const {
        if (x < kneeThrLin) return kneeCurve(x, k);
        return db2lin(ykneeThrDb + slope * (lin2db(x) - kneeThrDb));
    }
    double slopeAt(double x, double k) const {
        if (x < linThr) return 1;
        double x2 = x * 1.001, xDb = lin2db(x), x2Db = lin2db(x2), yDb = lin2db(kneeCurve(x, k)), y2Db = lin2db(kneeCurve(x2, k));
        return (y2Db - yDb) / (x2Db - xDb);
    }
    double kAtSlope(double desired) const {
        double x = db2lin(threshold + knee), minK = .1, maxK = 10000, k = 5;
        for (int i = 0; i < 15; ++i) { double s = slopeAt(x, k); if (s < desired) maxK = k; else minK = k; k = std::sqrt(minK * maxK); }
        return k;
    }
    void init(double s, double thr, double kn, double rat, double att, double rel) {
        sr = s; threshold = thr; knee = kn; ratio = rat; attack = att; release = rel;
        linThr = db2lin(thr); slope = 1 / ratio;
        // kAtSlope reads kneeThr through kneeCurve only via linThr, so the order is safe
        K = kAtSlope(1 / ratio); kneeThrDb = thr + kn; kneeThrLin = db2lin(kneeThrDb); ykneeThrDb = lin2db(kneeCurve(kneeThrLin, K));
        makeup = std::pow(1 / saturate(1, K), .6);
        attackFrames = std::max(.001, attack) * sr;
        double releaseFrames = sr * release, y1 = releaseFrames * .09, y2 = releaseFrames * .16, y3 = releaseFrames * .42, y4 = releaseFrames * .98;
        kA = 0.9999999999999998 * y1 + 1.8432219684323923e-16 * y2 - 1.9373394351676423e-16 * y3 + 8.824516011816245e-18 * y4;
        kB = -1.5788320352845888 * y1 + 2.3305837032074286 * y2 - 0.9141194204840429 * y3 + 0.1623677525612032 * y4;
        kC = 0.5334142869106424 * y1 - 1.272736789213631 * y2 + 0.9258856042207512 * y3 - 0.18656310191776226 * y4;
        kD = 0.08783463138207234 * y1 - 0.1694162967925622 * y2 + 0.08588057951595272 * y3 - 0.00429891410546283 * y4;
        kE = -0.042416883008123074 * y1 + 0.1115693827987602 * y2 - 0.09764676325265872 * y3 + 0.03699113564733961 * y4;
        satReleaseFrames = .0025 * sr;
        predelay = (size_t)std::lround(.006 * sr); preL.assign(1024 * 8, 0.0); preR.assign(1024 * 8, 0.0); pw = 0;
        detectorAverage = 0; compressorGain = 1; maxAttackDiff = -1; frameInDiv = 0; envelopeRate = 1;
    }
    void updateEnvelope() {
        double desired = detectorAverage, scaled = std::asin(std::clamp(desired, 0.0, 1.0)) / (PI / 2);
        bool releasing = scaled > compressorGain;
        double diff = scaled <= 0 ? INFINITY : lin2db(compressorGain / scaled);   // Chrome turns an infinite difference into +-1 dB below
        if (releasing) {
            maxAttackDiff = -1; if (!std::isfinite(diff)) diff = -1;
            double x = std::clamp(diff, -12.0, 0.0); x = .25 * (x + 12);
            double x2 = x * x, x3 = x2 * x, x4 = x2 * x2, rf = kA + kB * x + kC * x2 + kD * x3 + kE * x4;
            envelopeRate = db2lin(5 / rf);
        } else {
            if (!std::isfinite(diff)) diff = 1;
            if (maxAttackDiff == -1 || maxAttackDiff < diff) maxAttackDiff = diff;
            double eff = std::max(.5, maxAttackDiff), x = .25 / eff;
            envelopeRate = 1 - std::pow(x, 1 / attackFrames);
        }
        envGoal = scaled;
    }
    double envGoal = 1;
    inline void process(double& l, double& r) {
        if (frameInDiv == 0) updateEnvelope();
        frameInDiv = (frameInDiv + 1) & 31;
        size_t n = preL.size(); preL[pw] = l; preR[pw] = r;
        size_t rd = (pw + n - predelay) % n; pw = (pw + 1) % n;
        double absIn = std::max(std::fabs(l), std::fabs(r));
        double shaped = saturate(absIn, K), att = absIn <= .0001 ? 1 : shaped / absIn;
        double attDb = std::max(2.0, -lin2db(att)), satRate = db2lin(attDb / satReleaseFrames) - 1;
        double rate = att > detectorAverage ? satRate : 1;
        detectorAverage += (att - detectorAverage) * rate; detectorAverage = std::min(1.0, detectorAverage);
        if (!std::isfinite(detectorAverage)) detectorAverage = 1;
        if (envelopeRate < 1) compressorGain += (envGoal - compressorGain) * envelopeRate;
        else { compressorGain *= envelopeRate; compressorGain = std::min(1.0, compressorGain); }
        double gain = makeup * std::sin(PI / 2 * compressorGain);
        l = preL[rd] * gain; r = preR[rd] * gain;
    }
};

// ---------- ConvolverNode: uniform partitioned FFT convolution, stereo impulse, mono in ----------
class FFT {
public:
    explicit FFT(int n = 1024) { init(n); }
    void init(int n) {
        N = n; rev.assign((size_t)n, 0); tw.resize((size_t)n / 2);
        int bits = 0; while ((1 << bits) < n) ++bits;
        for (int i = 0; i < n; ++i) { int r = 0; for (int b = 0; b < bits; ++b) if (i & (1 << b)) r |= 1 << (bits - 1 - b); rev[(size_t)i] = r; }
        for (int i = 0; i < n / 2; ++i) tw[(size_t)i] = std::polar(1.0, -2 * PI * i / n);
    }
    void run(std::complex<double>* a, bool inverse) const {
        for (int i = 0; i < N; ++i) if (i < rev[(size_t)i]) std::swap(a[i], a[rev[(size_t)i]]);
        for (int len = 2; len <= N; len <<= 1) {
            int step = N / len;
            for (int i = 0; i < N; i += len) for (int j = 0; j < len / 2; ++j) {
                std::complex<double> w = tw[(size_t)(j * step)]; if (inverse) w = std::conj(w);
                std::complex<double> u = a[i + j], v = a[i + j + len / 2] * w; a[i + j] = u + v; a[i + j + len / 2] = u - v;
            }
        }
        if (inverse) for (int i = 0; i < N; ++i) a[i] /= N;
    }
    int size() const { return N; }
private:
    int N = 0; std::vector<int> rev; std::vector<std::complex<double>> tw;
};

struct ImpulseResponse {   // a stereo impulse, cut into FFT'd partitions
    int B = 512; std::vector<std::vector<std::complex<double>>> part[2]; double scale = 1;
};

class Convolver {
public:
    static constexpr int B = 512;   // latency in samples; taken out of the reverb's pre-delay, so the room arrives exactly when it does on the web
    Convolver() : fft(2 * B) { reset(); }
    void reset() {
        inBuf.assign(B, 0.0); prevIn.assign(B, 0.0); outL.assign(B, 0.0); outR.assign(B, 0.0); pos = 0;
        hist.clear(); histPos = 0; spec.assign(2 * B, {});
    }
    void setIR(std::shared_ptr<const ImpulseResponse> r) {
        ir = std::move(r);
        size_t P = ir ? ir->part[0].size() : 0;
        hist.assign(P, std::vector<std::complex<double>>(2 * B)); histPos = 0;
    }
    bool hasIR() const { return ir != nullptr; }
    inline void process(double x, double& l, double& r) {
        l = outL[(size_t)pos]; r = outR[(size_t)pos];
        inBuf[(size_t)pos] = x;
        if (++pos == B) { pos = 0; block(); }
    }
    static std::shared_ptr<ImpulseResponse> prepare(const std::vector<float>& L, const std::vector<float>& R, double scale) {
        auto ir = std::make_shared<ImpulseResponse>(); FFT f(2 * B); ir->scale = scale;
        const std::vector<float>* ch[2] = {&L, &R};
        size_t P = (L.size() + B - 1) / B;
        for (int c = 0; c < 2; ++c) {
            ir->part[c].resize(P);
            for (size_t p = 0; p < P; ++p) {
                std::vector<std::complex<double>> a(2 * B);
                for (int i = 0; i < B; ++i) { size_t j = p * B + (size_t)i; a[(size_t)i] = j < ch[c]->size() ? (*ch[c])[j] * scale : 0.0; }
                f.run(a.data(), false); ir->part[c][p] = std::move(a);
            }
        }
        return ir;
    }
private:
    FFT fft; std::shared_ptr<const ImpulseResponse> ir;
    std::vector<double> inBuf, prevIn, outL, outR; int pos = 0;
    std::vector<std::vector<std::complex<double>>> hist; size_t histPos = 0; std::vector<std::complex<double>> spec;
    void block() {
        if (!ir || hist.empty()) { std::fill(outL.begin(), outL.end(), 0.0); std::fill(outR.begin(), outR.end(), 0.0); prevIn = inBuf; return; }
        auto& X = hist[histPos];
        for (int i = 0; i < B; ++i) { X[(size_t)i] = prevIn[(size_t)i]; X[(size_t)(i + B)] = inBuf[(size_t)i]; }
        fft.run(X.data(), false); prevIn = inBuf;
        size_t P = hist.size();
        for (int c = 0; c < 2; ++c) {
            std::fill(spec.begin(), spec.end(), std::complex<double>());
            for (size_t p = 0; p < P; ++p) {
                const auto& H = ir->part[c][p]; const auto& Xp = hist[(histPos + P - p) % P];
                for (int k = 0; k <= B; ++k) spec[(size_t)k] += Xp[(size_t)k] * H[(size_t)k];   // real signals: the upper half mirrors the lower
            }
            for (int k = B + 1; k < 2 * B; ++k) spec[(size_t)k] = std::conj(spec[(size_t)(2 * B - k)]);
            fft.run(spec.data(), true);
            auto& o = c ? outR : outL; for (int i = 0; i < B; ++i) o[(size_t)i] = spec[(size_t)(i + B)].real();
        }
        histPos = (histPos + 1) % P;
    }
};

} // namespace md442
