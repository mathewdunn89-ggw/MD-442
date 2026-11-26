#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "BeatIO.h"
#include "BinaryData.h"
#include <set>

using namespace md442;

static juce::String pid(const std::string& k) { return juce::String(k).replace(".", "_"); }   // parameter ids: bd.tune -> bd_tune
static juce::String muteId(int k) { return juce::String("mute_") + voices()[(size_t)k].id; }

// The order the DAW lists the knobs in. Maschine and most controllers page through them 8 at a time,
// so each page is one thing: the master, the effects, then one page per drum (its sound, its level, then its channel tools).
static std::vector<std::string> paramOrder(std::vector<std::string>& toggles) {
    std::vector<std::string> o = {"vol", "accent", "shuffle", "key", "fx.filter", "fx.verb", "fx.space", "fx.drive",
                                  "fx.vdec", "fx.etime", "fx.efb", "bpm"};
    toggles = {"kill_LOW", "kill_MID", "kill_HI", "seq"};   // fill the second page
    std::vector<std::string> rest; std::set<std::string> used(o.begin(), o.end());
    std::vector<std::string> pages;
    for (int k = 0; k < NUM_SOUND; ++k) {
        std::vector<std::string> page;
        for (auto& kn : voiceKnobs(k)) if (!used.count(kn.key)) page.push_back(kn.key);
        page.push_back(std::string("lvl.") + voices()[(size_t)k].id);
        std::string id = voices()[(size_t)k].id;
        std::vector<std::string> tools = {"flt." + id, "pan." + id, "drv." + id, revKey(k), echKey(k)};
        for (auto& t : tools) { if (used.count(t)) continue; if (page.size() < 8) page.push_back(t); else rest.push_back(t); }
        if (page.size() < 8) page.push_back("#mute_" + id); else rest.push_back("#mute_" + id);
        for (auto& p : page) { used.insert(p); pages.push_back(p); }
        for (auto& r : rest) used.insert(r);
    }
    o.push_back("#toggles");
    o.insert(o.end(), pages.begin(), pages.end()); o.insert(o.end(), rest.begin(), rest.end());
    return o;
}

juce::AudioProcessorValueTreeState::ParameterLayout MD442Processor::layout() {
    juce::AudioProcessorValueTreeState::ParameterLayout L;
    std::vector<std::string> toggles; auto order = paramOrder(toggles);
    std::set<std::string> added;
    auto addDef = [&](const std::string& key) {
        int i = defIndex(key); if (i < 0 || added.count(key)) return; added.insert(key);
        const ParamDef d = defs()[(size_t)i];
        juce::NormalisableRange<float> r;
        if (d.exp) r = juce::NormalisableRange<float>((float)d.mn, (float)d.mx,
                         [](float a, float b, float p) { return a * std::pow(b / a, p); },
                         [](float a, float b, float v) { return std::log(v / a) / std::log(b / a); });
        else r = juce::NormalisableRange<float>((float)d.mn, (float)d.mx, (float)d.step);
        auto attr = juce::AudioParameterFloatAttributes().withStringFromValueFunction([d](float v, int) { return juce::String(formatValue(d, v)); });
        L.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID { pid(key), 1 }, d.label, r, (float)d.df, attr));
    };
    auto addToggle = [&](const std::string& t) {
        if (t == "seq") L.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID { "seq", 1 }, "Pattern plays with the DAW", true));
        else if (t.rfind("kill_", 0) == 0) L.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID { t, 1 }, "Kill " + t.substr(5), false));
    };
    for (auto& k : order) {
        if (k == "#toggles") { for (auto& t : toggles) addToggle(t); continue; }
        if (k.rfind("#mute_", 0) == 0) { std::string v = k.substr(6); L.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID { "mute_" + v, 1 }, "Mute " + v, false)); continue; }
        addDef(k);
    }
    for (auto& d : defs()) addDef(d.id);   // anything the pages left out
    L.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID { "mute_AC", 1 }, "Mute accent", false));
    return L;
}

