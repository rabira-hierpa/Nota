# Putting Hohe inside Nota

How small and fast Hohe can get, so Nota can ship it in the installer
instead of asking for a model and a Python runtime on first launch. Measured
30 October to 1 November 2026 on an M1 Pro with 16 GB. The test scripts
(FLEURS scorer, chatter mixer, Node timing, punctuation scorer) are not in
the repo yet: they sit in a temporary folder that macOS clears. The release
gates below need them, so they should move to `scripts/bench/` first.

## What shipped (2 November 2026)

Option B, 8-bit Hohe built in, with the punctuation model after it:

- `npm run build:speech` (`scripts/build_speech_models.py`) downloads Hohe and
  the punctuation model at pinned revisions, exports Hohe to ONNX and stores
  both models' weights in 8 bits into `models/` (723 + 117 MB, not in git),
  with a manifest of SHA-256s and a licence notice. Packaging checks the
  manifest first.
- Hohe's 8-bit layers run at **accuracy level 4** (8-bit inputs and integer
  dot products), measured below.
- `electron/speech/` ports the input features, the pause splitting, CTC
  decoding, the SentencePiece tokenizer and the punctuation windows to
  TypeScript. The features, CTC decoding, tokenizer and punctuation labels
  are checked against fixtures Python wrote; the pause splitting and WAV
  reading have unit tests of their own. The models run in
  an Electron utility process (`speech-worker.ts`) through onnxruntime-node
  1.30, with the memory arena off (see *The arena under Electron*).
- Punctuation runs on whole recordings only, adding full stops and question
  marks where both of the model's heads end a sentence; dictation clips stay
  as Hohe writes them.
- On macOS 13, which onnxruntime-node's library doesn't support, Hohe falls
  back to the Python setup; BuzzASR always uses it. Intel Macs get neither
  (no onnxruntime-node binding, and no build of the pinned PyTorch), and their
  build leaves the models out.

Measured on the M1 Pro, in Electron's utility process as the app runs it:

| 8-bit Hohe in Nota | Level 0 | **Level 4** |
|---|---:|---:|
| FLEURS, 150 clips: CER / WER | 6.82% / 17.64% | **6.82% / 17.64%** |
| Text identical to Python's 8-bit | 150 of 150 | 145 of 150 (0.04% of characters differ) |
| 40 FLEURS clips (7.7 min): speed | 2.9× | **4.2×** |
| Four 75 s recordings cut at pauses: speed | 2.0× | **2.4×** (same text) |
| Load | 0.9 s | 1.4 s |
| Worker peak memory, ~11 s clips / ~27 s pieces | 1.8 / 2.9 GB | 2.0 / 3.1 GB |

Level 4 gains less on long pieces because more of their work is attention,
which stays in float32. Chatter and hand-checked recordings were not rerun.

### The arena under Electron

ONNX Runtime with its memory arena off runs about 30% slower inside Electron
than in plain Node on the same 40 clips (2.9–3.1× against 4.5×, level 0).
Electron's run-as-node mode is no faster (3.1×), so the cost is the
allocator built into Electron's binary, which every tensor's memory goes
through. Turning the arena on gets the speed back on short clips (4.2×), but
the arena doubles each block it adds, and Electron's allocator ends the
process when asked for one over 2 GB: the worker died (a trap, exit code 5)
on the 75 s recordings at 1.0–1.6 GB in use, also with the weights kept out
of the arena. onnxruntime-node has no setting for the arena's growth, so it
stays off; memory then falls back to the model's ~0.9 GB between pieces.

Two test sets:

- **FLEURS** (Amharic test split, the first 150 clips: 28.2 minutes of read
  speech with human transcripts). Scored the way Hohe's card describes:
  Ge'ez homophones folded and punctuation dropped. The card gives no table,
  so we fold ሐ and ኀ as ሀ, ሠ as ሰ, ዐ as አ and ፀ as ጸ. Run clean, and again
  with **chatter**: four other FLEURS speakers mixed in 10 dB below the
  voice, the same mix for every model.
- **Nota's own recordings** (11 recordings, 14.6 minutes, cut at pauses into
  37 pieces of up to 30 s, as the app does). They have no transcripts, so
  they measure **text changed**: the character edit distance from full-size
  Hohe's text (float32) on the same audio, divided by that text's length. It
  shows what shrinking changes, not whether the change is better or worse.

**Speed** is seconds of audio per second of work with the model already
loaded, so higher is faster; 3.5× turns a 10-minute recording around in
about 3 minutes. **CER** and **WER** are character and word error rates.
**Peak memory** is the process's peak, model included. MB and GB are decimal.
The machine was busy during many timings (load average 17–38 on 10 cores),
so speeds are approximate: compare them within one table, not across.

