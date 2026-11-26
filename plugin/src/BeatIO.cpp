#include "BeatIO.h"

using namespace md442;

namespace BeatIO {

juce::String toJson(const Engine& e, const juce::String& name) {
    auto* root = new juce::DynamicObject();
    root->setProperty("format", "md442-beat"); root->setProperty("version", 1); root->setProperty("name", name);
    auto* P = new juce::DynamicObject();
    for (size_t i = 0; i < defs().size(); ++i) P->setProperty(juce::Identifier(defs()[i].id), e.P[i]);
    root->setProperty("P", juce::var(P));
    juce::Array<juce::var> scenes;
    for (auto& sc : e.scenes) {
        auto* s = new juce::DynamicObject(); auto* g = new juce::DynamicObject();
        for (int k = 0; k < NUM_KEYS; ++k) { juce::Array<juce::var> row; for (int i = 0; i < STEPS; ++i) row.add((bool)sc.g[(size_t)k][(size_t)i]); g->setProperty(voices()[(size_t)k].id, row); }
        juce::Array<juce::var> n; for (int i = 0; i < STEPS; ++i) n.add(sc.n[(size_t)i]);
        s->setProperty("g", juce::var(g)); s->setProperty("n", n);
        juce::String brk; for (char c : sc.brk) brk += juce::String::charToString(c); if (brk != "................") s->setProperty("brk", brk);   // the BREAK row, MD187 / MD888
        scenes.add(juce::var(s));
    }
    root->setProperty("scenes", scenes); root->setProperty("last", e.last);
    root->setProperty("trim", e.hasBeatTrim ? e.beatTrim : [&] { for (auto& s : presetSources()) if (e.preset == s.name) return s.trim; return 0.0; }());
    return juce::JSON::toString(juce::var(root), false);
}

static bool okScene(const juce::var& s) {
    auto g = s["g"], n = s["n"];
    if (!g.isObject() || !n.isArray() || n.size() != STEPS) return false;
    for (int k = 0; k < NUM_KEYS; ++k) { auto r = g[voices()[(size_t)k].id]; if (!r.isVoid() && (!r.isArray() || r.size() != STEPS)) return false; }
    return true;
}

bool fromJson(Engine& e, const juce::String& json, juce::String& name, bool setTrim) {
    auto v = juce::JSON::parse(json);
    if (v.isArray() && v.size() > 0) v = v[0];
    else if (v["beats"].isArray() && v["beats"].size() > 0) v = v["beats"][0];
    if (!v.isObject() || !v["P"].isObject() || !v["scenes"].isArray() || v["scenes"].size() == 0) return false;
    auto* sa = v["scenes"].getArray(); for (auto& s : *sa) if (!okScene(s)) return false;
    for (size_t i = 0; i < defs().size(); ++i) {
        auto x = v["P"][juce::Identifier(defs()[i].id)];
        e.P[i] = x.isDouble() || x.isInt() || x.isInt64() ? juce::jlimit(defs()[i].mn, defs()[i].mx, (double)x) : defs()[i].df;
    }
    e.scenes.clear();
    for (auto& s : *sa) {
        if (e.scenes.size() >= 8) break;
        Scene sc;
        for (int k = 0; k < NUM_KEYS; ++k) { auto r = s["g"][voices()[(size_t)k].id]; if (r.isArray()) for (int i = 0; i < STEPS; ++i) sc.g[(size_t)k][(size_t)i] = (bool)r[i]; }
        for (int i = 0; i < STEPS; ++i) sc.n[(size_t)i] = (int)s["n"][i];
        auto brk = s["brk"].toString(); if (brk.length() == STEPS) for (int i = 0; i < STEPS; ++i) { auto c = (char)brk[i]; sc.brk[(size_t)i] = juce::String(".-g12345678").containsChar(c) ? c : '.'; }
        e.scenes.push_back(sc);
    }
    e.sc = 0; e.pend = -1; e.chain = false; e.last = juce::jlimit(1, 16, v["last"].isVoid() ? 16 : (int)v["last"]);
    e.mute.fill(false);
    name = v["name"].toString(); if (name.isEmpty()) name = "Imported beat";
    e.preset = name.toStdString();
    if (setTrim || !v["trim"].isVoid()) { e.hasBeatTrim = true; e.beatTrim = (double)v["trim"]; }
    for (auto& s : presetSources()) if (e.preset == s.name) e.hasBeatTrim = false;
    return true;
}

juce::File beatsFolder() {
    auto f = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("MD-442").getChildFile("Beats");
    f.createDirectory(); return f;
}
juce::Array<juce::File> listBeats() {
    auto a = beatsFolder().findChildFiles(juce::File::findFiles, false, "*.json");
    a.sort(); return a;
}

bool writeMidi(const Engine& e, const juce::File& f, bool allScenes) {
    const int PPQ = 96, step = PPQ / 4; juce::MidiMessageSequence drums, bass, stab, meta;
    double bpm = e.bpm() > 0 ? e.bpm() : e.pv("bpm");
    meta.addEvent(juce::MidiMessage::tempoMetaEvent((int)std::lround(60000000.0 / bpm)), 0);
    meta.addEvent(juce::MidiMessage::timeSignatureMetaEvent(4, 4), 0);
    std::vector<int> which; if (allScenes) for (size_t i = 0; i < e.scenes.size(); ++i) which.push_back((int)i); else which.push_back(e.sc);
    int key = (int)std::lround(e.pv("key")); double sh = (e.pv("shuffle") / 100 - .5) * 2 * step;
    int bar = 0;
    for (int si : which) {
        const Scene& sc = e.scenes[(size_t)si];
        for (int i = 0; i < e.last; ++i) {
            double t = bar * e.last * step + i * step + (i % 2 ? sh : 0);
            int vel = sc.g[AC][(size_t)i] ? 127 : 100;
            for (int k = 0; k < NUM_SOUND; ++k) {
                if (!sc.g[(size_t)k][(size_t)i]) continue;
                if (k == BS) { int n = juce::jlimit(0, 127, 28 + key + sc.n[(size_t)i]); bass.addEvent(juce::MidiMessage::noteOn(2, n, (juce::uint8)vel), t); bass.addEvent(juce::MidiMessage::noteOff(2, n), t + step - 2); }
                else if (k == ST) { int n = juce::jlimit(0, 127, 52 + key); stab.addEvent(juce::MidiMessage::noteOn(3, n, (juce::uint8)vel), t); stab.addEvent(juce::MidiMessage::noteOff(3, n), t + step - 2); }
                else { drums.addEvent(juce::MidiMessage::noteOn(1, 36 + k, (juce::uint8)vel), t); drums.addEvent(juce::MidiMessage::noteOff(1, 36 + k), t + step / 2); }
            }
        }
        ++bar;
    }
    drums.updateMatchedPairs(); bass.updateMatchedPairs(); stab.updateMatchedPairs();
    // one track, all three channels, so the clip drops onto one MD-442 track
    juce::MidiMessageSequence all; all.addSequence(meta, 0); all.addSequence(drums, 0); all.addSequence(bass, 0); all.addSequence(stab, 0);
    all.updateMatchedPairs();
    double end = bar * e.last * step; all.addEvent(juce::MidiMessage::endOfTrack(), end);
    juce::MidiFile mf; mf.setTicksPerQuarterNote(PPQ); mf.addTrack(all);
    f.deleteFile(); juce::FileOutputStream os(f); if (!os.openedOk()) return false;
    return mf.writeTo(os, 1);
}

juce::MemoryBlock kbFrame(const Engine& e, int slot, const Scene& sc) {
    // MD|442 firmware 1.1, command 50 "put pattern": F0 7D 46 4C 32 slot bpmLo bpmHi swing root acid rows[13x3] notes[16] F7
    static const int ROWS[] = {BD, SD, LT, MT, HT, RS, CP, CH, OH, CR, RD, AC, BS};
    std::vector<juce::uint8> f;
    int bpm = (int)std::lround(e.bpm() > 0 ? e.bpm() : e.pv("bpm")); bpm = juce::jlimit(30, 300, bpm);
    int sw = juce::jlimit(0, 100, (int)std::lround((e.pv("shuffle") - 50) / 25 * 100)), root = 40 + (int)std::lround(e.pv("key")), acid = (int)std::lround(e.pv("bs.acid"));
    for (int b : {0xF0, 0x7D, 0x46, 0x4C, 50}) f.push_back((juce::uint8)b);
    f.push_back((juce::uint8)slot); f.push_back((juce::uint8)(bpm & 127)); f.push_back((juce::uint8)(bpm >> 7));
    f.push_back((juce::uint8)sw); f.push_back((juce::uint8)root); f.push_back((juce::uint8)juce::jlimit(0, 127, acid));
    for (int k : ROWS) {
        int m = 0; for (int i = 0; i < STEPS; ++i) if (sc.g[(size_t)k][(size_t)i]) m |= 1 << i;
        f.push_back((juce::uint8)(m & 127)); f.push_back((juce::uint8)((m >> 7) & 127)); f.push_back((juce::uint8)((m >> 14) & 3));
    }
    for (int i = 0; i < STEPS; ++i) f.push_back((juce::uint8)juce::jlimit(0, 127, sc.n[(size_t)i] + 64));
    f.push_back(0xF7);
    return juce::MemoryBlock(f.data(), f.size());
}

} // namespace BeatIO
