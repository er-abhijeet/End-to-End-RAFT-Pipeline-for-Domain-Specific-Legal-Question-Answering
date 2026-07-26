import os, time, json, gc, threading
import gradio as gr
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

MODEL_REPO = "abhifdsdf/qwen2.5-3b-cuad-raft-gguf"
MODEL_FILE = "qwen-cuad-raft-q4_k_m.gguf"
MODEL_CACHE = os.environ.get("MODEL_CACHE_DIR", "/tmp/model-cache")
os.makedirs(MODEL_CACHE, exist_ok=True)

model_path = hf_hub_download(
    repo_id=MODEL_REPO, filename=MODEL_FILE, repo_type="model", cache_dir=MODEL_CACHE
)

llm = None
llm_lock = threading.Lock()
MODEL_N_CTX = int(os.environ.get("MODEL_N_CTX", "2048"))
MODEL_N_THREADS = int(os.environ.get("MODEL_N_THREADS", "4"))
MAX_NEW_TOKENS = int(os.environ.get("MAX_NEW_TOKENS", "512"))


def get_llm():
    global llm
    if llm is None:
        with llm_lock:
            if llm is None:
                llm = Llama(
                    model_path=model_path,
                    n_ctx=MODEL_N_CTX,
                    n_threads=MODEL_N_THREADS,
                    n_gpu_layers=0,
                    verbose=False,
                )
    return llm


SYSTEM_PROMPT = (
    "You are a legal contract analysis assistant trained on CUAD "
    "(Contract Understanding Atticus Dataset). Answer concisely and "
    "factually based only on the provided context."
)


def format_messages(messages):
    parts = []
    for m in messages:
        if m["role"] == "system":
            parts.append(f"<|im_start|>system\n{m['content']}<|im_end|>")
        elif m["role"] == "user":
            parts.append(f"<|im_start|>user\n{m['content']}<|im_end|>")
        elif m["role"] == "assistant":
            parts.append(f"<|im_start|>assistant\n{m['content']}<|im_end|>")
    parts.append("<|im_start|>assistant\n")
    return "\n".join(parts)


def generate(
    question,
    context,
    temperature=0.0,
    max_new_tokens=None,
    top_p=0.95,
):
    model = get_llm()
    if context and context.strip():
        user_content = (
            f"Context:\n{context}\n\nQuestion: {question}\n"
            "Answer concisely and factually based only on the context."
        )
    else:
        user_content = f"Question: {question}\nAnswer concisely and factually."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.append({"role": "user", "content": user_content})
    prompt = format_messages(messages)
    mt = max_new_tokens or MAX_NEW_TOKENS

    start = time.time()
    tokens = []
    for token in model(prompt, max_tokens=mt, temperature=temperature, top_p=top_p, stream=True):
        chunk = token["choices"][0].get("text", "")
        tokens.append(chunk)
        yield "".join(tokens), time.time() - start


def chat_fn(message, history):
    context = ""
    history_text = ""
    for turn in history:
        history_text += f"User: {turn[0]}\nAssistant: {turn[1]}\n"
    if history_text:
        context = f"Previous conversation:\n{history_text}\n"

    full_response = ""
    for response_chunk, elapsed in generate(
        question=message, context=context, temperature=0.1
    ):
        full_response = response_chunk
    return full_response


def answer_question(question, context, temperature, max_tokens):
    full = ""
    for chunk, elapsed in generate(
        question=question,
        context=context,
        temperature=temperature,
        max_new_tokens=int(max_tokens),
    ):
        full = chunk
    return full, f"{elapsed:.2f}s"


with gr.Blocks(
    title="CUAD RAFT - Legal Contract Q&A",
    theme=gr.themes.Soft(),
    css="""
    .container { max-width: 900px; margin: auto; }
    footer { display: none !important; }
    """,
) as demo:
    gr.Markdown(
        """
    # ⚖️ CUAD RAFT — Legal Contract Q&A

    Fine-tuned **Qwen2.5-3B** via RAFT (Retrieval-Augmented Fine-Tuning) on CUAD legal contracts.
    Asks a question about a contract clause and get a precise answer.
    """
    )

    with gr.Tab("💬 Chat"):
        gr.ChatInterface(
            chat_fn,
            title="Chat with your contract assistant",
            description="Ask anything about contract clauses, legal terms, or obligations.",
        )

    with gr.Tab("🔍 Single Question"):
        with gr.Row():
            with gr.Column(scale=1):
                question_input = gr.Textbox(
                    label="Question",
                    placeholder="e.g. What is the governing law?",
                    lines=2,
                )
                context_input = gr.Textbox(
                    label="Contract Context (optional)",
                    placeholder="Paste relevant contract text here...",
                    lines=6,
                )
                with gr.Row():
                    temperature = gr.Slider(0.0, 1.0, value=0.0, step=0.05, label="Temperature")
                    max_tokens = gr.Slider(64, 1024, value=256, step=32, label="Max Tokens")
                submit_btn = gr.Button("Generate", variant="primary")

            with gr.Column(scale=1):
                answer_output = gr.Textbox(label="Answer", lines=6, interactive=False)
                latency_output = gr.Textbox(label="Latency", lines=1, interactive=False)

        submit_btn.click(
            fn=answer_question,
            inputs=[question_input, context_input, temperature, max_tokens],
            outputs=[answer_output, latency_output],
        )

    with gr.Tab("📡 API"):
        gr.Markdown(
            """
        ## API Endpoint

        The same model is available via POST at `/api/generate`.

        **Request:**
        ```json
        {
          "question": "What is the governing law?",
          "context": "This agreement shall be governed by the laws of Delaware.",
          "temperature": 0.0,
          "max_tokens": 256
        }
        ```

        **Response:**
        ```json
        {
          "answer": "Delaware law.",
          "latency_seconds": 2.34
        }
        ```

        **cURL example:**
        ```bash
        curl -X POST https://YOUR-SPACE.hf.space/api/generate \\
          -H "Content-Type: application/json" \\
          -d '{"question": "What is the governing law?", "context": "This agreement shall be governed by the laws of Delaware."}'
        ```
        """
        )

    gr.Markdown(
        """
    ---
    Built with ❤️ using [llama.cpp](https://github.com/ggerganov/llama.cpp) +
    [Gradio](https://gradio.app) | Model: [`abhifdsdf/qwen2.5-3b-cuad-raft-gguf`](https://huggingface.co/abhifdsdf/qwen2.5-3b-cuad-raft-gguf)
    """
    )


# --- FastAPI mount for external API ---
from fastapi import FastAPI
from pydantic import BaseModel

api_app = FastAPI()


class GenerateRequest(BaseModel):
    question: str
    context: str = ""
    temperature: float = 0.0
    max_tokens: int = 256


class GenerateResponse(BaseModel):
    answer: str
    latency_seconds: float


@api_app.post("/api/generate", response_model=GenerateResponse)
def api_generate(req: GenerateRequest):
    full = ""
    start = time.time()
    for chunk, _ in generate(
        question=req.question,
        context=req.context,
        temperature=req.temperature,
        max_new_tokens=req.max_tokens,
    ):
        full = chunk
    return GenerateResponse(answer=full, latency_seconds=round(time.time() - start, 2))


demo.app.mount("/api", api_app)


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
