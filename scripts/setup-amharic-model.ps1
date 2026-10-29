# Set up offline Amharic speech for Nota on Windows: a private Python runtime,
# and the speech model(s), downloaded once. After this, Nota transcribes and
# dictates without a network connection. (macOS and Linux:
# setup-amharic-model.sh, which this mirrors.)
#
# usage: powershell -ExecutionPolicy Bypass -File setup-amharic-model.ps1 [hohe|buzzasr|all]
#
# Needs Python 3.10-3.13 (the python.org installer, with the "py" launcher)
# or uv (https://docs.astral.sh/uv/), which fetches a Python itself.
#
# Overrides: NOTA_DATA_DIR (Nota's data folder, default %APPDATA%\Nota),
# NOTA_PYTHON (an existing Python that already has the requirements),
# HOHE_MODEL_DIR, BUZZASR_MODEL_DIR.
param([ValidateSet("hohe", "buzzasr", "all")][string]$Choice = "hohe")

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$requirements = Join-Path $here "speech-requirements.txt"
$dataDir = if ($env:NOTA_DATA_DIR) { $env:NOTA_DATA_DIR } else { Join-Path $env:APPDATA "Nota" }
$modelsDir = Join-Path $dataDir "models"
$runtime = Join-Path $dataDir "python"

function Test-Requirements([string]$python) {
  & $python -I -c "import torch, transformers, huggingface_hub, numpy" 2>$null
  return $LASTEXITCODE -eq 0
}

# A Python between 3.10 and 3.13: the py launcher's, or python on PATH.
function Find-Python {
  $check = "import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)"
  foreach ($version in @("3.12", "3.11", "3.13", "3.10")) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
      $path = & py "-$version" -c "import sys; print(sys.executable)" 2>$null
      if ($LASTEXITCODE -eq 0 -and $path) { return $path.Trim() }
    }
  }
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    & $python.Source -c $check 2>$null
    if ($LASTEXITCODE -eq 0) { return $python.Source }
  }
  return $null
}

function Invoke-Checked([string]$program, [string[]]$arguments) {
  & $program @arguments
  if ($LASTEXITCODE -ne 0) { throw "$program failed (exit $LASTEXITCODE)" }
}

if ($env:NOTA_PYTHON) {
  $python = $env:NOTA_PYTHON
  if (-not (Test-Requirements $python)) { throw "NOTA_PYTHON ($python) is missing torch, transformers or huggingface_hub." }
} else {
  $python = Join-Path $runtime "Scripts\python.exe"
  if ((Test-Path $python) -and (Test-Requirements $python)) {
    Write-Output "Speech runtime already installed: $runtime"
  } else {
    Write-Output "Creating Nota's speech runtime in $runtime (about 1 GB, once)..."
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
    if (Get-Command uv -ErrorAction SilentlyContinue) {
      Invoke-Checked uv @("venv", "--python", "3.12", $runtime)
      Invoke-Checked uv @("pip", "install", "--python", $python, "-r", $requirements)
    } else {
      $base = Find-Python
      if (-not $base) {
        Write-Error ("Nota needs Python 3.10-3.13 (or uv) once, to set up offline speech.`n" +
          "  Install Python from https://www.python.org/downloads/ (tick 'Add python.exe to PATH'),`n" +
          "  or uv: powershell -c `"irm https://astral.sh/uv/install.ps1 | iex`"`n" +
          "Then run this again.")
        exit 1
      }
      Invoke-Checked $base @("-m", "venv", $runtime)
      Invoke-Checked $python @("-m", "pip", "install", "--upgrade", "pip")
      # PyTorch's Windows wheels on PyPI are CPU builds already.
      Invoke-Checked $python @("-m", "pip", "install", "-r", $requirements)
    }
    if (-not (Test-Requirements $python)) { throw "The speech runtime didn't install cleanly; run this again." }
  }
}

$models = if ($Choice -eq "all") { @("hohe", "buzzasr") } else { @($Choice) }
# Copies the model files into Nota's data folder: symlinks need extra rights on Windows.
Invoke-Checked $python (@("-I", (Join-Path $here "setup_models.py"), $modelsDir) + $models)
Write-Output "Done. Speech now works offline. If Nota is open, it picks the model up within a few seconds."
