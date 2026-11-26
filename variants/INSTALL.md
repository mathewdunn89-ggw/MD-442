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

Switching between MD442, MD187 and MD888 is the same: run the installer again and pick another. Switching to MD187
or MD888 starts that firmware's own patterns (the keyboard says OLD DATA CLEARED once); going from MD442 1.2 to
MD442 1.3 keeps your patterns.

Windows or Linux: install Python 3, run `pip install mido python-rtmidi`, then
`python3 tools/fm1_install.py md187-smk37-elite.fwsc` (or the file you want).

## PERFORM controls (all three)
| Control | What it does |
| --- | --- |
| OCTAVE- / OCTAVE+ | previous / next instrument (909 BD SD CP CH OH toms RS CR RD, then the 808's, 303A, 303B, BREAK) |
| PATCH + OCTAVE- / + | previous / next part (909, 808, 303A, 303B, BREAK) |
| < / > | the bars (steps 1-16, 17-32 ...); on a 303 keyboard its octave |
| PATCH + < / > | previous / next pattern (switches at the end of the bar) |
| PATCH + pad | jump to that pattern (as before) |
| K2 / K3 / K4 (top right) | the selected instrument's FILTER (middle off, left low-pass, right high-pass), RESONANCE, TONE (its decay; on a 303 cutoff, reso, env mod; on the BREAK its pitch) |
| PATCH + K2 / K3 / K4 | tempo / part / pattern |
| KNOB BANK | tap: pads become MUTE pads (lit); tap again to go back. Hold it: mute while held |
| MUTE pads | 1-11 the tracks of the kit on screen, 12-16 the parts 909, 808, 303A, 303B, BREAK |
| PATCH + KNOB BANK | unmute everything |
| Mod wheel | on a drum or the BREAK: a high-pass riser on that instrument (on a 303: its cutoff, as before) |
| Black keys (BREAK selected) | play the BREAK's 8 slices live: MD187 stabs and vocal hits, MD888 trance stabs and hits |
| K1, K5-K8, faders, FX, PLAY, REC ... | as before (K1 volume, K5-K8 the screen's knobs, faders the part levels) |

The filters are fresh each time the keyboard starts (a set starts clean). Holding < and > together for 5 seconds
puts the keyboard in update mode (it was OCTAVE- and OCTAVE+ before).

## Go back to the stock firmware
Install M-VAVE's own package for your model with M-VAVE's updater (M-UPGRADE).

## Source (GPL-3.0)
X0X by Charles Vestal (fork of Felucca by Leo Kuroshita / Hügelton Instruments), SMK-37 port by genkigenki.
MD changes: firmware/md442-smk37.patch then variants/md-variants.patch, against github.com/genkigenki/fm1-x0x @ 8af3731.
