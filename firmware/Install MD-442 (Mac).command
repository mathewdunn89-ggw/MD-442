#!/bin/sh
# MD|442 firmware installer for macOS. Double-click, connect the keyboard by USB, pick your model.
# Uses X0X's fm1_install.py (GPL-3.0). It checks the package matches the connected keyboard before writing.
cd "$(dirname "$0")"
LOGF="$(pwd)/install-log.txt"
echo "MD|442 firmware installer"
echo "Connect your keyboard by USB (a data cable, straight into the Mac, no hub) and keep it powered."
echo "Quit Chrome tabs with MD|442, M-VAVE's editor and any DAW first: only one app can talk to the keyboard."
echo
echo "  1) M-VAVE SMK-37 Elite"
echo "  2) M-VAVE SMK-37 Pro / Starrykey 37 Play"
echo "  3) M-VAVE FM-1"
printf "Your keyboard (1-3): "; read n
case "$n" in 1) F=md442-smk37-elite.fwsc;; 2) F=md442-smk37-pro.fwsc;; 3) F=md442-fm1.fwsc;; *) echo "Cancelled."; exit 1;; esac
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
echo "--- $(date) $F" >> "$LOGF"
python3 tools/fm1_install.py --log "$LOGF" "$F"
rc=$?
echo
if [ $rc -eq 0 ]; then
    echo "Done. Your keyboard now starts MD|442. Press Enter to close."
else
    echo "The install did not finish (code $rc). The details are saved in install-log.txt next to this file."
    echo "If the keyboard screen is blank or says update/upgrade, run this installer again: it finishes the job."
fi
read _
