#!/bin/sh
# Puts M-VAVE's own firmware back on an SMK-37 / FM-1 that runs MD|442 (or is stuck in MD|442's update mode).
# Needs M-VAVE's .fwsc for your keyboard, e.g. "SMK-37 Elite_016.fwsc", in Downloads, Desktop or this folder.
cd "$(dirname "$0")"
LOGF="$(pwd)/restore-log.txt"
echo "Restore M-VAVE firmware"
echo "Close M-UPGRADE, browsers, the MD|442 app and any DAW. Plug the keyboard straight into the Mac."
echo
F=""
for f in ./"SMK-37 Elite_0"*.fwsc ./"SMK-37 Pro_0"*.fwsc ./"FM-1"*.fwsc "$HOME/Downloads/SMK-37 Elite_0"*.fwsc "$HOME/Desktop/SMK-37 Elite_0"*.fwsc "$HOME/Downloads/SMK-37 Pro_0"*.fwsc "$HOME/Downloads/FM-1"*.fwsc; do
    [ -f "$f" ] && { F="$f"; break; }
done
if [ -z "$F" ]; then
    echo "Drag M-VAVE's firmware file (for example SMK-37 Elite_016.fwsc) into this window and press Enter:"
    read F; F=$(echo "$F" | sed "s/^'//; s/'$//; s/\\\\ / /g")
fi
[ -f "$F" ] || { echo "File not found: $F"; read _; exit 1; }
echo "Firmware file: $F"
command -v python3 >/dev/null || { echo "Python 3 is needed."; xcode-select --install 2>/dev/null; exit 1; }
python3 -c 'import mido, rtmidi' 2>/dev/null || python3 -m pip install --user mido python-rtmidi || exit 1
echo
echo "Looking for the keyboard ..."
if ! python3 tools/fm1_install.py --info; then
    echo
    echo "The keyboard did not answer. Unplug it, wait 10 seconds, plug it back in and run this again."
    echo "Send Claude what this window says."
    read _; exit 1
fi
echo "--- $(date) restore $F" >> "$LOGF"
python3 tools/fm1_install.py --force --log "$LOGF" "$F"
rc=$?
echo
[ $rc -eq 0 ] && echo "Done: M-VAVE's firmware is back." || echo "Did not finish (code $rc). Run this again; send Claude restore-log.txt if it keeps failing."
read _
