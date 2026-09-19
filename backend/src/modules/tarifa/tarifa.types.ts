export type TipoVehiculoTarifa = 'Carro' | 'Moto' | 'Bicicleta';

export interface Tarifa {
  id_tarifa: string;
  tipo_vehiculo: TipoVehiculoTarifa;
  valor_inicial: number | null;
  minutos_iniciales: number | null;
  valor_fraccion: number | null;
  minutos_fraccion: number | null;
  valor_pernocta: number;
  valor_turno_am: number | null;
  valor_turno_pm: number | null;
  fecha_hora_inicio: Date;
}

export interface CrearTarifaCarroMoto {
  tipo_vehiculo: 'Carro' | 'Moto';
  valor_inicial: number;
  minutos_iniciales: number;
  valor_fraccion: number;
  minutos_fraccion: number;
  valor_pernocta: number;
  fecha_hora_inicio: string;
}

export interface CrearTarifaBicicleta {
  tipo_vehiculo: 'Bicicleta';
  valor_pernocta: number;
  valor_turno_am: number;
  valor_turno_pm: number;
  fecha_hora_inicio: string;
}

export type CrearTarifa = CrearTarifaCarroMoto | CrearTarifaBicicleta;
