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
MD|442 1.2 and 1.5 to 1.7 users keep their patterns in MD442 1.8.

Windows or Linux: install Python 3, run `pip install mido python-rtmidi`, then
`python3 tools/fm1_install.py md187-smk37-elite.fwsc` (or the file you want).

## Playing it (all three, version 1.8)
The one-page cheat sheet (md-hardware-controls.pdf) has all of this on one page.

| Control | What it does |
| --- | --- |
| < / > | pick the instrument: DRUMS 1 (909), DRUMS 2 (808), BASS, CHORDS, LEAD, BREAKS. The screen shows its name |
| keys (F3 to G5) | always play the instrument on screen, never the steps. Drums: BD SD CP CH OH LT MT HT RS CR RD from F3, again from E4. BASS, CHORDS and LEAD: notes, kept in the key of the bass line (OCTAVE- / + the octave). BREAKS: slices 1-8 |
| ARP | an arpeggiator for the keys on BASS, CHORDS and LEAD. One key held: that note up through the octaves. More keys: they run upwards, in 16ths, in time with the pattern. PATCH + ARP: the line generator |
| PATCH + SCALE | IN KEY on / off. On (the start): the keys snap to the natural minor scale of the bass line's key, and CHORDS builds its chords from that scale, so playing over a pattern stays in tune |
| pads | the instrument's 16 steps: tap on, tap off. BASS / CHORDS / LEAD: a new step takes the note you last played; hold a pad + press a key to set that step's note |
| REC + PLAY | what you play on the keys goes into the pattern on the nearest step |
| FX | the faders' switch. Lit: REVERB, DELAY, DRIVE (bottom: off), FILTER (bottom: off, up: high-pass). Off: volumes of DRUMS 1, DRUMS 2, BASS, CHORDS |
| FADER BANK | fader 1 switches between DRUMS 1 and BREAKS (lit: BREAKS) |
| Hold a pad + any fader | that pad's instrument volume. Pads 1 to 11: the drums of the kit on screen (BD SD CP CH OH LT MT HT RS CR RD). Pads 12 to 16: DRUMS 1, DRUMS 2, BASS, CHORDS, BREAKS. The step or mute the press changed is put back |
| KNOB BANK held + K2 / K3 / K4 | filter, resonance, decay of the instrument (BASS / CHORDS: cutoff, reso, env mod) |
| PARA | the instrument's sound pages; on CHORDS the CHORD page picks the chord: Minor, Major, Min7, Maj7, Min9, Sus4, 5th, Off |
| KNOB BANK tap | the pads mute (1-11 drums, 12-16 instruments); PATCH + a pad solos; PATCH + KNOB BANK unmutes all |
| PATCH + < / >, PATCH + pad | the pattern before / after, or that pattern, at the end of the bar |
| hold CHORD while playing | accent (or hit the key hard) |

**CHORDS** is new: one key plays a whole chord through one filter, like a dub-techno or house stab. It starts as
a minor 7th on MD442 (MD442's Deep House and Dub Techno patterns play its stab), a minor 9th on MD187 and a dark
minor stab on MD888. **BASS** on MD442 starts as a round bass; turn up the resonance and env mod for acid.
A project saved with 1.5 gets the new BASS and CHORDS sound once, the first time 1.6 or later loads it. Its patterns stay.

**LEAD** (new in 1.8) is the CHORDS voice playing single notes: pick it with < > and play a lead line or an
arpeggio. LEAD and CHORDS are one voice and one pattern lane, so one of them sounds at a time. Arpeggiator
notes are played live and are not recorded into the pattern.

**Your own loops:** the keyboard keeps about 14 seconds of your own loops (SMK-37 Elite and Pro; about 21 on
the FM-1; one loop about 7 seconds at most, mono, 22 kHz). They stay in the keyboard when it is unplugged and
play on BREAKS as BR1, BR2 and so on (PARA, then LOOP A or LOOP B). The loops page on the MD-Modules site
sends them over USB from Chrome or Edge.

**Build-ups and breakdowns: the 10 end keys of the keybed (hold to play)**
| Key | What it does |
| --- | --- |
| C3, C#3, D3, D#3 | BEAT REPEAT 1/2, 1/4, 1/8, 1/16 bar; let go and it is back in time |
| E3 | FILL: a roll on the drum on screen, faster and louder each bar |
| G#5 | ECHO THROW: the instrument into the delay; the echoes ring for a bar after you let go |
| A5 | KILL LOW: kicks and bass out; back on the next one |
| A#5 | WASH: reverb on the instrument (PATCH + ECHO or WASH: every part) |
| B5 | RISER: master high-pass sweeps up over 4 bars; back on the next one |
| C6 | DROP: everything out, tails ring; back on the next one |

Unchanged from stock: holding OCTAVE- and OCTAVE+ together for 5 seconds puts the keyboard in update mode, so
M-UPGRADE can always reach it; GLOBE opens the settings; your global settings are kept through every update.
With the app over USB the Elite sends and follows play / stop and MIDI clock; unplugged it runs on its own.

## Go back to the stock firmware
Install M-VAVE's own package for your model with M-VAVE's updater (M-UPGRADE).

## Source (GPL-3.0)
X0X by Charles Vestal (fork of Felucca by Leo Kuroshita / Hügelton Instruments), SMK-37 port by genkigenki.
MD changes: firmware/md442-smk37.patch then variants/md-variants.patch, against github.com/genkigenki/fm1-x0x @ 8af3731.
