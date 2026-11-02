"""Build the speech models Nota ships inside the app, so it transcribes with no
Python and no download (electron/speech/). Run by build-speech-models.sh.

  python -I build_speech_models.py <out dir>                  # the models
  python -I build_speech_models.py <out dir> --fixtures <dir>  # and the test fixtures

Both models are exported to ONNX with 8-bit weights (MatMulNBits, blocks of
32, symmetric): on FLEURS this changes nothing measurable. Hohe's layers also
run at accuracy level 4 (see HOHE_ACCURACY_LEVEL).

  hohe-w8.onnx    snapwre/hohe-asr-amharic (CC BY 4.0), about 723 MB
  hohe.json       its CTC tokens by id
  punct-w8.onnx   1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase
                  (Apache-2.0), its 250k-piece word table cut to the 6,052
                  pieces Amharic text uses, about 117 MB
  punct.json      that tokenizer's kept pieces, renumbered, and the labels
  NOTICE          where the models come from and their licences
  manifest.json   every file's size and SHA-256, checked before packaging

Prints numbers only.
"""

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import tempfile
import warnings

import numpy as np

HOHE = {"repo": "snapwre/hohe-asr-amharic", "revision": "217712df448adc0956b2d1b3f13bc30466c8733b"}
HOHE_FILES = ["config.json", "model.safetensors", "preprocessor_config.json", "vocab.json", "added_tokens.json",
              "special_tokens_map.json", "tokenizer_config.json"]
PUNCT = {"repo": "1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase",
         "revision": "d1769a597ce8dfaa070d436bc67d4ee761f58884"}
PUNCT_FILES = ["config.yaml", "model.onnx", "sp.model"]
PUNCT_EMBEDDINGS = "bert_model.embeddings.word_embeddings.weight"
SAMPLE_RATE = 16_000
BITS = 8
# Hohe's 8-bit layers round their inputs to 8 bits too and use the CPU's integer
# dot products: up to 1.45x faster in Nota, with the same FLEURS score (CER
# 6.82%, 145 of 150 clips' text identical). The punctuation model is quick
# either way and keeps float maths.
HOHE_ACCURACY_LEVEL = 4

# The word pieces Hohe's text can need: Ge'ez (all four Ethiopic blocks), digits
# and ASCII punctuation, and single Latin letters. The rest of XLM-R's table
# (other scripts) never matches Amharic text.
GEEZ = re.compile(r"^[ሀ-᎟ⶀ-⷟꬀-꬯▁]+$")
DIGITS_AND_MARKS = re.compile(r"^[0-9\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E▁]+$")
LATIN_LETTER = re.compile(r"^▁?[A-Za-z]$")
SPECIALS = 4  # <s> <pad> </s> <unk>

NOTICE = """Speech models built into Nota

hohe-w8.onnx, hohe.json
  Hohe ASR Amharic by snapwre, https://huggingface.co/snapwre/hohe-asr-amharic
  (revision {hohe}), licensed CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/). Changed: exported to ONNX,
  weights stored in 8 bits, computed with 8-bit inputs.

punct-w8.onnx, punct.json
  xlm-roberta_punctuation_fullstop_truecase by 1-800-BAD-CODE,
  https://huggingface.co/1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase
  (revision {punct}), licensed Apache-2.0
  (https://www.apache.org/licenses/LICENSE-2.0), built on XLM-RoBERTa
  (MIT). Changed: word table cut to the pieces Amharic text uses, weights
  stored in 8 bits.
"""


def say(message):
    print(message, flush=True)


def download(spec, files):
    from huggingface_hub import snapshot_download

    return snapshot_download(spec["repo"], revision=spec["revision"], allow_patterns=files)


