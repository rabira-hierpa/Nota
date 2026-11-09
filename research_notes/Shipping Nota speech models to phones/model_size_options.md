# How small can Nota's speech models get, and what smaller Amharic models exist?

Desk research, 6 November 2026. No models were run or downloaded. Two kinds of evidence are used. Web sources are dated where the page shows a date. Nota's own measurements come from the repo: `docs/embedded-speech.md` (untracked, written while building built-in Hohe, 2026-11) and `scripts/build_speech_models.py`. These are cited as local files. They are the only measurements of Hohe itself under compression, so they carry more weight than general literature.

Baseline: `hohe-w8.onnx` is 723,419,839 bytes and `punct-w8.onnx` is 117,182,179 bytes. Both use ONNX Runtime `MatMulNBits` 8-bit weights with block size 32 and symmetric quantization ([build_speech_models.py](/Users/rz/rz-codes/amharic-stt/scripts/build_speech_models.py), lines 7 and 96–97). The punctuation source is `1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase`, cut to Amharic pieces (same file, lines 13 and 38–39).

## ONNX Runtime below 8 bits: 4-bit weight-only quantization, execution-provider support on Android and iOS, and accuracy impact

### Takeaway
4-bit `MatMulNBits` works today but only runs on ONNX Runtime's CPU execution provider (plus CUDA, DirectML and WebGPU, none of which matter on phones). XNNPACK, NNAPI and CoreML have no kernel for it. On Hohe, Nota's own tests put 4-bit at 427 MB, against 723 MB for 8-bit. Clean read speech (FLEURS) shows no loss. Conversational speech ("chatter") loses about 0.5 CER points and 1.2 WER points, and 4–8% of the text changes on Nota's own recordings.

