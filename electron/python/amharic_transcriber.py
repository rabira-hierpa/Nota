"""Amharic transcription helper, run by the Electron main process
(electron/lib/amharic-model-engine.ts) on VoiceStudio's Python runtime.

usage: python -I amharic_transcriber.py <model_dir>

Protocol, one JSON object per line:
  stdout  {"ready": true, "device": "mps"}          once the model has loaded
  stdin   {"id": "<uuid>", "path": "/abs/file.wav"}
  stdout  {"id": "<uuid>", "text": "..."}  or  {"id": "<uuid>", "error": "..."}
Diagnostics go to stderr. Transcripts never do.

Why decode by hand instead of VoiceStudio's engine: BuzzASR/amharic was
fine-tuned on text only, so asking it for timestamps (which every VoiceStudio
Whisper engine does) yields nothing but end-of-text. It must also run in
float32: in float16 or bfloat16 on Apple GPUs it emits only end-of-text too.
"""

import json
import sys
import warnings
import wave

import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from transformers.utils import logging as transformers_logging

SAMPLE_RATE = 16_000
INT16_SCALE = 32768.0
# Whisper reads 30 s windows; cut a little earlier, at the quietest moment.
MAX_CHUNK_S = 28
PAUSE_SEARCH_S = 5
FRAME_S = 0.1
# Decoding settings from the model card.
GENERATE_OPTIONS = {
    "language": "am",
    "task": "transcribe",
    "num_beams": 1,
    "no_repeat_ngram_size": 3,
    "repetition_penalty": 1.2,
}
MAX_ERROR_LENGTH = 300


def read_wav(path: str) -> np.ndarray:
    """The app always records 16 kHz mono 16-bit WAV."""
    with wave.open(path) as wav:
        if wav.getframerate() != SAMPLE_RATE or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise ValueError("expected a 16 kHz mono 16-bit WAV")
        frames = wav.readframes(wav.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / INT16_SCALE


def split_at_pauses(audio: np.ndarray) -> list[np.ndarray]:
    """Chunks of at most MAX_CHUNK_S, each cut at the quietest 100 ms in the
    last PAUSE_SEARCH_S of its window so words are rarely split."""
    max_len = MAX_CHUNK_S * SAMPLE_RATE
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


class Transcriber:
    def __init__(self, model_dir: str) -> None:
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.processor = WhisperProcessor.from_pretrained(model_dir)
        self.model = (
            WhisperForConditionalGeneration.from_pretrained(model_dir, dtype=torch.float32)
            .to(self.device)
            .eval()
        )

    @torch.inference_mode()
    def transcribe(self, path: str) -> str:
        texts = []
        for chunk in split_at_pauses(read_wav(path)):
            features = self.processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
            ids = self.model.generate(features.to(self.device), **GENERATE_OPTIONS)
            texts.append(self.processor.batch_decode(ids, skip_special_tokens=True)[0].strip())
        return " ".join(text for text in texts if text)


def reply(message: dict) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> None:
    warnings.filterwarnings("ignore")
    transformers_logging.set_verbosity_error()
    transcriber = Transcriber(sys.argv[1])
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
