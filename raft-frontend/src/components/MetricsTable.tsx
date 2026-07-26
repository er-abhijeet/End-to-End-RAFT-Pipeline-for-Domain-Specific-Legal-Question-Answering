import type { MetricsJson } from "@/lib/data";

function fmt(v: string | number | null) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "—";
    return v.toFixed(3);
  }
  return v;
}

export default function MetricsTable({ metrics }: { metrics: MetricsJson }) {
  return (
    <div className="overflow-x-auto rounded-sm">
      <table className="w-full border-collapse font-[family-name:var(--font-mono)] text-sm">
        <thead>
          <tr className="border-b border-[var(--color-grid)] text-left text-[var(--color-text-dim)]">
            <th className="py-3 pr-4 font-normal">Evaluation metric</th>
            {metrics.columns.map((c) => (
              <th key={c} className="px-4 py-3 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.rows.map((row) => {
            const values = metrics.columns.map((c) => row[c]);
            const numericValues = values.filter((v): v is number => typeof v === "number");
            const best = numericValues.length ? Math.max(...numericValues) : null;
            return (
              <tr key={row.metric} className="border-b border-[var(--color-grid)]/60">
                <td className="py-3 pr-4 text-[var(--color-text)]">{row.metric}</td>
                {metrics.columns.map((c) => {
                  const v = row[c];
                  const isBest = typeof v === "number" && best !== null && v === best;
                  return (
                    <td
                      key={c}
                      className={`px-4 py-3 ${
                        isBest ? "text-[var(--color-gold)]" : "text-[var(--color-text-dim)]"
                      }`}
                    >
                      {fmt(v)}
                      {isBest ? " ▲" : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