### Cited Findings
- **How ORT does 4-bit.** ONNX Runtime quantizes weights to 4 bits block by block ("block-wise weight-only quantization"). A MatMul is quantized only when its weight input B is constant. In QOperator format it becomes `MatMulNBits`; in QDQ format it becomes a DequantizeLinear→MatMul pair. Gather can become `GatherBlockQuantized` (QOperator only, RTN only). The MatMul algorithms are RTN (the default), HQQ and GPTQ. The tool is `matmul_4bits_quantizer.MatMul4BitsQuantizer` with `DefaultWeightOnlyQuantConfig(block_size=128, is_symmetric, accuracy_level=4, op_types_to_quantize=("MatMul","Gather"))`. Block size must be a power of 2 and at least 16. The output is saved with external data. Int4/UInt4 need opset 21 (lower-opset models are force-upgraded), and GatherBlockQuantized needs ORT 1.20 — [ONNX Runtime quantization docs](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html) (current page, fetched 2026-11-06).
- **The same docs say nothing about which execution providers run 4-bit models** and give no mobile-specific 4-bit guidance. For transformers they recommend dynamic quantization over static — [ONNX Runtime quantization docs](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html).
- **Which providers implement the kernels.** `OperatorKernels.md` on main lists `MatMulNBits` for exactly four providers: CPU (T1 = float or float16, T2 = uint8), CUDA (adds bfloat16), DirectML and WebGPU. `GatherBlockQuantized` and `DynamicQuantizeMatMul` appear only in the CPU, CUDA/DML and WebGPU sections. The file documents no CoreML, XNNPACK or NNAPI kernels at all — [OperatorKernels.md, microsoft/onnxruntime main](https://github.com/microsoft/onnxruntime/blob/main/docs/OperatorKernels.md) (fetched 2026-11-06).
- **XNNPACK EP** supports only AveragePool, Conv, ConvTranspose, MaxPool, Softmax, QLinearConv, Resize, Gemm, MatMul ("Only 2D Op is supported", since 1.14), QLinearAveragePool, QLinearSoftmax and QLinearConvTranspose. It has no MatMulNBits and no DequantizeLinear. Unsupported nodes fall back to the CPU EP — [XNNPACK EP docs](https://onnxruntime.ai/docs/execution-providers/Xnnpack-ExecutionProvider.html).
- **NNAPI EP** supports MatMul, QLinearMatMul, DequantizeLinear and QuantizeLinear, each only when "all quantization scales and zero points [are] constant". It has no MatMulNBits — [NNAPI EP docs](https://onnxruntime.ai/docs/execution-providers/NNAPI-ExecutionProvider.html). Android's own documentation marks NNAPI deprecated: "Warning: NNAPI is deprecated… deprecated in Android 15" — [Android NDK Neural Networks API](https://developer.android.com/ndk/guides/neuralnetworks).
- **CoreML EP** lists MatMul (B constant) and Gemm, among others. It does not list MatMulNBits, DequantizeLinear or QuantizeLinear, and the page says nothing about int8 or 4-bit. MLProgram needs iOS 15+. Dynamic input shapes are accepted, but "performance may suffer" — [CoreML EP docs](https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html).
- **Hohe on FLEURS, 150 clips.** 8-bit ONNX (723 MB) scores CER 6.89% / WER 18.25%; in chatter, 10.32% / 22.95%. 4-bit ONNX (427 MB) scores CER 6.89% / WER 17.85%; in chatter, 10.83% / 24.16%. The float32 reference (2.42 GB) scores 6.88% / 18.29%, and float16 (1.21 GB) scores 6.90% / 18.37%. The doc notes that 150 clips "cannot separate differences of a few tenths of a point" — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md), "Accuracy against human transcripts (FLEURS)".
- **Text changed on Nota's recordings, compared with float32.** 8-bit weights change 0.77%. 4-bit RTN (427 MB) changes 7.88%. 4-bit HQQ (501 MB) changes 6.48%. 4-bit feed-forward with 8-bit elsewhere (522 MB) changes 5.33%. 4-bit inner layers with 8-bit first and last (458 MB) changes 7.04%. 8-bit weights and activations (`quantize_dynamic`, 610–652 MB) change 3.9–6.5% — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md), "Text changed on Nota's recordings".
- **The doc's own verdict:** "Smaller is a bet… In chatter, 4-bit adds half a point of CER and 1.3 points of WER. On Nota's recordings both change 4–8% of the text… Only hand-checked transcripts of a few Nota recordings can settle it." — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md), "What the numbers say".
- **`accuracy_level` changes speed, not size.** Level 4 rounds each block of inputs to 8 bits and uses the CPU's integer dot-product instructions. On an M1 CPU, 8-bit weights at level 4 ran 5.5× real time against 3.6–3.7× at level 0, on 30 s pieces. At 4 bits the figures were 5.6× and 3.9×. The M1 lacks the I8MM instructions that some of ORT's 8-bit kernels use — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).
- **Memory, loaded and idle:** about 0.9 GB for 8-bit Hohe and 0.6 GB for 4-bit (arena off) — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).
- **Download size barely shrinks.** "Quantized weights barely compress (8-bit 5%, 4-bit 7%, 8-bit activations 33–37%)" — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).
- **CoreML with float32 Hohe** was "killed for memory while compiling" (Node, desktop) — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).
- **General literature (older than 2024).** "Shrinking Bigfoot" (2021) reports a quantized wav2vec 2.0 "3.6 times smaller… with a 0.1% loss in WER". This comes from a search-result summary; the full text was not checked — [arXiv 2103.15760](https://arxiv.org/pdf/2103.15760). It predates ORT's MatMulNBits and may not transfer.

### Inferences
- On phones, a MatMulNBits model (8-bit today, or 4-bit) runs its MatMuls on the ORT CPU provider, with ARM NEON/dot-product kernels. Turning on XNNPACK, NNAPI or CoreML would at most take the non-MatMul nodes, splitting the graph without speeding the bulk of the work. GPU/NPU acceleration of the quantized model is therefore not a realistic route on either platform today. The alternative (QDQ int8 per-tensor for NNAPI, or float16 for CoreML) gives up the size savings or, by Nota's tests, accuracy.
- Even the best 4-bit Hohe (427 MB) plus the 8-bit punctuation model (117 MB) is about 545 MB. Nota's own doc gives "~535 MB" for this combination (row B4). That is still well above any "small app" threshold. 4-bit alone cannot bring Hohe near 200 MB.
- Using `accuracy_level=4` on the existing 8-bit file is a free speed win (about 1.5×) with no size change. The 0.36% vs 0.90% text-changed figures rest on 2 vs 5 characters, and level 4 has not been scored on FLEURS.
- The 4–8% text changed at 4 bits is about the size of Hohe's own error rate. Whether it is better or worse cannot be told without hand-checked references.

### Gaps
- No primary ORT release note was fetched for ARM64-specific MatMulNBits kernels or Arm KleidiAI integration (the docs nav lists an "Arm KleidiAI software" page). Phone speed at 4-bit vs 8-bit is therefore unknown. Nota's figures are from an M1 Mac.
- The flutter_onnxruntime plugin was not checked for which ORT version it bundles, or whether that version includes the MatMulNBits 4-bit/8-bit CPU kernels and level-4 paths on Android and iOS. The phone app already runs `hohe-w8.onnx`, so the 8-bit path evidently works.
- No published study of 4-bit weight-only quantization of wav2vec2-BERT or Conformer speech encoders under ORT was found. The literature found is older and framework-agnostic.

## Other compression: layer pruning, distillation, vocabulary/head trimming, fp16 vs int8, external data

### Takeaway
Beyond 4-bit, the real size cuts need retraining: structured pruning or distillation into a smaller student. The literature reports 40–72% fewer parameters or compute at small accuracy cost, but all on English. The closest Amharic evidence is the Ethio-ASR family: a 94M HuBERT-base model reaches 30.95% WER on WAXAL Amharic, against 22.92% for the 600M w2v-BERT model that Hohe is built from. Head trimming, float16 and external data files do not reduce size meaningfully.

### Cited Findings
- **Structured pruning.** Peng et al. (ICASSP 2023) prune wav2vec2-base with CTC. The pruned models are more accurate than wav2vec2-base at 10–30% less computation, and "can reduce computation by 40% to 50% without any degradation" (LibriSpeech, SLURP). Older than 2024; from a search summary — [arXiv 2302.14132](https://arxiv.org/pdf/2302.14132).
- **Pruning with distillation.** Wang et al. (Interspeech 2023) combine task-agnostic structured pruning with distillation. They report outperforming wav2vec 2.0 base on average "with 72% fewer parameters and 2 times faster inference". Older than 2024; from a search summary — [Interspeech 2023](https://www.isca-archive.org/interspeech_2023/wang23da_interspeech.pdf).
- **Distillation alone.** In "Shrinking Bigfoot" (2021), a distilled wav2vec 2.0 student is "4.8 times smaller… with a 7% loss in WER" and at least 2× faster on CPU and GPU. Older than 2024 — [arXiv 2103.15760](https://arxiv.org/pdf/2103.15760).
- **Unstructured pruning.** SparseWAV (2024) reports one-shot removal of up to 80% of parameters with negligible degradation in large speech foundation models. It notes that structured pruning usually degrades more — [SparseWAV, SJTU 2024](https://audiocc.sjtu.edu.cn/user/pages/03.research/02.publications/2024/SparseWAV@@Fast@and@Accurate@One-Shot@Unstructured@Pruning@for@Large@Speech@Foundation@Models/paper.pdf).
- **Layer gates.** A 2025 layer-level "self-pinching gates" paper reports 7.05% WER on LibriSpeech test-clean at 4.26× compression (23M parameters). From a search summary — [arXiv 2505.22608](https://arxiv.org/html/2505.22608v1).
- **Ethio-ASR, Amharic WER by size on the WAXAL test set** (all trained on WAXAL, March 2026). AfriHuBERT 94M (card says 92M in one table): 30.95. MMS-300M: 30.19. MMS-1B: 26.14. w2v-BERT-2.0 600M multilingual: 22.92. Monolingual Amharic w2v-BERT-2.0 600M: 22.37 — [badrex/Ethio-ASR-amharic card](https://huggingface.co/badrex/Ethio-ASR-amharic); [badrex/Ethio-ASR-multilingual-300M card](https://huggingface.co/badrex/Ethio-ASR-multilingual-300M); paper [arXiv 2603.23654](https://arxiv.org/abs/2603.23654) (preprint).
- **Hohe's lineage.** Hohe is "fine-tuned from badrex/Ethio-ASR-multilingual-600M, which itself derives from facebook/w2v-bert-2.0", on 880 h of Amharic (corpus not released) — [snapwre/hohe-asr-amharic](https://huggingface.co/snapwre/hohe-asr-amharic) (card notes a re-cut after 5 October 2026).
- **float16 vs int8.** float16 Hohe is 1.21 GB, against 723 MB for 8-bit weights; FLEURS CER is 6.90% vs 6.89% — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).
- **External data.** ORT's 4-bit quantizer saves models "with external data enabled" — [ONNX Runtime quantization docs](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html). External data moves weights into a side file; it does not shrink them.

### Inferences
- **Head and vocabulary trimming of Hohe saves almost nothing.** A CTC head is vocab × hidden size. A character vocabulary of a few hundred Ge'ez symbols times a ~1024-wide encoder is well under 1M of ~600M parameters. (Architecture reasoning, not a sourced measurement.) Vocabulary trimming does matter for the punctuation model; see below.
- **Distillation is the route to a sub-200 MB recogniser.** The Ethio-ASR numbers bound what a ~94M or ~300M student costs on Amharic: about +7–8 WER points over the 600M teacher on WAXAL (roughly 33–35% relative), before any distillation gains. Distilling Hohe into a ~95M student with Hohe's 880 h (unreleased) is not possible without that data. The student could be trained on Hohe's own transcripts of unlabelled Amharic audio as pseudo-labels. Nobody appears to have published this for Amharic.
- **Size of a ~95M student.** About 95 MB at 8-bit or ~50–60 MB at 4-bit (parameters × bytes, plus overhead). That would make "bake it in" viable on both stores.
- **Pruning top layers of the 24-layer w2v-BERT encoder** is plausible but unmeasured for Amharic. Each Conformer layer is ~4% of the model, so dropping 6 layers saves ~25% (~180 MB at 8-bit) and needs fine-tuning afterwards. This is an estimate.
- **Unstructured sparsity** (SparseWAV) does not shrink an ONNX file or speed ORT CPU inference without sparse kernels. It is not useful for download size.

### Gaps
- No paper was found that prunes or distills w2v-BERT 2.0 specifically, or any Amharic ASR model.
- The pruning and distillation figures above come from search-engine summaries of the papers. The full texts were not read, so exact WER deltas and baselines need checking.
- Hohe's exact layer count and hidden size were not re-checked on the card in this pass. The figures used are the w2v-BERT 2.0 defaults (24 layers, 1024 wide).

## Smaller openly licensed Amharic ASR models: sizes and reported WER/CER

### Takeaway
The only smaller Amharic models with credible accuracy are mostly under non-commercial licences: Ethio-ASR 94M, 300M and 1B; MMS-300M and MMS-1B-all. The permissively licensed ones are either the same size as Hohe (Ethio-ASR 600M, CC BY 4.0) or unproven on Amharic: Omnilingual ASR CTC-300M, Whisper-small fine-tunes, and weak community XLS-R fine-tunes. No small, permissive Amharic model clearly matches Hohe.

### Cited Findings
| Model | Params / fp32 size | Licence | Reported Amharic accuracy | Source |
|---|---|---|---|---|
| Hohe (current) | 0.6B; 723 MB at 8-bit | CC BY 4.0 | FLEURS am_et CER 6.28% / WER 17.86% greedy; 5.99% / 16.04% with LM. Own test set CER 5.89% / WER 18.70%. Podcast WER 49.6% | [Hohe card](https://huggingface.co/snapwre/hohe-asr-amharic) |
| Ethio-ASR-amharic (monolingual w2v-BERT 2.0) | 606,098,651 params; 2.42 GB | CC BY 4.0 | WAXAL Amharic WER 22.37 | [card](https://huggingface.co/badrex/Ethio-ASR-amharic) |
| Ethio-ASR-multilingual-600M (Hohe's base) | 2.42 GB | CC BY 4.0 | WAXAL Amharic WER 22.92 | [HF API](https://huggingface.co/badrex/Ethio-ASR-multilingual-600M); [card table](https://huggingface.co/badrex/Ethio-ASR-amharic) |
| Ethio-ASR-multilingual-1B (MMS-1B base) | 963,029,024 params; 3.85 GB | **CC BY-NC 4.0** | WER 26.14 | [card](https://huggingface.co/badrex/Ethio-ASR-multilingual-1B) |
| Ethio-ASR-multilingual-300M (MMS-300M base) | 315,864,096 params; 1.26 GB | **CC BY-NC 4.0** | WER 30.19 | [card](https://huggingface.co/badrex/Ethio-ASR-multilingual-300M) |
| Ethio-ASR-multilingual-94M (AfriHuBERT base) | 94,690,848 params; 379 MB | **CC BY-NC-SA 4.0** | WER 30.95 | [card](https://huggingface.co/badrex/Ethio-ASR-multilingual-94M) |
| facebook/mms-1b-all | ~1B base; per-language adapters ~2M params (~9 MB adapter files) | **CC BY-NC 4.0** | MMS paper Amharic WER "around 32%", per a community card (not verified against the paper) | [HF API/files](https://huggingface.co/facebook/mms-1b-all); [Transformers MMS docs](https://huggingface.co/docs/transformers/model_doc/mms); [jlonsako/mms-1b-all-AmhLM](https://huggingface.co/jlonsako/mms-1b-all-AmhLM) |
| facebook/mms-300m (pretrained only) | 1.27 GB | **CC BY-NC 4.0** | Fine-tuned MMS-300M: 39.5 WER / 12.0 CER on Amharic in WAXAL-NET | [HF API](https://huggingface.co/facebook/mms-300m); [WAXAL-NET, arXiv 2606.02375](https://arxiv.org/html/2606.02375) |
| Omnilingual ASR CTC-300M (v1/v2) | 325,494,996 params; 1.3 GiB fp32; ~2 GiB to run | GitHub reports licence "Other" (not checked further) | No Amharic-specific figure found. Across African languages (AfriVox-v2), average WER 39.20 (300M), 33.91 (1B), 32.20 (7B), with Amharic among the languages that degrade most in the wild | [omnilingual-asr README](https://github.com/facebookresearch/omnilingual-asr); [paper arXiv 2511.09690](https://arxiv.org/html/2511.09690v1); [AfriVox-v2, arXiv 2605.03590](https://arxiv.org/pdf/2605.03590) |
| Omnilingual CTC-300M, third-party MLX ports | ~326M params; 193 MB at 4-bit, 342 MB at 8-bit | (same) | — | [soniqo/speech-swift docs](https://github.com/soniqo/speech-swift/blob/main/docs/models/omnilingual-asr.md) (secondary) |
| Whisper-small fine-tuned on Amharic | Whisper-small (size not fetched) | MIT (base Whisper; fine-tune licences vary) | WAXAL-NET table: Whisper-Small ~12.5 CER, Whisper-Tiny 17.9 CER (column alignment uncertain). "Whispering in Amharic" (Mar 2025): fine-tuned Whisper-small reaches FLEURS CER in the low teens; zero-shot style row ~75.8 WER / 20.2 CER (extracted table garbled) | [arXiv 2606.02375](https://arxiv.org/html/2606.02375); [arXiv 2503.18485](https://arxiv.org/abs/2503.18485) |
| Community XLS-R-300M Amharic fine-tunes (Common Voice 16.1) | ~300M | not stated | WER 0.86–0.92 (essentially unusable) | [DipsankarSinha](https://huggingface.co/DipsankarSinha/wav2vec2-large-xls-r-300m-amharic-demo-colab); [timotewos](https://huggingface.co/timotewos/wav2vec2-large-xls-r-300m-amharic-demo-colab/blob/main/README.md) |

- The Ethio-ASR paper says its best model beats "the best OmniASR model while using far fewer parameters" on WAXAL (average WER 30.48). It is a preprint under review — [arXiv 2603.23654](https://arxiv.org/abs/2603.23654).
- Hohe's card compares itself with an unnamed "strongest open Amharic model": CER 0.1052 vs Hohe's 0.0589 on its own test set, and 0.1327 vs 0.0433 on dialects. The other model is slightly better on podcast speech (CER 0.2865 vs 0.2991) — [Hohe card](https://huggingface.co/snapwre/hohe-asr-amharic).
- The WAXAL-NET search summaries disagree on which test set the MMS-300M/Whisper Amharic numbers come from (spontaneous WAXAL speech vs FLEURS). The text says Whisper-Small beats the others on Amharic, while the table shows a near-tie. Treat these numbers as indicative — [arXiv 2606.02375](https://arxiv.org/html/2606.02375).
- Stock Whisper-large-v3 with the Amharic token forced: WER 164.1 on FLEURS in WAXAL-NET, i.e. hallucinated output — [arXiv 2606.02375](https://arxiv.org/html/2606.02375). This matches Nota's own finding of ~193% CER (project CLAUDE.md).

### Inferences
- **Licence is the binding constraint.** Every Ethio-ASR model below 600M, and all MMS checkpoints, are non-commercial. Nota ships through app stores; whether a free, open-source app counts as non-commercial use is a legal question. These models are risky to bundle and impossible to bundle if Nota ever charges.
- **Accuracy cost of going smaller,** measured on the same test set (WAXAL): 600M → 300M or 94M costs about +7–8 WER points on Amharic. Hohe adds 880 h of Amharic fine-tuning on top of the 600M base, so the real gap between Hohe and a 94M model is likely larger.
- **Omnilingual CTC-300M is the most interesting permissive-looking candidate by size.** About 193 MB at 4-bit per the MLX port; an ONNX export would differ. But its licence needs confirming (GitHub says "Other"), its Amharic accuracy is unpublished in what was found, and it would need Amharic fine-tuning (e.g. on WAXAL) to compete. It is a wav2vec2-style CTC model, so Nota's CTC pipeline would carry over. Its feature front end is raw waveform rather than the SeamlessM4T log-mel features Nota ported.
- **Whisper-small** is an encoder-decoder. Nota's CTC-only pipeline would need an autoregressive decoder on the phone, and Nota has found that Whisper fine-tunes must decode without timestamps (project notes). Its reported Amharic CER (~12%) is about twice Hohe's FLEURS CER.

### Gaps
- No Amharic-specific CER/WER for Omnilingual ASR CTC-300M/1B was found; the paper's per-language tables were not read. The Omnilingual model licence was not confirmed.
- No Moonshine, Parakeet or NVIDIA Canary model covering Amharic was found. This was not searched exhaustively, so it is unverified rather than confirmed absent.
- No ALFFA or Common Voice Amharic benchmark table comparing these models under one protocol was found.
- The exact Amharic CER from the MMS paper (arXiv 2305.13516) was not checked.

## Could the punctuation model be replaced by something much smaller?

### Takeaway
Probably yes, but nothing ready-made was found. Rule-based Amharic segmenters only split text that already has ። and ፧, so they cannot restore punctuation in raw ASR output. Nota's 117 MB file is already the vocabulary-trimmed form of a 1.1 GB model; the remaining bulk is the 12-layer XLM-R encoder. That leaves 4-bit quantization of the encoder, layer dropping, or training a small dedicated tagger as the options.

### Cited Findings
- **Source model.** `1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase` (Apache-2.0, last modified 2023-07-15) does punctuation, truecasing and sentence boundaries in 47 languages including Amharic. Its post-punctuation set includes the Ethiopic full stop, comma and question mark. The published `model.onnx` is 1,112.5 MB (fp32) — [model card](https://huggingface.co/1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase); sizes from the HF API.
- **Sibling model.** `1-800-BAD-CODE/punct_cap_seg_47_language` (Apache-2.0, 2023) does the same 47-language job. Its `punct_cap_seg_47lang.onnx` is 233.0 MB (fp32) — [model card](https://huggingface.co/1-800-BAD-CODE/punct_cap_seg_47_language). No Amharic accuracy figures were found for either model. Both are older than 2024.
- **Rule-based segmenters.** pysbd's Amharic module splits on `[፧።!\?]` — it segments existing punctuation, it does not restore it — [pysbd amharic.py](https://huggingface.co/spaces/AriNubar/xcl-en-demo/blame/main/pysbd/lang/amharic.py). Pragmatic Segmenter has a similar Amharic module — [rubydoc](https://www.rubydoc.info/gems/pragmatic_segmenter/0.3.4/PragmaticSegmenter/Languages/Amharic).
- **Nota's punctuation path today.** It keeps only full stops and question marks, where both of the model's heads agree, and is applied only to whole recordings (project CLAUDE.md). The model is quantized with MatMulNBits at 8 bits, accuracy level 0 ([build_speech_models.py](/Users/rz/rz-codes/amharic-stt/scripts/build_speech_models.py), line 253).
- No dedicated Amharic punctuation restoration model was found in search; the only Amharic-capable learned options were the two 1-800-BAD-CODE models — [search results incl. arXiv 2506.03793 (Indic-only Cadence)](https://papers.cool/arxiv/2506.03793).

### Inferences
- **Most of the 117 MB is encoder.** XLM-R base has 12 layers of width 768, about 85M encoder parameters; the trimmed embedding table is the remainder. (Standard XLM-R-base configuration, not re-fetched.)
  - Quantizing the encoder to 4 bits would bring the file to roughly 50–60 MB.
  - Dropping half the layers and fine-tuning would roughly halve it again.
  - Both are estimates. Nota's fixtures (`electron/speech/fixtures/`) can check that full-stop and question-mark output is unchanged.
- **A small dedicated tagger** (e.g. a 2–4 layer transformer, or a BiLSTM over the same Amharic SentencePiece pieces) trained only for ። and ፧ could plausibly be 5–20 MB. Nota uses only two classes, which makes the task far smaller than the 47-language model's. Training data would come from punctuated Amharic text, which is plentiful (news, Wikipedia). This is a design inference; no published Amharic model of this kind was found.
- The 233 MB `punct_cap_seg_47_language` is not obviously smaller once vocabulary-trimmed. Its fp32 size suggests ~58M parameters, but how much of that is embeddings was not checked.

### Gaps
- No Amharic punctuation accuracy figures exist for either 1-800-BAD-CODE model in what was found, so the cost of shrinking cannot be measured against a published baseline. It has to be measured against Nota's own fixtures.
- The layer and embedding breakdown of Nota's trimmed `punct-w8.onnx` was not inspected (no models were run).

## What size makes bundling practical on each store?

### Takeaway
On Google Play, Nota's 840 MB fits in one install-time asset pack today (limit 1.5 GB per pack, 4 GB in total), but not in the 500 MB base module. Any install over 200 MB shows mobile-data users a non-blocking size dialog. On iOS the hard ceiling is 4 GB uncompressed, so 840 MB is allowed. Making the speech models "small" in the user's eyes realistically means under ~200 MB on Play, which only a ~95M–300M-class model at 4–8 bits plus a compact punctuation model can reach. 4-bit Hohe (~535–545 MB with punctuation) cannot.

### Cited Findings
- **Google Play download-size limits:**
  - base module 500 MB
  - individual feature modules 500 MB
  - individual asset packs 1.5 GB
  - cumulative total for all modules and install-time asset packs 4 GB
  - cumulative total for on-demand or fast-follow asset packs 30 GB
  - total maximum compressed download 34 GB
  - apps still published as APKs: legacy limit of 100 MB
  - apps over 1 GB must have minSdk 21+

  "If your app is above 200MB in size, users on a mobile data connection will see a non-blocking dialog when installing the app from Google Play informing them of the app's large size" — [Play Console Help, "Optimize your app's size and stay within Google Play app size limits"](https://support.google.com/googleplay/android-developer/answer/9859372) (fetched 2026-11-06).
- **Play Asset Delivery.** Install-time asset packs "have the same requirements as the base APK, which require at least two times the size of all the asset packs" in free space. On app update, install-time packs update with the base app. Fast-follow and on-demand packs are patched: the patch is downloaded, all previously downloaded packs are invalidated, and the patch is applied. The page mentions "delta patching" — [Play Asset Delivery docs](https://developer.android.com/guide/playcore/asset-delivery).
- **App Store.** "Maximum uncompressed app size: 4 GB" for iOS and iPadOS — [App Store Connect Help, Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes) (fetched 2026-11-06).
- **Download size ≈ file size for Nota's models.** Quantized weights compress only 5–7% — [docs/embedded-speech.md](/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md).

### Inferences
Approximate file sizes against the thresholds. Sizes marked "≈" are parameters × bytes estimates, not measurements.

| Option | Approx. total with punctuation | Play base (500 MB) | Play 200 MB dialog | iOS 4 GB |
|---|---|---|---|---|
| Today: 8-bit Hohe + 8-bit punct | 840 MB | no (needs install-time asset pack) | dialog | ok |
| 4-bit Hohe (measured 427 MB) + 8-bit punct | ~545 MB | no | dialog | ok |
| 4-bit Hohe + 4-bit punct (≈55 MB) | ≈480 MB | borderline, only with a tiny app | dialog | ok |
| ~300M CTC model at 4-bit (e.g. Omnilingual 193 MB MLX) + small punct | ≈200–250 MB | yes | borderline | ok |
| ~95M distilled student at 8-bit (≈95 MB) + small tagger | ≈100–120 MB | yes | no dialog | ok |

- **Updating the model.** Bundled install-time packs are re-delivered with app updates, and Play says it delta-patches them. An unchanged model should cost little on update, though the page does not state this outright.
- **Phone storage.** The 2× free-space requirement for install-time packs means an 840 MB pack needs ~1.7 GB free at install time. That matters on the low-storage Android phones common in Ethiopia.
- **Where the gains are.** Size reduction alone gets Hohe from 840 MB to ~480–545 MB without retraining (4-bit), at an accuracy cost on conversational speech that has not been verified. Reaching the ~200 MB band needs a different, smaller recogniser: distilled from Hohe, or a fine-tuned permissive ~300M model. That is a training project, not an export setting.

### Gaps
- Apple's cellular-download prompt threshold (historically 200 MB, user-overridable since iOS 13) was not verified from a primary Apple source in this pass. The App Store Connect page fetched gives only the 4 GB and executable-size limits.
- Whether iOS On-Demand Resources or Background Assets have separate size limits was not checked. This is likely covered by the distribution-focused research thread.
- Play's App size page does not say outright whether an unchanged install-time asset pack is re-downloaded on update; "delta patching" is mentioned without numbers.
