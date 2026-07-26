import ClauseHeading from "@/components/ClauseHeading";
import EmptyState from "@/components/EmptyState";
import ExampleCard from "@/components/ExampleCard";
import StatCallout from "@/components/StatCallout";
import { getComparisonData } from "@/lib/data";

export default async function ComparisonPage() {
  const data = await getComparisonData();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <ClauseHeading number="C" kicker="Exhibit A" title="RAFT vs. RAG vs. zero-shot, side by side" />

      {!data ? (
        <EmptyState
          title="No comparison examples exported yet."
          instructions="Run cuad_raft_showcase_assets.ipynb on Kaggle, then copy website_assets/data/comparison_examples.json into public/data/ in this project."
        />
      ) : (
        <>
          <div className="mb-14 grid grid-cols-2 gap-8 border-b border-[var(--color-grid)] pb-10 sm:grid-cols-4">
            <StatCallout value={data.summary.avg_f1.zero_shot.toFixed(2)} label="Avg F1 · zero-shot" />
            <StatCallout value={data.summary.avg_f1.rag.toFixed(2)} label="Avg F1 · base + RAG" />
            <StatCallout
              value={data.summary.avg_f1.raft.toFixed(2)}
              label="Avg F1 · fine-tuned RAFT"
              annotation="highest average"
            />
            <StatCallout
              value={
                data.summary.raft_best_or_tied_rate !== null
                  ? `${Math.round(data.summary.raft_best_or_tied_rate * 100)}%`
                  : "—"
              }
              label="Examples RAFT wins or ties"
            />
          </div>

          <p className="mb-8 max-w-2xl font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
            Sorted by the largest F1 gain of the fine-tuned RAFT model over the un-tuned zero-shot
            base — the clearest wins first.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.examples.map((ex, i) => (
              <ExampleCard key={i} example={ex} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