def quantize(source, target, accuracy_level=0):
    import logging

    import onnx
    from onnxruntime.quantization.matmul_nbits_quantizer import DefaultWeightOnlyQuantConfig, MatMulNBitsQuantizer

    # It logs every matrix it visits.
    logging.getLogger("onnxruntime.quantization").setLevel(logging.WARNING)
    logging.getLogger("onnxruntime.quantization.matmul_nbits_quantizer").setLevel(logging.WARNING)

    config = DefaultWeightOnlyQuantConfig(block_size=32, is_symmetric=True, accuracy_level=accuracy_level, bits=BITS)
    quantizer = MatMulNBitsQuantizer(onnx.load(source), bits=BITS, block_size=32, is_symmetric=True,
                                     accuracy_level=accuracy_level, algo_config=config)
    quantizer.process()
    quantizer.model.save_model_to_file(target, False)


def probe_audio(seconds):
    """A fixed test sound (two tones and noise): exporting needs one input, and nothing private."""
    rng = np.random.default_rng(0)
    t = np.arange(int(seconds * SAMPLE_RATE)) / SAMPLE_RATE
    wave = 0.2 * np.sin(2 * np.pi * 220 * t) + 0.1 * np.sin(2 * np.pi * 1330 * t) + 0.05 * rng.standard_normal(t.size)
    return np.clip(np.round(wave * 32767), -32768, 32767).astype(np.int16)


def build_hohe(out, work):
    import onnxruntime as ort
    import torch
    from transformers import AutoModelForCTC, AutoProcessor

    class PointwiseAsLinear(torch.nn.Module):
        """A kernel-1 convolution as a matrix product, so weight-only quantization reaches it."""

        def __init__(self, conv):
            super().__init__()
            assert conv.kernel_size == (1,) and conv.stride == (1,) and conv.groups == 1
            self.linear = torch.nn.Linear(conv.in_channels, conv.out_channels, bias=conv.bias is not None)
            self.linear.weight.data = conv.weight.data[:, :, 0].clone()
            if conv.bias is not None:
                self.linear.bias.data = conv.bias.data.clone()

        def forward(self, x):
            return self.linear(x.transpose(1, 2)).transpose(1, 2)

    class Logits(torch.nn.Module):
        def __init__(self, inner):
            super().__init__()
            self.inner = inner

        def forward(self, input_features):
            return self.inner(input_features=input_features).logits

    say("Hohe: downloading (2.4 GB, once)…")
    source = download(HOHE, HOHE_FILES)
    processor = AutoProcessor.from_pretrained(source)
    model = AutoModelForCTC.from_pretrained(source, dtype=torch.float32).eval()
    audio = probe_audio(8).astype(np.float32) / 32768.0
    probe = processor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
    with torch.no_grad():
        before = model(input_features=probe).logits
        for layer in model.wav2vec2_bert.encoder.layers:
            layer.conv_module.pointwise_conv1 = PointwiseAsLinear(layer.conv_module.pointwise_conv1)
            layer.conv_module.pointwise_conv2 = PointwiseAsLinear(layer.conv_module.pointwise_conv2)
        after = model(input_features=probe).logits
    say(f"Hohe: pointwise convolutions as matrix products, largest logit change {float((before - after).abs().max()):.1e}")

    say("Hohe: exporting to ONNX…")
    import onnx

    raw = os.path.join(work, "hohe-raw.onnx")
    # The TorchScript exporter is the one this graph was checked with; torch says it is on its way out.
    warnings.filterwarnings("ignore", message="You are using the legacy TorchScript")
    warnings.filterwarnings("ignore", message="Constant folding")
    torch.onnx.export(Logits(model), (probe,), raw, input_names=["input_features"], output_names=["logits"],
                      dynamic_axes={"input_features": {1: "frames"}, "logits": {1: "steps"}},
                      opset_version=17, dynamo=False)
    reference = after.numpy()
    del model
    fp32 = os.path.join(work, "hohe-fp32.onnx")
    onnx.save_model(onnx.load(raw), fp32, save_as_external_data=True, all_tensors_to_one_file=True,
                    location="hohe-fp32.onnx.data")
    os.remove(raw)

    say(f"Hohe: storing the weights in {BITS} bits…")
    target = os.path.join(out, "hohe-w8.onnx")
    quantize(fp32, target, HOHE_ACCURACY_LEVEL)
    logits = ort.InferenceSession(target, providers=["CPUExecutionProvider"]).run(
        None, {"input_features": probe.numpy()})[0]
    same = float((logits.argmax(-1) == reference.argmax(-1)).mean())
    say(f"Hohe: 8-bit against float32 on the test sound, largest logit change {float(np.abs(logits - reference).max()):.2f}, "
        f"same token on {same * 100:.1f}% of steps")

    vocab = json.load(open(os.path.join(source, "vocab.json"), encoding="utf-8"))
    vocab.update(json.load(open(os.path.join(source, "added_tokens.json"), encoding="utf-8")))
    config = json.load(open(os.path.join(source, "config.json"), encoding="utf-8"))
    tokens = [""] * config["vocab_size"]
    for token, index in vocab.items():
        tokens[index] = token
    tokenizer = json.load(open(os.path.join(source, "tokenizer_config.json"), encoding="utf-8"))
    assert tokenizer["clean_up_tokenization_spaces"] is False and tokenizer["do_lower_case"] is False
    assert logits.shape[-1] == len(tokens)
    write_json(os.path.join(out, "hohe.json"), {
        "tokens": tokens,
        "blank": vocab[tokenizer["pad_token"]],
        "wordDelimiter": tokenizer["word_delimiter_token"],
    })
    return source


