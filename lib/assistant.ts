import "server-only";
import type { AssistantAnswer, FleetData, Incidente, Reserva, Vehiculo } from "./types";
import { commissionFor, ownerById } from "./data";
import { buildStatementForReference } from "./statements";
import { parseFaqSections } from "./faq";
import { formatCurrency } from "./format";

const SYSTEM_PROMPT = `Eres el asistente de FleetGo para dueños de vehículos. Respondes EXCLUSIVAMENTE basándote en (1) el FAQ oficial de FleetGo y (2) los datos del dueño que te entrego como contexto.

Reglas inviolables:
- Si la respuesta no está en el FAQ ni en los datos, dilo: "No tengo esa información, te derivo a soporte."
- Cita siempre el origen: "Según el FAQ (sección X)" o "Según tus datos: ...".
- Nunca inventes montos, fechas o políticas.
- No prometas devoluciones, descuentos o cambios — solo informas y derivas.
- Responde en español chileno, conciso (máx. 6 líneas).
- Si el dueño pregunta sobre una reserva o incidente específico, búscalo en los datos por ID.`;

type OwnerContext = {
  dueno: ReturnType<typeof ownerById>;
  plan: ReturnType<typeof commissionFor>;
  vehiculos: Vehiculo[];
  reservas_ultimos_30_dias: Reserva[];
  incidentes_ultimos_30_dias: Incidente[];
  proxima_liquidacion: {
    periodo_inicio: string;
    periodo_fin: string;
    fecha_pago: string;
    total_estimado: number;
    reservas_incluidas: number;
  };
};

function buildOwnerContext(data: FleetData, dueno_id: string, reference: string): OwnerContext {
  const dueno = ownerById(data, dueno_id);
  if (!dueno) throw new Error(`Dueño no encontrado: ${dueno_id}`);
  const plan = commissionFor(data, dueno.plan_comision);

  const refMs = new Date(reference + "T00:00:00").getTime();
  const cutoffMs = refMs - 30 * 86400000;
  const cutoffIso = new Date(cutoffMs).toISOString().slice(0, 10);

  const vehiculos = data.vehiculos.filter((v) => v.dueno_id === dueno_id);
  const reservas_ultimos_30_dias = data.reservas.filter(
    (r) => r.dueno_id === dueno_id && r.fecha_inicio >= cutoffIso,
  );
  const incidentes_ultimos_30_dias = data.incidentes.filter(
    (i) => i.dueno_id === dueno_id && i.fecha >= cutoffIso,
  );

  const s = buildStatementForReference(data, dueno_id, reference);
  return {
    dueno,
    plan,
    vehiculos,
    reservas_ultimos_30_dias,
    incidentes_ultimos_30_dias,
    proxima_liquidacion: {
      periodo_inicio: s.periodo_inicio,
      periodo_fin: s.periodo_fin,
      fecha_pago: s.fecha_pago,
      total_estimado: s.total_neto,
      reservas_incluidas: s.reservas_count,
    },
  };
}

// ---- Intent routing for the local fallback ----

type IntentRule = { name: string; pattern: RegExp; section: string | null };

const INTENT_RULES: IntentRule[] = [
  { name: "when_pay", pattern: /\b(cu[aá]ndo|fecha).{0,10}(pag|liqui|deposit|transfer)/i, section: "¿Cuándo recibo mi pago?" },
  { name: "commission_calc", pattern: /\b(c[oó]mo|por qu[eé]).{0,15}(comisi[oó]n|descuento|calcul)/i, section: "¿Cómo se calcula la comisión de la plataforma?" },
  { name: "discount_reason", pattern: /\b(por qu[eé]).{0,20}descuento/i, section: "¿Por qué se aplicó un descuento a una de mis reservas?" },
  { name: "damage_policy", pattern: /\b(da[ñn]o|raya|rayon|seguro|cubre|colision)/i, section: "¿Qué pasa si mi auto sufre un daño durante el arriendo?" },
  { name: "traffic_fine", pattern: /\b(multa|infracci[oó]n)/i, section: "¿Quién paga las multas de tránsito durante el arriendo?" },
  { name: "late_return", pattern: /\b(atraso|tard[ií]o|tarde|devuelv[oa])/i, section: "El cliente devolvió el auto tarde. ¿Qué cobramos?" },
  { name: "fuel", pattern: /\b(combustible|bencina|gasolina|tanque)/i, section: "¿Qué pasa si el cliente devuelve el auto sin combustible?" },
  { name: "deregister", pattern: /\b(dar de baja|doy de baja|baja|pausar|retirar|quitar).{0,20}veh[ií]culo|veh[ií]culo.{0,20}(baja|pausar)/i, section: "¿Cómo doy de baja un vehículo de la flota?" },
  { name: "add_vehicle", pattern: /\b(sub[iy]r|agregar|nuevo).{0,20}veh[ií]culo/i, section: "¿Puedo subir un nuevo vehículo en cualquier momento?" },
  { name: "maintenance", pattern: /\b(mantenimient|mantenci[oó]n|taller)/i, section: "¿Qué pasa si mi auto está en mantenimiento?" },
  { name: "communication_pref", pattern: /\b(preferencia|canal|whatsapp|email|notificaci[oó]n)/i, section: "¿Puedo cambiar mi preferencia de comunicación?" },
  { name: "support_hours", pattern: /\b(horario|soporte|atenci[oó]n)/i, section: "¿Cuál es el horario de soporte?" },
  { name: "cancellation", pattern: /\b(cancel|cancelaci[oó]n)/i, section: "Un cliente canceló su reserva. ¿Recibo algo?" },
  { name: "dispute", pattern: /\b(disput|reclam|incorrect|err[oó]r)/i, section: "¿Cómo disputo un cargo o un descuento que considero incorrecto?" },
  { name: "my_income", pattern: /\b(cu[aá]nto|monto).{0,15}(gano|me pagan|recibir|liquid)/i, section: null },
  { name: "my_incidents", pattern: /\b(qu[eé]|cu[aá]les?|cu[aá]ntos?).{0,15}(incidente|problema)|incidentes?.{0,15}(tuve|tengo|mes|reciente)/i, section: null },
  { name: "my_fleet", pattern: /\b(mi flota|mis veh[ií]culos|cu[aá]ntos autos|estado.{0,10}flota)/i, section: null },
];

