# Build from source

Each part of MD-Modules builds on its own. See [Where the code lives](../README.md#where-the-code-lives) for
which branch holds what.

## Web app and phone app

Plain HTML, CSS and JavaScript. No bundler, no dependencies.

```sh
git clone -b site https://github.com/mathewdunn89-ggw/MD-MODULE
cd MD-MODULE
python3 -m http.server 8000
```

Open `http://localhost:8000/md442/` for the console and `http://localhost:8000/md442/app/` for the phone app.
The `/md187/` and `/md888/` links are rewrites done by the host (`vercel.json`); locally, switch machine with
the 442 / 187 / 888 keys under the logo. Web MIDI needs Chrome, Edge or another Chromium browser, and
`localhost` or HTTPS.

The main files are `md442/md442.js` (engine, sequencer and interface) and `md442/md442.css`.

## Desktop app (Electron)

Needs Node.js 20.

```sh
git clone -b desktop-apps https://github.com/mathewdunn89-ggw/MD-MODULE
cd MD-MODULE/desktop
npm install
node fetch-web.js        # copies the web app into ./web so the app works offline
npm start                # run it
npm run dist:mac         # or dist:win: build the installer into ./dist
```

`fetch-web.js` copies from the live site by default. To package your own copy of the web app, pass its address:
`node fetch-web.js http://localhost:8000/md442/`.

## Plugin (JUCE)

Needs CMake 3.22 or newer and a C++17 compiler (Xcode on Mac, Visual Studio 2022 on Windows). JUCE 8.0.12 is
fetched by CMake; to use your own checkout add `-DJUCE_DIR=/path/to/JUCE`.

```sh
git clone -b vst-plugin https://github.com/mathewdunn89-ggw/MD-MODULE
cd MD-MODULE

# Mac: VST3, AU and standalone, universal
cmake -S plugin -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
cmake --build build --config Release --target MD442_VST3 MD442_AU MD442_Standalone

# Windows: VST3 and standalone
cmake -S plugin -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release --target MD442_VST3 MD442_Standalone
```

The built plugins are under `build/MD442_artefacts/Release/`.

## Keyboard firmware

The firmware is the open X0X groovebox firmware (GPL-3.0) with two patches from this repository:

1. `firmware/md442-smk37.patch`: MD|442 on the SMK-37 and FM-1.
2. `variants/md-variants.patch`: the performance layout, per-instrument filters, and MD|187 and MD|888.

The simplest way to build is to fork this repository and push: the
[`variants.yml`](../.github/workflows/variants.yml) workflow builds all nine `.fwsc` files (three firmwares for
three keyboards) and attaches them to a test pre-release.

To build on your own Linux machine, follow the same steps the workflow runs:

```sh
git clone -b smk37 https://github.com/genkigenki/fm1-x0x x0x
git -C x0x checkout 8af3731713ba6062f17b403300f436aac50aaf30
git -C x0x apply ../firmware/md442-smk37.patch
git -C x0x apply ../variants/md-variants.patch

pip install Pillow numpy
sh x0x/tools/get_toolchain.sh
git clone --depth 1 --branch AC79NN_SDK_V1.2.1_2023-12-13 --filter=blob:none --sparse \
  https://github.com/amitv87/fw-AC79_AIoT_SDK.git "$HOME/fw-AC79_AIoT_SDK"
git -C "$HOME/fw-AC79_AIoT_SDK" sparse-checkout set --no-cone /cpu/wl82/tools/

cd x0x
export X0X_ID3=1 MD_VARIANT=442 FELUCCA_DATA_FAMILY=X0X X0X_BREAK_BANK=
BOARD=smk37 MODEL=elite ./build.sh --release 1.8     # SMK-37 Elite
BOARD=smk37 ./build.sh --release 1.8                 # SMK-37 Pro
./build.sh --release 1.8                             # FM-1
```

For MD187 or MD888, generate that firmware's sample bank first and point the build at it:

```sh
python3 tools/md_gen_samples.py 187 "$PWD/build/md187"
export MD_VARIANT=187 X0X_BREAK_BANK="$PWD/build/md187"
```

The `.fwsc` files land in `x0x/build/`. Install one with `python3 firmware/tools/fm1_install.py <file>.fwsc`.
The installer checks that the file matches the connected keyboard before it writes anything.

> [!WARNING]
> A firmware you built yourself is yours to test. Keep M-VAVE's own firmware file for your model at hand so you
> can go back with M-UPGRADE (hold OCTAVE- and OCTAVE+ for 5 seconds for update mode).

## Sample packs

```sh
pip install numpy scipy
python3 tools/make_sample_packs.py        # writes samples/ and dist/MD187-sample-pack.zip, dist/MD888-sample-pack.zip
```

`tools/gen_banks.py` synthesises every loop: drum voices, stabs, vocal-style formant hits, rumble and gabba
kicks, all from oscillators, noise and filters. Change a voice or a pattern there and rebuild.

## Android app

`android/` holds the wrapper: one activity with a full-screen WebView that carries an offline copy of the phone
app (the `md442/` folder of the `site` branch, packed as the APK's `assets/`). Build it with the Android SDK
(min SDK 24, target SDK 34) and sign it with your own key. The release signing key is not in this repository
and never will be.
