import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { probarConexion } from './config/database';
import { registrarRutas } from './routes';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET debe estar definida en las variables de entorno');
}

const app = Fastify({
  logger: true,
});

app.register(fastifyJwt, { secret: jwtSecret });

app.get('/', async () => {
  return {
    sistema: 'SIGP - Parqueadero Javi',
    estado: 'Backend funcionando',
  };
});

app.register(registrarRutas);

const iniciarServidor = async () => {
  try {
    const conexion = await probarConexion();
    app.log.info({ conexion }, 'PostgreSQL conectado correctamente');
    await app.listen({
      port: 3000,
      host: '0.0.0.0',
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

iniciarServidor();
