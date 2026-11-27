// MD|442 sound engine and sequencer: section 3 and 4 of md442.js, in C++.
#pragma once
#include "Params.h"
#include "Presets.h"
#include "WebAudio.h"
#include <mutex>
#include <thread>
#include <atomic>
#include <functional>

namespace md442 {

struct Part {   // one sounding piece of a hit (a resonator, a noise burst ...), feeding its drum's channel
    int ch = 0; double vel = 1, start = 0, stop = 0; int id = 0;
    virtual ~Part() = default;
    virtual double tick(double t) = 0;
};

// one loop of a break kit: mono samples, how many bars it is and at what tempo
struct Loop { std::vector<float> data; double sr = 22050; int bars = 1; double bpm = 120; };

struct Transport { bool hostKnown = false, hostPlaying = false; double ppq = 0, bpm = 120; };

class Engine {
public:
    Engine();
    ~Engine();
    void prepare(double sampleRate, bool live = true);
    // ----- state, the same as the web app's P and S -----
    std::vector<double> P;   // values in real units, indexed like defs()
    double& p(const char* k) { return P[(size_t)defIndex(k)]; }
    double pv(const char* k) const { return P[(size_t)defIndex(k)]; }
    std::vector<Scene> scenes; int sc = 0, last = 16, pend = -1, solo = -1; bool chain = false;
    std::array<bool, NUM_KEYS> mute {}; std::array<bool, 3> kill {}; std::string preset = "Peak Warehouse"; double beatTrim = 0; bool hasBeatTrim = false;   // a saved beat carries its own loudness trim
    bool seqOn = true;            // play the pattern while the DAW plays
    bool internalPlay = false;    // the plugin's own PLAY, used while the DAW is stopped
    void loadPreset(int idx);    // 0-6 MD442, then the MD187 and MD888 patterns (Styles.h)
    static int numPresets();
    static std::string presetName(int idx);
    static std::string presetStyle(int idx);
    std::array<std::array<Loop, 4>, 3> loops;   // [kit 1 MD187, 2 MD888][slot]; kit 0 is empty
    void slice(int n, double vel = 1);           // play slice n (0-7) of the current loop, from a pad
    const char* loopName(int kit, int slot) const;
    void apply(bool snap = false);
    bool off(int k) const { return mute[(size_t)k] || (solo >= 0 && solo != k); }
    Scene& scene() { return scenes[(size_t)std::clamp(sc, 0, (int)scenes.size() - 1)]; }
    // ----- sound -----
    void voice(int k, double t, int stepIdx, double vel, const int* note = nullptr);
    void hit(int k, double vel = 1, const int* note = nullptr) { if (k < NUM_SOUND && !off(k)) voice(k, now + 1.0 / sr, 0, vel, note); }
    void process(float* L, float* R, int n, const Transport& tr);
    // ----- things the screen reads -----
    std::atomic<int> playhead { -1 };
    std::atomic<uint32_t> hitFlags { 0 };   // a bit per drum that sounded since the screen last looked
    std::atomic<float> meter { 0 };
    double bpm() const { return effBpm; }
    double sampleRate() const { return sr; }
    double now = 0;               // seconds
    // SEQ REC: writes a played note into the looping pattern on the nearest step (a note in the second half of a step lands on the next one).
    // k: a drum, BS (note = semitones above the key) or NUM_KEYS for the BREAKS row (note = slice 0-7). False when the pattern is not playing.
    bool writeStep(int k, int note = 0);
    void stopAll();
private:
    friend struct HatPart;
    double sr = 48000; bool live = true; double effBpm = 128;
    std::vector<std::unique_ptr<Part>> parts; int nextId = 1, openHat = 0;
    Rng rng { 0x9e3779b9 };
    std::vector<float> pulse;
    // banks of six square waves for the metal
    struct Bank { Osc o[6]; Smooth f[6]; double v = 0; void tick(double sr) { double s = 0; for (int i = 0; i < 6; ++i) s += o[i].tick(f[i].next(), sr); v = s * .17; } } hat, crb, rdb;
    // channels
    struct Channel {
        Shaper entry; Biquad stHp; Shaper cdrv; MovingBiquad clp, chp; Smooth gain, pan, sv, sd;
        double in = 0;
    } chs[NUM_SOUND], bch;   // bch: the BREAK's channel
    Smooth rum, brkGain; Biquad rumLp;
    Param duck { 1 }, bduck { 1 };   // the kick dips everything else for a moment, and the bass a bit further
    // reverb
    DelayLine pre; Convolver cv[2]; Param cvg[2] { Param(1), Param(0) }; int cvA = 0; double irSecs = 0, irWantAt = -1; bool irPending = false;
    Biquad rvf[2], rvShelf[2], rvLp[2];
    std::mutex irMutex; std::shared_ptr<ImpulseResponse> irReady; std::vector<std::shared_ptr<const ImpulseResponse>> irTrash; std::thread irThread; std::atomic<bool> irBusy { false };
    double dropOldAt = -1; int dropOld = -1;
    std::shared_ptr<ImpulseResponse> makeIR(double secs, uint32_t seed);
    void requestIR(double secs);
    // dub delay
    DelayLine dl; MovingBiquad dlp, dhp; Biquad dret; Smooth fb, dtime;
    // master
    MovingBiquad lo[2], mid[2], hi[2], lp1[2], lp2[2], hp1[2], hp2[2]; Shaper drv[2]; Smooth mst; Compressor comp;
    // sequencer
    struct Pending { double t; int idx; long long bar; };
    struct BrkPart; std::unique_ptr<Part> brk;   // the BREAK plays one sound at a time
    void smStep(const Scene& s, int idx, long long bar, double t, double vel);
    bool sampler(double t, int idx, long long bar, double vel, int sl);
    void brkStop(double t);
    double smEnd = -1; bool smLoop = false; int headIdx = -1; double headT = 0;
    Rng brkRng { 777 };
    std::vector<Pending> pending; double seqPpq = 0; bool wasRunning = false; long long lastStep = -1;
    void playStep(int idx, double t, long long bar = 0);
    void runSequencer(int n, const Transport& tr);
    double trim() const;
    void setT(Smooth& s, double v, double tc, bool snap) { if (snap) s.snap(v); else s.set(v, tc, sr); }
    void filt(MovingBiquad& lp, MovingBiquad& hp, double v, bool snap);
};

} // namespace md442
