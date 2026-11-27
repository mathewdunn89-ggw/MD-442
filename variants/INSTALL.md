# MD Hardware firmwares: MD442, MD187, MD888

Three firmwares for the M-VAVE SMK-37 Elite (also the SMK-37 Pro and the FM-1). Same engine, same
filters and effects, same PERFORM controls; each has its own sound, patterns and samples.

| Firmware | Style | Tempo | Patterns 1-8 |
| --- | --- | --- | --- |
| MD442 | techno and house | 142 | Peak Warehouse, Berlin Roll, Electro, Acid Jack, Deep House, Breakbeat, Dub Techno |
| MD187 | 90s hip-hop: boom-bap, dusty sampled drums, stabs, vocal hits | 96 | Boom Bap, Dusty, Stab City, Vox Hits, Laid Back, Chop Shop, Horns, Scratch |
| MD888 | hard techno: Berlin, gabba, rumble, trance stabs and hits | 155 | Warehouse, Gabba, Trance Stab, Industry, Acid 155, Schranz, Rolling, Peak Time |

All MD187 and MD888 samples are synthesised from scratch (no recordings, nothing taken from a record).

**These builds have not been tested on a keyboard yet.** The installer keeps all its safety checks, and you can
always go back to M-VAVE's own firmware.

## Install (Mac), about 2 minutes
1. The SMK-37 needs M-VAVE's stock firmware 016 under it (it already has it if MD|442 1.2 is on it).
2. Connect the keyboard to the Mac with a USB data cable, straight in, no hub. Quit Chrome tabs with MD|442 and any DAW.
3. Double-click **Install MD Hardware (Mac).command** (keep the tools folder next to it). The first time, macOS
   may block it: right-click it, choose Open, then Open again.
4. Type 1, 2 or 3 for the firmware (MD442, MD187, MD888), then 1 for the SMK-37 Elite. The installer checks
   that the file matches the connected keyboard before it writes anything.
5. Keep the keyboard plugged in until it says Done. It restarts into the firmware you picked.

Switching between MD442, MD187 and MD888 is the same: run the installer again and pick another. Your global
settings (MIDI channels, clock and notes out, output level, key lights, autosave) stay as they are. Each firmware
starts with its own patterns and sound; the other firmware's saved patterns are kept until you save in this one.
MD|442 1.2 users keep their patterns in MD442 1.5.

Windows or Linux: install Python 3, run `pip install mido python-rtmidi`, then
`python3 tools/fm1_install.py md187-smk37-elite.fwsc` (or the file you want).

## PERFORM controls (all three, version 1.5)
Every stock X0X button, knob, MIDI setting and the update combo work exactly as in MD|442 1.2. The new moves
use only controls that did nothing before: KNOB BANK, the 10 end keys of the keybed, PATCH + < / >, and the mod
wheel on drums. PATCH is SHIFT. The one-page cheat sheet (md-hardware-controls.pdf) shows them on a picture of the Elite.

**Build a beat**
| Control | What it does |
| --- | --- |
| black keys, or KNOB BANK + OCTAVE- / OCTAVE+ | pick the instrument (909's 11 tracks, the 808's, 303A, 303B, BREAK) |
| pads (or white keys) | the instrument's 16 steps: tap on, tap off, hold for that step's sound; OCTAVE- / + the bars (stock) |
| SEQ REC + keys or pads | record live |
| KNOB BANK + FADER BANK | DRUM PADS: pads 1-11 play the kit on screen, 12-16 the other kit's BD SD CP CH OH, with velocity; with REC they record to the nearest step. Again: back to steps |
| KNOB BANK held + K2 / K3 / K4 | the instrument's FILTER (left low-pass, right high-pass, rests at OFF), RESONANCE, DECAY (303: cutoff, reso, env mod; BREAK: pitch) |
| K2 / K3 / K4 alone | X0X's SELECT, ALGORITHM, PRESETS (stock); PATCH + them: tempo / part / pattern |

**Mix it live**
| Control | What it does |
| --- | --- |
| faders | A: 909, 808, 303A, 303B levels. FADER BANK: break level, reverb, delay, master filter |
| KNOB BANK | tap: MUTE pads (lit; 1-11 tracks, 12-16 parts), tap again to leave. Hold + pads: mute while held |
| PATCH + a pad (in MUTE) | solo that track or part; again to unsolo |
| PATCH + KNOB BANK | unmute everything |
| PATCH + < / >, PATCH + pad | the pattern before / after, or that pattern, at the end of the bar |

**Build-ups and breakdowns: the 10 end keys of the keybed (hold to play)**
| Key | What it does |
| --- | --- |
| C3, C#3, D3, D#3 | BEAT REPEAT 1/2, 1/4, 1/8, 1/16 bar; the fastest held wins; let go and it is back in time |
| E3 | FILL: a roll on the selected drum (the snare if none), 8ths, 16ths from the next bar, then 32nds, getting louder |
| G#5 | ECHO THROW: the part on screen into the delay; the echoes ring for a bar after you let go |
| A5 | KILL LOW: kicks and both 303s out; back on the next one |
| A#5 | WASH: reverb on the part on screen (PATCH + ECHO or WASH: every part) |
| B5 | RISER: master high-pass sweeps up over 4 bars and the reverb swells; back on the next one |
| C6 | DROP: everything out, tails ring; back on the next one |

The mod wheel is a high-pass riser on the selected drum or the BREAK (on a 303 it opens the cutoff). With the BREAK
selected the black keys play its 8 slices live (MD187 stabs and vocal hits, MD888 trance stabs and hits).
The filters start at OFF each time the keyboard starts. Holding OCTAVE- and OCTAVE+ together for 5 seconds puts
the keyboard in update mode (as in 1.2), so M-UPGRADE can always reach it.

## Go back to the stock firmware
Install M-VAVE's own package for your model with M-VAVE's updater (M-UPGRADE).

## Source (GPL-3.0)
X0X by Charles Vestal (fork of Felucca by Leo Kuroshita / Hügelton Instruments), SMK-37 port by genkigenki.
MD changes: firmware/md442-smk37.patch then variants/md-variants.patch, against github.com/genkigenki/fm1-x0x @ 8af3731.
