import type { ComparisonExample } from "@/lib/data";

function PredictionRow({
  label,
  answer,
  em,
  f1,
  accent,
}: {
  label: string;
  answer: string;
  em: number;
  f1: number;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--color-grid)]/60 py-3 first:border-t-0">
      <div className="flex items-center justify-between">
        <span
          className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest"
          style={{ color: accent }}
        >
          {label}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
          EM {em} · F1 {f1.toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text)]">{answer || <em className="text-[var(--color-text-dim)]">(empty)</em>}</p>
    </div>
  );
}

export default function ExampleCard({ example }: { example: ComparisonExample }) {
  return (
    <article className="rounded-sm border border-[var(--color-grid)] bg-[var(--color-ink-2)] p-6">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-text)]">
        {example.question}
      </p>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
        Gold answer: <span className="text-[var(--color-gold)]">{example.gold_answer}</span>
      </p>

      <div className="mt-4">
        <PredictionRow
          label="Zero-shot"
          answer={example.predictions.zero_shot.answer}
          em={example.predictions.zero_shot.em}
          f1={example.predictions.zero_shot.f1}
          accent="var(--color-text-dim)"
        />
        <PredictionRow
          label="Base + RAG"
          answer={example.predictions.rag.answer}
          em={example.predictions.rag.em}
          f1={example.predictions.rag.f1}
          accent="var(--color-teal)"
        />
        <PredictionRow
          label="Fine-tuned RAFT"
          answer={example.predictions.raft.answer}
          em={example.predictions.raft.em}
          f1={example.predictions.raft.f1}
          accent="var(--color-redline-bright)"
        />
      </div>

      <details className="mt-4 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
        <summary className="cursor-pointer select-none">Retrieved context (top-3)</summary>
        <div className="mt-2 space-y-2">
          {example.context.map((ctx, i) => (
            <p key={i} className="rounded-sm bg-black/20 p-3 leading-relaxed">
              {ctx.slice(0, 400)}
              {ctx.length > 400 ? "…" : ""}
            </p>
          ))}
        </div>
      </details>
    </article>
  );
}
