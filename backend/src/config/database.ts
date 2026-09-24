import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: '-c timezone=America/Bogota',
});

export const probarConexion = async () => {
  const resultado = await pool.query('SELECT NOW() AS fecha_hora');
  return resultado.rows[0];
};
