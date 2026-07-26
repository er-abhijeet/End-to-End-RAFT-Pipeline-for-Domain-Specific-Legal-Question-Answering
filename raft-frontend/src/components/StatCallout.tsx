export default function StatCallout({
  value,
  label,
  annotation,
}: {
  value: string;
  label: string;
  annotation?: string;
}) {
  return (
    <div className="redline-note py-1">
      <div className="font-[family-name:var(--font-display)] text-4xl font-medium text-[var(--color-text)]">
        {value}
      </div>
      <div className="mt-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
        {label}
      </div>
      {annotation && (
        <div className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-redline-bright)]">
          {annotation}
        </div>
      )}
    </div>
  );
}