MD442Processor::MD442Processor()
    : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "MD442", layout()) {
    paramOf.resize(defs().size());
    for (size_t i = 0; i < defs().size(); ++i) { paramOf[i] = apvts.getParameter(pid(defs()[i].id)); apvts.addParameterListener(pid(defs()[i].id), this); }
    for (int k = 0; k < NUM_KEYS; ++k) { muteParam[k] = apvts.getParameter(muteId(k)); apvts.addParameterListener(muteId(k), this); }
    const char* kn[] = {"kill_LOW", "kill_MID", "kill_HI"};
    for (int i = 0; i < 3; ++i) { killParam[i] = apvts.getParameter(kn[i]); apvts.addParameterListener(kn[i], this); }
    seqParam = apvts.getParameter("seq"); apvts.addParameterListener("seq", this);
    // the break loops: MD187 (1 bar at 96 BPM each) and MD888 (1 bar at 155 BPM, TRANCE 2 bars)
    struct L { const char* data; int size; int kit, slot, bars; double bpm; };
    const L loops[] = {{BinaryData::BOOMBP_wav, BinaryData::BOOMBP_wavSize, 1, 0, 1, 96}, {BinaryData::DRUMS_wav, BinaryData::DRUMS_wavSize, 1, 1, 1, 96},
                       {BinaryData::STABS_wav, BinaryData::STABS_wavSize, 1, 2, 1, 96}, {BinaryData::VOX_wav, BinaryData::VOX_wavSize, 1, 3, 1, 96},
                       {BinaryData::RUMBLE_wav, BinaryData::RUMBLE_wavSize, 2, 0, 1, 155}, {BinaryData::GABBA_wav, BinaryData::GABBA_wavSize, 2, 1, 1, 155},
                       {BinaryData::TRANCE_wav, BinaryData::TRANCE_wavSize, 2, 2, 2, 155}, {BinaryData::HITS_wav, BinaryData::HITS_wavSize, 2, 3, 1, 155}};
    juce::WavAudioFormat wav;
    for (auto& l : loops) {
        std::unique_ptr<juce::AudioFormatReader> r(wav.createReaderFor(new juce::MemoryInputStream(l.data, (size_t)l.size, false), true));
        if (!r) continue;
        juce::AudioBuffer<float> b(1, (int)r->lengthInSamples); r->read(&b, 0, (int)r->lengthInSamples, 0, true, false);
        auto& dst = engine.loops[(size_t)l.kit][(size_t)l.slot]; dst.sr = r->sampleRate; dst.bars = l.bars; dst.bpm = l.bpm;
        dst.data.assign(b.getReadPointer(0), b.getReadPointer(0) + b.getNumSamples());
    }
    loadPreset(0);
}
MD442Processor::~MD442Processor() {}

void MD442Processor::parameterChanged(const juce::String&, float) { paramsDirty = true; }

bool MD442Processor::isBusesLayoutSupported(const BusesLayout& l) const {
    return l.getMainOutputChannelSet() == juce::AudioChannelSet::stereo() || l.getMainOutputChannelSet() == juce::AudioChannelSet::mono();
}

void MD442Processor::prepareToPlay(double sr, int) {
    const juce::ScopedLock sl(lock);
    engine.prepare(sr, true); paramsDirty = true;
}

