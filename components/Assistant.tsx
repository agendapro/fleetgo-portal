"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "¿Cuándo me pagan la próxima vez?",
  "¿Cómo se calcula la comisión?",
  "¿Qué incidentes tengo este mes?",
  "¿Qué cubre el seguro si mi auto se daña?",
  "¿Cómo doy de baja un vehículo?",
  "¿Qué cobramos si el cliente devuelve tarde?",
];

type AnswerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "answered"; text: string; sources: string[]; mode: "live" | "local" }
  | { status: "error"; message: string };

export default function Assistant({ duenoId, reference }: { duenoId: string; reference: string }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AnswerState>({ status: "idle" });

  async function ask(q: string) {
    setQuestion(q);
    setState({ status: "loading" });
    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueno_id: duenoId, question: q, reference }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setState({ status: "answered", text: data.text, sources: data.sources, mode: data.mode });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Pregúntale al asistente FleetGo</h2>
        <p className="text-xs text-muted">
          Responde sobre <strong>políticas</strong> (FAQ) y <strong>tus datos</strong> (reservas,
          incidentes, próxima liquidación). Si no sabe, te dice que escribas a soporte.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="text-left text-xs rounded-lg border border-border bg-panel hover:border-accent px-3 py-2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask(question.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Tu pregunta…"
          className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!question.trim() || state.status === "loading"}
          className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-medium disabled:opacity-40"
        >
          {state.status === "loading" ? "…" : "Preguntar"}
        </button>
      </form>

      {state.status === "loading" && <div className="text-xs text-muted">Pensando…</div>}
      {state.status === "error" && (
        <div className="rounded-lg border border-bad/40 bg-bad/5 text-bad px-3 py-2 text-sm">
          Error: {state.message}
        </div>
      )}
      {state.status === "answered" && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted flex gap-3">
            <span>
              {state.mode === "live" ? "🟢 IA · Claude" : "⚪ IA · local (sin API key)"}
            </span>
            <span>fuentes: {state.sources.join(", ")}</span>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{state.text}</div>
        </div>
      )}
    </div>
  );
}
