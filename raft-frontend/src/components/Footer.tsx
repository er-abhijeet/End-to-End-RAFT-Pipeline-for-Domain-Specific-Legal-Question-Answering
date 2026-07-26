export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-grid)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)] sm:flex-row sm:items-center sm:justify-between">
        <span>RAFT / CUAD — teacher-student contract QA distillation</span>
        <span>gemma-2-9b-it teacher · Qwen2.5-3B student · QLoRA · FAISS + MiniLM retrieval</span>
      </div>
    </footer>
  );
}