## What a user downloads today

| Part | Size |
|---|---|
| Python runtime with PyTorch and transformers | ~570 MB (543 MiB measured) |
| Hohe (wav2vec2-BERT, 606M weights, float32) | 2.42 GB |
| BuzzASR (Whisper large-v3 fine-tune, float16) | 3.09 GB |
| Hohe's 5-gram language model (not used by Nota) | 538 MB, not downloaded |

So Hohe alone means about 3 GB, a few minutes of setup and a connection once.
The installer itself is 126 MB (macOS arm64 DMG).

Where Hohe runs today: on Apple silicon, the Mac GPU in float32. On Windows
and Linux, the CPU in float32: the helper never uses a GPU there. Intel Macs
and Windows ARM64 get no Hohe at all, because the pinned PyTorch (2.8.0) has
no build for them.

## Accuracy against human transcripts (FLEURS)

| How Hohe runs | Size | CER | WER | CER, chatter | WER, chatter | Speed |
|---|---:|---:|---:|---:|---:|---:|
| **PyTorch, float32, Mac GPU (Nota today)** | 2.42 GB | 6.88% | 18.29% | 10.29% | 22.82% | 27.9× |
| PyTorch, float16, Mac GPU | 1.21 GB | 6.90% | 18.37% | not run | | 30.1× |
| **ONNX, 8-bit weights, CPU** | **723 MB** | 6.89% | 18.25% | 10.32% | 22.95% | 4.3× |
| ONNX, 4-bit weights, CPU | 427 MB | 6.89% | 17.85% | 10.83% | 24.16% | 4.8× |
| ONNX, 8-bit weights and activations, CPU | 650 MB | 6.97% | 18.21% | 10.41% | 23.15% | 8.9× |

