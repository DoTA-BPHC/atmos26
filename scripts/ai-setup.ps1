# Sets up the local asset-generation toolkit on the external drive.
# Everything (venv, pip cache, HF cache, ComfyUI, weights) lives under D:\atmos-ai
# because C: is nearly full. Safe to re-run: downloads resume and finished steps are skipped.

$ErrorActionPreference = 'Continue'  # native tools write progress to stderr; failures are checked via $LASTEXITCODE
$Root = 'D:\atmos-ai'
$env:PIP_CACHE_DIR = "$Root\pip-cache"
$env:PIP_DEFAULT_TIMEOUT = "60"; $env:PIP_RETRIES = "8"
$env:HF_HOME = "$Root\hf-cache"
$env:TORCH_HOME = "$Root\torch-cache"
$env:TEMP = "$Root\tmp"; $env:TMP = "$Root\tmp"
New-Item -ItemType Directory -Force $Root, "$Root\tmp", "$Root\models" | Out-Null

function Step($msg) { Write-Output "`n=== $msg ($(Get-Date -Format HH:mm:ss))" }

# --- ComfyUI (git checkout, shares the venv below) ---
if (-not (Test-Path "$Root\ComfyUI")) {
  Step 'clone ComfyUI'
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI "$Root\ComfyUI"
}
if (-not (Test-Path "$Root\ComfyUI\custom_nodes\ComfyUI-GGUF")) {
  Step 'clone ComfyUI-GGUF'
  git clone --depth 1 https://github.com/city96/ComfyUI-GGUF "$Root\ComfyUI\custom_nodes\ComfyUI-GGUF"
}

# --- Python venv ---
$Py = "$Root\venv\Scripts\python.exe"
if (-not (Test-Path $Py)) {
  Step 'create venv'
  python -m venv "$Root\venv"
}
Step 'pip install torch (cu124)'
& $Py -m pip install --upgrade pip
& $Py -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
Step 'pip install ComfyUI + tooling requirements'
& $Py -m pip install -r "$Root\ComfyUI\requirements.txt"
& $Py -m pip install -r "$Root\ComfyUI\custom_nodes\ComfyUI-GGUF\requirements.txt"
& $Py -m pip install "huggingface_hub[cli]" transformers timm kornia einops opencv-python pillow scipy

# --- Weights ---
$M = "$Root\ComfyUI\models"
function Get-HF($repo, $file, $dest) {
  $out = Join-Path $dest (Split-Path $file -Leaf)
  if (Test-Path $out) { Write-Output "have $out"; return }
  New-Item -ItemType Directory -Force $dest | Out-Null
  Step "download $repo/$file"
  curl.exe -L --fail --retry 5 -C - -o "$out.part" "https://huggingface.co/$repo/resolve/main/$file"
  if ($LASTEXITCODE -ne 0) { throw "download failed: $repo/$file" }
  Move-Item "$out.part" $out
}

# segmentation / fill / depth (used from plain Python scripts)
# SAM 2.1 is loaded through transformers (facebook/sam2.1-hiera-large into HF_HOME), see scripts/logo-layers.py
Get-HF 'fashn-ai/LaMa' 'big-lama.pt' "$Root\models\lama"
Get-HF 'depth-anything/Depth-Anything-V2-Large' 'depth_anything_v2_vitl.pth' "$Root\models\depth-anything"
Step 'snapshot BiRefNet (needs its remote code)'
& "$Root\venv\Scripts\hf.exe" download ZhengPeng7/BiRefNet --local-dir "$Root\models\birefnet"

# FLUX.1 Kontext [dev] (instruction edits) for ComfyUI
Get-HF 'QuantStack/FLUX.1-Kontext-dev-GGUF' 'flux1-kontext-dev-Q5_K_M.gguf' "$M\unet"
Get-HF 'comfyanonymous/flux_text_encoders' 't5xxl_fp8_e4m3fn.safetensors' "$M\text_encoders"
Get-HF 'comfyanonymous/flux_text_encoders' 'clip_l.safetensors' "$M\text_encoders"
Get-HF 'Comfy-Org/Lumina_Image_2.0_Repackaged' 'split_files/vae/ae.safetensors' "$M\vae"

# Wan 2.2 TI2V-5B (video loops) for ComfyUI
Get-HF 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged' 'split_files/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors' "$M\diffusion_models"
Get-HF 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged' 'split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors' "$M\text_encoders"
Get-HF 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged' 'split_files/vae/wan2.2_vae.safetensors' "$M\vae"

Step 'done'
