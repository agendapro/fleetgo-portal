"use client";

import type { Reserva } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

/** ISO week-start (Monday) for a date string YYYY-MM-DD. */
function weekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyBars({ reservas }: { reservas: Reserva[] }) {
  if (reservas.length === 0) {
    return <div className="text-xs text-muted">Sin reservas en el período.</div>;
  }

  const byWeek = new Map<string, number>();
  for (const r of reservas) {
    const wk = weekStart(r.fecha_inicio);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + Number(r.monto_bruto));
  }
  const entries = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...entries.map(([, v]) => v));

  return (
    <div className="space-y-2">
      {entries.map(([wk, v]) => (
        <div key={wk} className="flex items-center gap-3">
          <div className="font-mono text-[11px] text-muted w-24">Sem {wk}</div>
          <div className="flex-1 h-6 bg-border/40 rounded">
            <div
              className="h-6 bg-accent rounded flex items-center justify-end pr-2"
              style={{ width: `${(v / max) * 100}%` }}
            >
              <span className="text-[11px] font-mono text-bg font-semibold">
                {formatCurrency(v)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
