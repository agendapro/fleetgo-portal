"use client";

import { useMemo, useState } from "react";
import type {
  Comision,
  Dueno,
  IncidentAlert,
  Incidente,
  Reserva,
  Statement,
  Vehiculo,
} from "@/lib/types";
import { SEVERITY_MAP } from "@/lib/alerts";
import { formatCurrency } from "@/lib/format";
import Assistant from "@/components/Assistant";
import WeeklyBars from "@/components/WeeklyBars";

type Tab = "resumen" | "liquidacion" | "incidentes" | "flota" | "asistente";

const TAB_ITEMS: { key: Tab; label: string; emoji: string }[] = [
  { key: "resumen", label: "Resumen", emoji: "📊" },
  { key: "liquidacion", label: "Liquidación próxima", emoji: "💰" },
  { key: "incidentes", label: "Incidentes", emoji: "⚠️" },
  { key: "flota", label: "Mi flota", emoji: "🚗" },
  { key: "asistente", label: "Asistente", emoji: "🤖" },
];

const SEVERITY_COLORS: Record<string, string> = {
  urgent: "bg-bad/10 border-bad/40 text-bad",
  warning: "bg-warn/10 border-warn/40 text-warn",
  info: "bg-accent/10 border-accent/40 text-accent",
};

const SEVERITY_EMOJI: Record<string, string> = {
  urgent: "🔴",
  warning: "🟡",
  info: "🔵",
};

export default function OwnerDashboard(props: {
  dueno: Dueno;
  plan: Comision;
  statement: Statement;
  myAlerts: IncidentAlert[];
  vehiculos: Vehiculo[];
  reservas: Reserva[];
  incidentes: Incidente[];
  reference: string;
}) {
  const { dueno, plan, statement, myAlerts, vehiculos, reservas, incidentes, reference } = props;
  const [tab, setTab] = useState<Tab>("resumen");

  return (
    <>
      <Header dueno={dueno} plan={plan} vehiculos={vehiculos} reservas={reservas} />
      <Tabs current={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === "resumen" && (
          <ResumenTab reservas={reservas} incidentes={incidentes} reference={reference} myAlerts={myAlerts} />
        )}
        {tab === "liquidacion" && <LiquidacionTab statement={statement} />}
        {tab === "incidentes" && <IncidentesTab incidentes={incidentes} />}
        {tab === "flota" && (
          <FlotaTab vehiculos={vehiculos} reservas={reservas} incidentes={incidentes} />
        )}
        {tab === "asistente" && <Assistant duenoId={dueno.dueno_id} reference={reference} />}
      </div>
    </>
  );
}

