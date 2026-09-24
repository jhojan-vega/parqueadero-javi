BEGIN;

SET LOCAL TIME ZONE 'America/Bogota';

ALTER TABLE tarifa
  ALTER COLUMN valor_pernocta DROP NOT NULL;

DO $$
DECLARE
  restriccion RECORD;
BEGIN
  FOR restriccion IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'caja'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%turno%'
  LOOP
    EXECUTE format('ALTER TABLE caja DROP CONSTRAINT %I', restriccion.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'caja'::regclass
      AND conname = 'chk_caja_turno_operativo'
  ) THEN
    ALTER TABLE caja
      ADD CONSTRAINT chk_caja_turno_operativo
      CHECK (turno IN ('AM', 'PM', 'T1', 'T2', 'T3'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_validar_horario_entrada ON servicio;
DROP FUNCTION IF EXISTS validar_horario_entrada();

CREATE OR REPLACE FUNCTION calcular_tarifa_diurna(p_minutos INTEGER, p_id_tarifa BIGINT)
RETURNS INTEGER AS $$
DECLARE
  vi INTEGER;
  mi INTEGER;
  vf INTEGER;
  mf INTEGER;
BEGIN
  SELECT valor_inicial, minutos_iniciales, valor_fraccion, minutos_fraccion
  INTO vi, mi, vf, mf
  FROM tarifa
  WHERE id_tarifa = p_id_tarifa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarifa % no encontrada', p_id_tarifa;
  END IF;

  IF vi IS NULL OR mi IS NULL OR vf IS NULL OR mf IS NULL OR mf <= 0 THEN
    RAISE EXCEPTION 'Tarifa % no corresponde al modelo vigente por minutos', p_id_tarifa;
  END IF;

  IF p_minutos <= mi THEN
    RETURN vi;
  END IF;

  RETURN vi + CEIL((p_minutos - mi)::NUMERIC / mf)::INTEGER * vf;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_tarifa_servicio(
  p_entrada TIMESTAMP,
  p_salida TIMESTAMP,
  p_id_tarifa BIGINT
)
RETURNS INTEGER AS $$
DECLARE
  minutos_cobrables INTEGER;
BEGIN
  IF p_salida < p_entrada THEN
    RAISE EXCEPTION 'La salida no puede ser anterior a la entrada';
  END IF;

  minutos_cobrables := CEIL(EXTRACT(EPOCH FROM (p_salida - p_entrada)) / 60)::INTEGER;
  RETURN calcular_tarifa_diurna(minutos_cobrables, p_id_tarifa);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_tarifa_bicicleta(
  p_entrada TIMESTAMP,
  p_salida TIMESTAMP,
  p_id_tarifa BIGINT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN calcular_tarifa_servicio(p_entrada, p_salida, p_id_tarifa);
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN tarifa.valor_pernocta IS
  'Campo legacy del modelo anterior; las tarifas vigentes de 24 horas lo almacenan como NULL.';
COMMENT ON COLUMN tarifa.valor_turno_am IS
  'Campo legacy del modelo anterior de Bicicleta; las tarifas vigentes de 24 horas lo almacenan como NULL.';
COMMENT ON COLUMN tarifa.valor_turno_pm IS
  'Campo legacy del modelo anterior de Bicicleta; las tarifas vigentes de 24 horas lo almacenan como NULL.';

DO $$
DECLARE
  corte TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tarifa (
    tipo_vehiculo, valor_inicial, minutos_iniciales,
    valor_fraccion, minutos_fraccion,
    valor_pernocta, valor_turno_am, valor_turno_pm, fecha_hora_inicio
  )
  SELECT valores.tipo_vehiculo, valores.valor_inicial, valores.minutos_iniciales,
         valores.valor_fraccion, valores.minutos_fraccion,
         NULL, NULL, NULL, corte
  FROM (
    VALUES
      ('Carro'::VARCHAR, 3000, 120, 300, 20),
      ('Moto'::VARCHAR, 2000, 120, 200, 20),
      ('Bicicleta'::VARCHAR, 1000, 240, 200, 60)
  ) AS valores(tipo_vehiculo, valor_inicial, minutos_iniciales, valor_fraccion, minutos_fraccion)
  WHERE NOT EXISTS (
    SELECT 1
    FROM tarifa existente
    WHERE existente.tipo_vehiculo = valores.tipo_vehiculo
      AND existente.fecha_hora_inicio <= corte
      AND existente.valor_pernocta IS NULL
      AND existente.valor_turno_am IS NULL
      AND existente.valor_turno_pm IS NULL
      AND existente.valor_inicial = valores.valor_inicial
      AND existente.minutos_iniciales = valores.minutos_iniciales
      AND existente.valor_fraccion = valores.valor_fraccion
      AND existente.minutos_fraccion = valores.minutos_fraccion
  );

  INSERT INTO tarifa (
    tipo_vehiculo, valor_inicial, minutos_iniciales,
    valor_fraccion, minutos_fraccion,
    valor_pernocta, valor_turno_am, valor_turno_pm, fecha_hora_inicio
  )
  SELECT DISTINCT ON (legacy.tipo_vehiculo, legacy.fecha_hora_inicio)
    legacy.tipo_vehiculo,
    CASE legacy.tipo_vehiculo WHEN 'Carro' THEN 3000 WHEN 'Moto' THEN 2000 ELSE 1000 END,
    CASE legacy.tipo_vehiculo WHEN 'Bicicleta' THEN 240 ELSE 120 END,
    CASE legacy.tipo_vehiculo WHEN 'Carro' THEN 300 WHEN 'Moto' THEN 200 ELSE 200 END,
    CASE legacy.tipo_vehiculo WHEN 'Bicicleta' THEN 60 ELSE 20 END,
    NULL, NULL, NULL, legacy.fecha_hora_inicio
  FROM tarifa legacy
  WHERE legacy.fecha_hora_inicio > corte
    AND (
      (legacy.tipo_vehiculo IN ('Carro', 'Moto') AND legacy.valor_pernocta IS NOT NULL)
      OR (legacy.tipo_vehiculo = 'Bicicleta' AND (
        legacy.valor_turno_am IS NOT NULL
        OR legacy.valor_turno_pm IS NOT NULL
        OR legacy.valor_pernocta IS NOT NULL
      ))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM tarifa nueva
      WHERE nueva.tipo_vehiculo = legacy.tipo_vehiculo
        AND nueva.fecha_hora_inicio = legacy.fecha_hora_inicio
        AND nueva.valor_pernocta IS NULL
        AND nueva.valor_turno_am IS NULL
        AND nueva.valor_turno_pm IS NULL
    )
  ORDER BY legacy.tipo_vehiculo, legacy.fecha_hora_inicio;

  WITH tarifas_nuevas AS (
    SELECT DISTINCT ON (tipo_vehiculo) id_tarifa, tipo_vehiculo
    FROM tarifa
    WHERE fecha_hora_inicio <= corte
      AND valor_pernocta IS NULL
      AND valor_turno_am IS NULL
      AND valor_turno_pm IS NULL
    ORDER BY tipo_vehiculo, fecha_hora_inicio DESC, id_tarifa DESC
  )
  UPDATE servicio servicio_activo
  SET id_tarifa = tarifa_nueva.id_tarifa
  FROM tarifas_nuevas tarifa_nueva
  WHERE servicio_activo.estado = 'activo'
    AND servicio_activo.tipo_vehiculo = tarifa_nueva.tipo_vehiculo
    AND servicio_activo.id_tarifa <> tarifa_nueva.id_tarifa;
END;
$$;

COMMIT;
