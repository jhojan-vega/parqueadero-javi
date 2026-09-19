export type TipoVehiculoServicio = 'Carro' | 'Moto' | 'Bicicleta';
export type EstadoServicio = 'activo' | 'finalizado';

export interface Servicio {
  id_servicio: string;
  codigo_recibo: string;
  placa: string | null;
  identificacion_usuario: string | null;
  tipo_vehiculo: TipoVehiculoServicio;
  vehiculo_especial: boolean;
  fecha_hora_entrada: Date;
  fecha_hora_salida: Date | null;
  tiempo_total: number | null;
  estado: EstadoServicio;
  valor_calculado: number | null;
  id_tarifa: string;
  id_colaborador_entrada: string;
  id_colaborador_salida: string | null;
}

export interface CrearEntradaCarroMoto {
  tipo_vehiculo: 'Carro' | 'Moto';
  placa: string;
  vehiculo_especial?: boolean;
  id_colaborador_entrada: string;
}

export interface CrearEntradaBicicleta {
  tipo_vehiculo: 'Bicicleta';
  identificacion_usuario: string;
  id_colaborador_entrada: string;
}

export type CrearEntradaServicio =
  | CrearEntradaCarroMoto
  | CrearEntradaBicicleta;

export interface DisponibilidadTipoVehiculo {
  capacidad: number;
  ocupados: number;
  disponibles: number;
}

export interface DisponibilidadServicios {
  Carro: DisponibilidadTipoVehiculo;
  Moto: DisponibilidadTipoVehiculo;
  Bicicleta: DisponibilidadTipoVehiculo;
}

export type ResultadoEntradaServicio =
  | { resultado: 'registrado'; servicio: Servicio }
  | { resultado: 'colaborador_no_encontrado' }
  | { resultado: 'tarifa_no_encontrada' }
  | { resultado: 'sin_cupo' };

export interface CalculoSalidaServicio {
  id_servicio: string;
  codigo_recibo: string;
  placa: string | null;
  identificacion_usuario: string | null;
  tipo_vehiculo: TipoVehiculoServicio;
  fecha_hora_entrada: Date;
  fecha_hora_salida_calculada: Date;
  tiempo_total_minutos: number;
  valor_calculado: number;
  id_tarifa: string;
}

export type ResultadoCalculoSalidaServicio =
  | { resultado: 'calculado'; calculo: CalculoSalidaServicio }
  | { resultado: 'no_encontrado' }
  | { resultado: 'finalizado' };