function Header({
  dueno,
  plan,
  vehiculos,
  reservas,
}: {
  dueno: Dueno;
  plan: Comision;
  vehiculos: Vehiculo[];
  reservas: Reserva[];
}) {
  const activos = vehiculos.filter((v) => v.estado_actual === "activo").length;
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Hola, {dueno.nombre} 👋</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Vehículos" value={String(vehiculos.length)} hint={`${activos} activos`} />
        <Stat label="Plan" value={dueno.plan_comision} hint={`Comisión ${plan.comision_porcentaje}%`} />
        <Stat label="Canal preferido" value={dueno.preferencia_comunicacion} />
        <Stat label="Reservas históricas" value={String(reservas.length)} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

function Tabs({ current, onChange }: { current: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto">
      {TAB_ITEMS.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap rounded-t-md transition-colors ${
              active
                ? "bg-panel text-ink border-x border-t border-border -mb-px"
                : "text-muted hover:text-ink"
            }`}
          >
            <span className="mr-1.5">{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ResumenTab({
  reservas,
  incidentes,
  reference,
  myAlerts,
}: {
  reservas: Reserva[];
  incidentes: Incidente[];
  reference: string;
  myAlerts: IncidentAlert[];
}) {
  const last30 = useMemo(() => {
    const cutoffMs = new Date(reference + "T00:00:00").getTime() - 30 * 86400000;
    const cutoffIso = new Date(cutoffMs).toISOString().slice(0, 10);
    const r30 = reservas.filter((r) => r.fecha_inicio >= cutoffIso);
    const i30 = incidentes.filter((i) => i.fecha >= cutoffIso);
    return {
      r30,
      i30,
      gmv: r30.reduce((s, r) => s + Number(r.monto_bruto), 0),
      incMonto: i30.reduce((s, i) => s + Number(i.monto_asociado), 0),
    };
  }, [reservas, incidentes, reference]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Últimos 30 días</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Reservas" value={String(last30.r30.length)} />
          <Stat label="GMV bruto" value={formatCurrency(last30.gmv)} />
          <Stat label="Incidentes" value={String(last30.i30.length)} />
          <Stat label="Monto incidentes" value={formatCurrency(last30.incMonto)} />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3 text-accent">Ingreso bruto semanal</h3>
        <div className="rounded-xl border border-border bg-panel p-4">
          <WeeklyBars reservas={last30.r30} />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3 text-accent">
          Incidentes recientes (últimos 7 días)
        </h3>
        {myAlerts.length === 0 ? (
          <div className="rounded-xl border border-accent2/40 bg-accent2/5 text-accent2 px-4 py-3">
            Sin incidentes nuevos en los últimos 7 días ✅
          </div>
        ) : (
          <div className="space-y-2">
            {myAlerts.map((a) => (
              <div
                key={a.incidente_id}
                className={`rounded-xl border px-4 py-3 ${SEVERITY_COLORS[a.severity]}`}
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>
                    {SEVERITY_EMOJI[a.severity]} {a.tipo.replace(/_/g, " ")} en {a.vehiculo_id} · {a.fecha}
                  </span>
                  <span className="font-mono">{formatCurrency(a.monto)}</span>
                </div>
                <div className="mt-1 text-xs text-muted">{a.descripcion}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LiquidacionTab({ statement }: { statement: Statement }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Próxima liquidación: pago el {statement.fecha_pago}
        </h2>
        <p className="text-xs text-muted">
          Período: {statement.periodo_inicio} → {statement.periodo_fin}. Política: pagos día 15 y último día hábil del mes (FAQ).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Reservas liquidadas" value={String(statement.reservas_count)} />
        <Stat label="GMV bruto" value={formatCurrency(statement.total_bruto)} />
        <Stat
          label={`Comisión (${statement.porcentaje_comision}%)`}
          value={formatCurrency(-statement.total_comision)}
        />
        <Stat
          label="Total a pagar"
          value={formatCurrency(statement.total_neto)}
          hint={`${formatCurrency(statement.total_incidentes)} incidentes`}
        />
      </div>

      {statement.lineas.length === 0 ? (
        <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          No hay reservas completadas en este período. Las reservas en curso se liquidan en el siguiente ciclo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2">Reserva</th>
                <th className="text-left px-3 py-2">Vehículo</th>
                <th className="text-left px-3 py-2">Periodo</th>
                <th className="text-right px-3 py-2">Bruto</th>
                <th className="text-right px-3 py-2">Descuento</th>
                <th className="text-right px-3 py-2">Comisión</th>
                <th className="text-right px-3 py-2">Incidentes</th>
                <th className="text-right px-3 py-2">Neto</th>
              </tr>
            </thead>
            <tbody>
              {statement.lineas.map((l) => (
                <tr key={l.reserva_id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{l.reserva_id}</td>
                  <td className="px-3 py-2">{l.vehiculo}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {l.fecha_inicio} → {l.fecha_fin}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(l.monto_bruto)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.descuento ? formatCurrency(-l.descuento) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(-l.comision)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.incidentes_brutos ? formatCurrency(l.incidentes_brutos) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(l.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statement.incidentes_detalle.length > 0 && (
        <section>
          <h3 className="text-base font-semibold mb-2 text-accent">Detalle de incidentes</h3>
          <ul className="space-y-2 text-sm">
            {statement.incidentes_detalle.map((i) => (
              <li key={i.incidente_id} className="rounded-lg border border-border bg-panel px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {i.tipo} <span className="text-muted">({i.fecha}) en {i.reserva_id}</span>
                  </span>
                  <span className="font-mono">
                    {i.signo}
                    {formatCurrency(i.monto)}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">{i.descripcion}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function IncidentesTab({ incidentes }: { incidentes: Incidente[] }) {
  const sorted = [...incidentes].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const counts = sorted.reduce<Record<string, number>>((acc, i) => {
    acc[i.tipo] = (acc[i.tipo] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Todos tus incidentes ({sorted.length})</h2>
      {sorted.length === 0 ? (
        <div className="text-sm text-muted">Sin incidentes registrados.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Severidad</th>
                  <th className="text-left px-3 py-2">Vehículo</th>
                  <th className="text-left px-3 py-2">Reserva</th>
                  <th className="text-right px-3 py-2">Monto</th>
                  <th className="text-left px-3 py-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((i) => {
                  const sev = SEVERITY_MAP[i.tipo] ?? "info";
                  return (
                    <tr key={i.incidente_id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-mono text-xs">{i.fecha}</td>
                      <td className="px-3 py-2">{i.tipo}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SEVERITY_COLORS[sev]}`}>
                          {sev}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{i.vehiculo_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{i.reserva_id}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(Number(i.monto_asociado))}</td>
                      <td className="px-3 py-2 text-xs text-muted max-w-md">{i.descripcion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section>
            <h3 className="text-base font-semibold mb-2 text-accent">Distribución por tipo</h3>
            <div className="space-y-1.5">
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([tipo, count]) => (
                  <div key={tipo} className="flex items-center gap-3">
                    <div className="text-xs w-44 text-muted">{tipo}</div>
                    <div className="flex-1 h-5 bg-border/40 rounded">
                      <div
                        className="h-5 bg-accent rounded"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <div className="font-mono text-xs w-6 text-right">{count}</div>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FlotaTab({
  vehiculos,
  reservas,
  incidentes,
}: {
  vehiculos: Vehiculo[];
  reservas: Reserva[];
  incidentes: Incidente[];
}) {
  const reservasByVeh = useMemo(() => {
    const out: Record<string, { count: number; gmv: number }> = {};
    for (const r of reservas) {
      out[r.vehiculo_id] ??= { count: 0, gmv: 0 };
      out[r.vehiculo_id].count += 1;
      out[r.vehiculo_id].gmv += Number(r.monto_bruto);
    }
    return out;
  }, [reservas]);
  const incByVeh = useMemo(() => {
    const out: Record<string, number> = {};
    for (const i of incidentes) {
      if (!i.vehiculo_id) continue;
      out[i.vehiculo_id] = (out[i.vehiculo_id] ?? 0) + 1;
    }
    return out;
  }, [incidentes]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Mis vehículos</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-[10px] uppercase tracking-wider">
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Marca</th>
              <th className="text-left px-3 py-2">Modelo</th>
              <th className="text-left px-3 py-2">Año</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-right px-3 py-2">Reservas</th>
              <th className="text-right px-3 py-2">Ingreso bruto</th>
              <th className="text-right px-3 py-2">Incidentes</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => {
              const agg = reservasByVeh[v.vehiculo_id] ?? { count: 0, gmv: 0 };
              const incs = incByVeh[v.vehiculo_id] ?? 0;
              return (
                <tr key={v.vehiculo_id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{v.vehiculo_id}</td>
                  <td className="px-3 py-2">{v.marca}</td>
                  <td className="px-3 py-2">{v.modelo}</td>
                  <td className="px-3 py-2">{v.ano}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        v.estado_actual === "activo"
                          ? "border-accent2/40 text-accent2 bg-accent2/5"
                          : "border-warn/40 text-warn bg-warn/5"
                      }`}
                    >
                      {v.estado_actual}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{agg.count}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(agg.gmv)}</td>
                  <td className="px-3 py-2 text-right font-mono">{incs}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
