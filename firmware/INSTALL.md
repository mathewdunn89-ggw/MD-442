# MD|442 firmware: install guide

MD|442 runs on the keyboard itself: no computer, plays through the keyboard's own audio out.
Built on the open X0X groovebox firmware (GPL-3.0). Mathew's seven MD|442 patterns are loaded as patterns 1-7:
Peak Warehouse, Berlin Roll, Electro, Acid Jack, Deep House, Breakbeat, Dub Techno.

| Your hardware | File |
| --- | --- |
| M-VAVE SMK-37 Elite | md442-smk37-elite.fwsc |
| M-VAVE SMK-37 Pro (also Starrykey 37 Play) | md442-smk37-pro.fwsc |
| M-VAVE FM-1 | md442-fm1.fwsc |

## Version 1.7
- Hold a pad and move any fader: that pad's instrument volume. Pads 1 to 11 are the drums of the kit on screen,
  pads 12 to 16 are DRUMS 1, DRUMS 2, BASS, CHORDS, BREAKS. The step or mute the press changed is put back.
- Fixed: changing the instrument with knob 3 while holding a key left the note held. The last messages with the
  old names (303A, 303B, 909, 808) use the plain names.
- Identity SMK-37 Elite_917. Everything from 1.6 below is unchanged.

## Version 1.6
- The keys always play the instrument on screen (drums, bass, chords or break slices) and never turn steps on or off.
  The 16 pads are the steps. < / > pick the instrument: DRUMS 1, DRUMS 2, BASS, CHORDS, BREAKS.
- CHORDS is new: one key plays a whole chord (Minor, Major, Min7, Maj7, Min9, Sus4, 5th). Deep House and Dub Techno
  play MD|442's dub stab on it. BASS starts as a round bass.
- FX switches the faders: lit = reverb, delay, drive, filter; off = the volumes. REC + PLAY records what you play.
- Your saved patterns and global settings are kept. The update combo (hold OCTAVE- and OCTAVE+ for 5 seconds) and
  M-UPGRADE restore work as before (identity SMK-37 Elite_916). See md442-controls.pdf.
- MD187 (90s hip-hop) and MD888 (hard techno) are on the same download page.

## Before you install
- This replaces the keyboard's firmware. You can always go back (below), but you do it at your own risk.
- Use a USB data cable. Keep the keyboard powered and plugged in the whole time.

## Install (Mac)
1. Connect the keyboard to the Mac with a USB data cable.
2. Double-click "Install MD-442 (Mac).command" (keep the tools folder next to it). The first time, macOS may block it:
   right-click it, choose Open, then Open again.
3. Type 1, 2 or 3 for your keyboard and press Enter. The installer checks that the file matches the connected keyboard
   before it writes anything.
4. Keep the keyboard plugged in until it says done. It restarts into MD|442.

## Install (Windows or Linux)
1. Install Python 3, then run: pip install mido python-rtmidi
2. Connect the keyboard by USB and run, with your model's file:
   python3 tools/fm1_install.py md442-smk37-elite.fwsc

## Play
- PLAY starts pattern 1 (Peak Warehouse, 142 BPM).
- Change pattern: hold HOME (on the SMK-37: PATCH) and press white key / pad 1-7.
- Steps: the white keys on the FM-1, the 16 pads on the SMK-37 (its keys play the instrument).

## Use it with the MD|442 app (web, Mac, Windows, Android)
The app and the keyboard work together over USB. In the app:
- ▶ PLAY / ■ STOP is one key now (it replaces separate START and STOP).
- Double-tap a drum to mute it, and double-tap again to unmute.
- MY BEATS has IMPORT, EXPORT and MIDI ↓ (download a beat as a .mid file).
- CLOCK OUT (in the MIDI · DAW panel) makes the keyboard follow the app's tempo. Firmware 1.1 follows incoming MIDI clock and Start/Stop over USB, so press ▶ PLAY in the app and the keyboard starts in time. When the clock stops for half a second, the keyboard goes back to its own tempo.

## Send your own beats to the keyboard (firmware 1.1)
1. Connect the keyboard by USB to the computer running MD|442 (Chrome or the desktop app).
2. In MD|442 open the MIDI · DAW panel and press SEND TO KEYBOARD (allow MIDI with SysEx the first time).
3. Your scenes 1-8 land on keyboard patterns 9-16; the screen says FROM MD|442. Patterns 1-7 keep the factory beats.
4. From then on, every Save beat sends automatically while the keyboard is connected.
Drums, accents, the bass line, tempo and swing go across; the dub stab, knob settings, scene mixes and mute groups stay in the app.
Firmware 1.2: with LIVE on, the app also updates the keyboard as you edit (steps, tempo, drum mutes) and switches it to the scene you're on.

## Go back to the stock firmware
Install M-VAVE's own package for your model with M-VAVE's updater (M-UPGRADE).

## Source (GPL-3.0)
X0X by Charles Vestal (fork of Felucca by Leo Kuroshita / Hügelton Instruments), SMK-37 port by genkigenki.
MD|442 changes: md442-smk37.patch against github.com/genkigenki/fm1-x0x @ 8af3731 (branch smk37); full build in github.com/mathewdunn89-ggw/MD-MODULE.
