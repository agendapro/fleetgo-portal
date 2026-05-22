import type { Dueno, FleetData, IncidentAlert, Statement } from "./types";
import { formatCurrency } from "./format";

export type Notification = {
  dueno_id: string;
  canal: "email" | "whatsapp";
  asunto: string;
  cuerpo: string;
  tipo: "incident_alert" | "biweekly_statement";
};

function channelsFor(dueno: Dueno, forceEmailForCritical = false): ("email" | "whatsapp")[] {
  const base: ("email" | "whatsapp")[] =
    dueno.preferencia_comunicacion === "email"
      ? ["email"]
      : dueno.preferencia_comunicacion === "whatsapp"
        ? ["whatsapp"]
        : ["email", "whatsapp"];
  if (forceEmailForCritical && !base.includes("email")) base.push("email");
  return base;
}

const SEVERITY_EMOJI: Record<string, string> = {
  urgent: "🔴",
  warning: "🟡",
  info: "🔵",
};

function alertEmail(name: string, alerts: IncidentAlert[]): { asunto: string; cuerpo: string } {
  const asunto = `FleetGo · ${alerts.length} actualización(es) sobre tu flota`;
  const lines: string[] = [`Hola ${name},`, "", "Te avisamos sobre eventos recientes en tus vehículos:", ""];
  for (const a of alerts) {
    const emoji = SEVERITY_EMOJI[a.severity];
    const title = `${a.tipo.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())} — ${a.vehiculo_id}`;
    lines.push(`${emoji} ${title} (${a.fecha})`);
    lines.push(`   Reserva: ${a.reserva_id}`);
    lines.push(`   Monto asociado: ${formatCurrency(a.monto)}`);
    lines.push(`   ${a.descripcion}`);
    lines.push("");
  }
  lines.push("Detalle: https://app.fleetgo.cl/panel/incidentes");
  lines.push("", "— Equipo FleetGo");
  return { asunto, cuerpo: lines.join("\n") };
}

function alertWhatsapp(name: string, alerts: IncidentAlert[]): string {
  const parts: string[] = [`Hola ${name} 👋`, `Tienes *${alerts.length} actualización(es)* en tu flota:`];
  for (const a of alerts) {
    const emoji = SEVERITY_EMOJI[a.severity];
    const title = `${a.tipo.replace(/_/g, " ")} (${a.vehiculo_id})`;
    parts.push(`${emoji} ${title} · ${a.fecha} · ${formatCurrency(a.monto)}`);
  }
  parts.push("", "Detalle: https://app.fleetgo.cl/panel");
  return parts.join("\n");
}

export function buildAlertNotifications(
  data: FleetData,
  byOwner: Record<string, IncidentAlert[]>,
): Notification[] {
  const out: Notification[] = [];
  for (const dueno_id of Object.keys(byOwner)) {
    const dueno = data.duenos.find((d) => d.dueno_id === dueno_id);
    if (!dueno) continue;
    const alerts = byOwner[dueno_id];
    const critical = alerts.some((a) => a.severity === "urgent");
    const channels = channelsFor(dueno, critical);
    const { asunto, cuerpo: cuerpoEmail } = alertEmail(dueno.nombre, alerts);
    const cuerpoWa = alertWhatsapp(dueno.nombre, alerts);
    for (const canal of channels) {
      out.push({
        dueno_id,
        canal,
        asunto: canal === "email" ? asunto : "",
        cuerpo: canal === "email" ? cuerpoEmail : cuerpoWa,
        tipo: "incident_alert",
      });
    }
  }
  return out;
}

export function statementEmail(s: Statement): { asunto: string; cuerpo: string } {
  const asunto = `FleetGo · Tu liquidación del ${s.periodo_inicio} al ${s.periodo_fin}`;
  const cuerpo = [
    `Hola ${s.dueno_nombre},`,
    "",
    `Adjuntamos tu liquidación del período **${s.periodo_inicio} → ${s.periodo_fin}**.`,
    `Se acreditará el **${s.fecha_pago}**.`,
    "",
    `- Reservas liquidadas: ${s.reservas_count}`,
    `- Ingreso bruto: ${formatCurrency(s.total_bruto)}`,
    `- Comisión (${s.porcentaje_comision}%): ${formatCurrency(-s.total_comision)}`,
    `- Incidentes neto: ${formatCurrency(s.total_incidentes)}`,
    `- **Total a pagar: ${formatCurrency(s.total_neto)}**`,
    "",
    "Ver detalle: https://app.fleetgo.cl/panel/liquidaciones",
    "",
    "— Equipo FleetGo",
  ].join("\n");
  return { asunto, cuerpo };
}
