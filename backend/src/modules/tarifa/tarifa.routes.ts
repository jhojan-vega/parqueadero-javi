import type { FastifyInstance } from 'fastify';
import {
  buscarTarifaPorId,
  crearTarifa,
  listarTarifas,
  listarTarifasVigentes,
} from './tarifa.service';
import type { CrearTarifa, TipoVehiculoTarifa } from './tarifa.types';

const tiposVehiculoValidos: TipoVehiculoTarifa[] = [
  'Carro',
  'Moto',
  'Bicicleta',
];

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esNumeroEnteroNoNegativo = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;

const esTipoVehiculoTarifa = (
  valor: unknown,
): valor is TipoVehiculoTarifa =>
  typeof valor === 'string' &&
  tiposVehiculoValidos.includes(valor as TipoVehiculoTarifa);

const esFechaHoraValida = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  valor.trim().length > 0 &&
  !Number.isNaN(Date.parse(valor));

const tieneSoloCampos = (
  datos: Record<string, unknown>,
  camposPermitidos: string[],
): boolean => Object.keys(datos).every((campo) => camposPermitidos.includes(campo));

const esIdValido = (id: string): boolean => /^\d+$/.test(id);

const validarCrearTarifa = (cuerpo: unknown): CrearTarifa | null => {
  if (!esObjeto(cuerpo) || !esTipoVehiculoTarifa(cuerpo.tipo_vehiculo)) {
    return null;
  }

  if (cuerpo.tipo_vehiculo === 'Bicicleta') {
    if (
      !tieneSoloCampos(cuerpo, [
        'tipo_vehiculo',
        'valor_pernocta',
        'valor_turno_am',
        'valor_turno_pm',
        'fecha_hora_inicio',
      ]) ||
      !esNumeroEnteroNoNegativo(cuerpo.valor_pernocta) ||
      !esNumeroEnteroNoNegativo(cuerpo.valor_turno_am) ||
      !esNumeroEnteroNoNegativo(cuerpo.valor_turno_pm) ||
      !esFechaHoraValida(cuerpo.fecha_hora_inicio)
    ) {
      return null;
    }

    return {
      tipo_vehiculo: 'Bicicleta',
      valor_pernocta: cuerpo.valor_pernocta,
      valor_turno_am: cuerpo.valor_turno_am,
      valor_turno_pm: cuerpo.valor_turno_pm,
      fecha_hora_inicio: cuerpo.fecha_hora_inicio.trim(),
    };
  }

  if (
    !tieneSoloCampos(cuerpo, [
      'tipo_vehiculo',
      'valor_inicial',
      'minutos_iniciales',
      'valor_fraccion',
      'minutos_fraccion',
      'valor_pernocta',
      'fecha_hora_inicio',
    ]) ||
    !esNumeroEnteroNoNegativo(cuerpo.valor_inicial) ||
    !esNumeroEnteroNoNegativo(cuerpo.minutos_iniciales) ||
    !esNumeroEnteroNoNegativo(cuerpo.valor_fraccion) ||
    !esNumeroEnteroNoNegativo(cuerpo.minutos_fraccion) ||
    !esNumeroEnteroNoNegativo(cuerpo.valor_pernocta) ||
    !esFechaHoraValida(cuerpo.fecha_hora_inicio)
  ) {
    return null;
  }

  return {
    tipo_vehiculo: cuerpo.tipo_vehiculo,
    valor_inicial: cuerpo.valor_inicial,
    minutos_iniciales: cuerpo.minutos_iniciales,
    valor_fraccion: cuerpo.valor_fraccion,
    minutos_fraccion: cuerpo.minutos_fraccion,
    valor_pernocta: cuerpo.valor_pernocta,
    fecha_hora_inicio: cuerpo.fecha_hora_inicio.trim(),
  };
};

export const rutasTarifa = async (app: FastifyInstance): Promise<void> => {
  app.get('/tarifas', async () => listarTarifas());

  app.get('/tarifas/vigentes', async () => listarTarifasVigentes());

  app.get<{ Params: { id: string } }>(
    '/tarifas/:id',
    async (solicitud, respuesta) => {
      if (!esIdValido(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de tarifa inválido' });
      }

      const tarifa = await buscarTarifaPorId(solicitud.params.id);

      if (!tarifa) {
        return respuesta.status(404).send({ mensaje: 'Tarifa no encontrada' });
      }

      return tarifa;
    },
  );

  app.post('/tarifas', async (solicitud, respuesta) => {
    const datos = validarCrearTarifa(solicitud.body);

    if (!datos) {
      return respuesta.status(400).send({ mensaje: 'Datos de tarifa inválidos' });
    }

    const tarifa = await crearTarifa(datos);
    return respuesta.status(201).send(tarifa);
  });
};