def kept_pieces(proto):
    """The ids of the pieces Amharic text can need, specials first, in order."""
    return list(range(SPECIALS)) + [
        index for index in range(SPECIALS, len(proto.pieces))
        if proto.pieces[index].type == proto.pieces[index].NORMAL
        and any(pattern.match(proto.pieces[index].piece) for pattern in (GEEZ, DIGITS_AND_MARKS, LATIN_LETTER))
    ]


def restricted_tokenizer(sp_model, keep):
    """The tokenizer as the cut model needs it: unkept pieces are never used, kept ones renumbered."""
    from sentencepiece import SentencePieceProcessor, sentencepiece_model_pb2

    proto = sentencepiece_model_pb2.ModelProto()
    proto.ParseFromString(open(sp_model, "rb").read())
    kept = set(keep)
    for index, piece in enumerate(proto.pieces):
        if index not in kept and piece.type == piece.NORMAL:
            piece.type = piece.UNUSED
    sp = SentencePieceProcessor(model_proto=proto.SerializeToString())
    remap = np.full(sp.GetPieceSize(), sp.unk_id(), dtype=np.int64)
    remap[keep] = np.arange(len(keep))
    return sp, remap


def build_punct(out, work):
    import onnx
    import yaml
    from onnx import numpy_helper
    from sentencepiece import SentencePieceProcessor, sentencepiece_model_pb2

    say("Punctuation: downloading (1.1 GB, once)…")
    source = download(PUNCT, PUNCT_FILES)
    sp = SentencePieceProcessor(os.path.join(source, "sp.model"))
    proto = sentencepiece_model_pb2.ModelProto()
    proto.ParseFromString(open(os.path.join(source, "sp.model"), "rb").read())
    spec = proto.normalizer_spec
    assert (spec.name, spec.add_dummy_prefix, spec.remove_extra_whitespaces, spec.escape_whitespaces) == (
        "nmt_nfkc", True, True, True)
    assert proto.trainer_spec.model_type == proto.trainer_spec.UNIGRAM and not proto.trainer_spec.byte_fallback
    assert (sp.bos_id(), sp.eos_id(), sp.unk_id()) == (0, 2, 3)

    keep = kept_pieces(proto)
    say(f"Punctuation: keeping {len(keep):,} of {sp.GetPieceSize():,} word pieces")

    model = onnx.load(os.path.join(source, "model.onnx"))
    users = [node.op_type for node in model.graph.node if PUNCT_EMBEDDINGS in node.input]
    assert users == ["Gather"], users
    for tensor in model.graph.initializer:
        if tensor.name == PUNCT_EMBEDDINGS:
            table = numpy_helper.to_array(tensor)
            tensor.CopyFrom(numpy_helper.from_array(np.ascontiguousarray(table[keep]), PUNCT_EMBEDDINGS))
    cut = os.path.join(work, "punct-cut.onnx")
    onnx.save(model, cut)
    del model

    say(f"Punctuation: storing the weights in {BITS} bits…")
    target = os.path.join(out, "punct-w8.onnx")
    quantize(cut, target)

    config = yaml.safe_load(open(os.path.join(source, "config.yaml"), encoding="utf-8"))
    pieces = [[proto.pieces[index].piece, proto.pieces[index].score] for index in keep]
    write_json(os.path.join(out, "punct.json"), {
        "maxLength": config["max_length"],
        "postLabels": config["post_labels"],
        "bos": sp.bos_id(), "eos": sp.eos_id(), "unk": sp.unk_id(),
        "specials": SPECIALS,
        # [piece, score] by new id; the first `specials` are control pieces, never matched.
        "pieces": pieces,
    })
    return source, keep