function routeIntent(q: string): { intent: string; section: string | null } {
  for (const r of INTENT_RULES) {
    if (r.pattern.test(q)) return { intent: r.name, section: r.section };
  }
  return { intent: "fallback", section: null };
}

function askLocal(question: string, faqText: string, ctx: OwnerContext): AssistantAnswer {
  const sections = parseFaqSections(faqText);
  const { intent, section } = routeIntent(question);

  if (section && sections[section]) {
    const excerpt = sections[section];
    let text = `Según el FAQ — **${section}**:\n\n${excerpt}`;
    if (intent === "when_pay") {
      const p = ctx.proxima_liquidacion;
      text += `\n\n**En tu caso:** tu próxima liquidación cubre ${p.periodo_inicio} → ${p.periodo_fin} y se acreditará el **${p.fecha_pago}**. Total estimado: ${formatCurrency(p.total_estimado)} (${p.reservas_incluidas} reservas).`;
    } else if (intent === "commission_calc") {
      const pct = ctx.plan?.comision_porcentaje ?? 0;
      text += `\n\n**En tu caso:** estás en plan **${ctx.plan?.plan}** → comisión **${pct}%** sobre (monto bruto − descuentos).`;
    }
    return { text, sources: [`faq.md#${section}`], mode: "local" };
  }

  if (intent === "my_income") {
    const p = ctx.proxima_liquidacion;
    return {
      text:
        `Tu próxima liquidación cubre ${p.periodo_inicio} → ${p.periodo_fin} (${p.reservas_incluidas} reservas) y se acreditará el **${p.fecha_pago}**.\n\n` +
        `Total estimado: **${formatCurrency(p.total_estimado)}** (plan ${ctx.plan?.plan}, comisión ${ctx.plan?.comision_porcentaje}%).\n\nDetalle por reserva en tu panel.`,
      sources: ["owner_data:proxima_liquidacion", "faq.md#¿Cuándo recibo mi pago?"],
      mode: "local",
    };
  }

  if (intent === "my_incidents") {
    const incs = ctx.incidentes_ultimos_30_dias;
    if (incs.length === 0) {
      return {
        text: "No registramos incidentes en tus vehículos en los últimos 30 días. ✅",
        sources: ["owner_data:incidentes"],
        mode: "local",
      };
    }
    const lines = [`Tienes **${incs.length} incidente(s)** en los últimos 30 días:`];
    for (const i of incs.slice(-10)) {
      lines.push(`- ${i.fecha} · ${i.tipo} (${i.reserva_id}) — ${formatCurrency(Number(i.monto_asociado))}`);
    }
    return { text: lines.join("\n"), sources: ["owner_data:incidentes"], mode: "local" };
  }

  if (intent === "my_fleet") {
    const vehs = ctx.vehiculos;
    const activos = vehs.filter((v) => v.estado_actual === "activo").length;
    const mant = vehs.length - activos;
    const lines = [`Tienes **${vehs.length} vehículos**: ${activos} activos, ${mant} en mantenimiento.`];
    for (const v of vehs) {
      lines.push(`- ${v.marca} ${v.modelo} ${v.ano} (${v.vehiculo_id}) — ${v.estado_actual}`);
    }
    return { text: lines.join("\n"), sources: ["owner_data:vehiculos"], mode: "local" };
  }

  // fallback: list available topics
  const titles = Object.keys(sections).map((t) => `- ${t}`).join("\n");
  return {
    text:
      `No identifiqué tu pregunta con suficiente certeza para responderla automáticamente. ` +
      `Estos son los temas que sí puedo responder hoy:\n\n${titles}\n\n` +
      `Si tu consulta es otra, escribe a soporte y un humano te responderá.`,
    sources: ["faq.md"],
    mode: "local",
  };
}

async function askLive(question: string, faqText: string, ctx: OwnerContext): Promise<AssistantAnswer> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const userMsg = `# FAQ FleetGo
${faqText}

# Datos del dueño (JSON)
\`\`\`json
${JSON.stringify(ctx, null, 2)}
\`\`\`

# Pregunta
${question}`;
  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = resp.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { type: string; text?: string }) => b.text ?? "")
    .join("\n");
  return { text, sources: ["faq.md", "owner_data"], mode: "live" };
}

export async function askAssistant(
  data: FleetData,
  dueno_id: string,
  question: string,
  reference: string,
  opts: { forceLocal?: boolean } = {},
): Promise<AssistantAnswer> {
  const ctx = buildOwnerContext(data, dueno_id, reference);
  if (!opts.forceLocal && process.env.ANTHROPIC_API_KEY) {
    try {
      return await askLive(question, data.faqText, ctx);
    } catch (err) {
      console.warn("[assistant] live mode failed, falling back to local:", err);
    }
  }
  return askLocal(question, data.faqText, ctx);
}