void MD442Processor::loadPreset(int index) {
    {
        const juce::ScopedLock sl(lock);
        engine.loadPreset(index); program = index; beatName = Engine::presetName(index);
    }
    pushParamsToHost();
}
void MD442Processor::pushParamsToHost() {
    std::vector<double> P; std::array<bool, NUM_KEYS> m;
    { const juce::ScopedLock sl(lock); P = engine.P; m = engine.mute; }
    for (size_t i = 0; i < P.size(); ++i) if (auto* p = paramOf[i]) p->setValueNotifyingHost(p->convertTo0to1((float)P[i]));
    for (int k = 0; k < NUM_KEYS; ++k) if (muteParam[k]) muteParam[k]->setValueNotifyingHost(m[(size_t)k] ? 1.f : 0.f);
    paramsDirty = true; stateChanged = true;
}
void MD442Processor::setValue(int i, double v) {
    if (i < 0 || i >= (int)paramOf.size() || !paramOf[(size_t)i]) return;
    auto* p = paramOf[(size_t)i]; p->beginChangeGesture(); p->setValueNotifyingHost(p->convertTo0to1((float)v)); p->endChangeGesture();
}

static double velGain(int v, double accentDb) {   // full-velocity hits get the accent, like the ACCENT row
    if (v <= 100) return v / 100.0;
    return 1 + (std::pow(10, accentDb / 20) - 1) * (v - 100) / 27.0;
}

void MD442Processor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals nd;
    const juce::ScopedLock sl(lock);
    const int n = buffer.getNumSamples();
    // knob values from the DAW (automation, controllers, the screen)
    if (paramsDirty.exchange(false)) {
        bool changed = false;
        for (size_t i = 0; i < paramOf.size(); ++i) {
            if (!paramOf[i]) continue;
            double v = paramOf[i]->convertFrom0to1(paramOf[i]->getValue());
            if (std::fabs(v - engine.P[i]) > 1e-6) { engine.P[i] = v; changed = true; }
        }
        for (int k = 0; k < NUM_KEYS; ++k) if (muteParam[k]) { bool m = muteParam[k]->getValue() > .5f; if (m != engine.mute[(size_t)k]) { engine.mute[(size_t)k] = m; changed = true; } }
        for (int i = 0; i < 3; ++i) { bool m = killParam[i]->getValue() > .5f; if (m != engine.kill[(size_t)i]) { engine.kill[(size_t)i] = m; changed = true; } }
        engine.seqOn = seqParam->getValue() > .5f;
        if (changed) engine.apply();
    }
    Transport tr;
    if (auto* ph = getPlayHead()) if (auto pos = ph->getPosition()) {
        tr.hostKnown = true; tr.hostPlaying = pos->getIsPlaying();
        if (auto b = pos->getBpm()) tr.bpm = *b; else tr.hostKnown = false;
        if (auto q = pos->getPpqPosition()) tr.ppq = *q; else if (tr.hostPlaying) tr.hostKnown = false;
    }
    if (!tr.hostKnown) tr.bpm = engine.pv("bpm");
    lastHostPlaying = tr.hostKnown && tr.hostPlaying; lastBpm = tr.hostKnown ? tr.bpm : 0;
    if (lastHostPlaying) engine.internalPlay = false;

    float* L = buffer.getWritePointer(0); float* R = buffer.getNumChannels() > 1 ? buffer.getWritePointer(1) : nullptr;
    std::vector<float> tmpR; if (!R) { tmpR.resize((size_t)n); R = tmpR.data(); }
    int pos = 0;
    auto run = [&](int upTo) {
        if (upTo <= pos) return;
        Transport t = tr; t.ppq = tr.ppq + pos * tr.bpm / 60.0 / getSampleRate();
        engine.process(L + pos, R + pos, upTo - pos, t); pos = upTo;
    };
    for (const auto meta : midi) {
        const auto m = meta.getMessage(); run(juce::jlimit(0, n, meta.samplePosition));
        if (m.isNoteOn()) {
            int note = m.getNoteNumber(), ch = m.getChannel(); double g = velGain(m.getVelocity(), engine.pv("accent"));
            if (ch == 2) { int off = note - 28 - (int)std::lround(engine.pv("key")); engine.hit(BS, g, &off); }
            else if (ch == 3) { int off = note - 52 - (int)std::lround(engine.pv("key")); engine.hit(ST, g, &off); }
            else if ((note >= 49 && note <= 56) || (note >= 73 && note <= 80)) engine.slice((note - 49) % 24, g);
            else { int k = note >= 36 && note <= 48 ? note - 36 : note >= 60 && note <= 72 ? note - 60 : -1; if (k >= 0) engine.hit(k, g); }
        } else if (m.isController()) {
            int cc = m.getControllerNumber(), val = m.getControllerValue();
            const juce::ScopedTryLock cl(ccLock);
            if (cl.isLocked()) {
                int t = learnTarget.load();
                if (t >= 0) { ccMap[cc] = t; learnTarget = -1; stateChanged = true; }
                auto it = ccMap.find(cc);
                if (it != ccMap.end() && it->second < (int)paramOf.size() && paramOf[(size_t)it->second]) paramOf[(size_t)it->second]->setValueNotifyingHost(val / 127.f);
            }
        }
    }
    run(n);
    if (buffer.getNumChannels() == 1) for (int i = 0; i < n; ++i) L[i] = (L[i] + R[i]) * .5f;
    for (int c = 2; c < buffer.getNumChannels(); ++c) buffer.clear(c, 0, n);
}

