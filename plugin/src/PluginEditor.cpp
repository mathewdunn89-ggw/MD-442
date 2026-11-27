#include "PluginEditor.h"
#include "BeatIO.h"

using namespace md442;
static constexpr int ROWS = NUM_KEYS + 1, BREAK = NUM_KEYS;   // the 14 rows of MD|442, then the BREAK (MD187 / MD888 loops)

static juce::String pidOf(const std::string& k) { return juce::String(k).replace(".", "_"); }

// ------------------------------------------------------------------ look
MD442Look::MD442Look() { refresh(); }
void MD442Look::refresh() {
    setColour(juce::TextButton::buttonColourId, ui::cell); setColour(juce::TextButton::buttonOnColourId, ui::accent);
    setColour(juce::TextButton::textColourOffId, ui::text); setColour(juce::TextButton::textColourOnId, juce::Colours::black);
    setColour(juce::ComboBox::backgroundColourId, ui::cell); setColour(juce::ComboBox::textColourId, ui::text); setColour(juce::ComboBox::outlineColourId, ui::cell);
    setColour(juce::PopupMenu::backgroundColourId, ui::panel); setColour(juce::PopupMenu::textColourId, ui::text); setColour(juce::PopupMenu::highlightedBackgroundColourId, ui::accent);
    setColour(juce::Slider::rotarySliderFillColourId, ui::accent);
}
void MD442Look::drawRotarySlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider&) {
    auto r = juce::Rectangle<float>((float)x, (float)y, (float)w, (float)h).reduced(4); float d = juce::jmin(r.getWidth(), r.getHeight());
    auto c = r.getCentre(); auto k = juce::Rectangle<float>(d, d).withCentre(c);
    juce::Path track; track.addCentredArc(c.x, c.y, d / 2 - 2, d / 2 - 2, 0, a0, a1, true);
    g.setColour(ui::cell); g.strokePath(track, juce::PathStrokeType(3.f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    float a = a0 + pos * (a1 - a0);
    juce::Path val; val.addCentredArc(c.x, c.y, d / 2 - 2, d / 2 - 2, 0, a0, a, true);
    g.setColour(ui::accent); g.strokePath(val, juce::PathStrokeType(3.f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    g.setColour(juce::Colour(0xff2f2f37)); g.fillEllipse(k.reduced(d * .2f));
    juce::Point<float> tip(c.x + std::sin(a) * (d * .3f), c.y - std::cos(a) * (d * .3f));
    g.setColour(ui::text); g.drawLine(c.x, c.y, tip.x, tip.y, 2.f);
}
void MD442Look::drawButtonBackground(juce::Graphics& g, juce::Button& b, const juce::Colour&, bool over, bool down) {
    auto r = b.getLocalBounds().toFloat().reduced(1);
    auto col = b.getToggleState() ? ui::accent : ui::cell; if (over) col = col.brighter(.12f); if (down) col = col.darker(.2f);
    g.setColour(col); g.fillRoundedRectangle(r, 4);
}

// ------------------------------------------------------------------ knob
Knob::Knob(MD442Editor& e, const std::string& k, const juce::String& l) : key(k), defIdx(defIndex(k)), ed(e), label(l) {
    slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag); slider.setTextBoxStyle(juce::Slider::NoTextBox, false, 0, 0);
    slider.setRotaryParameters(juce::degreesToRadians(225.f), juce::degreesToRadians(495.f), true);
    addAndMakeVisible(slider);
    att = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(ed.proc.apvts, pidOf(k), slider);
    if (defIdx >= 0) slider.setDoubleClickReturnValue(true, defs()[(size_t)defIdx].df);
    slider.onValueChange = [this] { repaint(); };
    slider.addMouseListener(this, false);
    slider.setPopupMenuEnabled(false);
}
void Knob::resized() { auto r = getLocalBounds(); slider.setBounds(r.removeFromTop(r.getHeight() - 26)); }
void Knob::paint(juce::Graphics& g) {
    auto r = getLocalBounds().removeFromBottom(26);
    g.setColour(ui::text); g.setFont(juce::FontOptions(11.f, juce::Font::bold)); g.drawText(label, r.removeFromTop(13), juce::Justification::centred);
    g.setColour(ui::dim); g.setFont(juce::FontOptions(10.5f));
    bool learning = ed.proc.learnTarget.load() == defIdx;
    juce::String val = defIdx >= 0 ? juce::String(formatValue(defs()[(size_t)defIdx], slider.getValue())) : juce::String();
    if (key == "brk.slot") val = ed.proc.engine.loopName((int)std::lround(ed.proc.engine.pv("brk.kit")), (int)std::lround(slider.getValue()));
    g.drawText(learning ? juce::String("TURN A KNOB") : val, r, juce::Justification::centred);
}
void Knob::mouseDown(const juce::MouseEvent& e) {
    if (!e.mods.isPopupMenu() || defIdx < 0) return;
    juce::PopupMenu m; int cc = -1;
    { const juce::ScopedLock l(ed.proc.ccLock); for (auto& kv : ed.proc.ccMap) if (kv.second == defIdx) cc = kv.first; }
    m.addItem(1, "MIDI learn (then turn a knob on your controller)");
    if (cc >= 0) m.addItem(2, "Forget MIDI CC " + juce::String(cc));
    m.addItem(3, "Reset to " + juce::String(formatValue(defs()[(size_t)defIdx], defs()[(size_t)defIdx].df)));
    m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(this), [this, cc](int r) {
        if (r == 1) { ed.proc.learnTarget = defIdx; ed.toast("MIDI learn: turn a knob or fader on your controller"); }
        if (r == 2) { const juce::ScopedLock l(ed.proc.ccLock); ed.proc.ccMap.erase(cc); }
        if (r == 3) slider.setValue(defs()[(size_t)defIdx].df, juce::sendNotificationSync);
        repaint();
    });
}

// ------------------------------------------------------------------ step grid
juce::Rectangle<float> StepGrid::cellRect(int row, int step) const {
    float x0 = (float)(nameW + msW * 2 + 6), w = (getWidth() - x0) / STEPS, h = (float)getHeight() / ROWS;
    return { x0 + step * w + (step / 4) * 0.f, row * h, w, h };
}
int StepGrid::rowAt(float y) const { return juce::jlimit(0, ROWS - 1, (int)(y / ((float)getHeight() / ROWS))); }
int StepGrid::stepAt(float x) const { float x0 = (float)(nameW + msW * 2 + 6); if (x < x0) return -1; return juce::jlimit(0, STEPS - 1, (int)((x - x0) / ((getWidth() - x0) / STEPS))); }

void StepGrid::paint(juce::Graphics& g) {
    auto& e = ed.proc.engine; Scene sc; std::array<bool, NUM_KEYS> mute; int solo, last;
    { const juce::ScopedLock l(ed.proc.lock); sc = e.scene(); mute = e.mute; solo = e.solo; last = e.last; }
    int sel = ed.proc.selected; float h = (float)getHeight() / ROWS;
    int kit = (int)std::lround(e.pv("brk.kit"));
    {   // the BREAK row
        int k = BREAK; float y = k * h; auto name = juce::Rectangle<float>(0, y + 1, (float)nameW, h - 2);
        g.setColour(k == sel ? ui::accent : ((flash >> 14) & 1u) ? ui::cell.brighter(.3f) : ui::cell); g.fillRoundedRectangle(name, 3);
        g.setColour(k == sel ? juce::Colours::black : kit ? ui::text : ui::dim); g.setFont(juce::FontOptions(11.f, juce::Font::bold));
        g.drawText(kit ? juce::String("BREAKS ") + (kit == 1 ? "187" : "888") : juce::String("BREAKS"), name.reduced(6, 0), juce::Justification::centredLeft);
        for (int i = 0; i < STEPS; ++i) {
            auto c = cellRect(k, i).reduced(2, 2); char ch = sc.brk[(size_t)i];
            juce::Colour col = ch == '.' ? ((i / 4) % 2 ? ui::cell : ui::cell.brighter(.06f)) : ch == '-' ? ui::accent.withAlpha(.35f) : ch == 'g' ? juce::Colour(0xff3fbf6f) : ui::on;
            if (i >= last) col = col.withAlpha(.25f); if (i == head) col = col.brighter(.35f);
            g.setColour(col); g.fillRoundedRectangle(c, 3);
            if (ch != '.') { g.setColour(juce::Colours::black); g.setFont(juce::FontOptions(10.f, juce::Font::bold)); g.drawText(ch == 'g' ? juce::String("LOOP") : ch == '-' ? juce::String("~") : juce::String::charToString(ch), c, juce::Justification::centred); }
        }
    }
    for (int k = 0; k < NUM_KEYS; ++k) {
        float y = k * h; auto name = juce::Rectangle<float>(0, y + 1, (float)nameW, h - 2);
        bool lit = (flash >> k) & 1u;
        g.setColour(k == sel ? ui::accent : lit ? ui::cell.brighter(.3f) : ui::cell); g.fillRoundedRectangle(name, 3);
        g.setColour(k == sel ? juce::Colours::black : ui::text); g.setFont(juce::FontOptions(11.f, juce::Font::bold));
        g.drawText(voices()[(size_t)k].shortName, name.reduced(6, 0), juce::Justification::centredLeft);
        auto mr = juce::Rectangle<float>((float)nameW + 3, y + 1, (float)msW - 2, h - 2), sr = mr.translated((float)msW, 0);
        g.setColour(mute[(size_t)k] ? juce::Colour(0xffd94a4a) : ui::cell); g.fillRoundedRectangle(mr, 3);
        g.setColour(solo == k ? juce::Colour(0xff3fbf6f) : ui::cell); if (k != AC) g.fillRoundedRectangle(sr, 3);
        g.setColour(ui::text); g.setFont(juce::FontOptions(10.f, juce::Font::bold)); g.drawText("M", mr, juce::Justification::centred); if (k != AC) g.drawText("S", sr, juce::Justification::centred);
        for (int i = 0; i < STEPS; ++i) {
            auto c = cellRect(k, i).reduced(2, 2);
            bool onS = sc.g[(size_t)k][(size_t)i], beyond = i >= last;
            juce::Colour col = onS ? (k == AC ? ui::on : ui::accent) : (i / 4) % 2 ? ui::cell : ui::cell.brighter(.06f);
            if (beyond) col = col.withAlpha(.25f);
            if (i == head) col = onS ? juce::Colours::white : col.brighter(.35f);
            g.setColour(col); g.fillRoundedRectangle(c, 3);
            if (k == BS && onS && sc.n[(size_t)i] != 0) {
                g.setColour(juce::Colours::black); g.setFont(juce::FontOptions(10.f, juce::Font::bold));
                g.drawText((sc.n[(size_t)i] > 0 ? "+" : "") + juce::String(sc.n[(size_t)i]), c, juce::Justification::centred);
            }
        }
    }
}
void StepGrid::mouseDown(const juce::MouseEvent& m) {
    int k = rowAt((float)m.y), i = stepAt((float)m.x); auto& e = ed.proc.engine;
    if (m.x < nameW) { ed.select(k, true); return; }
    if (k == BREAK) {   // click: rest -> slice 1..8 -> LOOP (play it through) -> ~ (keep ringing) -> rest. Right-click: rest
        if (i < 0) return;
        const juce::ScopedLock l(ed.proc.lock); auto& c = e.scene().brk[(size_t)i];
        static const char cyc[] = ".12345678g-";
        if (m.mods.isPopupMenu()) c = '.'; else { const char* p = std::strchr(cyc, c); c = cyc[p ? (p - cyc + 1) % 11 : 0]; }
        if (c >= '1' && c <= '8' && !(ed.proc.hostPlaying() || e.internalPlay)) e.slice(c - '1');
        repaint(); return;
    }
    if (i < 0) {
        const juce::ScopedLock l(ed.proc.lock);
        if (m.x < nameW + msW + 3) { if (auto* p = ed.proc.muteParam[k]) p->setValueNotifyingHost(e.mute[(size_t)k] ? 0.f : 1.f); }
        else if (k != AC) { e.solo = e.solo == k ? -1 : k; e.apply(); }
        repaint(); return;
    }
    if (m.mods.isPopupMenu() && k == BS) {   // right-click a bass step: next note in the cycle, as on the web
        const juce::ScopedLock l(ed.proc.lock); auto& s = e.scene(); int j = 0; for (int q = 0; q < 7; ++q) if (NOTE_CYCLE[q] == s.n[(size_t)i]) j = q;
        s.n[(size_t)i] = NOTE_CYCLE[(j + 1) % 7]; s.g[BS][(size_t)i] = true; repaint(); return;
    }
    { const juce::ScopedLock l(ed.proc.lock); auto& s = e.scene(); paintVal = !s.g[(size_t)k][(size_t)i]; s.g[(size_t)k][(size_t)i] = paintVal; }
    painting = k; lastCell = i; repaint();
}
// double-click a drum's key mutes it, as on the web and phone apps (a single click selects and plays it)
void StepGrid::mouseDoubleClick(const juce::MouseEvent& m) {
    if (m.x >= nameW) return;
    int k = rowAt((float)m.y); if (k >= NUM_KEYS) return; const juce::ScopedLock l(ed.proc.lock);
    if (auto* p = ed.proc.muteParam[k]) p->setValueNotifyingHost(ed.proc.engine.mute[(size_t)k] ? 0.f : 1.f);
    repaint();
}
void StepGrid::mouseDrag(const juce::MouseEvent& m) {
    if (painting < 0 || painting >= NUM_KEYS) return; int i = stepAt((float)m.x); if (i < 0 || i == lastCell) return;
    { const juce::ScopedLock l(ed.proc.lock); ed.proc.engine.scene().g[(size_t)painting][(size_t)i] = paintVal; }
    lastCell = i; repaint();
}

// ------------------------------------------------------------------ MIDI clip drag
void DragMidiButton::mouseDrag(const juce::MouseEvent& e) {
    if (dragged || e.getDistanceFromDragStart() < 6) return;
    dragged = true; auto f = ed.midiClip(true);
    if (f.existsAsFile()) juce::DragAndDropContainer::performExternalDragDropOfFiles({ f.getFullPathName() }, false, this, [this] { dragged = false; });
}
void DragMidiButton::mouseUp(const juce::MouseEvent& e) {
    juce::TextButton::mouseUp(e);
    if (!dragged && !e.mouseWasDraggedSinceMouseDown()) {
        auto f = ed.midiClip(true); ed.toast("MIDI clip saved to " + f.getParentDirectory().getFullPathName() + ". Drag this button onto a track to drop it in.");
        f.revealToUser();
    }
    dragged = false;
}

// ------------------------------------------------------------------ editor
MD442Editor::MD442Editor(MD442Processor& p) : AudioProcessorEditor(&p), proc(p) {
    setLookAndFeel(&look);
    addAndMakeVisible(grid);
    for (auto* b : { &presetBtn, &playBtn, &patternBtn, &chainBtn, &addScene, &delScene, &importBtn, &exportBtn, &sendBtn, &randomBtn, &clearBtn, &recBtn }) addAndMakeVisible(b);
    addAndMakeVisible(dragBtn);
    presetBtn.onClick = [this] { showPresetMenu(); };
    playBtn.setClickingTogglesState(false);
    playBtn.onClick = [this] {
        if (proc.hostPlaying()) { toast("The DAW is playing: MD-442 follows it. Stop the DAW to use PLAY."); return; }
        const juce::ScopedLock l(proc.lock); proc.engine.internalPlay = !proc.engine.internalPlay;
    };
    patternBtn.setClickingTogglesState(true);
    patternAtt = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(proc.apvts, "seq", patternBtn);
    patternBtn.setTooltip("On: the pattern plays along with the DAW. Off: MD-442 only plays the notes you send it (pads, clips).");
    chainBtn.onClick = [this] { { const juce::ScopedLock l(proc.lock); proc.engine.chain = !proc.engine.chain; } refreshTop(); };
    addScene.onClick = [this] {
        { const juce::ScopedLock l(proc.lock); auto& e = proc.engine; if (e.scenes.size() >= 8) { toast("Eight scenes is the most"); return; } e.scenes.push_back(e.scene()); e.sc = (int)e.scenes.size() - 1; }
        toast("Scene saved. You are on the new copy: keep building. CHAIN plays them in order."); refreshTop();
    };
    delScene.onClick = [this] { { const juce::ScopedLock l(proc.lock); auto& e = proc.engine; if (e.scenes.size() < 2) return; e.scenes.erase(e.scenes.begin() + e.sc); e.sc = juce::jmin(e.sc, (int)e.scenes.size() - 1); } refreshTop(); };
    for (int i = 0; i < 8; ++i) {
        auto* b = sceneBtns.add(new juce::TextButton(juce::String(i + 1))); addAndMakeVisible(b);
        b->onClick = [this, i] {
            const juce::ScopedLock l(proc.lock); auto& e = proc.engine; if (i >= (int)e.scenes.size()) return;
            e.chain = false; if (proc.hostPlaying() || e.internalPlay) e.pend = i == e.sc ? -1 : i; else e.sc = i;
        };
    }
    addAndMakeVisible(lenBox); for (int i = 1; i <= 16; ++i) lenBox.addItem("LEN " + juce::String(i), i);
    lenBox.onChange = [this] { const juce::ScopedLock l(proc.lock); proc.engine.last = lenBox.getSelectedId(); };
    importBtn.onClick = [this] { importBeat(); }; exportBtn.onClick = [this] { exportBeat(); };
    sendBtn.onClick = [this] { sendToKeyboard(); };
    recBtn.setClickingTogglesState(true); recBtn.setColour(juce::TextButton::buttonOnColourId, juce::Colour(0xffc21818));
    recBtn.setTooltip("Loop record: while the pattern plays, the pads and keys you play are written into it on the nearest step, pass after pass");
    recBtn.onClick = [this] {
        bool on = recBtn.getToggleState(); proc.seqRec = on;
        if (on && !proc.hostPlaying()) { const juce::ScopedLock l(proc.lock); proc.engine.internalPlay = true; }   // starts the loop if it is stopped
        toast(on ? "SEQ REC: play the pads and keys, they are written into the loop" : "SEQ REC off"); refreshTop();
    };
    sendBtn.setTooltip("Sends this beat's scenes to an SMK-37 or FM-1 running the MD|442 firmware (1.6 is the current one), as patterns 9-16");
    dragBtn.setTooltip("Drag onto a track in Ableton or Maschine to drop this beat in as a MIDI clip. Click to save it.");
    randomBtn.onClick = [this] {
        juce::Random r; auto pick = [&](std::initializer_list<const char*> l) { return *(l.begin() + r.nextInt((int)l.size())); };
        const juce::ScopedLock lk(proc.lock); Scene sc; auto row = [&](int k, const char* s) { for (int i = 0; i < 16; ++i) sc.g[(size_t)k][(size_t)i] = s[i] == 'x'; };
        const char* bd = pick({"x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x..xx...x...", "x.....x...x.....", "x..x..x...x..x..", "x.x.......xx...."}); bool four = std::string(bd).rfind("x...x...x...x", 0) == 0;
        row(BD, bd);
        row(SD, four ? pick({"................", "................", "............x...", ".......x......x."}) : pick({"....x.......x...", "....x..x.x..x...", "....x.......x..x"}));
        row(CP, four ? pick({"....x.......x...", "....x.......x...", "............x..."}) : pick({"................", "............x..."}));
        row(CH, pick({"x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.xxx.xxx.xxx.xx", "x..xx..xx..xx..x", "xx.xxx.xxx.xxx.x", "..x...x...x...x."}));
        row(OH, pick({"..x...x...x...x.", "..x...x...x...x.", "..............x.", "......x.......x.", "................"}));
        row(RS, pick({"................", "................", "..x..x....x..x..", ".......x.....x..", "...x......x....."}));
        const char* tom = pick({"................", "................", "...x..x....x.x..", "..x.....x.x.....", ".x...x.x...x..x.", "......x......x.."});
        for (int i = 0; i < 16; ++i) if (tom[i] == 'x') sc.g[bongoHi(i) ? HT : MT][(size_t)i] = true;
        row(LT, pick({"................", "................", "................", "..............xx", ".............x.x"}));
        row(RD, pick({"................", "................", "................", "..x...x...x...x.", "x.x.x.x.x.x.x.x."}));
        row(CR, pick({"................", "................", "x..............."}));
        row(BS, pick({".xx..xx..xx..xx.", ".x.x.x.x.x.x.x.x", "x..x..x...x..x..", "x.x...x.x..x..x.", "x.xxx.xx.xx.xxx.", "x.......x..x....", "..x..x....x..x..", "x..x...x..x....."}));
        row(ST, pick({"................", "................", "..............x.", "......x.........", "x..x......x.....", "..x.....x..x...."}));
        row(AC, pick({"................", "x...x...x...x...", "..x...x...x...x.", "x.....x...x....."}));
        const int scale[] = {3, 5, 7, 10, 12, 12}; for (int i = 0; i < 16; ++i) sc.n[(size_t)i] = i % 4 == 0 || r.nextFloat() < .6f ? 0 : scale[r.nextInt(6)];
        proc.engine.scene() = sc;
    };
    clearBtn.onClick = [this] { const juce::ScopedLock l(proc.lock); proc.engine.scene() = Scene(); };
    const char* kn[] = {"LOW", "MID", "HI"};
    const char* kid[] = {"kill_LOW", "kill_MID", "kill_HI"};
    for (int i = 0; i < 3; ++i) {
        killBtn[i].setButtonText(juce::String("KILL ") + kn[i]); killBtn[i].setClickingTogglesState(true); addAndMakeVisible(killBtn[i]);
        killAtt[i] = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(proc.apvts, kid[i], killBtn[i]);
    }
    for (auto& m : std::vector<std::pair<const char*, const char*>> {{"vol", "VOLUME"}, {"bpm", "TEMPO"}, {"shuffle", "SHUFFLE"}, {"key", "KEY"}, {"accent", "ACCENT"}})
        addAndMakeVisible(masterKnobs.add(new Knob(*this, m.first, m.second)));
    for (auto& m : std::vector<std::pair<const char*, const char*>> {{"fx.filter", "FILTER"}, {"fx.verb", "REVERB"}, {"fx.space", "ECHO"}, {"fx.drive", "DRIVE"}, {"fx.vdec", "RV DECAY"}, {"fx.etime", "E TIME"}, {"fx.efb", "E FDBK"}})
        addAndMakeVisible(fxKnobs.add(new Knob(*this, m.first, m.second)));
    addAndMakeVisible(toastLbl); toastLbl.setColour(juce::Label::backgroundColourId, ui::accent); toastLbl.setColour(juce::Label::textColourId, juce::Colours::black);
    toastLbl.setJustificationType(juce::Justification::centred); toastLbl.setFont(juce::FontOptions(13.f, juce::Font::bold)); toastLbl.setVisible(false);
    setResizable(true, true); setResizeLimits(980, 620, 1800, 1100); setSize(1120, 690);
    setWantsKeyboardFocus(true);
    rebuildVoiceKnobs(); refreshTop(); applyStyle((int)std::lround(proc.engine.pv("brk.kit"))); startTimerHz(30);
}
// the keys go to the editor, not to whichever button was clicked last (SPACE on a focused button would press that button)
void MD442Editor::keysToEditor() {
    std::function<void(juce::Component*)> walk = [&](juce::Component* c) { for (auto* ch : c->getChildren()) { ch->setWantsKeyboardFocus(false); walk(ch); } };
    walk(this);
}
void MD442Editor::applyStyle(int st) {
    st = juce::jlimit(0, 2, st); if (st == style) return; style = st;
    ui::setStyle(st); look.refresh(); toastLbl.setColour(juce::Label::backgroundColourId, ui::accent);
    sendLookAndFeelChange(); refreshTop(); repaint();
}
// the web app's shortcuts. One idea per modifier: a plain letter is a step, Shift + letter selects a drum, Alt + letter mutes it.
bool MD442Editor::keyPressed(const juce::KeyPress& kp) {
    auto mods = kp.getModifiers(); if (mods.isCommandDown() || mods.isCtrlDown()) return false;
    int code = kp.getKeyCode(); auto& e = proc.engine; int sel = proc.selected;
    if (code == juce::KeyPress::spaceKey) {
        if (proc.hostPlaying()) return false;   // the DAW is playing: SPACE is the DAW's
        { const juce::ScopedLock l(proc.lock); e.internalPlay = !e.internalPlay; } refreshTop(); return true;
    }
    if (code == juce::KeyPress::upKey || code == juce::KeyPress::downKey) { select(juce::jlimit(0, ROWS - 1, sel + (code == juce::KeyPress::upKey ? -1 : 1)), false); return true; }
    if (code == '[' || code == ']') { { const juce::ScopedLock l(proc.lock); e.last = juce::jlimit(1, 16, e.last + (code == '[' ? -1 : 1)); } refreshTop(); grid.repaint(); return true; }
    if (code >= '1' && code <= '8') { if (auto* b = sceneBtns[code - '1']) if (b->isVisible()) b->onClick(); refreshTop(); return true; }
    static const juce::String STEPS_ = "QWERTYUIASDFGHJK", DRUMS = "QWERTYUIASDFGH";   // drums: Kick Q, Snare W, Clap E, Rim R, toms T Y U, hats I A, Crash S, Ride D, Bass F, Chords G, Accent H
    int ch = juce::CharacterFunctions::toUpperCase((juce::juce_wchar)code);
    if (mods.isAltDown() || mods.isShiftDown()) {
        if (ch == 'M' && mods.isShiftDown() && sel < NUM_SOUND) { { const juce::ScopedLock l(proc.lock); e.solo = e.solo == sel ? -1 : sel; e.apply(); } grid.repaint(); return true; }
        int k = DRUMS.indexOfChar((juce::juce_wchar)ch); if (k < 0) return false;
        if (mods.isAltDown()) {
            if (mods.isShiftDown()) { if (k != AC) { const juce::ScopedLock l(proc.lock); e.solo = e.solo == k ? -1 : k; e.apply(); } }
            else if (auto* p = proc.muteParam[k]) p->setValueNotifyingHost(e.mute[(size_t)k] ? 0.f : 1.f);
            grid.repaint(); return true;
        }
        select(k, true); return true;
    }
    if (ch == 'M') { if (sel < NUM_KEYS) if (auto* p = proc.muteParam[sel]) p->setValueNotifyingHost(e.mute[(size_t)sel] ? 0.f : 1.f); grid.repaint(); return true; }
    if (ch == 'N') { addScene.onClick(); return true; }
    if (ch == 'L') { chainBtn.onClick(); return true; }
    int i = STEPS_.indexOfChar((juce::juce_wchar)ch);
    if (i >= 0) {
        const juce::ScopedLock l(proc.lock); auto& sc = e.scene();
        if (sel == BREAK) sc.brk[(size_t)i] = sc.brk[(size_t)i] == '.' ? 'g' : '.'; else if (sel < NUM_KEYS) sc.g[(size_t)sel][(size_t)i] = !sc.g[(size_t)sel][(size_t)i];
        grid.repaint(); return true;
    }
    return false;
}
MD442Editor::~MD442Editor() { stopTimer(); if (sender) sender->stopThread(3000); setLookAndFeel(nullptr); }

void MD442Editor::select(int k, bool sound) {
    proc.selected = k; rebuildVoiceKnobs(); grid.repaint();
    if (sound && !(proc.hostPlaying() || proc.engine.internalPlay)) { const juce::ScopedLock l(proc.lock); if (k < NUM_SOUND) proc.engine.hit(k); else if (k == BREAK) proc.engine.slice(0); }
}
void MD442Editor::rebuildVoiceKnobs() {
    int k = proc.selected; lastSel = k; voiceKnobs.clear();
    if (k == BREAK) {
        for (auto& m : std::vector<std::pair<const char*, const char*>> {{"brk.kit", "KIT"}, {"brk.slot", "LOOP"}, {"brk.level", "LEVEL"}, {"brk.complex", "CHOP"}, {"brk.pitch", "PITCH"},
                                                                        {"pan.BRK", "PAN"}, {"flt.BRK", "FILTER"}, {"drv.BRK", "DRIVE"}, {"rev.BRK", "VERB"}, {"ech.BRK", "ECHO"}})
            addAndMakeVisible(voiceKnobs.add(new Knob(*this, m.first, m.second)));
        voiceTitle = "BREAKS: loops and 8 slices from MD187 / MD888. Click a step: slice 1-8, LOOP (plays the loop in time), ~ (keep ringing). Pads C#2-G#2 play the slices.";
        keysToEditor(); resized(); repaint(); return;
    }
    for (auto& kn : md442::voiceKnobs(k)) addAndMakeVisible(voiceKnobs.add(new Knob(*this, kn.key, kn.label)));
    if (k < NUM_SOUND) {
        std::string id = voices()[(size_t)k].id;
        addAndMakeVisible(voiceKnobs.add(new Knob(*this, "lvl." + id, "LEVEL")));
        for (auto& t : std::vector<std::pair<std::string, const char*>> {{"pan." + id, "PAN"}, {"flt." + id, "FILTER"}, {"drv." + id, "DRIVE"}, {revKey(k), "VERB"}, {echKey(k), "ECHO"}}) {
            bool dup = false; for (auto* v : voiceKnobs) if (v->key == t.first) dup = true;
            if (!dup) addAndMakeVisible(voiceKnobs.add(new Knob(*this, t.first, t.second)));
        }
    }
    voiceTitle = juce::String(voices()[(size_t)k].name).toUpperCase();
    keysToEditor(); resized(); repaint();
}
void MD442Editor::refreshTop() {
    auto& e = proc.engine; int n, sc, last, pend; bool chain, playing;
    { const juce::ScopedLock l(proc.lock); n = (int)e.scenes.size(); sc = e.sc; last = e.last; chain = e.chain; pend = e.pend; playing = e.internalPlay; }
    for (int i = 0; i < 8; ++i) { sceneBtns[i]->setVisible(i < n); sceneBtns[i]->setToggleState(i == sc, juce::dontSendNotification); sceneBtns[i]->setColour(juce::TextButton::buttonColourId, i == pend ? ui::on.darker(.4f) : ui::cell); }
    chainBtn.setToggleState(chain, juce::dontSendNotification); lenBox.setSelectedId(last, juce::dontSendNotification);
    playBtn.setToggleState(playing || proc.hostPlaying(), juce::dontSendNotification);
    playBtn.setButtonText(proc.hostPlaying() ? "SYNCED" : juce::String::fromUTF8(playing ? "\xe2\x96\xa0 STOP" : "\xe2\x96\xb6 PLAY"));
    recBtn.setToggleState(proc.seqRec.load(), juce::dontSendNotification);
    presetBtn.setButtonText(proc.beatName + "  v");
}

void MD442Editor::timerCallback() {
    auto& e = proc.engine;
    int h = e.playhead.load(); uint32_t f = e.hitFlags.exchange(0);
    bool running = proc.hostPlaying() || e.internalPlay; if (!running) h = -1;
    if (h != grid.head || f != grid.flash) { grid.head = h; grid.flash = f; grid.repaint(); }
    if (proc.stateChanged.exchange(false)) { if (proc.selected != lastSel) rebuildVoiceKnobs(); grid.repaint(); for (auto* k : voiceKnobs) k->repaint(); }
    applyStyle((int)std::lround(e.pv("brk.kit")));
    refreshTop();
    if (toastTicks > 0 && --toastTicks == 0) toastLbl.setVisible(false);
    static int tick = 0; if (++tick % 15 == 0) grid.repaint();   // pattern edits made from elsewhere (scene changes, chain)
}

void MD442Editor::toast(const juce::String& msg) { toastLbl.setText(msg, juce::dontSendNotification); toastLbl.setVisible(true); toastLbl.toFront(false); toastTicks = 30 * 4; }

void MD442Editor::paint(juce::Graphics& g) {
    g.fillAll(ui::bg);
    g.setColour(ui::text); g.setFont(juce::FontOptions(22.f, juce::Font::bold)); g.drawText("MD|", 14, 8, 44, 30, juce::Justification::centredLeft);
    g.setColour(style ? ui::accent : ui::text); g.drawText(style == 1 ? "187" : style == 2 ? "888" : "442", 50, 8, 60, 30, juce::Justification::centredLeft);
    for (auto [r, t] : std::vector<std::pair<juce::Rectangle<int>, juce::String>> {{voiceArea, voiceTitle}, {masterArea, "MASTER"}, {fxArea, "EFFECTS"}}) {
        g.setColour(ui::panel); g.fillRoundedRectangle(r.toFloat(), 6);
        g.setColour(ui::dim); g.setFont(juce::FontOptions(11.f, juce::Font::bold)); g.drawText(t, r.reduced(10, 4).removeFromTop(14), juce::Justification::centredLeft);
    }
    g.setColour(ui::dim); g.setFont(juce::FontOptions(10.5f));
    double hb = proc.hostBpm();
    g.drawText(hb > 0 ? "DAW tempo " + juce::String(hb, 1) + " BPM" : "Own tempo", getWidth() - 200, getHeight() - 18, 190, 14, juce::Justification::centredRight);
}

void MD442Editor::resized() {
    auto r = getLocalBounds().reduced(10);
    auto top = r.removeFromTop(34); top.removeFromLeft(110);
    presetBtn.setBounds(top.removeFromLeft(190).reduced(2)); playBtn.setBounds(top.removeFromLeft(70).reduced(2)); patternBtn.setBounds(top.removeFromLeft(84).reduced(2));
    top.removeFromLeft(8);
    for (int i = 0; i < 8; ++i) sceneBtns[i]->setBounds(top.removeFromLeft(30).reduced(2));
    addScene.setBounds(top.removeFromLeft(28).reduced(2)); delScene.setBounds(top.removeFromLeft(28).reduced(2)); chainBtn.setBounds(top.removeFromLeft(64).reduced(2));
    lenBox.setBounds(top.removeFromLeft(78).reduced(2));
    r.removeFromTop(6);
    auto bottom = r.removeFromBottom(250); r.removeFromBottom(6);
    auto tools = r.removeFromBottom(26); randomBtn.setBounds(tools.removeFromLeft(90).reduced(2)); clearBtn.setBounds(tools.removeFromLeft(80).reduced(2));
    tools.removeFromLeft(16);
    importBtn.setBounds(tools.removeFromLeft(80).reduced(2)); exportBtn.setBounds(tools.removeFromLeft(80).reduced(2));
    dragBtn.setBounds(tools.removeFromLeft(96).reduced(2)); sendBtn.setBounds(tools.removeFromLeft(150).reduced(2)); recBtn.setBounds(tools.removeFromLeft(84).reduced(2));
    for (int i = 2; i >= 0; --i) killBtn[i].setBounds(tools.removeFromRight(84).reduced(2));
    grid.setBounds(r);
    auto row1 = bottom.removeFromTop(122); voiceArea = row1;
    auto row2 = bottom.withTrimmedTop(6); masterArea = row2.removeFromLeft(row2.getWidth() * 5 / 12); row2.removeFromLeft(6); fxArea = row2;
    auto lay = [](juce::OwnedArray<Knob>& ks, juce::Rectangle<int> a) {
        a = a.reduced(8).withTrimmedTop(16); int w = juce::jmin(84, ks.size() ? a.getWidth() / juce::jmax(1, ks.size()) : 84);
        for (auto* k : ks) k->setBounds(a.removeFromLeft(w).reduced(2));
    };
    lay(voiceKnobs, voiceArea); lay(masterKnobs, masterArea); lay(fxKnobs, fxArea);
    toastLbl.setBounds(getLocalBounds().withSizeKeepingCentre(juce::jmin(760, getWidth() - 40), 34).withY(getHeight() - 56));
}

void MD442Editor::showPresetMenu() {
    juce::PopupMenu m; int np = Engine::numPresets();
    juce::PopupMenu sub[3]; const char* styles[] = {"MD442", "MD187", "MD888"};
    for (int i = 0; i < np; ++i) { auto st = Engine::presetStyle(i); int si = st == "MD187" ? 1 : st == "MD888" ? 2 : 0; sub[si].addItem(i + 1, Engine::presetName(i), true, proc.beatName == juce::String(Engine::presetName(i))); }
    m.addSubMenu("MD442  techno and house", sub[0]); m.addSubMenu("MD187  90s hip-hop, 96 BPM", sub[1]); m.addSubMenu("MD888  hard techno, 155 BPM", sub[2]); (void)styles;
    auto beats = BeatIO::listBeats();
    if (!beats.isEmpty()) { m.addSeparator(); m.addSectionHeader("Your beats (Documents/MD-442/Beats)"); for (int i = 0; i < beats.size(); ++i) m.addItem(100 + i, beats[i].getFileNameWithoutExtension().upToFirstOccurrenceOf(".md442", false, true)); }
    m.addSeparator(); m.addItem(99, "Open the beats folder");
    m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(&presetBtn), [this, beats](int r) {
        if (r >= 1 && r <= Engine::numPresets()) { proc.loadPreset(r - 1); grid.repaint(); }
        else if (r == 99) BeatIO::beatsFolder().startAsProcess();
        else if (r >= 100 && r - 100 < beats.size()) {
            juce::String name; bool ok;
            { const juce::ScopedLock l(proc.lock); ok = BeatIO::fromJson(proc.engine, beats[r - 100].loadFileAsString(), name); if (ok) proc.beatName = name; }
            if (ok) { proc.pushParamsToHost(); toast("Loaded " + name); } else toast("That file is not an MD|442 beat");
        }
        refreshTop();
    });
}

void MD442Editor::importBeat() {
    chooser = std::make_unique<juce::FileChooser>("Import an MD|442 beat", BeatIO::beatsFolder(), "*.json");
    chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& c) {
        auto f = c.getResult(); if (!f.existsAsFile()) return;
        juce::String name; bool ok;
        { const juce::ScopedLock l(proc.lock); ok = BeatIO::fromJson(proc.engine, f.loadFileAsString(), name); if (ok) proc.beatName = name; }
        if (ok) { proc.pushParamsToHost(); toast("Imported " + name); } else toast("That file is not an MD|442 beat");
        refreshTop(); grid.repaint();
    });
}
void MD442Editor::exportBeat() {
    juce::String json, name = proc.beatName;
    { const juce::ScopedLock l(proc.lock); json = BeatIO::toJson(proc.engine, name); }
    auto def = BeatIO::beatsFolder().getChildFile(juce::File::createLegalFileName(name) + ".md442.json");
    chooser = std::make_unique<juce::FileChooser>("Export this beat", def, "*.json");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::warnAboutOverwriting, [this, json](const juce::FileChooser& c) {
        auto f = c.getResult(); if (f == juce::File()) return;
        if (f.replaceWithText(json)) toast("Saved " + f.getFileName() + ". Open it in MD|442 on the web, the desktop app, or another DAW."); else toast("Could not save there");
    });
}
juce::File MD442Editor::midiClip(bool all) {
    auto f = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("MD-442 " + juce::File::createLegalFileName(proc.beatName) + ".mid");
    const juce::ScopedLock l(proc.lock); BeatIO::writeMidi(proc.engine, f, all); return f;
}

