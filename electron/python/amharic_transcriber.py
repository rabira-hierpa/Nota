"""Amharic transcription helper, run by the Electron main process
(electron/lib/amharic-model-engine.ts) on VoiceStudio's Python runtime.

usage: python -I amharic_transcriber.py <model_dir>

Serves either model the app offers, picked by the model's config.json:
  whisper        BuzzASR/amharic, a Whisper large-v3 fine-tune: text is
                 generated token by token.
  wav2vec2-bert  snapwre/hohe-asr-amharic, a CTC model: one pass over the
                 audio, about ten times faster on the same clip.

Protocol, one JSON object per line:
  stdout  {"ready": true, "device": "mps"}          once the model has loaded
  stdin   {"id": "<uuid>", "path": "/abs/file.wav"}
  stdout  {"id": "<uuid>", "text": "..."}  or  {"id": "<uuid>", "error": "..."}
Diagnostics go to stderr. Transcripts never do.
"""

import json
import os
import re
import sys
import warnings
import wave

import numpy as np
import torch
from transformers import AutoModelForCTC, AutoProcessor, WhisperForConditionalGeneration, WhisperProcessor
from transformers.utils import logging as transformers_logging

SAMPLE_RATE = 16_000
INT16_SCALE = 32768.0
PAUSE_SEARCH_S = 5
FRAME_S = 0.1
MAX_ERROR_LENGTH = 300


def read_wav(path: str) -> np.ndarray:
    """The app always records 16 kHz mono 16-bit WAV."""
    with wave.open(path) as wav:
        if wav.getframerate() != SAMPLE_RATE or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise ValueError("expected a 16 kHz mono 16-bit WAV")
        frames = wav.readframes(wav.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / INT16_SCALE


def split_at_pauses(audio: np.ndarray, max_chunk_s: int) -> list[np.ndarray]:
    """Chunks of at most max_chunk_s, each cut at the quietest 100 ms in the
    last PAUSE_SEARCH_S of its window so words are rarely split."""
    max_len = max_chunk_s * SAMPLE_RATE
    search = PAUSE_SEARCH_S * SAMPLE_RATE
    frame = int(FRAME_S * SAMPLE_RATE)
    chunks: list[np.ndarray] = []
    start = 0
    while len(audio) - start > max_len:
        window_end = start + max_len
        region = audio[window_end - search : window_end]
        frames = region[: len(region) // frame * frame].reshape(-1, frame)
        quietest = int(np.argmin((frames**2).mean(axis=1)))
        cut = window_end - search + quietest * frame + frame // 2
        chunks.append(audio[start:cut])
        start = cut
    chunks.append(audio[start:])
    return [chunk for chunk in chunks if len(chunk) > 0]


def best_device() -> str:
    return "mps" if torch.backends.mps.is_available() else "cpu"


class Transcriber:
    max_chunk_s = 28

    def transcribe_chunk(self, chunk: np.ndarray) -> str:
        raise NotImplementedError

    @torch.inference_mode()
    def transcribe(self, path: str) -> str:
        texts = [self.transcribe_chunk(chunk) for chunk in split_at_pauses(read_wav(path), self.max_chunk_s)]
        return " ".join(text for text in texts if text)


class WhisperTranscriber(Transcriber):
    """BuzzASR/amharic was fine-tuned on text only, so asking it for timestamps
    (which every VoiceStudio Whisper engine does) yields nothing but
    end-of-text. On Apple GPUs it runs in float16 with eager attention: half
    the memory of float32 (4.4 GB against 8 GB) and the same text on our
    recordings. Half precision with the default (SDPA) attention emits only
    end-of-text, and bfloat16 drifts."""

    # Whisper reads 30 s windows; cut a little earlier, at the quietest moment.
    max_chunk_s = 28
    # Decoding settings from the model card.
    generate_options = {
        "language": "am",
        "task": "transcribe",
        "num_beams": 1,
        "no_repeat_ngram_size": 3,
        "repetition_penalty": 1.2,
    }

    def __init__(self, model_dir: str) -> None:
        self.device = best_device()
        self.dtype = torch.float16 if self.device == "mps" else torch.float32
        self.processor = WhisperProcessor.from_pretrained(model_dir)
        self.model = (
            WhisperForConditionalGeneration.from_pretrained(model_dir, dtype=self.dtype, attn_implementation="eager")
            .to(self.device)
            .eval()
        )

    def transcribe_chunk(self, chunk: np.ndarray) -> str:
        features = self.processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
        ids = self.model.generate(features.to(self.device, self.dtype), **self.generate_options)
        return self.processor.batch_decode(ids, skip_special_tokens=True)[0].strip()


class CtcTranscriber(Transcriber):
    """Greedy CTC decoding. Hohe's optional 5-gram language model is left out:
    it needs a compiled kenlm, and on a real recording it changed nothing but
    the spacing of one word."""

    # Trained on clips up to a minute; shorter chunks keep attention memory small.
    max_chunk_s = 30
    # The model opens its output with a language tag such as [AMH].
    language_tag = re.compile(r"\[[A-Z]+\]")

    def __init__(self, model_dir: str) -> None:
        self.device = best_device()
        self.processor = AutoProcessor.from_pretrained(model_dir)
        self.model = AutoModelForCTC.from_pretrained(model_dir, dtype=torch.float32).to(self.device).eval()

    def transcribe_chunk(self, chunk: np.ndarray) -> str:
        inputs = self.processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt").to(self.device)
        logits = self.model(**inputs).logits
        text = self.processor.batch_decode(logits.argmax(-1))[0]
        return " ".join(self.language_tag.sub(" ", text).split())


TRANSCRIBERS = {"whisper": WhisperTranscriber, "wav2vec2-bert": CtcTranscriber}


def load_transcriber(model_dir: str) -> Transcriber:
    with open(os.path.join(model_dir, "config.json"), encoding="utf-8") as config:
        model_type = json.load(config).get("model_type")
    if model_type not in TRANSCRIBERS:
        raise ValueError(f"unsupported model type {model_type!r}")
    return TRANSCRIBERS[model_type](model_dir)


def reply(message: dict) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> None:
    warnings.filterwarnings("ignore")
    transformers_logging.set_verbosity_error()
    transformers_logging.disable_progress_bar()
    transcriber = load_transcriber(sys.argv[1])
    reply({"ready": True, "device": transcriber.device})
    for line in sys.stdin:
        try:
            request = json.loads(line)
            request_id, path = request["id"], request["path"]
        except (ValueError, KeyError, TypeError):
            print("ignored a malformed request", file=sys.stderr, flush=True)
            continue
        try:
            reply({"id": request_id, "text": transcriber.transcribe(path)})
        except Exception as exc:  # noqa: BLE001 - every failure goes back to the caller
            reply({"id": request_id, "error": f"{type(exc).__name__}: {exc}"[:MAX_ERROR_LENGTH]})


if __name__ == "__main__":
    main()
