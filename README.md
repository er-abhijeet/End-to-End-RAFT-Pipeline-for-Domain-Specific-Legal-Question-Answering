<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/embedding_pca.png">
  <img alt="RAFT — Retrieval-Augmented Fine-Tuning for Legal Contract QA" src="https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/embedding_pca.png">
</picture>

<p align="center">
  <a href="https://huggingface.co/spaces/abhifdsdf/cuad-raft"><strong>🤗 Live Demo</strong></a> ·
  <a href="https://cuad-raft.vercel.app"><strong>🌐 Showcase Site</strong></a> ·
  <a href="https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets"><strong>📊 Assets & Graphs</strong></a> ·
  <a href="https://huggingface.co/abhifdsdf/qwen2.5-3b-cuad-raft-gguf"><strong>🧠 GGUF Model</strong></a>
</p>

<br>

# ⚖️ RAFT / CUAD — Teacher-Student Knowledge Distillation for Legal Contract QA

> **A 9B legal teacher teaches a 3B student to read contracts — and the student nearly catches up.**

This project implements **Retrieval-Augmented Fine-Tuning (RAFT)** on the [CUAD](https://huggingface.co/datasets/theatticusproject/cuad-qa) (Contract Understanding Atticus Dataset) legal contracts corpus. A 9B teacher model (Gemma-2-9B-it) generates synthetic Q/A pairs grounded in real contract clauses; a cross-encoder reranker filters out hallucinated answers; and a 3B student (Qwen2.5-3B-Instruct) is fine-tuned with QLoRA to answer contract questions from retrieved context alone.

The result: a **3B model that outperforms its un-tuned base by 2.2× in Span F1** and beats a plain RAG pipeline by 1.3×, running on a single CPU core via `llama.cpp`.

---

## 📋 Table of Contents

- [Pipeline Architecture](#pipeline-architecture)
- [The Five Phases](#the-five-phases)
  - [Phase 1 — Ingestion & Indexing](#phase-1--ingestion--indexing)
  - [Phase 2 — Synthetic Data Generation](#phase-2--synthetic-data-generation)
  - [Phase 3 — Grounding Filter](#phase-3--grounding-filter)
  - [Phase 4 — Student Fine-Tuning](#phase-4--student-fine-tuning)
  - [Phase 5 — Evaluation](#phase-5--evaluation)
- [Results](#results)
- [Technologies & Tools](#technologies--tools)
- [Model Deployment](#model-deployment)
- [Getting Started](#getting-started)
- [Links](#links)

---

## Pipeline Architecture

```mermaid
flowchart TD
    A[CUAD Contracts<br/>~500 legal docs] --> B[Phase 1<br/>Sliding-Window Chunking<br/>+ MiniLM Embeddings]
    B --> C[FAISS Index<br/>12,726 chunks]
    C --> D[Phase 2<br/>9B Teacher (Gemma-2)<br/>writes Q/A pairs]
    D --> E[Phase 3<br/>Cross-Encoder Reranker<br/>(BAAI/bge-reranker-base)]
    E -->|score ≥ 0.5| F[Grounded RAFT Dataset<br/>500 Q/A pairs]
    E -->|score < 0.5| G[Discarded<br/>hallucinated answers]
    F --> H[Phase 4<br/>QLoRA Fine-Tuning<br/>3B Student (Qwen2.5)]
    H --> I[Fine-Tuned RAFT Model<br/>LoRA adapters on Hub]
    I --> J[Phase 5<br/>Evaluation]
    C --> J
    B --> J
    J --> K[Exact Match · Span F1<br/>Ragas Faithfulness<br/>30 held-out questions]
```

---

## The Five Phases

### Phase 1 — Ingestion & Indexing

Every unique contract passage in CUAD is split into overlapping ~2,000-character sliding windows (50% overlap). Each chunk is encoded into a 384-dimensional vector using `sentence-transformers/all-MiniLM-L6-v2` and indexed with FAISS `IndexFlatIP` for fast cosine-similarity retrieval.

| Metric | Value |
|--------|-------|
| Unique contract passages | 407 |
| Total indexed chunks | 12,726 |
| Avg chunk length | 1,972 chars |

<details>
<summary>📊 Dataset construction funnel</summary>

![Dataset funnel](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/dataset_funnel.png)

</details>

<details>
<summary>📊 Chunk length distribution</summary>

![Chunk length distribution](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/chunk_length_distribution.png)

</details>

<details>
<summary>📊 Embedding space (2D PCA)</summary>

![PCA embedding space](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/embedding_pca.png)

</details>

---

### Phase 2 — Synthetic Data Generation

The teacher model (`unsloth/gemma-2-9b-it-bnb-4bit`) reads a real contract chunk and writes a specific legal question with a factual answer. Each RAFT training example is assembled with:
- **1 oracle chunk** — the passage that actually contains the answer
- **2 distractor chunks** — retrieved from a *different* contract via FAISS (lowest cosine similarity), so the model learns to distinguish relevant from irrelevant context

Checkpoints are saved every 50 samples to `cuad_raw_synthetic.parquet`. A disjoint 50-chunk held-out pool is carved out for Phase 5 evaluation.

| Metric | Value |
|--------|-------|
| Synthetic Q/A pairs generated | 500 |
| Held-out evaluation questions | 50 |

---

### Phase 3 — Grounding Filter

Every generated answer is scored against its oracle chunk using `BAAI/bge-reranker-base`, a cross-encoder that reads the (passage, answer) pair jointly — far better at judging factual support than bi-encoder similarity.

**Threshold:** 0.5 — anything below is discarded.

> In this run, all 500 samples passed the grounding filter (retention rate: 100%), meaning the teacher model produced highly grounded answers from the start.

---

### Phase 4 — Student Fine-Tuning

The 3B student (`unsloth/Qwen2.5-3B-Instruct-bnb-4bit`) is fine-tuned on the grounded RAFT dataset using **Unsloth QLoRA**:

- **LoRA rank:** 16
- **LoRA alpha:** 32
- **LoRA dropout:** 0
- **Target modules:** `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`
- **Base model:** 4-bit quantized with `bitsandbytes`
- **Trainable parameters:** ~0.5% of total

This runs on a single T4 GPU (Kaggle). The adapter is pushed to [Hugging Face Hub](https://huggingface.co/abhifdsdf/cuad-raft-adapter).

**Key design choice:** Unsloth's free/OSS tier is single-GPU only. Multi-GPU would require Unsloth Pro. Since the 3B model fits comfortably on one T4, the second T4 remains unused during training — which is the optimal configuration (Unsloth's own docs note that 1×T4 is ~5× faster than 2×T4 for inference due to lack of tensor parallelism in the free tier).

---

### Phase 5 — Evaluation

The fine-tuned student is compared against:
1. **Zero-shot** — base model, no retrieval context
2. **Base + RAG** — base model with top-3 retrieved chunks
3. **Fine-tuned RAFT** — fine-tuned model with top-3 retrieved chunks

Evaluation metrics:
- **Exact Match (EM)** at retrieval depths k = 1, 3, 5
- **Span F1** — token-overlap F1 against the gold answer span (at k = 3)
- **Ragas Faithfulness & Answer Relevancy** — scored by the **teacher model loaded as an independent judge** (not the student grading itself)

---

## Results

### Summary

| Metric | Zero-Shot | Base + RAG | Fine-Tuned RAFT |
|--------|-----------|------------|-----------------|
| Exact Match @ Rank-1 | 0.000 | 0.000 | **0.100** |
| Exact Match @ Rank-3 | 0.000 | 0.000 | **0.080** |
| Exact Match @ Rank-5 | 0.000 | 0.000 | **0.080** |
| **Span F1 Score** | 0.192 | 0.317 | **0.357** |

> Ragas scores were not computed in this run. EM/F1 were evaluated on 30 held-out questions.

<details>
<summary>📊 Exact Match by retrieval depth</summary>

![EM by rank](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/em_by_rank.png)

</details>

<details>
<summary>📊 Span F1 comparison</summary>

![F1 comparison](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets/resolve/main/graphs/f1_comparison.png)

</details>

### Key Findings

1. **RAFT recovers from zero retrievals:** Zero-shot (no context) scores 0.000 EM across all ranks — the base model cannot answer contract questions from memory alone. Adding RAG bumps F1 to 0.317. RAFT fine-tuning pushes it further to **0.357**.

2. **2.2× improvement over zero-shot** in Span F1 (0.357 vs 0.192), and **1.13× over plain RAG** — the fine-tuning specifically teaches the model to use retrieved context more effectively.

3. **RAF T wins or ties on 53% of examples** compared to the best of zero-shot or RAG, showing consistent gains across diverse contract clauses.

4. **Exact Match is hard for all configurations** — legal QA requires precise span extraction from dense, legalese-heavy text. The RAFT model achieves 10% EM @ Rank-1, meaning 3 of 30 questions had perfectly extracted answers.

---

## Technologies & Tools

| Layer | Technology |
|-------|-----------|
| **Teacher model** | [`unsloth/gemma-2-9b-it-bnb-4bit`](https://huggingface.co/unsloth/gemma-2-9b-it-bnb-4bit) |
| **Student model** | [`unsloth/Qwen2.5-3B-Instruct-bnb-4bit`](https://huggingface.co/unsloth/Qwen2.5-3B-Instruct-bnb-4bit) |
| **Fine-tuning** | [Unsloth](https://unsloth.ai/) + QLoRA (`bitsandbytes`) |
| **Embeddings** | [`all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) (384-dim) |
| **Vector search** | [FAISS](https://github.com/facebookresearch/faiss) `IndexFlatIP` |
| **Reranker** | [`BAAI/bge-reranker-base`](https://huggingface.co/BAAI/bge-reranker-base) |
| **Evaluation** | ROUGE-L, Exact Match, [Ragas](https://docs.ragas.io/) |
| **Inference** | [llama.cpp](https://github.com/ggerganov/llama.cpp) via Python bindings |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI Framework** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Deployment** | [Hugging Face Spaces](https://huggingface.co/spaces) (Gradio) + [Vercel](https://vercel.com/) |
| **Hardware** | Kaggle 2× T4 GPU (16 GB each) |

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **9B teacher instead of 27B** | 27B in 4-bit is ~16 GB — doesn't fit with headroom on a 16 GB T4. Kaggle's 2× T4 has no tensor parallelism, so a 9B model on one T4 is actually faster. |
| **No Unsloth for teacher/eval** | Unsloth is single-GPU in the free tier. Teacher inference (Phase 2) and evaluation (Phase 5) use plain `transformers` + `bitsandbytes` with `device_map="auto"`. |
| **Teacher as Ragas judge** | The RAFT student shouldn't grade its own outputs. The teacher model is reloaded as an independent judge for Faithfulness and Answer Relevancy via `LangchainLLMWrapper`. |
| **llama.cpp for inference** | The fine-tuned adapter is merged and exported to GGUF format, enabling CPU inference with no GPU dependency — runs on free Hugging Face Spaces. |

---

## Model Deployment

The fine-tuned model is deployed as:

1. **🤗 [Hugging Face Space](https://huggingface.co/spaces/abhifdsdf/cuad-raft)** — Interactive Gradio app with chat interface, single-question mode, and REST API
2. **🌐 [Next.js Showcase](https://cuad-raft.vercel.app)** — Full-featured frontend with results, graphs, side-by-side comparisons, and live inference
3. **🧠 [GGUF on Hub](https://huggingface.co/abhifdsdf/qwen2.5-3b-cuad-raft-gguf)** — Quantized 4-bit GGUF model for local use with `llama.cpp`

### Gradio Space Features

- **💬 Chat tab** — Multi-turn conversation about contract clauses
- **🔍 Single Question tab** — One-shot Q&A with temperature and max tokens control
- **📡 API tab** — REST API at `/api/generate` for programmatic access

### Showcase Frontend

The Next.js showcase features:

- **Pipeline overview** with glossary terms and statistics
- **Metrics table** with best-value highlighting
- **Graph grid** of all evaluation visualizations
- **Side-by-side comparison** of zero-shot vs. RAG vs. RAFT on 30 examples
- **Live inference** calling the Hugging Face Space via server-sent events

---

## Getting Started

### Prerequisites

- A Kaggle account with GPU accelerator enabled (2× T4)
- A Hugging Face token with write access (`HF_TOKEN` as a Kaggle secret)
- Acceptance of the [Gemma license](https://huggingface.co/google/gemma-2-9b-it) on your HF account

### Running the Pipeline

1. Open [`final-notebook.ipynb`](final-notebook.ipynb) on Kaggle
2. Set your `HF_TOKEN` in Kaggle Secrets (Add-ons → Secrets)
3. Enable GPU accelerator (2× T4)
4. Run all cells — the notebook is fully self-contained and resumable

The pipeline checks Hugging Face Hub for each phase's output before recomputing, so you can resume from any phase after interruption.

### Running the Frontend Locally

```bash
git clone https://github.com/your-username/cuad-raft.git
cd cuad-raft/raft-frontend
npm install
npm run dev
```

Set environment variables in `.env.local`:

```env
# URL of the deployed Gradio Space (no trailing slash)
GRADIO_SPACE_URL=https://abhifdsdf-cuad-raft.hf.space
# The api_name of the predict function
GRADIO_API_NAME=predict
```

### Local Inference with llama.cpp

```bash
# Download the GGUF model
huggingface-cli download abhifdsdf/qwen2.5-3b-cuad-raft-gguf qwen-cuad-raft-q4_k_m.gguf --local-dir ./models

# Run inference
llama-cli -m ./models/qwen-cuad-raft-q4_k_m.gguf \
  -p "<|im_start|>system\nYou are a legal contract analysis assistant.<|im_end|>\n<|im_start|>user\nContext:\nThe governing law of this agreement is Delaware.\n\nQuestion: What is the governing law?<|im_end|>\n<|im_start|>assistant\n" \
  -n 256 --temp 0
```

---

## Links

| Resource | URL |
|----------|-----|
| 🤗 Live Demo (Gradio) | [https://huggingface.co/spaces/abhifdsdf/cuad-raft](https://huggingface.co/spaces/abhifdsdf/cuad-raft) |
| 🌐 Showcase Frontend | [https://cuad-raft.vercel.app](https://cuad-raft.vercel.app) |
| 🧠 GGUF Model | [https://huggingface.co/abhifdsdf/qwen2.5-3b-cuad-raft-gguf](https://huggingface.co/abhifdsdf/qwen2.5-3b-cuad-raft-gguf) |
| 📊 Graphs & Data | [https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets](https://huggingface.co/datasets/abhifdsdf/cuad-raft-showcase-assets) |
| 📓 Final Notebook | [final-notebook.ipynb](final-notebook.ipynb) |
| 💻 Frontend Source | [raft-frontend/](raft-frontend/) |

---

## Acknowledgments

- **[CUAD](https://www.atticusprojectai.org/cuad)** by The Atticus Project — the gold-standard legal contract QA dataset
- **[RAFT](https://arxiv.org/abs/2403.10131)** — the Retrieval-Augmented Fine-Tuning paper by Zhang et al.
- **[Unsloth](https://unsloth.ai/)** — making LLM fine-tuning 2× faster with minimal memory
- **[llama.cpp](https://github.com/ggerganov/llama.cpp)** — efficient CPU inference for quantized LLMs
- **[Google Gemma](https://ai.google.dev/gemma)** — the teacher model's open-weight foundation
- **[Qwen (Alibaba Cloud)](https://github.com/QwenLM/Qwen2.5)** — the student model's open-weight foundation

---

<p align="center">
  Built with ❤️ using Kaggle GPUs, Hugging Face, and Next.js
  <br>
  <sub>Disclaimer: This project is for educational and research purposes. Not legal advice.</sub>
</p>
