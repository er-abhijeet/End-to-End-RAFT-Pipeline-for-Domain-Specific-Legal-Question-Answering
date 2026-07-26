export default function EmptyState({
  title,
  instructions,
}: {
  title: string;
  instructions: string;
}) {
  return (
    <div className="redline-note rounded-sm bg-[var(--color-ink-2)] px-6 py-8">
      <p className="font-[family-name:var(--font-display)] text-lg">{title}</p>
      <p className="mt-2 max-w-xl font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-dim)]">
        {instructions}
      </p>
    </div>
  );
}