def write_json(path, value):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(value, file, ensure_ascii=False, separators=(",", ":"))


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for block in iter(lambda: file.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def write_manifest(out):
    import onnxruntime
    import torch
    import transformers

    files = sorted(name for name in os.listdir(out) if name != "manifest.json")
    manifest = {
        "hohe": HOHE, "punct": PUNCT,
        "built_with": {"torch": torch.__version__, "transformers": transformers.__version__,
                       "onnxruntime": onnxruntime.__version__},
        "files": {name: {"bytes": os.path.getsize(os.path.join(out, name)), "sha256": sha256(os.path.join(out, name))}
                  for name in files},
    }
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=2)
        file.write("\n")
    for name, entry in manifest["files"].items():
        say(f"  {name:<16} {entry['bytes'] / 1e6:8.1f} MB")


def b64(array):
    return base64.b64encode(np.ascontiguousarray(array).tobytes()).decode("ascii")


def fixtures(target, hohe_source, punct_source, keep, out, samples):
    """Python's answers for the TypeScript ports to match (electron/speech/*.test.ts)."""
    import onnxruntime as ort
    from transformers import AutoProcessor

    os.makedirs(target, exist_ok=True)
    processor = AutoProcessor.from_pretrained(hohe_source)

    # Features: 1.37 s gives an odd number of frames, so the padding frame is covered too.
    audio = probe_audio(1.37)
    features = processor(audio.astype(np.float32) / 32768.0, sampling_rate=SAMPLE_RATE, return_tensors="np")
    write_json(os.path.join(target, "features.json"), {
        "samples": b64(audio.astype("<i2")),
        "dims": list(features.input_features.shape),
        "features": b64(features.input_features.astype("<f4")),
    })

    # CTC: random token runs through the tokenizer and the helper's clean-up.
    tokens = json.load(open(os.path.join(out, "hohe.json"), encoding="utf-8"))
    rng = np.random.default_rng(1)
    favoured = [tokens["blank"], tokens["tokens"].index(tokens["wordDelimiter"]), tokens["tokens"].index("[AMH]")]
    cases = []
    for _ in range(40):
        ids = rng.integers(0, len(tokens["tokens"]), size=int(rng.integers(0, 60)))
        ids = np.where(rng.random(ids.size) < 0.4, rng.choice(favoured, size=ids.size), ids)
        ids = np.repeat(ids, rng.integers(1, 3, size=ids.size))
        text = processor.batch_decode(ids[None, :])[0]
        cases.append({"ids": ids.tolist(), "text": " ".join(re.sub(r"\[[A-Z]+\]", " ", text).split())})
    write_json(os.path.join(target, "ctc.json"), {"tokens": tokens, "cases": cases})

    # Tokenizer and punctuation, on sample sentences (one per line).
    sp, remap = restricted_tokenizer(os.path.join(punct_source, "sp.model"), keep)
    lines = [line.strip() for line in open(samples, encoding="utf-8") if line.strip() and not line.startswith("#")]
    words = sorted({word for line in lines for word in line.split()})
    encoded = [[word, [int(remap[i]) for i in sp.EncodeAsIds(word)]] for word in words]

    session = ort.InferenceSession(os.path.join(out, "punct-w8.onnx"), providers=["CPUExecutionProvider"])
    punct = json.load(open(os.path.join(out, "punct.json"), encoding="utf-8"))
    room = punct["maxLength"] - 2
    passages = [" ".join(lines[i:i + 5]) for i in range(0, len(lines), 5)] + [" ".join(lines)]
    labelled = []
    for passage in passages:
        ids, last = [], []
        for word in passage.split():
            ids += [int(remap[i]) for i in sp.EncodeAsIds(word)]
            last.append(len(ids) - 1)
        post, seg = window_labels(session, ids, room, punct)
        labelled.append({"text": passage, "post": [post[i] for i in last], "seg": [seg[i] for i in last]})
    table = {key: punct[key] for key in ("pieces", "specials", "unk")}
    write_json(os.path.join(target, "punct.json"), {"table": table, "words": encoded, "passages": labelled})
    say(f"fixtures: {len(cases)} CTC cases, {len(encoded)} words, {len(labelled)} passages")


