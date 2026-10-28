#!/usr/bin/env bash
# Set up the Amharic speech models the app transcribes with.
#
# usage: scripts/setup-amharic-model.sh [all|hohe|buzzasr]   (default: all)
#
# Stock Whisper (VoiceStudio's engine) barely knows Amharic (~193% character
# error on FLEURS). The app offers two fine-tuned models instead, run through
# electron/python/amharic_transcriber.py on VoiceStudio's Python runtime, so
# VoiceStudio must be installed:
#
#   hohe     snapwre/hohe-asr-amharic, wav2vec2-BERT + CTC (2.4 GB, CC BY 4.0)
#   buzzasr  BuzzASR/amharic, a Whisper large-v3 fine-tune (3.1 GB, MIT)
#
# Each is downloaded at a pinned revision into the Hugging Face cache (once)
# and linked into a model folder in the app's data directory; the cache itself
# is left untouched. Hohe's optional 5-gram language model (lm/, 538 MB) is
# skipped: the app decodes without it. BuzzASR's published
# generation_config.json carries "_from_model_config": true (saved by
# transformers 4.57), and transformers 5.x then drops every Whisper setting
# (no_timestamps_token_id, lang_to_id, task_to_id), so its folder holds a
# corrected copy.
#
# Overrides: VOICESTUDIO_PYTHON, HOHE_MODEL_DIR, BUZZASR_MODEL_DIR. Keep the
# default folder names in step with LOCAL_MODELS in electron/lib/config.ts.
set -euo pipefail

VS_PYTHON="${VOICESTUDIO_PYTHON:-$HOME/Library/Application Support/VoiceStudio/runtime/project/.venv/bin/python}"
MODELS_DIR="$HOME/Library/Application Support/Amharic Speech to Text/models"

if [[ ! -x "$VS_PYTHON" ]]; then
  echo "VoiceStudio's Python runtime wasn't found at $VS_PYTHON." >&2
  echo "Install VoiceStudio and finish its first-run setup, or set VOICESTUDIO_PYTHON." >&2
  exit 1
fi

# fetch <repo> <revision> [pattern...]: downloads (once) and prints the snapshot path.
fetch() {
  "$VS_PYTHON" -I -c '
import sys
from huggingface_hub import snapshot_download
print(snapshot_download(sys.argv[1], revision=sys.argv[2], allow_patterns=sys.argv[3:] or None))
' "$@"
}

# link_files <snapshot> <model_dir> [skip]: links the snapshot's top-level files.
link_files() {
  local snapshot=$1 dir=$2 skip=${3:-} file name
  mkdir -p "$dir"
  for file in "$snapshot"/*; do
    name=$(basename "$file")
    [[ -f "$file" && "$name" != "$skip" ]] || continue
    ln -sfn "$file" "$dir/$name"
  done
}

setup_hohe() {
  local revision=217712df448adc0956b2d1b3f13bc30466c8733b
  local dir="${HOHE_MODEL_DIR:-$MODELS_DIR/hohe-asr-amharic-${revision:0:7}}"
  echo "Fetching snapwre/hohe-asr-amharic@${revision:0:7} (about 2.4 GB the first time)…"
  link_files "$(fetch snapwre/hohe-asr-amharic "$revision" "*.json" "model.safetensors")" "$dir"

  # Fail now, not on the first recording, if transformers can't read it.
  "$VS_PYTHON" -I -c '
import sys, warnings
warnings.filterwarnings("ignore")
from transformers import AutoConfig, AutoProcessor
AutoProcessor.from_pretrained(sys.argv[1])
model_type = AutoConfig.from_pretrained(sys.argv[1]).model_type
sys.exit(0 if model_type == "wav2vec2-bert" else f"unexpected model type {model_type}")
' "$dir"
  echo "Hohe ready: $dir"
}

setup_buzzasr() {
  local revision=3002b3f5c907d2283255c0226398513b812cca49
  local dir="${BUZZASR_MODEL_DIR:-$MODELS_DIR/BuzzASR-amharic-${revision:0:7}}"
  local snapshot
  echo "Fetching BuzzASR/amharic@${revision:0:7} (about 3.1 GB the first time)…"
  snapshot=$(fetch BuzzASR/amharic "$revision")
  link_files "$snapshot" "$dir" generation_config.json
  "$VS_PYTHON" -I -c '
import json, sys
config = json.load(open(sys.argv[1], encoding="utf-8"))
config.pop("_from_model_config", None)
with open(sys.argv[2], "w", encoding="utf-8") as out:
    json.dump(config, out, indent=2)
    out.write("\n")
' "$snapshot/generation_config.json" "$dir/generation_config.json"

  "$VS_PYTHON" -I -c '
import sys, warnings
warnings.filterwarnings("ignore")
from transformers import GenerationConfig
config = GenerationConfig.from_pretrained(sys.argv[1])
missing = [key for key in ("no_timestamps_token_id", "lang_to_id") if not hasattr(config, key)]
sys.exit(f"generation config still missing {missing}" if missing else 0)
' "$dir"
  echo "BuzzASR ready: $dir"
}

case "${1:-all}" in
  all) setup_hohe && setup_buzzasr ;;
  hohe) setup_hohe ;;
  buzzasr) setup_buzzasr ;;
  *)
    echo "usage: $0 [all|hohe|buzzasr]" >&2
    exit 2
    ;;
esac
echo "Restart the app (npm run dev) if it is running, then pick the model in the sidebar."
