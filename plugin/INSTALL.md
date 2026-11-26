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
- **Three styles** in the preset menu: MD442 (techno and house, 7 patterns), MD187 (90s hip-hop, 96 BPM, 8 patterns) and MD888 (hard techno, 155 BPM, 8 patterns). MD187 and MD888 add the **BREAK** row: their loops (boom-bap, drums, stabs, vox / rumble, gabba, trance, hits) and 8 slices of each. Click a BREAK step to cycle slice 1-8, LOOP (plays the loop in time with the DAW) and ~ (keep ringing). Pads C#2 to G#2 play the 8 slices live.
- **The pattern plays along with your DAW** at the DAW's tempo whenever the DAW plays. Turn **PATTERN** off to play MD-442 only from pads, keys or clips.
- **Pads and keys**: notes from C1 (36) up to C2 (48) play Kick, Snare, Clap, Rim, Low tom, Mid tom, Hi tom, Closed hat, Open hat, Crash, Ride, Bass, Stab, the same layout as an Ableton Drum Rack. C3 (60) upward plays them too, for Maschine's keyboard mode. Hit hard (velocity above 100) for the accent.
- **MIDI channel 2** plays the bass at the note's pitch, **channel 3** plays the dub stab chord on that root.
- **Mute** a drum with the M key or by double-clicking its name. One click selects and plays it.
- **Knobs on your controller** (SMK-37, Mikro MK3, anything): right-click a knob on screen, choose **MIDI learn**, turn a knob on the controller. Every knob is also a normal DAW parameter, so Maschine's encoders and Ableton's MIDI map work too. In Maschine the parameter pages are laid out 8 at a time: Master, Effects, then one page per drum.
- **DRAG MIDI** drags the beat onto a track as a MIDI clip (drums on channel 1, bass on 2, stab on 3). Turn PATTERN off when you play the clip, so it does not play twice.
- **IMPORT / EXPORT** read and write MD|442 beat files (.md442.json). Beats saved in Documents/MD-442/Beats show up in the preset menu.
- **SEND TO KEYBOARD** sends the beat's scenes to an SMK-37 or FM-1 running MD|442 firmware 1.1 or newer, as patterns 9 to 16.
