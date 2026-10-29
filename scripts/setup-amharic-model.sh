#!/usr/bin/env bash
# Set up offline Amharic speech for Nota: a private Python runtime, and the
# speech model(s), downloaded once. After this, Nota transcribes and
# dictates without a network connection. (Windows: setup-amharic-model.ps1.)
#
# usage: scripts/setup-amharic-model.sh [hohe|buzzasr|all]   (default: hohe)
#
#   hohe     snapwre/hohe-asr-amharic, wav2vec2-BERT + CTC (2.4 GB, CC BY 4.0).
#            Recommended: the more accurate and about ten times faster.
#   buzzasr  BuzzASR/amharic, a Whisper large-v3 fine-tune (3.1 GB, MIT)
#
# The runtime is a Python virtual environment in Nota's data folder, built
# from scripts/speech-requirements.txt (about 1 GB). It needs Python 3.10–3.13,
# or uv (https://docs.astral.sh/uv/), which can fetch a Python itself.
# Models download at pinned revisions into the Hugging Face cache and are
# linked into Nota's data folder by setup_models.py, which also checks they load.
#
# Nota runs this same script from its setup guide (with NOTA_DATA_DIR set).
#
# Overrides:
#   NOTA_DATA_DIR      Nota's data folder (default: the app's, per system)
#   NOTA_PYTHON        an existing Python that already has the requirements
#   HOHE_MODEL_DIR, BUZZASR_MODEL_DIR   where to put each model folder
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIREMENTS="$HERE/speech-requirements.txt"
# Apps opened from the Dock or a launcher get a minimal PATH; look where
# Homebrew, python.org and uv install too.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.cargo/bin"

default_data_dir() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    local support="$HOME/Library/Application Support"
    # Before the rename the folder was "Amharic Speech to Text"; Nota's first
    # launch moves it across (electron/lib/data-folder.ts).
    if [[ ! -d "$support/Nota" && -d "$support/Amharic Speech to Text" ]]; then
      echo "$support/Amharic Speech to Text"
    else
      echo "$support/Nota"
    fi
  else
    echo "${XDG_CONFIG_HOME:-$HOME/.config}/Nota"
  fi
}

DATA_DIR="${NOTA_DATA_DIR:-$(default_data_dir)}"
MODELS_DIR="$DATA_DIR/models"
RUNTIME="$DATA_DIR/python"

# A Python between 3.10 and 3.13 on this machine, or nothing.
find_python() {
  local candidate
  for candidate in python3.12 python3.11 python3.13 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1 &&
      "$candidate" -c 'import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)' 2>/dev/null; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

has_requirements() {
  "$1" -I -c 'import torch, transformers, huggingface_hub, numpy' >/dev/null 2>&1
}

install_requirements() {
  local python=$1
  # On Linux the default torch wheel bundles CUDA (several GB); Nota runs on the CPU there.
  local torch_index=()
  [[ "$(uname -s)" == "Linux" ]] && torch_index=(--extra-index-url https://download.pytorch.org/whl/cpu)
  if command -v uv >/dev/null 2>&1; then
    uv pip install --python "$python" ${torch_index[@]+"${torch_index[@]}"} -r "$REQUIREMENTS"
  else
    "$python" -m pip install --upgrade pip
    "$python" -m pip install ${torch_index[@]+"${torch_index[@]}"} -r "$REQUIREMENTS"
  fi
}

# The Python Nota runs the model with: NOTA_PYTHON, or a runtime of its own.
prepare_python() {
  if [[ -n "${NOTA_PYTHON:-}" ]]; then
    PYTHON="$NOTA_PYTHON"
    has_requirements "$PYTHON" || { echo "NOTA_PYTHON ($PYTHON) is missing torch, transformers or huggingface_hub." >&2; exit 1; }
    return
  fi
  PYTHON="$RUNTIME/bin/python"
  if [[ -x "$PYTHON" ]] && has_requirements "$PYTHON"; then
    echo "Speech runtime already installed: $RUNTIME"
    return
  fi
  echo "Creating Nota's speech runtime in $RUNTIME (about 1 GB, once)…"
  mkdir -p "$DATA_DIR"
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 "$RUNTIME"
  else
    local base
    if ! base=$(find_python); then
      cat >&2 <<'HELP'
Nota needs Python 3.10–3.13 (or uv) once, to set up offline speech.
  macOS:  brew install python@3.12      (or https://www.python.org/downloads/)
  Ubuntu: sudo apt install python3 python3-venv
  Or install uv, which brings its own Python: https://docs.astral.sh/uv/
Then run this again.
HELP
      exit 1
    fi
    "$base" -m venv "$RUNTIME"
  fi
  install_requirements "$PYTHON"
  has_requirements "$PYTHON" || { echo "The speech runtime didn't install cleanly; run this again." >&2; exit 1; }
}

choice="${1:-hohe}"
case "$choice" in
  all | hohe | buzzasr) ;;
  *)
    echo "usage: $0 [hohe|buzzasr|all]" >&2
    exit 2
    ;;
esac

prepare_python
models=("$choice")
[[ "$choice" == "all" ]] && models=(hohe buzzasr)
# Downloads, links into the models folder (no second copy) and checks each model.
"$PYTHON" -I "$HERE/setup_models.py" --link "$MODELS_DIR" "${models[@]}"
echo "Done. Speech now works offline. If Nota is open, it picks the model up within a few seconds."
