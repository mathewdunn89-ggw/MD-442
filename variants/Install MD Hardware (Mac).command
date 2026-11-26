#!/bin/sh
# MD Hardware firmware installer for macOS: MD|442, MD|187 (hip-hop) or MD|888 (hard techno).
# Double-click, connect the keyboard by USB, pick the firmware and your keyboard.
# Uses X0X's fm1_install.py (GPL-3.0): it checks the package matches the connected keyboard (model, and the
# M-VAVE 016 base on an SMK-37) before it writes anything.
cd "$(dirname "$0")"
LOGF="$(pwd)/install-log.txt"
echo "MD Hardware firmware installer"
echo "Connect your keyboard by USB (a data cable, straight into the Mac, no hub) and keep it powered."
echo "Quit Chrome tabs with MD|442, M-VAVE's editor and any DAW first: only one app can talk to the keyboard."
echo
echo "Which firmware?"
echo "  1) MD442  techno and house (your seven MD|442 beats)"
echo "  2) MD187  90s hip-hop: boom-bap, dusty samples, stabs, vocal hits (90 BPM)"
echo "  3) MD888  hard techno: Berlin, gabba, rumble, trance stabs (155 BPM)"
printf "Firmware (1-3): "; read v
case "$v" in 1) V=md442;; 2) V=md187;; 3) V=md888;; *) echo "Cancelled."; exit 1;; esac
echo
echo "Which keyboard?"
echo "  1) M-VAVE SMK-37 Elite"
echo "  2) M-VAVE SMK-37 Pro / Starrykey 37 Play"
echo "  3) M-VAVE FM-1"
printf "Keyboard (1-3): "; read n
case "$n" in 1) F=$V-smk37-elite.fwsc;; 2) F=$V-smk37-pro.fwsc;; 3) F=$V-fm1.fwsc;; *) echo "Cancelled."; exit 1;; esac
[ -f "$F" ] || { echo "$F is not in this folder (it may not exist for this keyboard)."; echo "Press Enter to close."; read _; exit 1; }
command -v python3 >/dev/null || { echo "Python 3 is needed: macOS will offer to install it (Command Line Tools). Then run this again."; xcode-select --install 2>/dev/null; exit 1; }
python3 -c 'import mido, rtmidi' 2>/dev/null || python3 -m pip install --user mido python-rtmidi || exit 1
echo
echo "Checking the keyboard ..."
if ! python3 tools/fm1_install.py --info; then
    echo
    echo "The keyboard did not answer. Unplug the USB cable, wait 5 seconds, plug it back in, then run this again."
    echo "Press Enter to close."; read _; exit 1
fi
echo
echo "Installing $F"
echo "--- $(date) $F" >> "$LOGF"
python3 tools/fm1_install.py --log "$LOGF" "$F"
rc=$?
echo
if [ $rc -eq 0 ]; then
    echo "Done. Your keyboard restarts into $(echo $V | tr a-z A-Z). Press Enter to close."
else
    echo "The install did not finish (code $rc). The details are saved in install-log.txt next to this file."
    echo "If the keyboard screen is blank or says update/upgrade, run this installer again: it finishes the job."
fi
read _
