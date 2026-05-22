import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type {
  Comision,
  Dueno,
  FleetData,
  Incidente,
  Reserva,
  Vehiculo,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function loadCsv<T>(filename: string): Promise<T[]> {
  const text = await readFile(path.join(DATA_DIR, filename), "utf-8");
  const parsed = Papa.parse<T>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return parsed.data.filter((row) => row && Object.keys(row as object).length > 0);
}

let cache: FleetData | null = null;

export async function loadFleetData(): Promise<FleetData> {
  if (cache) return cache;

  const [reservas, vehiculos, duenos, incidentesRaw, comisiones, faqText] = await Promise.all([
    loadCsv<Reserva>("reservas.csv"),
    loadCsv<Vehiculo>("vehiculos.csv"),
    loadCsv<Dueno>("duenos.csv"),
    loadCsv<Incidente>("incidentes.csv"),
    loadCsv<Comision>("comisiones.csv"),
    readFile(path.join(DATA_DIR, "faq.md"), "utf-8"),
  ]);

  // Cross-link incidentes → reserva for dueno_id and vehiculo_id
  const reservaIndex = new Map(reservas.map((r) => [r.reserva_id, r]));
  const incidentes: Incidente[] = incidentesRaw.map((i) => {
    const r = reservaIndex.get(i.reserva_id);
    return {
      ...i,
      vehiculo_id: r?.vehiculo_id,
      dueno_id: r?.dueno_id,
    };
  });

  cache = {
    reservas,
    vehiculos,
    duenos,
    incidentes,
    comisiones,
    faqText,
  };
  return cache;
}

export function ownerById(data: FleetData, dueno_id: string): Dueno | undefined {
  return data.duenos.find((d) => d.dueno_id === dueno_id);
}

export function commissionFor(data: FleetData, plan: string): Comision | undefined {
  return data.comisiones.find((c) => c.plan === plan);
}
