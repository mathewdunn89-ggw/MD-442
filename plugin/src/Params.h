// MD|442 parameters, in real units: a straight port of section 1 of md442.js.
// Keep this file in step with the web app, so a preset sounds the same in both.
#pragma once
#include <string>
#include <vector>
#include <map>
#include <cmath>
#include <array>
#include <algorithm>

namespace md442 {

enum Voice { BD, SD, CP, RS, LT, MT, HT, CH, OH, CR, RD, BS, ST, AC, NUM_KEYS };
constexpr int NUM_SOUND = 13;   // every key but the accent row
constexpr int STEPS = 16;

struct VoiceInfo { const char* id; const char* name; const char* shortName; };
inline const std::array<VoiceInfo, NUM_KEYS>& voices() {
    static const std::array<VoiceInfo, NUM_KEYS> v {{
        {"BD", "Kick", "KICK"}, {"SD", "Snare", "SNARE"}, {"CP", "Clap", "CLAP"}, {"RS", "Rim shot", "RIM"},
        {"LT", "Low tom", "LO TOM"}, {"MT", "Mid tom", "MID TOM"}, {"HT", "Hi tom", "HI TOM"},
        {"CH", "Closed hat", "CL HAT"}, {"OH", "Open hat", "OP HAT"}, {"CR", "Crash", "CRASH"}, {"RD", "Ride", "RIDE"},
        {"BS", "Bass", "BASS"}, {"ST", "Chords", "CHORDS"}, {"AC", "Accent", "ACCENT"} }};
    return v;
}

struct Chord { const char* name; std::vector<int> iv; };
inline const std::vector<Chord>& chords() {
    static const std::vector<Chord> c { {"Fifth", {0, 7, 12}}, {"Minor", {0, 3, 7}}, {"Min 7", {0, 3, 7, 10}}, {"Min 9", {0, 3, 7, 10, 14}},
        {"Maj 7", {0, 4, 7, 11}}, {"Maj 9", {0, 4, 7, 11, 14}}, {"6/9", {0, 4, 7, 9, 14}} };
    return c;
}
inline const char* noteName(int i) { static const char* n[] = {"E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#"}; return n[((i % 12) + 12) % 12]; }
static const int NOTE_CYCLE[] = {0, 3, 5, 7, 10, 12, -2};
struct ETime { const char* name; double sixteenths; };
static const ETime ETIMES[] = {{"1/16", 1}, {"1/8 T", 4.0 / 3}, {"1/8", 2}, {"3/16", 3}, {"1/4", 4}, {"3/8", 6}};

enum Fmt { F_DB, F_HZ, F_MS, F_PC, F_ST, F_BPM, F_KEY, F_CHORD, F_ETIME, F_PAN, F_FILTER, F_SEC, F_KIT, F_SLOT, F_NUM };

struct ParamDef { std::string id; double mn, mx, df; std::string label; Fmt f; bool exp; double step; };

inline double lpHz(double v) { return 18000 * std::pow(140.0 / 18000, (-v - 4) / 96); }
inline double hpHz(double v) { return 20 * std::pow(4500.0 / 20, (v - 4) / 96); }

inline std::string fmtHz(double v) {
    char b[32];
    if (v >= 1000) std::snprintf(b, sizeof b, v >= 10000 ? "%.0f kHz" : "%.1f kHz", v / 1000); else std::snprintf(b, sizeof b, "%d Hz", (int)std::lround(v));
    return b;
}
inline std::string sgn(double v) { return v > 0 ? "+" : v < 0 ? "-" : ""; }
inline std::string formatValue(const ParamDef& d, double v) {
    char b[48];
    switch (d.f) {
        case F_DB: if (v <= -40) return "OFF"; std::snprintf(b, sizeof b, "%s%g dB", sgn(v).c_str(), std::fabs(std::round(v * 2) / 2)); return b;
        case F_HZ: return fmtHz(v);
        case F_MS: case F_SEC:
            if (v <= 4) { std::snprintf(b, sizeof b, v < 1 ? "%.2f s" : "%.1f s", v); return b; }
            if (v >= 1000) { std::snprintf(b, sizeof b, "%.2f s", v / 1000); return b; }
            std::snprintf(b, sizeof b, "%d ms", (int)std::lround(v)); return b;
        case F_PC: std::snprintf(b, sizeof b, "%d%%", (int)std::lround(v)); return b;
        case F_ST: std::snprintf(b, sizeof b, "%s%g st", sgn(v).c_str(), std::fabs(v)); return b;
        case F_BPM: std::snprintf(b, sizeof b, "%d BPM", (int)std::lround(v)); return b;
        case F_KEY: return noteName((int)std::lround(v));
        case F_CHORD: return chords()[(size_t)std::clamp((int)std::lround(v), 0, 6)].name;
        case F_ETIME: return ETIMES[std::clamp((int)std::lround(v), 0, 5)].name;
        case F_PAN: if (std::fabs(v) < 3) return "C"; std::snprintf(b, sizeof b, "%s %d", v < 0 ? "L" : "R", (int)std::lround(std::fabs(v))); return b;
        case F_FILTER: if (std::fabs(v) < 4) return "OFF"; return (v < 0 ? "LP " + fmtHz(lpHz(v)) : "HP " + fmtHz(hpHz(v)));
        case F_KIT: { static const char* k[] = {"OFF", "MD187", "MD888"}; return k[std::clamp((int)std::lround(v), 0, 2)]; }
        case F_SLOT: std::snprintf(b, sizeof b, "LOOP %d", (int)std::lround(v) + 1); return b;
        case F_NUM: std::snprintf(b, sizeof b, "%d", (int)std::lround(v)); return b;
    }
    return "";
}

// The level of each drum, its pan, and its reverb and echo sends (preset defaults)
inline const std::vector<ParamDef>& defs() {
    static std::vector<ParamDef> d;
    if (!d.empty()) return d;
    auto D = [](const std::string& k, double mn, double mx, double df, const std::string& lb, Fmt f, bool exp = false, double step = -1) {
        d.push_back({k, mn, mx, df, lb, f, exp, step > 0 ? step : (f == F_DB ? .5 : 1)});
    };
    D("vol", -40, 6, -3, "Volume", F_DB); D("bpm", 60, 200, 128, "Tempo", F_BPM); D("shuffle", 50, 75, 50, "Shuffle", F_PC); D("key", 0, 11, 0, "Key", F_KEY); D("accent", 0, 12, 5, "Accent", F_DB);
    D("bd.tune", 36, 72, 50, "Kick tune", F_HZ, false, .5); D("bd.decay", 120, 1800, 500, "Kick decay", F_MS, true); D("bd.attack", 0, 100, 50, "Kick attack", F_PC); D("bd.punch", 0, 100, 50, "Kick punch", F_PC); D("bd.rumble", 0, 100, 0, "Kick rumble", F_PC);
    D("sd.tune", -12, 12, 0, "Snare tune", F_ST, false, .5); D("sd.tone", 0, 100, 50, "Snare tone", F_PC); D("sd.snappy", 0, 100, 65, "Snappy", F_PC); D("sd.decay", 80, 900, 300, "Snare decay", F_MS, false, 5);
    D("cp.tone", 700, 2200, 1300, "Clap tone", F_HZ, false, 10); D("cp.decay", 60, 800, 300, "Clap decay", F_MS, false, 5);
    D("rs.tune", -12, 12, 0, "Rim tune", F_ST, false, .5);
    for (auto t : {std::pair<std::string, std::string>{"lt", "Low tom"}, {"mt", "Mid tom"}, {"ht", "Hi tom"}}) {
        D(t.first + ".tune", -12, 12, 0, t.second + " tune", F_ST, false, .5); D(t.first + ".decay", 100, 1200, 400, t.second + " decay", F_MS, false, 10);
    }
    D("ch.decay", 20, 400, 80, "Closed hat decay", F_MS, true); D("oh.decay", 150, 2000, 500, "Open hat decay", F_MS, true); D("hh.tone", 0, 100, 60, "Hats tone", F_PC);
    D("cr.tune", -12, 12, 0, "Crash tune", F_ST, false, .5); D("cr.decay", 400, 4000, 1600, "Crash decay", F_MS, true); D("cr.tone", 0, 100, 50, "Crash tone", F_PC);
    D("rd.tune", -12, 12, 0, "Ride tune", F_ST, false, .5); D("rd.decay", 300, 3000, 1100, "Ride decay", F_MS, true); D("rd.tone", 0, 100, 50, "Ride tone", F_PC);
    D("bs.cutoff", 60, 8000, 500, "Bass cutoff", F_HZ, true); D("bs.reso", 0, 100, 45, "Bass reso", F_PC); D("bs.acid", 0, 100, 0, "Acid", F_PC); D("bs.drive", 0, 100, 30, "Bass drive", F_PC); D("bs.echo", 0, 100, 0, "Bass echo", F_PC); D("bs.fat", 0, 100, 0, "Bass fat", F_PC); D("bs.decay", 40, 800, 200, "Bass decay", F_MS, true);
    D("st.tone", 300, 12000, 2500, "Stab tone", F_HZ, true); D("st.decay", 80, 1700, 400, "Stab decay", F_MS, true); D("st.chord", 0, 6, 1, "Chord", F_CHORD); D("st.echo", 0, 100, 0, "Stab echo", F_PC); D("st.verb", 0, 100, 0, "Stab verb", F_PC);
    D("fx.filter", -100, 100, 0, "Filter", F_FILTER); D("fx.verb", 0, 100, 0, "Reverb", F_PC); D("fx.space", 0, 100, 0, "Space", F_PC); D("fx.drive", 0, 100, 0, "Drive", F_PC);
    D("fx.vdec", .3, 4, 1.6, "Reverb decay", F_SEC, true); D("fx.etime", 0, 5, 3, "Echo time", F_ETIME); D("fx.efb", 0, 95, 50, "Echo feedback", F_PC);
    // the BREAK: MD187 / MD888 loops and their 8 slices (off on MD442's own patterns)
    D("brk.kit", 0, 2, 0, "Break kit", F_KIT); D("brk.slot", 0, 3, 0, "Break loop", F_SLOT); D("brk.level", 0, 127, 90, "Break level", F_NUM);
    D("brk.complex", 0, 100, 0, "Break chop", F_PC); D("brk.pitch", -12, 12, 0, "Break pitch", F_ST, false, .5);
    // the BREAK's channel tools, the same five as every drum
    D("pan.BRK", -100, 100, 0, "Break pan", F_PAN); D("flt.BRK", -100, 100, 0, "Break filter", F_FILTER); D("drv.BRK", 0, 100, 0, "Break channel drive", F_PC);
    D("rev.BRK", 0, 100, 12, "Break reverb send", F_PC); D("ech.BRK", 0, 100, 8, "Break echo send", F_PC);
    const double LEVEL[] = {0, -3, -4, -8, -6, -6, -6, -3, -4, -6, -8, -5.5, -6};
    const double PAN[] = {0, 0, 0, -12, -30, 0, 30, 18, -18, -24, 26, 0, 0};
    const double RV[] = {0, .5, .7, .45, .5, .55, .55, .16, .24, .3, .2, 0, 0}, DV[] = {0, .32, .45, .4, .4, .5, .5, .1, .18, .2, .12, 0, 0};
    for (int k = 0; k < NUM_SOUND; ++k) D(std::string("lvl.") + voices()[k].id, -40, 6, LEVEL[k], std::string(voices()[k].name) + " level", F_DB);
    for (int k = 0; k < NUM_SOUND; ++k) {
        std::string id = voices()[k].id, nm = voices()[k].name;
        D("pan." + id, -100, 100, PAN[k], nm + " pan", F_PAN); D("flt." + id, -100, 100, 0, nm + " filter", F_FILTER); D("drv." + id, 0, 100, 0, nm + " channel drive", F_PC);
        if (k != ST) D("rev." + id, 0, 100, std::round(RV[k] * 100), nm + " reverb send", F_PC);
        if (k != ST && k != BS) D("ech." + id, 0, 100, std::round(DV[k] * 100), nm + " echo send", F_PC);
    }
    return d;
}
inline int defIndex(const std::string& k) {
    static std::map<std::string, int> m; if (m.empty()) { for (size_t i = 0; i < defs().size(); ++i) m[defs()[i].id] = (int)i; }
    auto it = m.find(k); return it == m.end() ? -1 : it->second;
}
// knob travel 0..1 <-> value, exactly as the web app turns its knobs
inline double toPos(const ParamDef& d, double v) { return d.exp ? std::log(v / d.mn) / std::log(d.mx / d.mn) : (v - d.mn) / (d.mx - d.mn); }
inline double toVal(const ParamDef& d, double p) {
    p = std::clamp(p, 0.0, 1.0);
    if (!d.exp) return std::clamp(std::round((d.mn + p * (d.mx - d.mn)) / d.step) * d.step, d.mn, d.mx);
    double v = d.mn * std::pow(d.mx / d.mn, p); char b[32]; std::snprintf(b, sizeof b, "%.3g", v); return std::clamp(std::atof(b), d.mn, d.mx);
}

// The knobs each voice owns, as on the web console
struct KnobRef { const char* key; const char* label; };
inline std::vector<KnobRef> voiceKnobs(int k) {
    switch (k) {
        case BD: return {{"bd.tune", "TUNE"}, {"bd.decay", "DECAY"}, {"bd.attack", "ATTACK"}, {"bd.punch", "PUNCH"}, {"bd.rumble", "RUMBLE"}};
        case SD: return {{"sd.tune", "TUNE"}, {"sd.tone", "TONE"}, {"sd.snappy", "SNAPPY"}, {"sd.decay", "DECAY"}};
        case CP: return {{"cp.tone", "TONE"}, {"cp.decay", "DECAY"}};
        case RS: return {{"rs.tune", "TUNE"}};
        case LT: return {{"lt.tune", "TUNE"}, {"lt.decay", "DECAY"}};
        case MT: return {{"mt.tune", "TUNE"}, {"mt.decay", "DECAY"}};
        case HT: return {{"ht.tune", "TUNE"}, {"ht.decay", "DECAY"}};
        case CH: return {{"ch.decay", "DECAY"}, {"hh.tone", "TONE"}};
        case OH: return {{"oh.decay", "DECAY"}, {"hh.tone", "TONE"}};
        case CR: return {{"cr.tune", "TUNE"}, {"cr.decay", "DECAY"}, {"cr.tone", "TONE"}};
        case RD: return {{"rd.tune", "TUNE"}, {"rd.decay", "DECAY"}, {"rd.tone", "TONE"}};
        case BS: return {{"bs.cutoff", "CUTOFF"}, {"bs.reso", "RESO"}, {"bs.decay", "DECAY"}, {"bs.acid", "ACID"}, {"bs.fat", "FAT"}, {"bs.drive", "DRIVE"}};
        case ST: return {{"st.tone", "TONE"}, {"st.decay", "DECAY"}, {"st.chord", "CHORD"}};
        case AC: return {{"accent", "AMOUNT"}};
    }
    return {};
}
inline std::string revKey(int k) { return k == ST ? "st.verb" : std::string("rev.") + voices()[k].id; }
inline std::string echKey(int k) { return k == ST ? "st.echo" : k == BS ? "bs.echo" : std::string("ech.") + voices()[k].id; }

} // namespace md442
