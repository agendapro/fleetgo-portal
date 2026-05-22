import { notFound } from "next/navigation";
import Link from "next/link";
import { loadFleetData, ownerById, commissionFor } from "@/lib/data";
import { buildStatementForReference } from "@/lib/statements";
import { detectRecentAlerts } from "@/lib/alerts";
import OwnerDashboard from "./OwnerDashboard";

type Props = {
  params: { id: string };
  searchParams: { ref?: string };
};

const DEFAULT_REF = "2026-05-10";

export default async function OwnerPage({ params, searchParams }: Props) {
  const data = await loadFleetData();
  const dueno = ownerById(data, params.id);
  if (!dueno) notFound();

  const reference = searchParams.ref ?? DEFAULT_REF;
  const plan = commissionFor(data, dueno.plan_comision)!;
  const statement = buildStatementForReference(data, dueno.dueno_id, reference);
  const allAlerts = detectRecentAlerts(data, reference, 7);
  const myAlerts = allAlerts.filter((a) => a.dueno_id === dueno.dueno_id);

  const vehiculos = data.vehiculos.filter((v) => v.dueno_id === dueno.dueno_id);
  const reservas = data.reservas.filter((r) => r.dueno_id === dueno.dueno_id);
  const incidentes = data.incidentes.filter((i) => i.dueno_id === dueno.dueno_id);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-xs text-muted hover:text-accent">
          ← Cambiar dueño
        </Link>
        <span className="text-xs text-muted">
          Ref: <span className="font-mono">{reference}</span>
        </span>
      </div>
      <OwnerDashboard
        dueno={dueno}
        plan={plan}
        statement={statement}
        myAlerts={myAlerts}
        vehiculos={vehiculos}
        reservas={reservas}
        incidentes={incidentes}
        reference={reference}
      />
    </main>
  );
}
