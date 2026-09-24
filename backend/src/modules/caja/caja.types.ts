export type TurnoCaja = 'AM' | 'PM' | 'T1' | 'T2' | 'T3';
export type EstadoCaja = 'abierta' | 'cerrada' | 'pendiente';

export interface Caja {
  id_caja: string;
  turno: TurnoCaja;
  fecha_hora_apertura: Date;
  fecha_hora_cierre: Date | null;
  recaudo_total: number;
  total_efectivo: number;
  total_nequi: number;
  efectivo_real: number | null;
  faltante_caja: number;
  sobrante_caja: number;
  id_colaborador: string;
  estado: EstadoCaja;
  novedades: string | null;
  id_administrador_regulariza: string | null;
  fecha_hora_regularizacion: Date | null;
}

export type ResultadoAperturaCaja =
  | { resultado: 'abierta'; caja: Caja }
  | { resultado: 'colaborador_no_encontrado' }
  | { resultado: 'colaborador_inactivo' }
  | { resultado: 'rol_no_permitido' };

export interface VerificacionCaja {
  recaudo_total: number;
  total_efectivo: number;
  total_nequi: number;
  efectivo_real: number;
  faltante_caja: number;
  sobrante_caja: number;
}

export type ResultadoVerificacionCaja =
  | { resultado: 'verificada'; verificacion: VerificacionCaja }
  | { resultado: 'no_encontrada' }
  | { resultado: 'no_abierta' };

export type ResultadoCierreCaja =
  | { resultado: 'cerrada'; caja: Caja }
  | { resultado: 'no_encontrada' }
  | { resultado: 'no_abierta' };

export interface FiltrosHistorialCajas {
  id_colaborador?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface CajaHistorial {
  id_caja: string;
  turno: TurnoCaja;
  fecha_hora_apertura: Date;
  fecha_hora_cierre: Date | null;
  id_colaborador: string;
  nombre_colaborador: string;
  recaudo_total: number;
  total_efectivo: number;
  total_nequi: number;
  efectivo_real: number | null;
  faltante_caja: number;
  sobrante_caja: number;
  estado: EstadoCaja;
  novedades: string | null;
}

export interface ResumenFaltantesColaborador {
  id_colaborador: string;
  nombre: string;
  cantidad_cajas_con_faltante: number;
  total_faltantes: number;
}

export type ResultadoActualizarNovedadesCaja =
  | { resultado: 'actualizada'; caja: Caja }
  | { resultado: 'no_encontrada' }
  | { resultado: 'no_cerrada' };