FLEURS clips are about 11 s long. 150 clips cannot separate differences of a
few tenths of a point. Hohe's card gives 6.28% CER on FLEURS; the gap to our
6.88% is probably the subset and details of scoring. The 650 MB file rounds
each layer's weights and inputs to 8 bits with one scale per tensor
(onnxruntime's `quantize_dynamic`).

## Text changed on Nota's recordings

| How Hohe runs | Size | Speed | Text changed |
|---|---:|---:|---:|
| PyTorch, float32, CPU (the reference) | 2.42 GB | 1.0× | 0 |
| **PyTorch, float32, Mac GPU (Nota today)** | 2.42 GB | 5.4× | 0.00% |
| PyTorch, float16, Mac GPU | 1.21 GB | **25.9×** | 0.17% |
| ONNX Runtime, float32, CPU | 2.42 GB | 3.1× | 0.00% |
| **ONNX, 8-bit weights, float32 maths** | **723 MB** | 3.4× | **0.77%** |
| ONNX, 8-bit weights and activations, one scale per tensor | 610 MB | 5.9× | 6.45% |
| ONNX, 8-bit weights and activations, one scale per channel | 652 MB | 5.3× | 3.94% |
| ONNX, 4-bit weights (rounded) | 427 MB | 3.5× | 7.88% |
| ONNX, 4-bit weights (HQQ, fitted rounding) | 501 MB | 3.0× | 6.48% |
| ONNX, 4-bit feed-forward layers, 8-bit the rest | 522 MB | 3.4× | 5.33% |
| ONNX, 4-bit inner layers, 8-bit first and last | 458 MB | 3.4× | 7.04% |
| ONNX, 4-bit weights at level 4, older export | 416–682 MB | 3.6–4.3× | 7.4–7.7% |

The 610 MB file came from an earlier export and also rounds the other
convolutions (adapter and depthwise), which the 650 MB file leaves in
float32. The 650 MB file, used everywhere else, changed 6.00% (from Node,
below). The last row keeps the pointwise convolutions in float32 (int8 in
the 416 MB file), which is why a 4-bit file can be 682 MB; level 4 is
explained below. On the first 10 pieces, the 8-bit and 4-bit changes stay
the same with homophones folded, so they are not homophone spellings.

## From Node, with no Python

This is the path Nota would ship. transformers.js computes Hohe's input
features, onnxruntime-node runs the graph, and CTC is decoded in plain
JavaScript (best token per frame, repeats merged, blanks dropped). Same 37
pieces.

| Node | Speed | Text changed |
|---|---:|---:|
| CPU, 8-bit weights | 3.5× | 0.77% (the same as from Python) |
| CPU, 8-bit weights and activations (650 MB) | 6.3× | 6.00% |
| WebGPU (first 10 pieces), 8-bit / float16 / float32 | 4.3 / 5.1 / 4.3× | 0.36% / 0.72% / 0.00% |
| CoreML, float32 | killed for memory while compiling | |

On the CPU the 8-bit models load in 0.5–0.8 s (1.2 s at level 4, 2.0 s with
the memory arena on); on WebGPU float16 takes 7.5 s and float32 16.6 s. Feature extraction takes 0.03 s per 30 s of audio.

**The same file, faster maths.** ONNX Runtime's 8-bit and 4-bit layers have an
`accuracy_level` setting. Level 0, used above (except the "4-bit weights at
level 4" row), does the arithmetic in float32. Level 4
rounds each block of inputs to 8 bits and uses the CPU's integer dot-product
instructions. It is one attribute in the file, so the size does not change.
Run back to back; text changed is for 30 s pieces:

| Node, CPU | Size | Speed, 30 s pieces | Speed, pieces up to 10 s | Text changed |
|---|---:|---:|---:|---:|
| 8-bit weights, level 0 | 723 MB | 3.6–3.7× | 4.6× | 0.36% |
| **8-bit weights, level 4** | 723 MB | **5.5×** | **8.5×** | 0.90% |
| 8-bit weights and activations | 650 MB | 6.5× | | 3.78% |
| 4-bit weights, level 0 | 427 MB | 3.9× | | 4.32% |
| 4-bit weights, level 4 | 427 MB | 5.6× | | 4.32% |

The 30 s column is the first 10 pieces (193 s of audio); the other speed
column is the first 20 pieces of up to 10 s (140 s). 0.36% against 0.90% is 2 against 5
changed characters out of about 555, too few to judge, and level 4 has not
been scored on FLEURS. The M1 lacks the I8MM instructions some of ONNX
Runtime's 8-bit kernels use; M2 and later chips may gain more.

## Shorter pieces

Hohe's attention compares every frame with every other through a
relative-position table. Its memory and its arithmetic grow with the square
of the piece length; the attention is about 16% of all the arithmetic at
30 s and 6% at 10 s. So cutting at 10 or 15 s instead of 30 s needs far less
memory and is somewhat faster. 8-bit weights on the CPU, whole recordings scored:

| Longest piece | Speed | Peak memory | Text changed |
|---|---:|---:|---:|
| 30 s (today) | 2.2× at load ~37; 3.5–3.7× at load ~20–30 | 3.36 GB | 0.76% |
| 15 s | 4.3× | 1.51 GB | 22.80% |
| 10 s | 4.6–4.8× | 1.20 GB | 28.39% |
| 5 s | not run | 0.88 GB | not run |

Run back to back, though over different spans of audio (193 s against
140 s), pieces of up to 10 s are about 1.25× faster at level 0 (4.6× against
3.6–3.7×) and 1.5× at level 4 (8.5× against 5.5×). Memory is the bigger gain.

The text changes are not spread evenly. Of the eight recordings under 25 s,
the five with text changed by 0–4.4% at 10 s; the other three have no text
(one gained a single character). The three long ones (2.5–6 minutes) changed
by 24–43%, and they hold little speech for their length (233 s gave 784
characters). FLEURS clips are about 11 s and Hohe does well on them, so short
pieces are not bad in themselves. Text changed is measured against 30 s
output, so any other length shows as change whether it is better or worse.
Only hand-checked transcripts can choose the length; 15–20 s is a likely
compromise.

Memory also depends on ONNX Runtime's memory arena. With it on, about 3.1 GB
stays in use after a 30 s piece; with it off, use falls back to about 0.6 GB.
Loaded and idle, the 8-bit model takes about 0.9 GB and the 4-bit one about
0.6 GB.

## What the numbers say

1. **About 5× today on Macs, for a few lines.** Hohe in float16 on the Mac
   GPU ran 4.8 times faster than the float32 Nota uses on 30 s pieces (25.9×
   against 5.4×, one run each on a busy machine), with half the weights to
   hold. It scores the same on FLEURS (6.90% against 6.88%). On 11 s clips
   the two are close (30.1× against 27.9×). The change mirrors what
   `WhisperTranscriber` already does: float16 on MPS only, and the inputs cast
   to it. Without the cast the helper process aborts on MPS (checked with a
   small model). It does not remove the download.
2. **Python can go.** Hohe exports to ONNX with identical text on Nota's
   recordings (0.00% changed). In Node, 8-bit Hohe changes the same 0.77% as
   in Python. onnxruntime-node's native library is 45 MB on macOS arm64
   (12 MB compressed), against ~570 MB of Python and PyTorch.
3. **8-bit weights cost nothing measurable.** 6.89% against 6.88% on clean
   FLEURS, 10.32% against 10.29% in chatter, and 0.77% of text changed on
   Nota's recordings, at 723 MB.
4. **Smaller is a bet.** 4-bit weights (427 MB) and 8-bit activations
   (650 MB) look free on clean read speech. In chatter, 4-bit adds half a
   point of CER and 1.3 points of WER. On Nota's recordings both change 4–8% of
   the text, about as many characters as Hohe gets wrong on FLEURS. FLEURS is
   clean read speech; Nota records through laptop microphones. Only
   hand-checked transcripts of a few Nota recordings can settle it.
5. **Built in with ONNX Runtime means the CPU, so far.** 8-bit Hohe runs at
   about 3.5× there, and level 4 maths on the same file at about 5.5×. On
   Apple silicon that is a step back: level 0 is slower than Nota 0.2.0's GPU
   path (5.4×, a different run), level 4 is about the same, and float16 on the
   GPU (25.9×) is 5–7 times faster than either. ONNX Runtime's WebGPU path
   reached only 4–5×, and its CoreML path ran out of memory.
6. **On Windows and Linux, built in is also the speed fix.** There,
   Hohe today runs PyTorch float32 on the CPU (1.0× on the M1 Pro's CPU), so
   8-bit Hohe at about 3.5× would be faster as well as download-free. Windows
   ARM64 would get Hohe for the first time. None of this is measured on x64
   yet.

## The options

Installer sizes are for the macOS arm64 DMG. For A, B, B4, C and F they are
estimated from measured compressed sizes (±2%); D, E and G are rougher
estimates. Windows and Linux installers come out within about 20 MB of these.

| Option | Model | Installer | Speed | Accuracy | Work |
|---|---:|---:|---|---|---|
| A. float16 on the Mac GPU (keep the download) | 2.42 GB + ~570 MB runtime, downloaded | 126 MB | ~26× on an M1 Pro | same | a few lines |
| B. 8-bit Hohe built in, CPU | 723 MB | ~825 MB | 3.5×; ~5.5× at level 4 | same at level 0; level 4 not scored | an engine, packaging |
| B4. 4-bit Hohe built in, CPU | 427 MB | ~535 MB | 3.5–5.6× | worse in chatter; changes 4–8% of Nota text (direction unknown) | as B |
| C. B, then trained to live in 4 bits | 427 MB | ~535 MB | as B4 | same if training works | GPU hours, Amharic audio |
| D. Hohe with half its layers, retrained from itself | ~380 MB | ~500 MB (estimate) | 1.5–2× of B (guess) | unknown | GPU hours |
| E. A small model trained to copy Hohe | 30–65 MB | ~170–200 MB (guess) | many times faster; live with a streaming model (guess) | unknown | a research project |
| F. A small model built in, Hohe fetched without Python | 33 MB + 723 MB fetched | ~170 MB | small model after each pause (not measured; streaming needs its Zipformer sibling), Hohe as B | small model 8.49% CER against Hohe's 5.89% on Dataset.ET (authors' numbers) | B, plus a download |
| G. Hohe on libtorch with the Mac GPU, no Python | 1.21 GB | ~1.4 GB (guess) | ~26× on Macs (guess) | same | export Hohe for libtorch, a native addon |

**B, built in.** The model goes in `extraResources` beside the app (outside the
asar), run by a new `TranscriptionEngine` through onnxruntime-node. Nothing to
set up, nothing to download, no Python. What it takes is under *Shipping B*
below.

**C, 4 bits by training (quantization-aware fine-tuning).** Fine-tune Hohe for
a while with its weights rounded to 4 bits in the forward pass, so it learns
weights that survive the rounding, using ONNX Runtime's own rounding formula
so the export stays as it is. Published results on English speech models with
100 h of training: wav2vec2-base went from 10.00% to 10.40% WER at 4 bits,
HuBERT-large from 6.40% to 6.70% (Xu et al. 2025). Hohe's block-wise rounding
loses little to begin with (half a point in chatter, and it changes 4–8% of
the text on Nota audio), so the question is whether training closes that
smaller gap. We found
no published result for wav2vec2-BERT or for Amharic. C buys size only: about
290 MB off the installer, no speed. About 15–30 hours on one H100 (guess,
scaled from Hohe's own training).

**D, a shorter Hohe.** Keep 12 of the 24 layers (every other one) and train
them to reproduce full Hohe. On English wav2vec2-large the same cut took WER
from 2.63% to 6.6% and ran 1.5× faster on a GPU. Hohe's config has layer
dropout off, so removing layers without retraining will probably cost a lot
(guess; untested). About 20–60 H100 hours (guess).

**E, a small model of its own: the innovative one.** Hohe becomes a teacher.
It transcribes Amharic audio nobody has transcribed, and a small Conformer or
Zipformer (20–40M weights) learns from those transcripts and, optionally,
from Hohe's output probabilities. On English, a 9.7M Conformer trained on
100 h scored 8.0% WER. Taught by a wav2vec2-based model on the same 100 h it
scored 7.1%, and 5.4% once the teacher also labelled 860 h of untranscribed
audio; the teacher's text alone gave 5.6%, so most of the gain is the extra
audio. What to expect for Amharic: `abdissa-png/amharic-asr-small` (formerly
Qwebolo), a 21M-weight Conformer trained on about 500 h of transcripts (per
its config), publishes 8.49% CER on Dataset.ET's test set, where Hohe's card
publishes 5.89% on what looks like the same set. Its 8-bit file is 33 MB, and
its streaming Zipformer sibling types as you speak. It declares Apache-2.0,
though one of its listed training sets (Leyu Gojjam) has no clear licence.
Those are the authors' numbers under their own scoring; it has not been run
here. The catch is audio: openly licensed untranscribed Amharic is scarce
(see *Training data*). About 100–300 GPU hours on V100s (guess).

**F, a small model built in, Hohe fetched.** Ship a small model (abdissa-png's
today, a Hohe-taught one later) for dictation, and fetch the 723 MB ONNX Hohe
in the background over plain HTTPS with a checksum, for voice notes. The
installer stays small, dictation works at once, and the Python step goes
away. It keeps a download, so it misses the first goal, but it is the
fallback if ~825 MB is too big.

**G, the Mac GPU without Python.** libtorch (PyTorch's C++ library) could run
the same Metal kernels that gave 25.9×. The official macOS arm64 zip is 72–78 MB
(2.9.0 to 2.11.0) and unpacks to about 310 MB. Its headers include the Metal
backend, which suggests but does not prove that it is built in. Hohe would
have to be exported for libtorch first, relative-position code included, and
called through a native Node addon. It is Mac only (on Windows and Linux
libtorch runs on the CPU, where B already is) and keeps the 1.21 GB float16
model. It is the only Hohe option that could be built in, Python-free and
fast on Macs.

**BuzzASR** decodes word by word and is 5–10× slower than Hohe. In whisper.cpp's
5-bit format a large-v3 model is about 1.1 GB; BuzzASR has not been converted
or tested there. It stays an optional download, or goes.

### Other paths looked at

- **CTranslate2** has supported Hohe's model class since 4.5.0, with 8-bit
  weights, but runs only on CPUs and NVIDIA or AMD GPUs (no Apple GPU) and
  has no Node binding for its speech models.
- **Core ML directly** (coremltools, float16, run through a small Swift
  helper) could use the Mac GPU or Neural Engine. Its relative-position
  einsum needs rewriting first. Mac only; speed unknown.
- **ONNX Runtime's CoreML path** might work with a float16 graph (under 2 GB)
  and the einsum rewritten. Why float32 ran out of memory is a guess.
- **Rewriting the attention.** Hohe builds a 575 MB table per layer for each
  30 s piece (float32). A rewrite with plain matrix products would cut that
  memory traffic. Hohe clamps distances to 64 frames back and 8 ahead, which
  the standard rewrite does not cover, so it must be checked bit for bit
  against PyTorch.
- **WebNN** works in Nota's Electron (Chromium 156) behind one command-line
  switch, and maps to Core ML on Macs. Which of Hohe's operations it covers,
  and how fast it is, is untested.
- **MLX, ggml, ExecuTorch**: each means porting Hohe by hand or has no Node
  binding.
- **DirectML on Windows** ships with onnxruntime-node; untested on this graph.
- **Low-rank layers** (LiteASR) cut Whisper large-v3's encoder from 635M to
  429M weights at the same WER. Untested on a Conformer.
- **Smaller encoders do much worse on Amharic.** Fine-tuned by the Ethio-ASR
  authors on the same WAXAL data, WAXAL test WER is 22.92% for w2v-BERT 2.0
  600M (Hohe's base), 30.19% for MMS-300M and 30.95% for AfriHuBERT 94M (both
  under non-commercial licences). Meta's Omnilingual CTC 300M, not tuned on
  WAXAL, gets 49.15%.
- **sherpa-onnx** (20–40 MB per platform, 34 MB on macOS arm64, with voice
  detection and streaming) suits a small student; it adds nothing for Hohe
  itself.

## Shipping B

- **Off the main thread.** onnxruntime-node blocks the thread it runs on, so
  it runs in an Electron `utilityProcess`, started on first use and stopped
  when idle like the Python helper today, with the memory arena off.
- **Native files.** Nota's build leaves `node_modules` out, so the binding and
  its library ship per platform and architecture through `extraResources`,
  one copy of the library (the npm package carries two identical 44.6 MB
  copies on macOS). Windows also gets about 40 MB of DirectML files per
  architecture, which can probably be left out for the CPU path (to check).
- **Macs.** Apple silicon only: onnxruntime-node 1.30 ships no Intel binaries.
  Its library needs macOS 14, while Electron allows 13: either raise the
  minimum to 14 or show Hohe as unavailable when the library fails to load.
  Intel Macs have no Hohe today and B does not change that, unless a separate
  x64 build uses onnxruntime-node 1.23.2, the last with Intel binaries
  (untested with 8-bit weights). The x64 DMG should say so, or be dropped.
- **Windows** needs the Microsoft Visual C++ Redistributable. The NSIS
  installer can run `vc_redist` first (Microsoft's recommended route), or
  Nota can detect it missing and say what to install. No Windows build has
  been tested end to end.
- **The model stays out of git** (GitHub refuses files over 100 MB). A script
  fetches it at build time and checks its SHA-256, and a build hook fails the
  build if the model or the native library is missing, because
  electron-builder only warns.
- **Feature extraction** gets ported to TypeScript (the extractor is about
  160 lines, plus the spectrogram, mel-filter and window helpers it uses)
  instead of shipping transformers.js, which would pull in 140 MB of
  onnxruntime-web and sharp. A test compares it with transformers.js output.
- **Size.** Quantized weights barely compress (8-bit 5%, 4-bit 7%, 8-bit
  activations 33–37%), so the installer grows by about the model's size.
  Windows needs one installer per architecture; a combined one would come
  close to NSIS's 2 GB limit.
- **Updates.** Nota has no auto-updater, so each update means downloading the
  whole installer, model included. electron-updater could download only the
  changed parts (electron-builder already writes the block maps); not
  measured.
- **Licence.** Hohe is CC-BY-4.0, so the installer carries a notice crediting
  snapwre and saying the weights were quantized. Its base model, Ethio-ASR,
  declares CC-BY-4.0 but was fine-tuned on WAXAL, which is CC-BY-SA-4.0.
  Whether ShareAlike reaches model weights is contested; worth asking the
  authors.

## Training data

For C, D and E. Openly licensed Amharic speech with transcripts comes to about
650 hours under CC-BY or MIT:

| Set | Hours | Licence | Note |
|---|---:|---|---|
| Leyu dialects (Addis Ababa, Gonder, Wello, Shewa) | 453 | CC-BY-4.0 | probably in Hohe's training, so not a fair test (guess) |
| BDU speech | ~128 | CC-BY-4.0 | sources undocumented |
| Dataset.ET | 42 train | CC-BY-4.0 | its 4.7 h test split is Hohe's test set: keep it out |
| ALFFA | ~20 | MIT | |
| FLEURS | ~10 train | CC-BY-4.0 | test split is the benchmark: keep it out |
| WAXAL | 196 | CC-BY-SA-4.0 | ShareAlike may reach the model |
| Common Voice | ~3 | CC0 | |

Openly licensed audio *without* transcripts, which E needs most, is scarce:
WAXAL's untranscribed split (~400 h, estimated from file sizes, ShareAlike)
and VoxLingua107 (81 h, licence unclear). Radio, YouTube, podcasts and
Telegram voice notes carry no licence; training on them and shipping the
weights is a legal question, not a technical one.

C and D need a large GPU: Hohe was trained on one 80 GB H100, and 40 GB may
do (untested). For C the 16 GB M1 Pro is out: float32 weights, gradients and
optimiser state alone come to about 10 GB before activations (about 5 GB for
D). E's student fits in memory, but would take far longer here than on the
V100s estimated above.

## Jev

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
(TypeSafe AI, early access since 15 September 2026) is a *decision* model.
It is given a situation as text, and questions whose possible answers are
fixed in advance. It returns a choice, a yes/no probability or a score for
each, all in parallel, instead of writing an answer token by token. TypeSafe
gives that as the source of its speed: 70–500 ms per request, measured from
laptops on the US West Coast, so mostly the trip to its servers. The
architecture is not published and nobody has benchmarked it independently.

- **It can't be Nota's speech model.** Jev writes no text, so it can neither
  transcribe nor summarize. It reads text only (audio is "not supported
  (yet)"). It runs only on TypeSafe's hosted API, in the US, with no weights
  to download. Using it would send notes to TypeSafe, and Nota promises to
  stay offline. TypeSafe says English is where it is best, and names no
  other language.
- **Hohe already works this way.** CTC makes one decision for every 40 ms
  of audio, 25 a second (the stacked features are 20 ms and Hohe's adapter
  halves them). Each is a choice among 416 symbols, made for a whole piece of
  up to 30 s in one pass. Reading the text off is a maximum per frame. So
  Hohe already has Jev's trick, and its time goes into the network: 580M of
  its 606M weights are the 24 layers, and the decision layer at the end is
  0.4M. On a 30 s piece on the Mac GPU, the network takes 1.4–1.5 s and
  reading the decisions 1–6 ms. The ways to speed it up are the ones above:
  fewer bits (B), the GPU (A, G), or a smaller network (D, E). BuzzASR is the
  other kind: Whisper's decoder writes one token at a time, which is why it
  is 5–10× slower.
- **Open, local copies of the idea exist**, as model cards describe them.
  [LiquidAI d1-3B](https://huggingface.co/LiquidAI/d1-3B) answers a question
  in about 30 ms on an M5 Pro. [Laya](https://huggingface.co/convaiinnovations/laya)
  has a 322M multilingual version.
  [Simple Jev](https://github.com/featherless-ai/simple-jev) and
  [AnyJev](https://github.com/nokia-applied-research/AnyJev) turn an open
  model into one by reading its next-token probabilities.
  [d1-omni-600M](https://huggingface.co/LiquidAI/d1-omni-600M) even takes
  audio, but it learned from English voice commands. None has been tested on
  Amharic. They suit choosing tags or understanding voice commands, and Nota
  chooses tags without a model today.
- **Where the idea does help: punctuation.** Hohe's vocabulary has ። ፣ ፤ ፧,
  but its card says it writes no punctuation. On 40 FLEURS clips it wrote
  none, full size or 8-bit, where the human transcripts have 44 full stops
  and 30 commas. Nota's helper joins the pieces into one line, so a Hohe voice
  note is one long paragraph with no sentence ends, and **Summarize & organize
  does nothing on it.** On 24 made-up Amharic clauses without marks it finds
  1 sentence, no paragraph breaks and no summary. On the same text with ።, it
  finds 24 sentences, splits it into paragraphs and picks a 4-sentence
  summary.

Putting the marks back is a Jev-shaped job. For each gap between words, the
model picks nothing, ።, ፣ or ፧, for all gaps in one pass:

| Way | Size | Status |
|---|---|---|
| [xlm-roberta_punctuation_fullstop_truecase](https://huggingface.co/1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase) (Apache-2.0, 47 languages) | 1.11 GB as published; **117 MB** cut to Amharic at 8 bits | Measured below: it gives Hohe's text its full stops back. |
| A small Amharic BERT with a punctuation head: [bert-mini-amharic](https://huggingface.co/rasyosef/bert-mini-amharic) (10.7M weights) or [bert-small-amharic](https://huggingface.co/rasyosef/bert-small-amharic) (27.8M) | 10–30 MB at 8 bits | Training data costs nothing: take any punctuated Amharic text, remove the marks, and teach it to put them back. Neither model states a licence. Not tried. |
| Pauses: a long run of blanks in Hohe's output is a pause in the speech | nothing | Free to read off the frames Hohe already decides. A pause is not always a sentence end. Not tried: FLEURS clips are separate recordings, so the pauses between them would give the answer away. |

### Punctuation, measured

The 296 FLEURS test sentences, one recording each (57 minutes), transcribed
by full-size Hohe on the Mac GPU as Nota does. They are read in groups of
five joined into one line with no marks, the way Nota joins a long
recording: 59 passages, 5,101 of Hohe's words. At each gap between words,
the model's mark is compared with the human transcript's, carried over to
Hohe's words through a word alignment. The last word of each passage is
left out, since the end of the note ends a sentence anyway. The model
writes a full stop where both its heads agree, its mark and its
sentence-end head. That rule was the best of three tried, chosen on these
same passages, so its score is up to 1.5 points optimistic: the mark head
alone gets 80.7.

| Model | Size | ። precision | ። recall | ። F1 | ። F1, one word off allowed | ፣ F1 |
|---|---:|---:|---:|---:|---:|---:|
| Full, on the human words with every mark removed | 1.11 GB | 80.4 | 93.8 | 86.6 | 86.9 | 39.8 |
| Full, on Hohe's words | 1.11 GB | 76.1 | 89.3 | 82.2 | 85.0 | 35.2 |
| Cut to Amharic, 8-bit weights, on Hohe's words | 117 MB | 76.3 | 88.9 | 82.1 | 85.0 | 35.6 |
| Whole word table, plain 8-bit, on Hohe's words | 279 MB | 72.6 | 88.2 | 79.7 | 82.5 | 33.6 |
| A ። every 17 words (the FLEURS average) | – | 6.7 | 6.2 | 6.5 | 18.3 | – |

- **Full stops come back.** It finds 9 in 10, and 3 in 4 of the ones it
  writes are where a person put one. It writes about a sixth more than the
  transcripts (339 against 289), so it cuts some long sentences in two.
  Every passage gets the 3 sentences Summarize & organize needs: 6.5 on
  average where the transcripts have 5.8. Hohe's mistakes cost it about
  4 points. An independent scorer, which aligns sentence by sentence, put
  it at 85–86.
- **Commas mostly don't:** a third.
- **Cutting the word table costs nothing.** Most of the model is a table
  of 250,000 word pieces for 100 languages: 768 of its 1,112 MB. Keeping
  the 6,052 pieces Amharic needs (Ge'ez, digits, punctuation, single Latin
  letters), and telling the tokenizer to use only those, leaves every label
  on Hohe's text unchanged. 8-bit weights, done the way 8-bit Hohe is
  (block 32), then bring it to 117 MB, 108 MB compressed, and change 8
  labels in 5,101. Plain 8-bit of the whole table loses 2.5 points.
- **Fast:** 110–165 ms per 100 words on the CPU, so about 0.1 s for a 30 s
  piece.
- **On Nota's own recordings it makes short sentences:** 133 from 628
  words, 4 words at the median. Talk has shorter sentences than read
  Wikipedia, but only hand-checked transcripts can say whether these are
  right. FLEURS is read Wikipedia and the model learned from news; neither
  is how people talk into a notes app.

To fit it in: today it can run in the Python helper after Hohe, adding
onnxruntime and sentencepiece to the speech runtime and the 117 MB file to
the download. With B it runs in the same onnxruntime-node process, with a
SentencePiece tokenizer in TypeScript that keeps to the cut vocabulary. The
model is Apache-2.0, on XLM-RoBERTa (MIT).

## Open questions

1. **Punctuation on real notes.** The model above gives FLEURS its full
   stops back. Whether its short sentences on Nota's recordings are right
   needs the hand-checked transcripts of question 2.
2. **Hand-checked transcripts** of a few Nota recordings, to choose between
   8-bit, level 4, 4-bit, 8-bit activations and the piece length. FLEURS
   alone cannot.
3. **Dictation latency** inside a utility process: 1, 3 and 5 s clips, cold,
   warm, and after the idle exit.
4. **Other machines.** Every number here comes from one busy M1 Pro. Windows,
   Linux, older x64 laptops and 8 GB machines are untested; a 30 s piece
   peaks at 3.4 GB on top of Electron.
5. **float32 against float16 on the Mac GPU,** back to back on a quiet
   machine with peak memory recorded, to firm up the 5× in option A.
6. **abdissa-png's small model** run here, on the same clips with the same
   scoring.

## Recommendation

1. **Now:** run Hohe in float16 on Apple GPUs (option A): a few lines in
   `amharic_transcriber.py`, the same accuracy on FLEURS, and about five
   times faster on 30 s pieces. No automated test runs the helper, so check
   it by hand on a real recording. It buys speed only: the installer, the
   Python runtime and the 2.42 GB download all stay as they are.
2. **Next release:** ship 8-bit Hohe inside the app (option B) on Apple
   silicon Macs, Windows (x64 and ARM64) and Linux; Intel Macs stay without
   Hohe (see *Shipping B*). On Windows and Linux it is also the speed fix. On
   Apple silicon it stays about 5× slower than option A whatever the
   settings, so make level 4 maths, alone or with shorter pieces, a release
   gate for Macs: at least 0.2.0's 5.4× on the 37 pieces, timed back to back,
   with its accuracy scored on FLEURS (clean and chatter) and on hand-checked
   recordings, and peak memory tested on an 8 GB machine. Keep the Python
   setup for BuzzASR, and for Macs that already have the Python Hohe (set up
   before B ships): their float16 GPU path wins when both are present. New
   installs get B.
3. **Spike G, time-boxed:** check that the libtorch zip has the Metal backend,
   that an exported Hohe gives the same text, and time it on the 37 pieces.
   If all three hold, Macs can have Hohe built in, without Python, at GPU
   speed, for a ~1.4 GB installer.
4. **Alongside:** measure dictation latency and try abdissa-png's 33 MB model
   for dictation. If B's installer is too big, F is the fallback.
5. **Punctuation for voice notes:** run the cut 117 MB punctuation model
   after Hohe (see *Punctuation, measured*). Without sentence ends,
   Summarize & organize does nothing on Hohe's voice notes; with it, read
   speech gets its full stops back at F1 82. Check its sentence lengths on
   hand-checked recordings before it ships.
6. **Research track, for speed:** E for live dictation, once there is enough
   audio with a clean licence, with D as the lower-risk middle step. C only if
   installer size becomes the problem: it saves about 290 MB and no time.
   Measure each against Hohe on held-out Amharic before anything ships.