def window_labels(session, ids, room, punct):
    """Overlapping windows; each subtoken takes the window where it sits furthest from a cut."""
    best = [(-1, 0, 0)] * len(ids)
    step, start = room // 2, 0
    while True:
        chunk = ids[start:start + room]
        feed = np.array([[punct["bos"], *chunk, punct["eos"]]], dtype=np.int64)
        _, post, _, seg = session.run(None, {"input_ids": feed})
        at_start, at_end = start == 0, start + room >= len(ids)
        for k in range(len(chunk)):
            margin = min(len(ids) if at_start else k, len(ids) if at_end else len(chunk) - 1 - k)
            if margin > best[start + k][0]:
                best[start + k] = (margin, int(post[0][k + 1]), int(seg[0][k + 1]))
        if at_end:
            return [label for _, label, _ in best], [stop for _, _, stop in best]
        start += step


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("out")
    parser.add_argument("--fixtures", help="also write the test fixtures here")
    parser.add_argument("--samples", help="sample sentences for the fixtures, one per line")
    parser.add_argument("--fixtures-only", action="store_true", help="from models already built in <out dir>")
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    if args.fixtures_only:
        from sentencepiece import sentencepiece_model_pb2

        punct_source = download(PUNCT, PUNCT_FILES)
        proto = sentencepiece_model_pb2.ModelProto()
        proto.ParseFromString(open(os.path.join(punct_source, "sp.model"), "rb").read())
        fixtures(os.path.abspath(args.fixtures), download(HOHE, HOHE_FILES), punct_source, kept_pieces(proto), out,
                 args.samples)
        return
    staging = out + ".partial"
    shutil.rmtree(staging, ignore_errors=True)
    os.makedirs(staging)
    with tempfile.TemporaryDirectory(prefix="nota-speech-") as work:
        hohe_source = build_hohe(staging, work)
        punct_source, keep = build_punct(staging, work)
    with open(os.path.join(staging, "NOTICE"), "w", encoding="utf-8") as file:
        file.write(NOTICE.format(hohe=HOHE["revision"], punct=PUNCT["revision"]))
    if args.fixtures:
        fixtures(os.path.abspath(args.fixtures), hohe_source, punct_source, keep, staging, args.samples)
    write_manifest(staging)
    shutil.rmtree(out, ignore_errors=True)
    os.replace(staging, out)
    say(f"Done: {out}")


if __name__ == "__main__":
    main()
