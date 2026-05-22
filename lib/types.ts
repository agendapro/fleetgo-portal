export type Reserva = {
  reserva_id: string;
  vehiculo_id: string;
  dueno_id: string;
  fecha_inicio: string; // ISO yyyy-mm-dd
  fecha_fin: string;
  monto_bruto: number;
  descuento: number;
  estado: "completada" | "cancelada" | "en_curso";
};

export type Vehiculo = {
  vehiculo_id: string;
  dueno_id: string;
  marca: string;
  modelo: string;
  ano: number;
  estado_actual: "activo" | "en_mantenimiento";
};

export type Dueno = {
  dueno_id: string;
  nombre: string;
  email: string;
  telefono: string;
  plan_comision: "basico" | "pro" | "premium";
  preferencia_comunicacion: "email" | "whatsapp" | "ambos";
};

export type Incidente = {
  incidente_id: string;
  reserva_id: string;
  tipo: string;
  fecha: string;
  monto_asociado: number;
  descripcion: string;
  // joined
  vehiculo_id?: string;
  dueno_id?: string;
};

export type Comision = {
  plan: "basico" | "pro" | "premium";
  comision_porcentaje: number;
  monto_minimo_mensual: number;
  incluye_seguro_basico: "si" | "no";
  soporte_prioritario: "si" | "no";
  descripcion: string;
};

export type FleetData = {
  reservas: Reserva[];
  vehiculos: Vehiculo[];
  duenos: Dueno[];
  incidentes: Incidente[];
  comisiones: Comision[];
  faqText: string;
};

export type StatementLine = {
  reserva_id: string;
  vehiculo: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_bruto: number;
  descuento: number;
  base_comision: number;
  comision: number;
  incidentes_brutos: number;
  neto: number;
};

export type StatementIncidente = {
  reserva_id: string;
  incidente_id: string;
  tipo: string;
  fecha: string;
  monto: number;
  signo: "+" | "-";
  descripcion: string;
};

export type Statement = {
  dueno_id: string;
  dueno_nombre: string;
  plan: string;
  porcentaje_comision: number;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago: string;
  lineas: StatementLine[];
  incidentes_detalle: StatementIncidente[];
  total_bruto: number;
  total_descuentos: number;
  total_comision: number;
  total_incidentes: number;
  total_neto: number;
  reservas_count: number;
};

export type Severity = "urgent" | "warning" | "info";

export type IncidentAlert = {
  incidente_id: string;
  reserva_id: string;
  dueno_id: string;
  vehiculo_id: string;
  tipo: string;
  fecha: string;
  monto: number;
  descripcion: string;
  severity: Severity;
};

export type AssistantAnswer = {
  text: string;
  sources: string[];
  mode: "live" | "local";
};
