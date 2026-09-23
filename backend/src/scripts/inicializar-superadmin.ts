import { hash } from 'bcryptjs';
import { pool } from '../config/database';

const bloqueoInicializacionSuperadmin = 694305013;

const inicializarSuperadministrador = async (): Promise<void> => {
  let contrasena = process.env.SUPERADMIN_PASSWORD;

  if (!contrasena || contrasena.length < 4) {
    console.error(
      'La variable SUPERADMIN_PASSWORD debe contener una contraseña de al menos 4 caracteres.',
    );
    process.exitCode = 1;
    return;
  }

  const cliente = await pool.connect();
  let transaccionAbierta = false;

  try {
    await cliente.query('BEGIN');
    transaccionAbierta = true;

    await cliente.query('SELECT pg_advisory_xact_lock($1::bigint);', [
      bloqueoInicializacionSuperadmin,
    ]);

    const ingenieroExistente = await cliente.query(
      `
        SELECT 1
        FROM colaborador
        WHERE rol = $1
        LIMIT 1;
      `,
      ['Ingeniero'],
    );

    if (ingenieroExistente.rowCount !== null && ingenieroExistente.rowCount > 0) {
      await cliente.query('ROLLBACK');
      transaccionAbierta = false;
      console.error(
        'La inicialización fue cancelada: ya existe un colaborador con rol Ingeniero.',
      );
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hash(contrasena, 12);

    await cliente.query(
      `
        INSERT INTO colaborador (
          nombre,
          documento,
          usuario,
          correo,
          password_hash,
          requiere_cambio_contrasena,
          rol,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `,
      [
        'Superadministrador',
        'SUPERADMIN-001',
        'superadmin',
        null,
        passwordHash,
        false,
        'Ingeniero',
        'activo',
      ],
    );

    await cliente.query('COMMIT');
    transaccionAbierta = false;
    console.log('Cuenta Superadministrador inicializada correctamente.');
  } catch {
    if (transaccionAbierta) {
      await cliente.query('ROLLBACK');
    }

    console.error('No fue posible inicializar la cuenta Superadministrador.');
    process.exitCode = 1;
  } finally {
    contrasena = '';
    delete process.env.SUPERADMIN_PASSWORD;
    cliente.release();
    await pool.end();
  }
};

void inicializarSuperadministrador();
