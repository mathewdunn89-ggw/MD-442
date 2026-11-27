# Controls and keyboard mapping

Three maps: the M-VAVE keyboard running the MD firmware, the computer keyboard in the web and desktop apps,
and the MIDI notes the plugin answers to.

- [SMK-37 Elite and Pro with the MD firmware](#smk-37-elite-and-pro-with-the-md-firmware)
- [Computer keyboard (web and desktop apps)](#computer-keyboard-web-and-desktop-apps)
- [Plugin MIDI map](#plugin-midi-map)

## SMK-37 Elite and Pro with the MD firmware

One layout for MD442, MD187 and MD888 (firmware 1.7). The keys play. The pads are the steps. < > picks the
instrument. FX switches what the faders do. There is a one-page [cheat sheet (PDF)](../variants/md-hardware-controls.pdf).

### 1. Pick an instrument: < >

DRUMS 1 (909 kit), DRUMS 2 (808 kit), BASS, CHORDS, BREAKS. The screen shows its name. The keys, the pads, the
sound knobs and the mod wheel all follow it.

### 2. The keys play it

| Instrument | Keys |
| --- | --- |
| DRUMS 1 / 2 | From F3 up: BD SD CP CH OH LT MT HT RS CR RD, then the same again from E4. Hit harder for louder |
| BASS | Notes. Hold one key and play another: it slides. OCT- and OCT+ change the octave |
| CHORDS | One key plays a whole chord, an octave above the bass |
| BREAKS | Slices 1 to 8 of the loop, from F3 up |
| Accent | Hit hard, or hold CHORD while you play |

The keys never turn steps on or off. The two end zones of the keybed are the performance keys (section 7).

### 3. The pads are the steps

| Action | Result |
| --- | --- |
| Tap a pad | That step on. Tap again: off. Pads 1 to 16 are steps 1 to 16 |
| DRUMS | The pads show the drum you last played on the keys. Play another key to edit that drum |
| BASS / CHORDS | A new step takes the note you last played. Hold a pad + press a key: that step's note |
| Bars 2 to 4 | OCT- and OCT+ on the drums: steps 17 to 32 and on |

### 4. FX switches the faders

| State | Faders 1 to 4 |
| --- | --- |
| FX lit | REVERB, DELAY, DRIVE, FILTER (middle off, left low-pass, right high-pass) |
| FX off | Volumes: DRUMS 1, DRUMS 2, BASS, CHORDS |
| FADER BANK | Fader 1 switches between DRUMS 1 and BREAKS (lit: BREAKS) |
| Hold a pad + any fader | That instrument's volume. Pads 1 to 11: the drums of the kit on screen. Pads 12 to 16: DRUMS 1, DRUMS 2, BASS, CHORDS, BREAKS |

A fader only takes over once you move it, so nothing jumps when you switch.

### 5. Record

| Action | Result |
| --- | --- |
| REC + PLAY | Play the keys in time: drums, bass and chords go into the pattern on the nearest step |
| By hand | Stop, play a note, tap the pads where you want it |
| Save | BT saves (and it saves itself when it is quiet) |

### 6. Shape the sound

| Control | Result |
| --- | --- |
| Hold KNOB BANK | K2 filter, K3 resonance, K4 decay. BASS / CHORDS: cutoff, resonance, env mod |
| PARA | The instrument's sound pages (press again for the next page). K5 to K8 turn what is on screen |
| Chord type | On CHORDS: PARA until the CHORD page, then K5: Minor, Major, Min7, Maj7, Min9, Sus4, 5th or Off |
| Mod wheel | BASS / CHORDS: opens the filter. Drums / breaks: a high-pass riser |

### 7. Build-ups and breakdowns: hold the end keys

| Key | What it does |
| --- | --- |
| C3, C#3, D3, D#3 | BEAT REPEAT 1/2, 1/4, 1/8, 1/16 bar. Let go and it is back in time |
| E3 | FILL: a roll on the drum on screen, faster and louder each bar |
| G#5 | ECHO THROW: the instrument into the delay; the echoes ring for a bar after you let go |
| A5 | KILL LOW: kicks and bass out. Back on the next one |
| A#5 | WASH: reverb on the instrument (PATCH + ECHO or WASH: every part) |
| B5 | RISER: master high-pass sweeps up over 4 bars. Back on the next one |
| C6 | DROP: everything out, tails ring. Back on the next one |

### 8. Mutes and patterns

| Control | Result |
| --- | --- |
| Tap KNOB BANK | The pads become mutes (lit): 1 to 11 the drums, 12 to 16 the five instruments. Tap again: steps |
| PATCH + a pad (in mutes) | Solo. PATCH + KNOB BANK: unmute all |
| PATCH + < / >, PATCH + a pad | The pattern before or after, or that pattern. Changes at the end of the bar |

### Unchanged from stock

| | |
| --- | --- |
| Update mode | Hold OCT- and OCT+ for 5 seconds. M-VAVE's updater (M-UPGRADE) can always reach the keyboard |
| Settings | GLOBE: MIDI, clock, output. Kept through every update |
| With the app | Over USB the keyboard sends and follows play, stop and MIDI clock. Unplugged, it runs on its own |

## Computer keyboard (web and desktop apps)

Click the machine first so the keys go to it. **?** or **⌘K / Ctrl+K** opens the list of every shortcut.

| Key | What it does |
| --- | --- |
| Space | Start / stop |
| Q W E R T Y U I, A S D F G H J K | Steps 1 to 8 and 9 to 16 of the selected drum |
| Shift + letter | Select a drum (Q kick, W snare, E clap, R rim, T low tom, Y mid tom, U hi tom, I closed hat, A open hat, S crash, D ride, F bass, G stab, H sample, J accent) |
| Alt + letter | Mute that drum. With Shift: solo |
| ↑ / ↓ | Previous / next drum |
| ← / → | Tempo down / up by 1. With Shift: by 5 |
| 1 to 8 | Scene 1 to 8 |
| 9 | Click (metronome) |
| 0 | Tap tempo |
| N | New scene |
| L | Chain the scenes |
| M | Mute the selected drum. Shift + M: solo |
| B (hold) | Hold repeat |
| X | Mixer |
| C | Piano keys (then A W S E D F T G Y H U J K O L P play notes) |
| V | Next view |
| P | Full screen |
| [ / ] | Last step shorter / longer |
| Alt + Z / X / C | Kill low / mid / high |
| Alt + V / B / N / M | Filter, reverb, echo, drive on / off |
| Shift + Z | Random pattern |
| Shift + Backspace | Clear the selected drum |
| ⌘ / Ctrl + Z, Shift + Z or Y | Undo, redo |
| ⌘ / Ctrl + S | Save the beat |
| ⌘ / Ctrl + Enter | Record |

## Plugin MIDI map

| MIDI | Plays |
| --- | --- |
| C1 (36) to C2 (48), channel 1 | Kick, Snare, Clap, Rim, Low tom, Mid tom, Hi tom, Closed hat, Open hat, Crash, Ride, Bass, Chords (the Ableton Drum Rack layout) |
| C3 (60) upward | The same again, for Maschine's keyboard mode |
| C#2 to G#2 | BREAKS slices 1 to 8 (MD187 and MD888) |
| Velocity above 100 | Accent |
| Channel 2 | The bass, at the note's pitch |
| Channel 3 | The chords, on that root |

Every knob is a normal DAW parameter. Right-click a knob on screen and choose MIDI learn to put it on a
controller. The full plugin guide is in
[`plugin/INSTALL.md`](https://github.com/mathewdunn89-ggw/MD-MODULE/blob/vst-plugin/plugin/INSTALL.md).
