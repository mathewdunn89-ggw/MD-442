// Offline render of the C++ engine, for comparing with the web engine.
// render <out.wav> <preset 0-6> <what: BD|SD|...|bars:N> [secs] [rate]
#include "../src/Engine.h"
#include <cstdio>
#include <cstring>
#include <thread>
#include <chrono>
using namespace md442;

static void writeWav(const char* path, const std::vector<float>& L, const std::vector<float>& R, int sr) {
    FILE* f = std::fopen(path, "wb"); if (!f) return;
    uint32_t n = (uint32_t)L.size(), data = n * 2 * 4, v32; uint16_t v16;
    std::fwrite("RIFF", 1, 4, f); v32 = 36 + data; std::fwrite(&v32, 4, 1, f); std::fwrite("WAVEfmt ", 1, 8, f);
    v32 = 16; std::fwrite(&v32, 4, 1, f); v16 = 3; std::fwrite(&v16, 2, 1, f); v16 = 2; std::fwrite(&v16, 2, 1, f);
    v32 = (uint32_t)sr; std::fwrite(&v32, 4, 1, f); v32 = (uint32_t)sr * 8; std::fwrite(&v32, 4, 1, f); v16 = 8; std::fwrite(&v16, 2, 1, f); v16 = 32; std::fwrite(&v16, 2, 1, f);
    std::fwrite("data", 1, 4, f); std::fwrite(&data, 4, 1, f);
    for (uint32_t i = 0; i < n; ++i) { std::fwrite(&L[i], 4, 1, f); std::fwrite(&R[i], 4, 1, f); }
    std::fclose(f);
}

// the break loops, straight from styles/samples (16-bit mono WAV)
static Loop readWav(const std::string& path, int bars, double bpm) {
    Loop L; L.bars = bars; L.bpm = bpm; FILE* f = std::fopen(path.c_str(), "rb"); if (!f) return L;
    std::vector<unsigned char> d; unsigned char buf[65536]; size_t n; while ((n = std::fread(buf, 1, sizeof buf, f)) > 0) d.insert(d.end(), buf, buf + n); std::fclose(f);
    size_t p = 12; uint16_t ch = 1, bits = 16;
    while (p + 8 <= d.size()) {
        uint32_t sz = d[p + 4] | d[p + 5] << 8 | d[p + 6] << 16 | (uint32_t)d[p + 7] << 24;
        if (!std::memcmp(&d[p], "fmt ", 4)) { ch = (uint16_t)(d[p + 10] | d[p + 11] << 8); L.sr = d[p + 12] | d[p + 13] << 8 | d[p + 14] << 16; bits = (uint16_t)(d[p + 22] | d[p + 23] << 8); }
        if (!std::memcmp(&d[p], "data", 4) && bits == 16) { for (size_t i = p + 8; i + 1 < p + 8 + sz && i + 1 < d.size(); i += 2 * ch) L.data.push_back((int16_t)(d[i] | d[i + 1] << 8) / 32768.f); break; }
        p += 8 + sz + (sz & 1);
    }
    return L;
}
static void loadLoops(Engine& e, const std::string& dir) {
    const char* N[2][4] = {{"BOOMBP", "DRUMS", "STABS", "VOX"}, {"RUMBLE", "GABBA", "TRANCE", "HITS"}};
    for (int k = 0; k < 2; ++k) for (int s = 0; s < 4; ++s)
        e.loops[(size_t)k + 1][(size_t)s] = readWav(dir + (k ? "/md888/" : "/md187/") + N[k][s] + ".wav", k == 1 && s == 2 ? 2 : 1, k ? 155 : 96);
}

int main(int argc, char** argv) {
    if (argc < 4) { std::fprintf(stderr, "render out.wav preset what [secs] [rate]\n"); return 1; }
    int preset = std::atoi(argv[2]); double secs = argc > 4 ? std::atof(argv[4]) : 2.5; int sr = argc > 5 ? std::atoi(argv[5]) : 44100;
    Engine e; loadLoops(e, std::string(MD442_STYLES_DIR) + "/samples"); e.loadPreset(preset);
    for (int a = 6; a < argc; ++a) { std::string kv = argv[a]; auto q = kv.find('='); if (q != std::string::npos) { int j = defIndex(kv.substr(0, q)); if (j >= 0) e.P[(size_t)j] = std::atof(kv.c_str() + q + 1); } }
    bool live = false; for (int a = 6; a < argc; ++a) if (std::string(argv[a]) == "live") live = true;
    e.prepare(sr, live); if (live) std::this_thread::sleep_for(std::chrono::milliseconds(50));
    std::string what = argv[3]; Transport tr;
    std::vector<float> L((size_t)(secs * sr)), R(L.size());
    if (what.rfind("bars:", 0) == 0) {
        // play N bars on the engine's own clock, from 20 ms in, the same as the web test render
        e.internalPlay = false; int bars = std::atoi(what.c_str() + 5); (void)bars;
        int pre = (int)(.02 * sr); e.process(L.data(), R.data(), pre, tr);
        e.internalPlay = true;
        size_t pos = (size_t)pre; double stop = .02 + bars * 16 * 60 / e.pv("bpm") / 4;
        while (pos < L.size()) {
            int n = (int)std::min<size_t>(256, L.size() - pos);
            if (e.now >= stop) e.internalPlay = false;
            e.process(L.data() + pos, R.data() + pos, n, tr); pos += (size_t)n;
        }
    } else {
        int k = -1; for (int i = 0; i < NUM_SOUND; ++i) if (what == voices()[(size_t)i].id) k = i;
        if (k < 0) { std::fprintf(stderr, "unknown voice\n"); return 1; }
        e.voice(k, .02, 0, 1);
        for (size_t pos = 0; pos < L.size(); pos += 256) e.process(L.data() + pos, R.data() + pos, (int)std::min<size_t>(256, L.size() - pos), tr);
    }
    writeWav(argv[1], L, R, sr);
    return 0;
}
