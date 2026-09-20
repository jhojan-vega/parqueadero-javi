export interface CrearAuditoria {
  id_administrador_auditor: string;
  id_operador_auditado: string;
  id_caja: string;
  carros_fisico: number;
  motos_fisico: number;
  bicicletas_fisico: number;
  observaciones?: string | null;
}

export interface Auditoria {
  id_auditoria: string;
  fecha_hora: Date;
  id_administrador_auditor: string;
  id_operador_auditado: string;
  id_caja: string | null;
  carros_sistema: number;
  carros_fisico: number;
  motos_sistema: number;
  motos_fisico: number;
  bicicletas_sistema: number;
  bicicletas_fisico: number;
  observaciones: string | null;
}

export interface AuditoriaHistorial extends Auditoria {
  diferencia_carros: number;
  diferencia_motos: number;
  diferencia_bicicletas: number;
}

export interface FiltrosHistorialAuditorias {
  id_operador_auditado?: string;
  id_administrador_auditor?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export type ResultadoCrearAuditoria =
  | { resultado: 'creada'; auditoria: Auditoria }
  | { resultado: 'administrador_no_encontrado' }
  | { resultado: 'administrador_inactivo' }
  | { resultado: 'administrador_sin_rol' }
  | { resultado: 'operador_no_encontrado' }
  | { resultado: 'caja_no_encontrada' }
  | { resultado: 'caja_no_corresponde_operador' };
