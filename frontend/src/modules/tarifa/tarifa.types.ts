export type TipoTarifa = 'Carro' | 'Moto' | 'Bicicleta'
export interface Tarifa { id_tarifa: string; tipo_vehiculo: TipoTarifa; valor_inicial: number | null; minutos_iniciales: number | null; valor_fraccion: number | null; minutos_fraccion: number | null; valor_pernocta: number | null; valor_turno_am: number | null; valor_turno_pm: number | null; fecha_hora_inicio: string }
export interface CrearTarifaInput { tipo_vehiculo: TipoTarifa; valor_inicial: number; minutos_iniciales: number; valor_fraccion: number; minutos_fraccion: number; fecha_hora_inicio: string }
