// Mathew's seven patterns, converted to real units exactly as md442.js convert() does.
#pragma once
#include "Params.h"

namespace md442 {

struct Scene {
    std::array<std::array<bool, STEPS>, NUM_KEYS> g {};
    std::array<int, STEPS> n {};
    // the BREAKS row, as the web app's sampler plays it: '.' rest (what plays rings on), '1'-'8' a slice of the loop, '-' the slice before rings on, 'g' the loop plays on in time
    std::array<char, STEPS> brk { '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.' };
};

struct PresetSrc {
    const char* name; double bpm, swing; bool hard; double acid, root; std::vector<int> chord; std::array<int, 16> notes;
    std::array<int, 26> p; std::array<const char*, 8> g; double trim;
};

inline const std::vector<PresetSrc>& presetSources() {
    static const std::vector<PresetSrc> P {
        {"Peak Warehouse", 142, 0, true, .55, 41.2, {0, 7, 12}, {0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 15, 0, 0, 12, 0, 7},
         {45, 68, 85, 58, 55, 65, 30, 60, 40, 20, 74, 38, 72, 55, 35, 52, 62, 68, 0, 8, 70, 18, 35, 30, 24, 0},
         {"x...x...x...x...", "................", "....x.......x...", "xxxxxxxxxxxxxxxx", "..x...x...x...x.", "...........x..x.", ".xx..xx..xx..xx.", "..............x."}, 0.5},
        {"Berlin Roll", 133, 4, true, .25, 43.65, {0, 3, 7}, {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0},
         {58, 52, 68, 66, 45, 55, 38, 50, 50, 26, 56, 48, 56, 45, 45, 38, 48, 45, 10, 0, 42, 30, 70, 0, 0, 30},
         {"x...x...x...x...", "............x...", "................", "x.xxx.xxx.xxx.xx", "..x...x...x...x.", "..x.....x.x.....", ".x.x.x.x.x.x.x.x", "......x........."}, -1},
        {"Electro", 124, 6, true, .5, 49, {0, 3, 7, 10}, {0, 0, 0, 12, 0, 10, 0, 0, 0, 0, 0, 12, 0, 7, 10, 0},
         {45, 70, 85, 40, 55, 80, 40, 60, 45, 20, 70, 40, 68, 55, 35, 58, 55, 95, 0, 0, 68, 30, 25, 20, 12, 0},
         {"x...x...x...x...", "....x.......x...", "....x.......x...", "..xx..xx..xx..xx", "..x...x...x...x.", "................", "x.xx.x..x.xx.xx.", "......x.......x."}, 1.5},
        {"Acid Jack", 126, 8, false, .9, 55, {0, 3, 7}, {0, 0, 12, 0, 3, 0, 0, 12, 0, 7, 0, 0, 10, 12, 0, 0},
         {50, 60, 65, 35, 55, 60, 35, 55, 40, 22, 66, 40, 64, 55, 35, 48, 85, 55, 0, 0, 60, 20, 0, 0, 8, 0},
         {"x...x...x...x...", "................", "....x.......x...", "x.x.x.x.x.x.x.xx", "..x...x...x...x.", "................", "x.xxx.xx.xx.xxx.", "................"}, 2},
        {"Deep House", 122, 18, false, 0, 43.65, {0, 3, 7, 10, 14}, {0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 7, 0, 0, 0, 0, 0},
         {70, 35, 40, 42, 45, 45, 40, 48, 50, 30, 50, 48, 50, 50, 40, 32, 25, 15, 0, 0, 45, 45, 15, 25, 18, 0},
         {"x...x...x...x...", "................", "....x.......x...", "x..xx..xx..xx..x", "..x...x...x...x.", "......x......x..", "x..x...x..x.....", "x..x......x....."}, 3},
        {"Breakbeat", 134, 24, false, 0, 43.65, {0, 4, 7, 11, 14}, {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 7, 0, 0},
         {55, 50, 55, 40, 60, 50, 25, 55, 45, 22, 60, 40, 58, 60, 30, 30, 15, 15, 0, 0, 55, 55, 30, 45, 25, 15},
         {"x......x..x.....", ".........x.....x", "....x.......x...", "x.x.x.xxx.x.x.x.", "..x.......x.....", "...x.....x..x...", "x..x......x..x..", "x.....x...x....."}, 1.5},
        {"Dub Techno", 118, 12, false, 0, 46.25, {0, 3, 7, 10, 14}, {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
         {85, 10, 25, 55, 45, 40, 45, 42, 55, 18, 36, 55, 38, 70, 15, 22, 15, 8, 0, 10, 34, 62, 95, 85, 60, 70},
         {"x...x...x...x...", "................", "................", "..x..xx...x..xx.", "......x.........", "....x.......x..x", "x.....x...x.....", "..x.......x....."}, 0.5},
    };
    return P;
}

inline double halfR(double v) { return std::round(v * 2) / 2; }
inline bool bongoHi(int i) { return !(i == 0 || i == 3 || i == 6 || i == 10 || i == 13) && i % 2 == 0; }
// JS Math.round rounds .5 up, C++ round rounds away from zero; the values here are all positive except the tunes
inline double jsRound(double v) { return std::floor(v + .5); }

struct Converted { std::map<std::string, double> v; Scene sc; };
inline Converted convertPreset(const PresetSrc& p) {
    static const char* PK[] = {"bd.depth", "bd.attack", "bd.punch", "bd.decay", "sd.tune", "sd.snap", "sd.decay", "cp.tone", "cp.decay", "ch.decay", "ch.tone", "oh.decay", "oh.tone", "rm.tune", "rm.decay",
        "bs.cutoff", "bs.reso", "bs.drive", "bs.echo", "bs.verb", "st.tone", "st.decay", "st.echo", "st.verb", "fx.verb", "fx.space"};
    std::map<std::string, double> a; for (int j = 0; j < 26; ++j) a[PK[j]] = p.p[(size_t)j] / 100.0;
    Converted c; auto& v = c.v;
    v["bpm"] = p.bpm; v["shuffle"] = jsRound(50 + p.swing * .33);
    v["key"] = (double)((((int)jsRound(12 * std::log2(p.root / 41.2)) % 12) + 12) % 12);
    v["bd.tune"] = halfR(60 - a["bd.depth"] * 18); v["bd.decay"] = jsRound(3300 * (.045 + std::pow(a["bd.decay"], 1.6) * .5)); v["bd.attack"] = p.p[1]; v["bd.punch"] = p.p[2]; v["bd.rumble"] = p.hard ? 80 : 0;
    v["sd.tune"] = halfR((a["sd.tune"] - .5) * 10.8); v["sd.tone"] = 50; v["sd.snappy"] = p.p[5]; v["sd.decay"] = jsRound(3670 * (.045 + a["sd.decay"] * .2));
    v["cp.tone"] = jsRound(950 + a["cp.tone"] * 750); v["cp.decay"] = jsRound(3500 * (.028 + a["cp.decay"] * .2));
    v["ch.decay"] = jsRound(4160 * (.011 + std::pow(a["ch.decay"], 1.5) * .085)); v["oh.decay"] = jsRound(3450 * (.08 + std::pow(a["oh.decay"], 1.4) * .5)); v["hh.tone"] = p.p[10];
    v["bs.cutoff"] = jsRound(70 * std::pow(2, a["bs.cutoff"] * 5.6)); v["bs.reso"] = p.p[16]; v["bs.acid"] = jsRound(p.acid * 100); v["bs.drive"] = p.p[17]; v["bs.echo"] = p.p[18];
    v["bs.decay"] = jsRound(1000 * (.05 + (1 - p.acid) * .18)); v["fx.efb"] = jsRound((.32 + a["fx.space"] * .42) / .9 * 100); v["fx.vdec"] = p.p[24] >= 50 ? 2.8 : 1.6;
    v["st.tone"] = std::min(12000.0, jsRound(300 * std::pow(2, a["st.tone"] * 5.5))); v["st.decay"] = jsRound(1000 * (.08 + std::pow(a["st.decay"], 1.5) * 1.6));
    int ci = 0; for (size_t i = 0; i < chords().size(); ++i) if (chords()[i].iv == p.chord) { ci = (int)i; break; }
    v["st.chord"] = ci; v["st.echo"] = p.p[22]; v["st.verb"] = p.p[23]; v["fx.verb"] = p.p[24]; v["fx.space"] = p.p[25];
    for (auto t : {"lt", "mt", "ht"}) { v[std::string(t) + ".tune"] = halfR(7.2 + (a["rm.tune"] - .5) * 12); v[std::string(t) + ".decay"] = jsRound(4000 * (.04 + a["rm.decay"] * .2) / 10) * 10; }
    auto row = [&](int k, const char* s) { for (int i = 0; i < 16; ++i) c.sc.g[(size_t)k][(size_t)i] = s[i] == 'x'; };
    const int rows[] = {BD, SD, CP, CH, OH}; for (int j = 0; j < 5; ++j) row(rows[j], p.g[(size_t)j]);
    row(BS, p.g[6]); row(ST, p.g[7]);
    for (int i = 0; i < 16; ++i) if (p.g[5][i] == 'x') c.sc.g[bongoHi(i) ? HT : MT][(size_t)i] = true;
    for (int i = 0; i < 16; ++i) c.sc.n[(size_t)i] = p.notes[(size_t)i];
    return c;
}

} // namespace md442
