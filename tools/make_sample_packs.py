"""Builds the MD|187 and MD|888 sample packs from nothing but tools/gen_banks.py.
usage: python3 tools/make_sample_packs.py [outdir]     (needs numpy and scipy)
Writes samples/md187 and samples/md888 (the loops) and, in outdir (default: dist/),
MD187-sample-pack.zip and MD888-sample-pack.zip: each has the loops, every loop cut into its 8 slices,
a README and the licence. Every sound is synthesised by gen_banks.py; nothing is recorded or sampled."""
import os, sys, wave, zipfile, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist')
SAMPLES = os.path.join(ROOT, 'samples')
PACKS = {
    'md187': ('MD187', '90s hip-hop', 96, {'BOOMBP': 1, 'DRUMS': 1, 'STABS': 1, 'VOX': 1}),
    'md888': ('MD888', 'hard techno', 155, {'RUMBLE': 1, 'GABBA': 1, 'TRANCE': 2, 'HITS': 1}),
}
FIXED = (1980, 1, 1, 0, 0, 0)   # fixed dates: the same input gives the same zip

def slices(path):
    with wave.open(path) as w:
        params, frames = w.getparams(), w.readframes(w.getnframes())
    width = params.sampwidth * params.nchannels
    n = len(frames) // width // 8
    for i in range(8):
        yield params, frames[i * n * width:(i + 1) * n * width]

def wav_bytes(params, frames):
    import io
    b = io.BytesIO()
    with wave.open(b, 'wb') as w:
        w.setparams(params); w.writeframes(frames)
    return b.getvalue()

def add(z, name, data):
    z.writestr(zipfile.ZipInfo(name, FIXED), data, zipfile.ZIP_DEFLATED, 9)

def main():
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'gen_banks.py'), SAMPLES], check=True)
    os.makedirs(OUT, exist_ok=True)
    licence = open(os.path.join(SAMPLES, 'LICENSE'), 'rb').read()
    for key, (name, style, bpm, banks) in PACKS.items():
        top = name + '-sample-pack/'
        lines = [f'{name} sample pack: {style}, {bpm} BPM', 'Part of MD-Modules by Mathew, NEST Group.',
                 'https://github.com/mathewdunn89-ggw/MD-MODULE', '',
                 'Every sound here is synthesised from scratch by tools/gen_banks.py in that repository.',
                 'Nothing is recorded, and nothing is taken from a record or from another product.', '',
                 'Format: WAV, 44.1 kHz, 16-bit, mono.', f'Tempo: {bpm} BPM. Each loop is cut into 8 equal slices; every slice starts on a hit.', '',
                 'loops/   the whole loops', 'slices/  each loop cut into its 8 slices', '']
        with zipfile.ZipFile(os.path.join(OUT, name + '-sample-pack.zip'), 'w') as z:
            for bank, bars in banks.items():
                src = os.path.join(SAMPLES, key, bank + '.wav')
                loop = f'{name}_{bank}_{bpm}bpm_{bars}bar.wav'
                add(z, top + 'loops/' + loop, open(src, 'rb').read())
                lines.append(f'{loop}: {bars} bar{"s" if bars > 1 else ""}')
                for i, (params, frames) in enumerate(slices(src), 1):
                    add(z, f'{top}slices/{bank}/{name}_{bank}_slice{i}.wav', wav_bytes(params, frames))
            lines += ['', 'Licence: CC0 1.0 (public domain dedication). Use them in any track, commercial or not,',
                      'no credit needed. See LICENSE.txt.', '']
            add(z, top + 'README.txt', '\n'.join(lines))
            add(z, top + 'LICENSE.txt', licence)
        print('wrote', name + '-sample-pack.zip')

if __name__ == '__main__':
    main()
