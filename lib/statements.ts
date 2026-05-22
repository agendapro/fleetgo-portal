import type {
  FleetData,
  Statement,
  StatementIncidente,
  StatementLine,
} from "./types";
import { commissionFor, ownerById } from "./data";

/**
 * Returns [periodo_inicio, periodo_fin, fecha_pago] for the biweekly cycle that closes on or just before `reference`.
 * Cycles:
 *  - Day 1..15: previous cycle was 16..end-of-prev-month → payout the 15th of current month.
 *  - Day 16..end: current cycle is 1..15 of current month → payout the last day of current month.
 */
export function biweeklyPeriod(reference: string): { start: string; end: string; payout: string } {
  const refDate = new Date(reference + "T00:00:00");
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  function lastDay(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
  function iso(y: number, m: number, d: number): string {
    return `${y.toString().padStart(4, "0")}-${(m + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  }

  if (refDay <= 15) {
    let prevYear = refYear;
    let prevMonth = refMonth - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = refYear - 1;
    }
    const start = iso(prevYear, prevMonth, 16);
    const end = iso(prevYear, prevMonth, lastDay(prevYear, prevMonth));
    const payout = iso(refYear, refMonth, 15);
    return { start, end, payout };
  } else {
    const start = iso(refYear, refMonth, 1);
    const end = iso(refYear, refMonth, 15);
    const payout = iso(refYear, refMonth, lastDay(refYear, refMonth));
    return { start, end, payout };
  }
}

/** Build a single owner's statement for the given closed period. */
export function buildStatement(
  data: FleetData,
  dueno_id: string,
  periodoInicio: string,
  periodoFin: string,
  fechaPago: string,
): Statement {
  const dueno = ownerById(data, dueno_id);
  if (!dueno) {
    throw new Error(`Dueño no encontrado: ${dueno_id}`);
  }
  const plan = commissionFor(data, dueno.plan_comision);
  const pct = plan?.comision_porcentaje ?? 0;

  const vehLookup = new Map(data.vehiculos.map((v) => [v.vehiculo_id, v]));
  const incsByReserva = new Map<string, ReturnType<typeof Object>>();
  for (const i of data.incidentes) {
    if (!incsByReserva.has(i.reserva_id)) incsByReserva.set(i.reserva_id, [] as never);
    (incsByReserva.get(i.reserva_id) as unknown as typeof data.incidentes).push(i as never);
  }

  const inPeriod = data.reservas
    .filter(
      (r) =>
        r.dueno_id === dueno_id &&
        r.estado === "completada" &&
        r.fecha_fin >= periodoInicio &&
        r.fecha_fin <= periodoFin,
    )
    .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin));

  const lineas: StatementLine[] = [];
  const incidentes_detalle: StatementIncidente[] = [];

  for (const r of inPeriod) {
    const bruto = Number(r.monto_bruto) || 0;
    const desc = Number(r.descuento) || 0;
    const base = bruto - desc;
    const comision = Math.round((base * pct) / 100);

    const incs = (incsByReserva.get(r.reserva_id) as unknown as typeof data.incidentes) ?? [];
    let incTotal = 0;
    for (const inc of incs) {
      const monto = Number(inc.monto_asociado) || 0;
      if (inc.tipo === "reclamo_cliente") {
        incTotal -= monto;
        incidentes_detalle.push({
          reserva_id: r.reserva_id,
          incidente_id: inc.incidente_id,
          tipo: inc.tipo,
          fecha: inc.fecha,
          monto,
          signo: "-",
          descripcion: inc.descripcion,
        });
      } else {
        incTotal += monto;
        incidentes_detalle.push({
          reserva_id: r.reserva_id,
          incidente_id: inc.incidente_id,
          tipo: inc.tipo,
          fecha: inc.fecha,
          monto,
          signo: "+",
          descripcion: inc.descripcion,
        });
      }
    }
    const neto = base - comision + incTotal;
    const veh = vehLookup.get(r.vehiculo_id);
    const vehLabel = `${veh?.marca ?? "?"} ${veh?.modelo ?? "?"} (${r.vehiculo_id})`;
    lineas.push({
      reserva_id: r.reserva_id,
      vehiculo: vehLabel,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      monto_bruto: bruto,
      descuento: desc,
      base_comision: base,
      comision,
      incidentes_brutos: incTotal,
      neto,
    });
  }

  const totals = lineas.reduce(
    (acc, l) => {
      acc.total_bruto += l.monto_bruto;
      acc.total_descuentos += l.descuento;
      acc.total_comision += l.comision;
      acc.total_incidentes += l.incidentes_brutos;
      acc.total_neto += l.neto;
      return acc;
    },
    { total_bruto: 0, total_descuentos: 0, total_comision: 0, total_incidentes: 0, total_neto: 0 },
  );

  return {
    dueno_id,
    dueno_nombre: dueno.nombre,
    plan: dueno.plan_comision,
    porcentaje_comision: pct,
    periodo_inicio: periodoInicio,
    periodo_fin: periodoFin,
    fecha_pago: fechaPago,
    lineas,
    incidentes_detalle,
    ...totals,
    reservas_count: lineas.length,
  };
}

export function buildStatementForReference(data: FleetData, dueno_id: string, reference: string): Statement {
  const { start, end, payout } = biweeklyPeriod(reference);
  return buildStatement(data, dueno_id, start, end, payout);
}
