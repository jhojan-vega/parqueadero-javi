export interface CrearAuditoriaInput {
  carros_fisico: number
  motos_fisico: number
  bicicletas_fisico: number
  observaciones?: string | null
}

export interface Auditoria {
  id_auditoria: string
  fecha_hora: string
  id_administrador_auditor: string
  id_operador_auditado: string
  id_caja: string | null
  carros_sistema: number
  carros_fisico: number
  motos_sistema: number
  motos_fisico: number
  bicicletas_sistema: number
  bicicletas_fisico: number
  observaciones: string | null
}

export interface AuditoriaHistorial extends Auditoria {
  diferencia_carros: number
  diferencia_motos: number
  diferencia_bicicletas: number
}

export interface FiltrosAuditoria {
  id_operador_auditado?: string
  id_administrador_auditor?: string
  fecha_desde?: string
  fecha_hasta?: string
}
