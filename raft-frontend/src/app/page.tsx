import ClauseHeading from "@/components/ClauseHeading";
import GlossaryTerm from "@/components/GlossaryTerm";
import StatCallout from "@/components/StatCallout";
import { getPipelineStats } from "@/lib/data";
import Link from "next/link";

export default async function Home() {
  const stats = await getPipelineStats();

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-redline-bright)]">
          Recitals — what this project is
        </p>
        <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.08] font-medium sm:text-6xl">
          Teaching a 3B model to read contracts like a 9B model does.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-text-dim)]">
          This is a{" "}
          <GlossaryTerm
            term="Retrieval-Augmented Fine-Tuning (RAFT)"
            definition="A training method that shows the model a mix of relevant and irrelevant retrieved passages during fine-tuning, so it learns to identify and cite the right source instead of only memorizing answers."
          />{" "}
          pipeline built on the{" "}
          <GlossaryTerm
            term="CUAD dataset"
            definition="The Contract Understanding Atticus Dataset — 500+ commercial legal contracts with expert-labeled clauses, used here as the source of contract text."
          />
          . A 9B legal teacher model writes question/answer pairs grounded in real contract
          clauses; a cross-encoder throws out anything it can&apos;t verify; and a 3B student is
          fine-tuned with{" "}
          <GlossaryTerm
            term="QLoRA"
            definition="Quantized Low-Rank Adaptation — fine-tunes a small number of added adapter weights on top of a frozen 4-bit-quantized base model, making it possible to train a 3B model on a single T4 GPU."
          />{" "}
          to answer contract questions from retrieved context alone.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/results"
            className="rounded-sm bg-[var(--color-redline)] px-5 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-paper)] transition-colors hover:bg-[var(--color-redline-bright)]"
          >
            See the results →
          </Link>
          <Link
            href="/inference"
            className="rounded-sm border border-[var(--color-grid)] px-5 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-gold)]"
          >
            Try the model live →
          </Link>
        </div>

        {stats && (
          <div className="mt-16 grid grid-cols-2 gap-8 border-t border-[var(--color-grid)] pt-10 sm:grid-cols-4">
            <StatCallout value={stats.unique_contract_passages.toLocaleString()} label="Contract passages" />
            <StatCallout value={stats.total_chunks_indexed.toLocaleString()} label="Indexed chunks" />
            <StatCallout value={stats.synthetic_samples_generated.toLocaleString()} label="Teacher Q/A pairs" />
            <StatCallout
              value={`${Math.round(stats.grounding_retention_rate * 100)}%`}
              label="Passed grounding filter"
              annotation="cross-encoder verified"
            />
          </div>
        )}
      </section>

      {/* Pipeline clauses */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="mb-12 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          Terms — the five clauses of the pipeline
        </p>

        <div className="space-y-16">
          <div>
            <ClauseHeading number="1" kicker="Ingestion" title="Chunk the contracts, index the meaning" />
            <p className="max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
              Every unique contract passage in CUAD is split into overlapping windows and encoded
              with{" "}
              <GlossaryTerm
                term="sentence embeddings"
                definition="Dense numeric vectors (384 dimensions here, from all-MiniLM-L6-v2) positioned so that passages with similar meaning end up close together in vector space."
              />
              . Those vectors go into a{" "}
              <GlossaryTerm
                term="FAISS index"
                definition="Facebook AI Similarity Search — an in-memory index that finds the nearest vectors to a query by cosine similarity, in milliseconds, over thousands of chunks."
              />
              , which is how the retriever finds relevant clauses at both training and inference time.
            </p>
          </div>

          <div>
            <ClauseHeading number="2" kicker="Synthesis" title="A 9B legal teacher writes the questions" />
            <p className="max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-teal)]">
                gemma-2-9b-it
              </span>{" "}
              reads a real contract chunk and writes a specific legal question with a factual
              answer. Each training example is then assembled RAFT-style: the true{" "}
              <GlossaryTerm
                term="oracle chunk"
                definition="The passage that actually contains the answer to the question."
              />{" "}
              plus two unrelated{" "}
              <GlossaryTerm
                term="distractor chunks"
                definition="Passages retrieved from a different contract entirely, included so the model learns to distinguish relevant from irrelevant context rather than trusting everything it's shown."
              />
              , shuffled together — this is what separates RAFT from plain supervised fine-tuning.
            </p>
          </div>

          <div>
            <ClauseHeading number="3" kicker="Grounding" title="A reranker vetoes hallucination" />
            <p className="max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
              Every generated answer is scored against its oracle chunk with{" "}
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-teal)]">
                BAAI/bge-reranker-base
              </span>
              , a{" "}
              <GlossaryTerm
                term="cross-encoder"
                definition="A model that reads a (passage, answer) pair jointly rather than comparing separate embeddings — slower than embedding similarity, but far better at judging whether an answer is actually supported by a specific passage."
              />
              . Anything below a 0.5 grounding score is discarded before it ever reaches
              fine-tuning.
            </p>
          </div>

          <div>
            <ClauseHeading number="4" kicker="Distillation" title="QLoRA teaches the 3B student to cite, not guess" />
            <p className="max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-teal)]">
                Qwen2.5-3B-Instruct
              </span>{" "}
              is fine-tuned with{" "}
              <GlossaryTerm
                term="LoRA adapters"
                definition="Small trainable matrices inserted into attention and MLP projection layers; the original model weights stay frozen, so training only updates a fraction of the parameters."
              />{" "}
              (r=16, alpha=32) over the grounded RAFT dataset — this is the{" "}
              <GlossaryTerm
                term="knowledge distillation"
                definition="Transferring capability from a larger 'teacher' model into a smaller 'student' by training the student on the teacher's outputs, rather than on human-labeled data alone."
              />{" "}
              step: the 3B student inherits the 9B teacher&apos;s question-answering judgment
              without carrying its weight.
            </p>
          </div>

          <div>
            <ClauseHeading number="5" kicker="Evaluation" title="Zero-shot vs. RAG vs. RAFT, judged independently" />
            <p className="max-w-2xl leading-relaxed text-[var(--color-text-dim)]">
              The fine-tuned student is compared against its own un-tuned base weights — with and
              without retrieval — on a held-out question set, using Exact Match, span F1, and{" "}
              <GlossaryTerm
                term="Ragas Faithfulness / Answer Relevancy"
                definition="LLM-judged metrics: Faithfulness checks whether every claim in an answer is actually supported by the retrieved context; Answer Relevancy checks whether the answer actually addresses the question asked."
              />
              . The teacher model is reloaded as the judge for these — deliberately kept separate
              from the model being scored, so the RAFT student never grades its own work.
            </p>
          </div>
        </div>
      </section>

      {stats && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="redline-note rounded-sm bg-[var(--color-ink-2)] p-6 font-[family-name:var(--font-mono)] text-sm">
            <p className="mb-2 text-[var(--color-text-dim)]">Stack</p>
            <p className="text-[var(--color-text)]">
              Teacher <span className="text-[var(--color-gold)]">{stats.teacher_model}</span> · Student{" "}
              <span className="text-[var(--color-gold)]">{stats.student_model}</span> · Embeddings{" "}
              <span className="text-[var(--color-gold)]">{stats.embedding_model}</span> · Reranker{" "}
              <span className="text-[var(--color-gold)]">{stats.reranker_model}</span>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
