import Link from "next/link";
import { loadFleetData } from "@/lib/data";

const REFERENCE_FALLBACK = "2026-05-10";

export default async function HomePage() {
  const data = await loadFleetData();
  const reference = process.env.NEXT_PUBLIC_REFERENCE_DATE ?? REFERENCE_FALLBACK;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-[0.15em] text-accent2 font-semibold mb-3">
          Prototipo · Caso de estudio FleetGo
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Portal del Dueño<span className="text-accent">.</span>
        </h1>
        <p className="text-muted text-lg max-w-2xl">
          Login simulado: elige un dueño para entrar a su panel. Cada uno ve sus reservas,
          incidentes, próxima liquidación calculada en tiempo real, y puede preguntarle al
          asistente IA sobre políticas y sus propios datos.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.duenos.map((d) => {
          const vehs = data.vehiculos.filter((v) => v.dueno_id === d.dueno_id).length;
          return (
            <Link
              key={d.dueno_id}
              href={`/owners/${d.dueno_id}?ref=${reference}`}
              className="block rounded-xl border border-border bg-panel hover:border-accent transition-colors p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{d.dueno_id}</span>
                <span className="text-[10px] uppercase tracking-wider text-accent2">
                  plan {d.plan_comision}
                </span>
              </div>
              <div className="mt-2 font-medium">{d.nombre}</div>
              <div className="mt-1 text-xs text-muted">
                {vehs} vehículo{vehs === 1 ? "" : "s"} · canal {d.preferencia_comunicacion}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-12 text-xs text-muted">
        Fecha de referencia: {reference}. Cambia el parámetro <code className="font-mono text-accent">?ref=</code>{" "}
        en la URL para simular otra fecha del calendario.
      </p>
    </main>
  );
}
