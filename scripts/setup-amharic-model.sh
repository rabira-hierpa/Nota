#!/usr/bin/env bash
# Set up the Amharic speech model the app transcribes with.
#
# Stock Whisper (VoiceStudio's engine) barely knows Amharic (~193% character
# error on FLEURS). BuzzASR/amharic, a Whisper large-v3 fine-tune, reports
# ~12%. The app runs it through electron/python/amharic_transcriber.py on
# VoiceStudio's Python runtime, so VoiceStudio must be installed.
#
# As published, the model's generation_config.json carries
# "_from_model_config": true (saved by transformers 4.57), and transformers
# 5.x then drops every Whisper setting (no_timestamps_token_id, lang_to_id,
# task_to_id). This script downloads the pinned revision into the Hugging Face
# cache (~3.1 GB, once) and builds a model folder in the app's data directory
# that links to the cached files and holds a corrected generation_config.json.
# The cache itself is left untouched.
#
# Overrides: AMHARIC_ASR_REPO, AMHARIC_ASR_REVISION, AMHARIC_MODEL_DIR,
# VOICESTUDIO_PYTHON. Keep the default folder name in step with
# AMHARIC_MODEL_FOLDER in electron/lib/config.ts.
set -euo pipefail

REPO="${AMHARIC_ASR_REPO:-BuzzASR/amharic}"
REVISION="${AMHARIC_ASR_REVISION:-3002b3f5c907d2283255c0226398513b812cca49}"
VS_PYTHON="${VOICESTUDIO_PYTHON:-$HOME/Library/Application Support/VoiceStudio/runtime/project/.venv/bin/python}"
MODEL_DIR="${AMHARIC_MODEL_DIR:-$HOME/Library/Application Support/Amharic Speech to Text/models/${REPO//\//-}-${REVISION:0:7}}"

if [[ ! -x "$VS_PYTHON" ]]; then
  echo "VoiceStudio's Python runtime wasn't found at $VS_PYTHON." >&2
  echo "Install VoiceStudio and finish its first-run setup, or set VOICESTUDIO_PYTHON." >&2
  exit 1
fi

echo "Fetching $REPO@${REVISION:0:7} (about 3.1 GB the first time)…"
SNAPSHOT=$("$VS_PYTHON" -I -c '
import sys
from huggingface_hub import snapshot_download
print(snapshot_download(sys.argv[1], revision=sys.argv[2]))
' "$REPO" "$REVISION")

mkdir -p "$MODEL_DIR"
for file in "$SNAPSHOT"/*; do
  name=$(basename "$file")
  [[ "$name" == "generation_config.json" ]] && continue
  ln -sfn "$file" "$MODEL_DIR/$name"
done
"$VS_PYTHON" -I -c '
import json, sys
config = json.load(open(sys.argv[1], encoding="utf-8"))
config.pop("_from_model_config", None)
with open(sys.argv[2], "w", encoding="utf-8") as out:
    json.dump(config, out, indent=2)
    out.write("\n")
' "$SNAPSHOT/generation_config.json" "$MODEL_DIR/generation_config.json"

# Fail now, not on the first recording, if transformers still can't read it.
"$VS_PYTHON" -I -c '
import sys, warnings
warnings.filterwarnings("ignore")
from transformers import GenerationConfig
config = GenerationConfig.from_pretrained(sys.argv[1])
missing = [key for key in ("no_timestamps_token_id", "lang_to_id") if not hasattr(config, key)]
sys.exit(f"generation config still missing {missing}" if missing else 0)
' "$MODEL_DIR"

echo "Amharic model ready: $MODEL_DIR"
echo "Restart the app (npm run dev) if it is running; the sidebar should say “Amharic model ready”."
