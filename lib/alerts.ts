import type { FleetData, IncidentAlert, Severity } from "./types";

export const SEVERITY_MAP: Record<string, Severity> = {
  rayon_carroceria: "urgent",
  dano_interior: "urgent",
  reclamo_cliente: "warning",
  multa_transito: "warning",
  neumatico_pinchado: "warning",
  devolucion_tardia: "info",
  combustible_insuficiente: "info",
  extravio_documentos: "info",
};

export function detectRecentAlerts(
  data: FleetData,
  reference: string,
  windowDays = 7,
): IncidentAlert[] {
  const upper = new Date(reference + "T23:59:59").getTime();
  const lower = upper - windowDays * 86400000;
  const out: IncidentAlert[] = [];
  for (const i of data.incidentes) {
    if (!i.fecha) continue;
    const t = new Date(i.fecha + "T00:00:00").getTime();
    if (t >= lower && t <= upper && i.dueno_id && i.vehiculo_id) {
      out.push({
        incidente_id: i.incidente_id,
        reserva_id: i.reserva_id,
        dueno_id: i.dueno_id,
        vehiculo_id: i.vehiculo_id,
        tipo: i.tipo,
        fecha: i.fecha,
        monto: Number(i.monto_asociado) || 0,
        descripcion: i.descripcion,
        severity: SEVERITY_MAP[i.tipo] ?? "info",
      });
    }
  }
  // newest first
  out.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return out;
}

export function groupByOwner(alerts: IncidentAlert[]): Record<string, IncidentAlert[]> {
  const out: Record<string, IncidentAlert[]> = {};
  for (const a of alerts) {
    (out[a.dueno_id] ??= []).push(a);
  }
  return out;
}
