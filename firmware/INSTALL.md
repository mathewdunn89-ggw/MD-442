# MD|442 firmware: install guide

MD|442 runs on the keyboard itself: no computer, plays through the keyboard's own audio out.
Built on the open X0X groovebox firmware (GPL-3.0). Mathew's seven MD|442 patterns are loaded as patterns 1-7:
Peak Warehouse, Berlin Roll, Electro, Acid Jack, Deep House, Breakbeat, Dub Techno.

| Your hardware | File |
| --- | --- |
| M-VAVE SMK-37 Elite | md442-smk37-elite.fwsc |
| M-VAVE SMK-37 Pro (also Starrykey 37 Play) | md442-smk37-pro.fwsc |
| M-VAVE FM-1 | md442-fm1.fwsc |

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
- Steps: the white keys on the FM-1, the 16 pads on the SMK-37.

## Go back to the stock firmware
Install M-VAVE's own package for your model with M-VAVE's updater (M-UPGRADE).

## Source (GPL-3.0)
X0X by Charles Vestal (fork of Felucca by Leo Kuroshita / Hügelton Instruments), SMK-37 port by genkigenki.
MD|442 changes: md442-smk37.patch against github.com/genkigenki/fm1-x0x @ 8af3731 (branch smk37); full build in github.com/mathewdunn89-ggw/MD-MODULE.
