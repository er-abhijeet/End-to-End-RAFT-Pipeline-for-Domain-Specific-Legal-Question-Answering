export default function GlossaryTerm({
  term,
  definition,
}: {
  term: string;
  definition: string;
}) {
  return (
    <span
      title={definition}
      tabIndex={0}
      className="cursor-help border-b border-dotted border-[var(--color-gold)] text-[var(--color-gold)] focus-visible:outline-none"
    >
      {term}
    </span>
  );
}
