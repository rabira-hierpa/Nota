#!/usr/bin/env bash
# Build the speech models Nota ships inside the app into models/: Hohe and the
# punctuation model as 8-bit ONNX files (about 840 MB together), from the
# published models at pinned revisions. Packaging (npm run package:*) needs them.
#
# usage: scripts/build-speech-models.sh [--fixtures]
#
#   --fixtures        also rewrite electron/speech/fixtures from scripts/speech-samples.txt
#   --fixtures-only   only that, from the models already in models/
#   --notices-only    only rewrite models/NOTICE and the licence texts (from
#                     licenses/models/) and the manifest; any Python 3 will do
#
# Downloads about 3.5 GB once (the Hugging Face cache) and needs about 10 GB of
# memory for a few minutes. The build runtime is a Python virtual environment
# in .cache/speech-build, from scripts/speech-build-requirements.txt; it needs
# Python 3.10–3.13, or uv (https://docs.astral.sh/uv/).
#
# Overrides:
#   NOTA_BUILD_PYTHON   a Python that already has the requirements
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
VENV="$ROOT/.cache/speech-build"
REQUIREMENTS="$HERE/speech-build-requirements.txt"

if [[ "${1:-}" == "--notices-only" ]]; then
  exec "${NOTA_BUILD_PYTHON:-python3}" -I "$HERE/build_speech_models.py" "$ROOT/models" --notices-only
fi

if [[ -n "${NOTA_BUILD_PYTHON:-}" ]]; then
  PYTHON="$NOTA_BUILD_PYTHON"
else
  PYTHON="$VENV/bin/python"
  if [[ ! -x "$PYTHON" ]]; then
    if command -v uv >/dev/null 2>&1; then
      uv venv --python 3.12 "$VENV"
    else
      python3 -m venv "$VENV"
    fi
  fi
  # Linux: the CPU build of torch; the default wheel bundles CUDA (several GB).
  torch_index=()
  [[ "$(uname -s)" == "Linux" ]] && torch_index=(--extra-index-url https://download.pytorch.org/whl/cpu)
  if command -v uv >/dev/null 2>&1; then
    uv pip install --quiet --python "$PYTHON" ${torch_index[@]+"${torch_index[@]}"} -r "$REQUIREMENTS"
  else
    "$PYTHON" -m pip install --quiet ${torch_index[@]+"${torch_index[@]}"} -r "$REQUIREMENTS"
  fi
fi

args=("$ROOT/models")
case "${1:-}" in
  --fixtures) args+=(--fixtures "$ROOT/electron/speech/fixtures" --samples "$HERE/speech-samples.txt") ;;
  --fixtures-only) args+=(--fixtures-only --fixtures "$ROOT/electron/speech/fixtures" --samples "$HERE/speech-samples.txt") ;;
esac
"$PYTHON" -I "$HERE/build_speech_models.py" "${args[@]}"
