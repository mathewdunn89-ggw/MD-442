# MD-442 plugin: install

MD|442 as a plugin for Ableton Live, Maschine, Logic, FL Studio, Bitwig, Reaper and other DAWs.
Mac: VST3 and Audio Unit (AU), Apple Silicon and Intel. Windows: VST3, 64-bit. Both include a standalone app.

## Mac
1. Download **md442-plugin-mac.pkg**.
2. The installer is not signed by Apple yet, so the first time macOS blocks it. Right-click (or Control-click) the file, choose **Open**, then **Open** again.
   On macOS 15 and newer: double-click it once, then open **System Settings > Privacy & Security**, scroll down and press **Open Anyway**.
3. Follow the installer. It puts MD-442 in /Library/Audio/Plug-Ins (Components for AU, VST3 for VST3).
4. In your DAW:
   - **Maschine 2**: Preferences > Plug-ins > Manager, press **Rescan**. Load MD-442 from Instrument > Native/User plug-ins > NEST Group.
   - **Ableton Live**: Settings > Plug-Ins, turn on **Use Audio Units** and/or **Use VST3 Plug-in System Folders**, press **Rescan**. MD-442 is under Plug-Ins > NEST Group.
   - **Logic Pro**: it scans by itself on the next start (Instrument slot > AU Instruments > NEST Group > MD-442).

## Windows
1. Download **md442-plugin-windows.exe** and run it. SmartScreen will warn that it is from an unknown publisher: press **More info**, then **Run anyway**.
2. It installs MD-442.vst3 to C:\Program Files\Common Files\VST3.
3. **Ableton Live**: Options > Preferences > Plug-Ins, turn on **Use VST3 Plug-in System Folders**, press **Rescan**. **Maschine**: Preferences > Plug-ins > Manager > **Rescan**.

## Playing it
- **Three styles** in the preset menu: MD442 (techno and house, 7 patterns), MD187 (90s hip-hop, 93 to 96 BPM, 8 patterns) and MD888 (hard techno, 155 BPM, 8 patterns). MD187 and MD888 add the **BREAKS** row: their loops (boom-bap, drums, stabs, vox / rumble, gabba, trance, hits) and 8 slices of each, the same 44.1 kHz banks as the web app. Click a BREAKS step to cycle slice 1-8, LOOP (plays the loop in time with the DAW) and ~ (keep ringing). Pads C#2 to G#2 play the 8 slices live.
- **The pattern plays along with your DAW** at the DAW's tempo whenever the DAW plays. Turn **PATTERN** off to play MD-442 only from pads, keys or clips.
- **Pads and keys**: notes from C1 (36) up to C2 (48) play Kick, Snare, Clap, Rim, Low tom, Mid tom, Hi tom, Closed hat, Open hat, Crash, Ride, Bass, Chords, the same layout as an Ableton Drum Rack. C3 (60) upward plays them too, for Maschine's keyboard mode. Hit hard (velocity above 100) for the accent.
- **MIDI channel 2** plays the bass at the note's pitch, **channel 3** plays the chords (the dub stab) on that root.
- **SEQ REC** is loop record: turn it on and what you play on the pads and keys is written into the pattern on the nearest step, pass after pass. Drums go to their row, channel 2 writes the bass line with its notes, the slice pads write the BREAKS row.
- **Keyboard shortcuts**, the same as the web app, once you have clicked in the plugin window: SPACE plays or stops the plugin's own pattern while the DAW is stopped (while the DAW plays, SPACE stays the DAW's). Q W E R T Y U I and A S D F G H J K are steps 1 to 16 of the selected drum, Shift + letter selects a drum, Alt + letter mutes it, M mutes the selected drum, 1 to 8 pick a scene, N adds a scene, L chains them, [ and ] shorten or lengthen the pattern, up and down move between drums. Some DAWs keep the computer keyboard for themselves (Ableton's computer MIDI keyboard, key K to turn it off).
- **Three looks**: the window takes the colours of the machine you load, orange MD|442, amber MD|187, red MD|888.
- **Mute** a drum with the M key or by double-clicking its name. One click selects and plays it.
- **Knobs on your controller** (SMK-37, Mikro MK3, anything): right-click a knob on screen, choose **MIDI learn**, turn a knob on the controller. Every knob is also a normal DAW parameter, so Maschine's encoders and Ableton's MIDI map work too. In Maschine the parameter pages are laid out 8 at a time: Master, Effects, then one page per drum.
- **DRAG MIDI** drags the beat onto a track as a MIDI clip (drums on channel 1, bass on 2, chords on 3). Turn PATTERN off when you play the clip, so it does not play twice.
- **IMPORT / EXPORT** read and write MD|442 beat files (.md442.json). Beats saved in Documents/MD-442/Beats show up in the preset menu.
- **SEND TO KEYBOARD** sends the beat's scenes to an SMK-37 or FM-1 running the MD|442, MD|187 or MD|888 firmware (1.6 is the current one), as patterns 9 to 16. The parts are named as on the keyboard: DRUMS 1, DRUMS 2, BASS, CHORDS, BREAKS.
