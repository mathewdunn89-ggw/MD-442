# Contributing to MD-Modules

Thanks for wanting to help. Bug reports, patterns, sounds, fixes and features are all welcome.

## Report a bug

Open an [issue](https://github.com/mathewdunn89-ggw/MD-MODULE/issues) and say:

- which one: web, phone, desktop, plugin or firmware, and which machine (MD442, MD187, MD888);
- the version (the firmware shows it at start; the plugin and desktop app show it in their title or About);
- your browser, system or DAW, and for firmware your keyboard (SMK-37 Elite, SMK-37 Pro or FM-1);
- what you did, what you expected and what happened.

For a firmware install that did not finish, attach the installer's log file.

## Send a change

1. Fork the repository and branch from the branch that holds the part you are changing
   (see [Where the code lives](README.md#where-the-code-lives)): `site` for the web app, `vst-plugin` for the
   plugin, `desktop-apps` for the desktop app, `main` for firmware, samples and docs.
2. Keep a pull request to one thing. Say what changed for the person playing it, in plain words.
3. Say how you tested it. For firmware, say whether it ran on a real keyboard and which one. A build that
   has not been on hardware is fine, but it has to say so.

## The rules that matter

- **Sounds are your own.** Samples and loops must be synthesised or recorded by you. Nothing from a commercial
  record, a sample pack you do not have the rights to, or another product's firmware or factory content.
  If a sound is generated, add the generator (see `tools/gen_banks.py`).
- **No vendor firmware.** Do not add M-VAVE's `.fwsc` files or any other vendor binaries.
- **No secrets.** No signing keys, passwords or tokens, in files or in history.
- **Firmware safety stays.** The installer's check that a file matches the connected keyboard, and the stock
  update mode (OCTAVE- and OCTAVE+ for 5 seconds), must keep working. People need a way back.
- **Global settings are the player's.** Firmware changes do not reset MIDI channels, clock, output level or
  other global settings.

## Style

- Web app: plain JavaScript and CSS, no framework and no build step. Match the code around your change.
- Plugin: C++17 with JUCE.
- Words on screen and in docs: short and plain. Name the control and say what it does.

## Licence

By contributing you agree that your code is released under [GPL-3.0](LICENSE) and your samples under
[CC0 1.0](samples/LICENSE).
