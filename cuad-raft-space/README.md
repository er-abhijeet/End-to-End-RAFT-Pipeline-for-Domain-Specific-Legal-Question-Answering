---
title: CUAD RAFT — Legal Contract Q&A
emoji: ⚖️
colorFrom: indigo
colorTo: blue
sdk: gradio
app_file: app.py
pinned: false
license: apache-2.0
---

# ⚖️ CUAD RAFT — Legal Contract Q&A

Fine-tuned **Qwen2.5-3B** via RAFT (Retrieval-Augmented Fine-Tuning) on CUAD legal contracts.

## How to Deploy

### 1. Create a new HF Space

Go to https://huggingface.co/new-space and fill:

- **Space Name:** `cuad-raft-demo` (or any name)
- **License:** Apache-2.0
- **Space SDK:** Gradio
- **Hardware:** Free CPU (2 vCPU · 16GB · 30m sleep) — sufficient for the Q4_K_M GGUF (~2GB)

### 2. Upload files

Push these 3 files to the Space:

```bash
# Clone the empty space (use your own space name)
git clone https://huggingface.co/spaces/YOUR_USERNAME/cuad-raft-demo
cd cuad-raft-demo

# Copy files from this repo
cp path/to/app.py .
cp path/to/requirements.txt .
cp path/to/README.md .

git add .
git commit -m "Initial deploy: CUAD RAFT GGUF demo"
git push
```

### 3. Set model cache (optional)

Add a Space Secret (Settings → Repository Secrets):

```
MODEL_CACHE_DIR = /data/.cache
```

This keeps the 2GB GGUF cached across restarts instead of re-downloading.

### 4. Wait for build (~5 min)

The Space builds on first push. `llama-cpp-python` compiles C++ code, so this takes longer on the first push. Subsequent pushes are instant.

## API Usage

Once deployed, the API is at:

```
POST https://YOUR-SPACE.hf.space/api/generate
Content-Type: application/json

{
  "question": "What is the governing law?",
  "context": "This agreement shall be governed by the laws of Delaware.",
  "temperature": 0.0,
  "max_tokens": 256
}
```

Response:

```json
{
  "answer": "Delaware law.",
  "latency_seconds": 2.34
}
```

## Files

| File | Purpose |
|------|---------|
| `app.py` | Gradio UI + FastAPI /api/generate endpoint |
| `requirements.txt` | Python dependencies |
| `README.md` | This file (HF Space metadata) |

## Model

- **GGUF:** `abhifdsdf/qwen2.5-3b-cuad-raft-gguf`
- **Format:** Q4_K_M (~2GB, fits 16GB RAM)
- **Base:** Qwen2.5-3B-Instruct
- **Fine-tuned via:** RAFT on CUAD dataset
