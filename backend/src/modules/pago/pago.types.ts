import type { TipoVehiculoServicio } from '../servicio/servicio.types';

export type MedioPago = 'Efectivo' | 'Nequi';

export interface RegistrarSalidaServicio {
  id_caja: string;
  id_colaborador: string;
  medio_pago: MedioPago;
  referencia_nequi?: string | null;
}

export interface ReciboSalidaServicio {
  id_servicio: string;
  codigo_recibo: string;
  placa: string | null;
  identificacion_usuario: string | null;
  tipo_vehiculo: TipoVehiculoServicio;
  fecha_hora_entrada: Date;
  fecha_hora_salida: Date;
  tiempo_total: number;
  valor_calculado: number;
  valor_pagado: number;
  medio_pago: MedioPago;
  id_pago: string;
  id_caja: string;
  turno: 'AM' | 'PM' | 'T1' | 'T2' | 'T3';
  id_colaborador_salida: string;
}

export type ResultadoSalidaConPago =
  | { resultado: 'completada'; recibo: ReciboSalidaServicio }
  | { resultado: 'servicio_no_encontrado' }
  | { resultado: 'servicio_finalizado' }
  | { resultado: 'caja_no_encontrada' }
  | { resultado: 'caja_no_abierta' }
  | { resultado: 'caja_no_corresponde_colaborador' }
  | { resultado: 'colaborador_no_encontrado' }
  | { resultado: 'colaborador_inactivo' };
