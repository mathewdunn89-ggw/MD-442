#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include "Engine.h"

// MIDI in, from the DAW:
//   notes C1 (36) up to C2 (48) and C3 (60) up to C4 (72) play Kick, Snare, Clap, Rim, Low/Mid/Hi tom, Closed/Open hat, Crash, Ride, Bass, Stab
//   (C1 is the Ableton Drum Rack and Maschine pad layout; C3 is where Maschine's keyboard mode starts)
//   channel 2 plays the bass at the note's pitch, channel 3 plays the stab chord on that root
//   C#2 (49) to G#2 (56), and C#4 (73) to G#4 (80), play the 8 slices of the BREAK loop
//   any CC can be learnt to any knob (right-click a knob, MIDI learn, turn a knob on the controller)
class MD442Processor : public juce::AudioProcessor, private juce::AudioProcessorValueTreeState::Listener {
public:
    MD442Processor();
    ~MD442Processor() override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }
    const juce::String getName() const override { return "MD-442"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 4.0; }
    int getNumPrograms() override { return md442::Engine::numPresets(); }
    int getCurrentProgram() override { return program; }
    void setCurrentProgram(int index) override { loadPreset(index); }
    const juce::String getProgramName(int index) override { return index >= 0 && index < getNumPrograms() ? juce::String(md442::Engine::presetStyle(index) + " " + md442::Engine::presetName(index)) : juce::String(); }
    void changeProgramName(int, const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState apvts;
    md442::Engine engine;
    juce::CriticalSection lock;     // held by the audio thread while it plays; the screen takes it for each edit
    std::vector<juce::RangedAudioParameter*> paramOf;   // by md442::defs() index
    juce::RangedAudioParameter* muteParam[md442::NUM_KEYS] {};
    juce::RangedAudioParameter* killParam[3] {};
    juce::RangedAudioParameter* seqParam = nullptr;

    // ----- actions from the screen -----
    void loadPreset(int index);
    void pushParamsToHost();        // after the engine's values changed (a preset or an imported beat)
    void setValue(int defIdx, double v);
    std::atomic<int> program { 0 };
    std::atomic<int> selected { md442::BD };
    std::atomic<bool> seqRec { false };         // SEQ REC: what you play is written into the loop
    std::atomic<bool> stateChanged { false };   // tells the screen to redraw everything
    bool hostPlaying() const { return lastHostPlaying.load(); }
    double hostBpm() const { return lastBpm.load(); }

    // ----- MIDI learn -----
    std::map<int, int> ccMap;       // CC number -> defs() index
    std::atomic<int> learnTarget { -1 };
    juce::CriticalSection ccLock;

    juce::String beatName = "Peak Warehouse";
private:
    void parameterChanged(const juce::String& id, float v) override;
    static juce::AudioProcessorValueTreeState::ParameterLayout layout();
    std::atomic<bool> paramsDirty { true };
    std::atomic<bool> lastHostPlaying { false }; std::atomic<double> lastBpm { 0 };
    std::vector<std::pair<int, int>> pendingCC;   // CCs to hand to the host on the message thread
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MD442Processor)
};