// Send to keyboard: try each MIDI output until one answers like an MD|442 keyboard, then send every scene (patterns 9-16)
void MD442Editor::sendToKeyboard() {
    if (sender && sender->isThreadRunning()) return;
    std::vector<juce::MemoryBlock> frames;
    { const juce::ScopedLock l(proc.lock); auto& e = proc.engine; for (size_t i = 0; i < e.scenes.size() && i < 8; ++i) frames.push_back(BeatIO::kbFrame(e, 8 + (int)i, e.scenes[i])); }
    toast("Looking for an MD|442 keyboard...");
    struct Sender : juce::Thread, juce::MidiInputCallback {
        Sender(MD442Editor* ed, std::vector<juce::MemoryBlock> f) : juce::Thread("MD442 send"), editor(ed), frames(std::move(f)) {}
        juce::Component::SafePointer<MD442Editor> editor; std::vector<juce::MemoryBlock> frames; juce::WaitableEvent ack; std::atomic<int> rc { -1 };
        void handleIncomingMidiMessage(juce::MidiInput*, const juce::MidiMessage& m) override {
            auto* d = m.getRawData(); int n = m.getRawDataSize();
            if (n >= 8 && d[0] == 0xF0 && d[1] == 0x7D && d[2] == 0x46 && d[3] == 0x4C && d[4] == 50) { rc = d[6]; ack.signal(); }
        }
        bool ask(juce::MidiOutput& out, const juce::MemoryBlock& f) {
            rc = -1; ack.reset(); out.sendMessageNow(juce::MidiMessage(f.getData(), (int)f.getSize()));
            return ack.wait(1500) && rc == 0;
        }
        void say(const juce::String& s) { juce::MessageManager::callAsync([p = editor, s] { if (p) p->toast(s); }); }
        void run() override {
            std::vector<std::unique_ptr<juce::MidiInput>> ins;
            for (auto& d : juce::MidiInput::getAvailableDevices()) if (auto in = juce::MidiInput::openDevice(d.identifier, this)) { in->start(); ins.push_back(std::move(in)); }
            for (auto& d : juce::MidiOutput::getAvailableDevices()) {
                if (threadShouldExit()) return;
                auto out = juce::MidiOutput::openDevice(d.identifier); if (!out) continue;
                if (!ask(*out, frames[0])) continue;
                for (size_t i = 1; i < frames.size(); ++i) ask(*out, frames[i]);
                say("Sent to " + d.name + ": " + juce::String((int)frames.size()) + (frames.size() > 1 ? " scenes on patterns 9-" + juce::String(8 + (int)frames.size()) : juce::String(" scene on pattern 9")) + ". The chords stay in the plugin.");
                return;
            }
            say(ins.empty() ? "No MIDI input could be opened to hear the keyboard answer. If your DAW holds the keyboard's port, close the DAW's use of it and try again."
                            : "No MD|442 keyboard answered. Connect it by USB and check it runs the MD|442 firmware (1.6 is the current one).");
        }
    };
    if (sender) sender->stopThread(2000);
    sender = std::make_unique<Sender>(this, std::move(frames)); sender->startThread();
}
