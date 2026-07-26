import ClauseHeading from "@/components/ClauseHeading";
import EmptyState from "@/components/EmptyState";
import MetricsTable from "@/components/MetricsTable";
import { getMetrics, getPipelineStats, graphExists } from "@/lib/data";
import Image from "next/image";

const GRAPHS: Array<{ file: string; title: string; caption: string }> = [
  {
    file: "dataset_funnel.png",
    title: "Dataset construction funnel",
    caption: "How many contract passages survive from raw text to a trainable RAFT example.",
  },
  {
    file: "chunk_length_distribution.png",
    title: "Chunk length distribution",
    caption: "Character length of the ~2,000-char sliding-window chunks indexed for retrieval.",
  },
  {
    file: "grounding_score_distribution.png",
    title: "Grounding score distribution",
    caption: "Cross-encoder relevance score per synthetic answer, against the 0.5 keep threshold.",
  },
  {
    file: "embedding_pca.png",
    title: "Chunk embedding space",
    caption: "2D PCA projection of the 384-dim MiniLM embeddings for every indexed chunk.",
  },
  {
    file: "em_by_rank.png",
    title: "Exact Match by retrieval depth",
    caption: "Zero-shot vs. RAG vs. fine-tuned RAFT, at retrieval depths k = 1, 3, 5.",
  },
  {
    file: "f1_comparison.png",
    title: "Span F1 score",
    caption: "Token-overlap F1 against the gold answer span, at k = 3.",
  },
  {
    file: "ragas_scores.png",
    title: "Ragas judge scores",
    caption: "Faithfulness and Answer Relevancy, scored by the teacher model as an independent judge.",
  },
];

export default async function ResultsPage() {
  const [stats, metrics] = await Promise.all([getPipelineStats(), getMetrics()]);
  const graphChecks = await Promise.all(GRAPHS.map((g) => graphExists(g.file)));
  const availableGraphs = GRAPHS.filter((_, i) => graphChecks[i]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <ClauseHeading number="R" kicker="Schedule of results" title="Metrics &amp; graphs" />

      {!stats && !metrics ? (
        <EmptyState
          title="No results exported yet."
          instructions="Run cuad_raft_showcase_assets.ipynb on Kaggle, then copy website_assets/data/*.json into public/data/ and website_assets/graphs/*.png into public/graphs/ in this project."
        />
      ) : (
        <>
          {metrics ? (
            <div className="mb-16 rounded-sm border border-[var(--color-grid)] bg-[var(--color-ink-2)] p-6">
              <MetricsTable metrics={metrics} />
              {!metrics.has_ragas && (
                <p className="mt-4 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
                  Ragas rows are blank because evaluation_results.csv from Phase 5 wasn&apos;t found on the
                  Hub when this export ran — EM/F1 above were computed fresh from a 30-example resample instead.
                </p>
              )}
            </div>
          ) : (
            <div className="mb-16">
              <EmptyState
                title="metrics.json missing."
                instructions="Copy website_assets/data/metrics.json into public/data/."
              />
            </div>
          )}

          {availableGraphs.length > 0 && (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {availableGraphs.map((g) => (
                <figure key={g.file} className="rounded-sm border border-[var(--color-grid)] p-4">
                  <Image
                    src={`/graphs/${g.file}`}
                    alt={g.title}
                    width={900}
                    height={560}
                    className="w-full rounded-sm"
                  />
                  <figcaption className="mt-3">
                    <p className="font-[family-name:var(--font-display)] text-base">{g.title}</p>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
                      {g.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
