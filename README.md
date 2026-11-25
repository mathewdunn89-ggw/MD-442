# MD|442 firmware for the M-VAVE SMK-37

MD|442 (by Mathew, NEST Group) running on the SMK-37 Elite / Pro keyboard. Built on X0X (GPL-3.0) and its SMK-37 port.
Download the latest `.fwsc` from Releases; see `firmware/INSTALL.md`. GitHub Actions builds it on every push, no Docker needed.

## Desktop apps (Mac and Windows)
`desktop/` wraps the MD|442 web app in Electron with WebMIDI on, so the SMK-37 and FM-1 work as controllers. GitHub Actions builds `md442-mac.dmg` and `md442-windows.exe` on every push to `desktop/**` and publishes them to the [`desktop` release](https://github.com/mathewdunn89-ggw/md-442/releases/tag/desktop). Run the workflow by hand to pick up a new web build. See `desktop/INSTALL.md`.