juce::AudioProcessorEditor* MD442Processor::createEditor() { return new MD442Editor(*this); }

void MD442Processor::getStateInformation(juce::MemoryBlock& dest) {
    auto state = apvts.copyState();
    juce::ValueTree extra("MD442STATE");
    {
        const juce::ScopedLock sl(lock);
        extra.setProperty("beat", BeatIO::toJson(engine, beatName), nullptr);
        extra.setProperty("sc", engine.sc, nullptr); extra.setProperty("chain", engine.chain, nullptr);
        extra.setProperty("solo", engine.solo, nullptr); extra.setProperty("sel", selected.load(), nullptr);
        extra.setProperty("program", program.load(), nullptr);
    }
    {
        const juce::ScopedLock cl(ccLock); juce::String m;
        for (auto& kv : ccMap) m << kv.first << ":" << juce::String(defs()[(size_t)kv.second].id) << ";";
        extra.setProperty("cc", m, nullptr);
    }
    state.removeChild(state.getChildWithName("MD442STATE"), nullptr); state.addChild(extra, -1, nullptr);
    if (auto xml = state.createXml()) copyXmlToBinary(*xml, dest);
}

void MD442Processor::setStateInformation(const void* data, int size) {
    auto xml = getXmlFromBinary(data, size); if (!xml) return;
    auto state = juce::ValueTree::fromXml(*xml); if (!state.isValid()) return;
    auto extra = state.getChildWithName("MD442STATE");
    if (extra.isValid()) {
        const juce::ScopedLock sl(lock);
        juce::String name; BeatIO::fromJson(engine, extra.getProperty("beat").toString(), name, false);
        if (name.isNotEmpty()) { beatName = name; engine.preset = name.toStdString(); }
        engine.sc = juce::jlimit(0, (int)engine.scenes.size() - 1, (int)extra.getProperty("sc", 0));
        engine.chain = extra.getProperty("chain", false); engine.solo = extra.getProperty("solo", -1);
        selected = (int)extra.getProperty("sel", 0); program = (int)extra.getProperty("program", 0);
    }
    if (extra.isValid()) {
        const juce::ScopedLock cl(ccLock); ccMap.clear();
        for (auto& tok : juce::StringArray::fromTokens(extra.getProperty("cc").toString(), ";", "")) {
            int c = tok.upToFirstOccurrenceOf(":", false, false).getIntValue(); int i = defIndex(tok.fromFirstOccurrenceOf(":", false, false).toStdString());
            if (tok.isNotEmpty() && i >= 0) ccMap[c] = i;
        }
    }
    state.removeChild(extra, nullptr);
    apvts.replaceState(state);
    paramsDirty = true; stateChanged = true;
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new MD442Processor(); }
