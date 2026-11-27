#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include "PluginProcessor.h"

namespace ui {
const juce::Colour bg { 0xff131316 }, panel { 0xff1c1c21 }, cell { 0xff2a2a31 }, accent { 0xffff6a1a }, text { 0xffe9e7e3 }, dim { 0xff85848b }, on { 0xffffb347 };
}

class MD442Look : public juce::LookAndFeel_V4 {
public:
    MD442Look();
    void drawRotarySlider(juce::Graphics&, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider&) override;
    void drawButtonBackground(juce::Graphics&, juce::Button&, const juce::Colour&, bool over, bool down) override;
};

class MD442Editor;

class Knob : public juce::Component {
public:
    Knob(MD442Editor& ed, const std::string& key, const juce::String& label);
    void resized() override;
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    juce::Slider slider;
    std::string key; int defIdx;
private:
    MD442Editor& ed; juce::String label;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> att;
};

class StepGrid : public juce::Component {
public:
    explicit StepGrid(MD442Editor& e) : ed(e) {}
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override { painting = -1; }
    void mouseDoubleClick(const juce::MouseEvent&) override;
    int head = -1; uint32_t flash = 0;
private:
    MD442Editor& ed; int painting = -1; bool paintVal = false; int lastCell = -1;
    static constexpr int nameW = 92, msW = 22;
    juce::Rectangle<float> cellRect(int row, int step) const;
    int rowAt(float y) const; int stepAt(float x) const;
};

class DragMidiButton : public juce::TextButton {
public:
    explicit DragMidiButton(MD442Editor& e) : juce::TextButton("DRAG MIDI"), ed(e) {}
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
private:
    MD442Editor& ed; bool dragged = false;
};

class MD442Editor : public juce::AudioProcessorEditor, public juce::DragAndDropContainer, private juce::Timer {
public:
    explicit MD442Editor(MD442Processor&);
    ~MD442Editor() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    MD442Processor& proc;
    void toast(const juce::String& msg);
    void select(int k, bool sound);
    void rebuildVoiceKnobs();
    void refreshTop();
    juce::File midiClip(bool allScenes);
private:
    void timerCallback() override;
    void showPresetMenu();
    void importBeat(); void exportBeat(); void sendToKeyboard();
    MD442Look look;
    StepGrid grid { *this };
    juce::TextButton presetBtn, playBtn { "PLAY" }, patternBtn { "PATTERN" }, chainBtn { "CHAIN" }, addScene { "+" }, delScene { "-" },
        importBtn { "IMPORT" }, exportBtn { "EXPORT" }, sendBtn { "SEND TO KEYBOARD" }, randomBtn { "RANDOM" }, clearBtn { "CLEAR" }, recBtn { "SEQ REC" };
    DragMidiButton dragBtn { *this };
    juce::ComboBox lenBox;
    juce::OwnedArray<juce::TextButton> sceneBtns;
    juce::OwnedArray<Knob> voiceKnobs, masterKnobs, fxKnobs;
    juce::TextButton killBtn[3];
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> killAtt[3], patternAtt;
    juce::Label toastLbl; int toastTicks = 0;
    juce::String voiceTitle;
    std::unique_ptr<juce::FileChooser> chooser;
    std::unique_ptr<juce::Thread> sender;
    juce::Rectangle<int> voiceArea, masterArea, fxArea;
    int lastSel = -1;
    friend class StepGrid;
};
