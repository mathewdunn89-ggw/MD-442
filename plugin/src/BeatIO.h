// Beats in and out of the plugin:
//  - the shared MD|442 beat file (.md442.json), the same shape the web app saves a beat in
//  - a MIDI clip of the pattern, to drag into Ableton or Maschine
//  - SysEx frames for an SMK-37 / FM-1 running the MD|442, MD|187 or MD|888 firmware, 1.6 being the current one ("Send to keyboard")
#pragma once
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "Engine.h"

namespace BeatIO {
    juce::String toJson(const md442::Engine& e, const juce::String& name);
    // reads a beat file: one beat, a list of beats (takes the first), or { beats: [...] }. setTrim: use the file's loudness trim.
    bool fromJson(md442::Engine& e, const juce::String& json, juce::String& name, bool setTrim = true);
    juce::File beatsFolder();   // Documents/MD-442/Beats, shared by every MD|442 on this computer
    juce::Array<juce::File> listBeats();
    // one bar per scene (chain plays them in order), drums on channel 1 from C1, bass on channel 2, stab on channel 3
    bool writeMidi(const md442::Engine& e, const juce::File& f, bool allScenes);
    juce::MemoryBlock kbFrame(const md442::Engine& e, int slot, const md442::Scene& sc);
    // the BREAKS row for the MD|187 / MD|888 firmware (command 52); empty when the beat has no break. Not sent yet: SEND TO KEYBOARD sends what it always has
    juce::MemoryBlock kbBreak(const md442::Engine& e, int slot, const md442::Scene& sc);
}
