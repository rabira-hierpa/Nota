"""Download Nota's speech models at pinned revisions and check they load.

usage: python -I setup_models.py [--link] <models_dir> <hohe|buzzasr> [...]

Run by setup-amharic-model.sh (macOS, Linux) and setup-amharic-model.ps1
(Windows) once the speech runtime exists, with the runtime's Python.

  --link   link the model folder's files to the Hugging Face cache instead of
           copying them (saves the 2-3 GB a copy costs; needs symlinks, so
           not on Windows).

Keep the folder names in step with LOCAL_MODELS in electron/lib/config.ts.
"""

import json
import os
import sys
import warnings

from huggingface_hub import snapshot_download

MODELS = {
    "hohe": {
        "repo": "snapwre/hohe-asr-amharic",
        "revision": "217712df448adc0956b2d1b3f13bc30466c8733b",
        "label": "Hohe",
        "size": "about 2.4 GB",
        # Hohe's optional 5-gram language model (lm/) is skipped: Nota decodes without it.
        "patterns": ["*.json", "model.safetensors"],
        "folder": "hohe-asr-amharic-217712d",
    },
    "buzzasr": {
        "repo": "BuzzASR/amharic",
        "revision": "3002b3f5c907d2283255c0226398513b812cca49",
        "label": "BuzzASR",
        "size": "about 3.1 GB",
        "patterns": None,
        "folder": "BuzzASR-amharic-3002b3f",
    },
}

# BuzzASR's published generation config carries "_from_model_config": true
# (saved by transformers 4.57); transformers 5.x then drops every Whisper
# setting, so the model folder holds a corrected copy.
GENERATION_CONFIG = "generation_config.json"


def say(message: str) -> None:
    print(message, flush=True)


def link_snapshot(snapshot: str, target: str, skip: str | None) -> None:
    os.makedirs(target, exist_ok=True)
    for name in os.listdir(snapshot):
        source = os.path.join(snapshot, name)
        if name == skip or not os.path.isfile(source):
            continue
        link = os.path.join(target, name)
        if os.path.lexists(link):
            os.remove(link)
        os.symlink(source, link)


def fetch(model: str, models_dir: str, use_links: bool) -> str:
    spec = MODELS[model]
    target = os.environ.get(f"{model.upper()}_MODEL_DIR") or os.path.join(models_dir, spec["folder"])
    say(f"Downloading {spec['label']} ({spec['repo']}@{spec['revision'][:7]}, {spec['size']}, once)…")
    if use_links:
        snapshot = snapshot_download(spec["repo"], revision=spec["revision"], allow_patterns=spec["patterns"])
        link_snapshot(snapshot, target, GENERATION_CONFIG if model == "buzzasr" else None)
        source_config = os.path.join(snapshot, GENERATION_CONFIG)
    else:
        snapshot_download(spec["repo"], revision=spec["revision"], allow_patterns=spec["patterns"], local_dir=target)
        source_config = os.path.join(target, GENERATION_CONFIG)
    if model == "buzzasr":
        with open(source_config, encoding="utf-8") as source:
            config = json.load(source)
        config.pop("_from_model_config", None)
        destination = os.path.join(target, GENERATION_CONFIG)
        if os.path.lexists(destination) and os.path.islink(destination):
            os.remove(destination)
        with open(destination, "w", encoding="utf-8") as out:
            json.dump(config, out, indent=2)
            out.write("\n")
    return target


def check(model: str, folder: str) -> None:
    """Fail now, not on the first recording, if transformers can't read the model."""
    warnings.filterwarnings("ignore")
    if model == "hohe":
        from transformers import AutoConfig, AutoProcessor

        AutoProcessor.from_pretrained(folder)
        model_type = AutoConfig.from_pretrained(folder).model_type
        if model_type != "wav2vec2-bert":
            sys.exit(f"unexpected model type {model_type}")
    else:
        from transformers import GenerationConfig

        config = GenerationConfig.from_pretrained(folder)
        missing = [key for key in ("no_timestamps_token_id", "lang_to_id") if not hasattr(config, key)]
        if missing:
            sys.exit(f"generation config still missing {missing}")


def main() -> None:
    args = sys.argv[1:]
    use_links = "--link" in args
    args = [arg for arg in args if arg != "--link"]
    if len(args) < 2 or any(model not in MODELS for model in args[1:]):
        sys.exit("usage: setup_models.py [--link] <models_dir> <hohe|buzzasr> [...]")
    models_dir = args[0]
    for model in args[1:]:
        folder = fetch(model, models_dir, use_links)
        check(model, folder)
        say(f"{MODELS[model]['label']} ready: {folder}")


if __name__ == "__main__":
    main()
