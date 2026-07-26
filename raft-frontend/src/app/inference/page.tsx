"use client";

import ClauseHeading from "@/components/ClauseHeading";
import { useState } from "react";

const SAMPLE_QUESTIONS = [
  {
    question: "What is the governing law of this agreement?",
    context: "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws principles.",
  },
  {
    question: "What is the term of this agreement?",
    context: "This Agreement shall commence on the Effective Date and shall continue for a period of three (3) years, unless earlier terminated in accordance with Section 8.",
  },
];

export default function InferencePage() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(("Looks like the HF Inference Space is Down. " + json.error )|| "Something went wrong.");
      } else {
        setAnswer(String(json.answer ?? ""));
      }
    } catch {
      setError("Could not reach the inference API.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample(i: number) {
    setQuestion(SAMPLE_QUESTIONS[i].question);
    setContext(SAMPLE_QUESTIONS[i].context);
    setAnswer(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <ClauseHeading number="I" kicker="Signature block" title="Run the fine-tuned RAFT model" />
      <p className="mb-8 max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
        This calls the fine-tuned student model live, hosted as a Gradio Space. Paste a contract
        clause as context, ask a question about it, and the model answers from that context alone
        — the same way it was trained.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {SAMPLE_QUESTIONS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => loadSample(i)}
            className="rounded-sm border border-[var(--color-grid)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-text)]"
          >
            Load example {i + 1}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="context"
            className="mb-2 block font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]"
          >
            Contract context
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={6}
            placeholder="Paste a clause or contract excerpt here…"
            className="w-full rounded-sm border border-[var(--color-grid)] bg-[var(--color-ink-2)] p-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-gold)]"
          />
        </div>
        <div>
          <label
            htmlFor="question"
            className="mb-2 block font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]"
          >
            Question
          </label>
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is the governing law of this agreement?"
            className="w-full rounded-sm border border-[var(--color-grid)] bg-[var(--color-ink-2)] p-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-gold)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question}
          className="rounded-sm bg-[var(--color-redline)] px-6 py-3 font-[family-name:var(--font-mono)] text-sm text-[var(--color-paper)] transition-colors hover:bg-[var(--color-redline-bright)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Asking the model…" : "Ask the model"}
        </button>
      </form>

      {error && (
        <div className="redline-note mt-8 rounded-sm bg-[var(--color-ink-2)] p-5">
          <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-redline-bright)]">
            {error}
          </p>
        </div>
      )}

      {answer !== null && !error && (
        <div className="mt-8 rounded-sm border border-[var(--color-grid)] bg-[var(--color-ink-2)] p-6">
          <p className="mb-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-gold)]">
            Model answer
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg">{answer}</p>
        </div>
      )}
    </div>
  );
}
