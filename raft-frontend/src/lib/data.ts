import { promises as fs } from "fs";
import path from "path";

export type PipelineStats = {
  unique_contract_passages: number;
  total_chunks_indexed: number;
  avg_chunk_length_chars: number;
  synthetic_samples_generated: number;
  samples_kept_after_grounding_filter: number;
  grounding_retention_rate: number;
  held_out_eval_questions: number;
  teacher_model: string;
  student_model: string;
  embedding_model: string;
  reranker_model: string;
  lora_config: {
    r: number;
    lora_alpha: number;
    lora_dropout: number;
    target_modules: string[];
  };
};

export type MetricsRow = {
  metric: string;
  [column: string]: string | number | null;
};

export type MetricsJson = {
  columns: string[];
  rows: MetricsRow[];
  has_ragas: boolean;
};

export type ComparisonPrediction = {
  answer: string;
  em: number;
  f1: number;
};

export type ComparisonExample = {
  question: string;
  context: string[];
  gold_answer: string;
  predictions: {
    zero_shot: ComparisonPrediction;
    rag: ComparisonPrediction;
    raft: ComparisonPrediction;
  };
};

export type ComparisonJson = {
  summary: {
    n_examples: number;
    avg_f1: { zero_shot: number; rag: number; raft: number };
    raft_best_or_tied_rate: number | null;
  };
  examples: ComparisonExample[];
};

async function readJsonAsset<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "data", filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const getPipelineStats = () => readJsonAsset<PipelineStats>("pipeline_stats.json");
export const getMetrics = () => readJsonAsset<MetricsJson>("metrics.json");
export const getComparisonData = () => readJsonAsset<ComparisonJson>("comparison_examples.json");

export function graphExists(filename: string): Promise<boolean> {
  return fs
    .access(path.join(process.cwd(), "public", "graphs", filename))
    .then(() => true)
    .catch(() => false);
}
