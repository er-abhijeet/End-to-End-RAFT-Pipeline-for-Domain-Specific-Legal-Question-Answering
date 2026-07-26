export default function ClauseHeading({
  number,
  title,
  kicker,
}: {
  number: string;
  title: string;
  kicker?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="clause-number pt-1 text-sm">§{number}</span>
      <div>
        {kicker && (
          <p className="mb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            {kicker}
          </p>
        )}
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">{title}</h2>
      </div>
    </div>
  );
}
