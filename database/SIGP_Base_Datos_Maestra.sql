-- SIGP - PARQUEADERO JAVI
-- BASE DE DATOS MAESTRA - PostgreSQL 17
-- Instalacion desde cero. Version consolidada: 2026-09-20
-- No contiene datos operativos de prueba.

BEGIN;

CREATE TABLE colaborador (
 id_colaborador BIGSERIAL PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL,
 documento VARCHAR(30) NOT NULL UNIQUE,
 usuario VARCHAR(80) NOT NULL UNIQUE,
 correo VARCHAR(150),
 password_hash TEXT NOT NULL,
 requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT FALSE,
 rol VARCHAR(20) NOT NULL CHECK (rol IN ('Vigilante','Administrador','Ingeniero')),
 estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
);

CREATE TABLE recuperacion_contrasena (
 id_recuperacion BIGSERIAL PRIMARY KEY,
 id_colaborador BIGINT NOT NULL REFERENCES colaborador(id_colaborador),
 codigo_hash VARCHAR(64) NOT NULL,
 fecha_hora_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_hora_expiracion TIMESTAMP NOT NULL,
 intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0 AND intentos <= 3),
 utilizado BOOLEAN NOT NULL DEFAULT FALSE,
 invalidado BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_recuperacion_contrasena_colaborador ON recuperacion_contrasena(id_colaborador, fecha_hora_creacion DESC);

CREATE TABLE tarifa (
 id_tarifa BIGSERIAL PRIMARY KEY,
 tipo_vehiculo VARCHAR(20) NOT NULL CHECK (tipo_vehiculo IN ('Carro','Moto','Bicicleta')),
 valor_inicial INTEGER,
 minutos_iniciales INTEGER,
 valor_fraccion INTEGER,
 minutos_fraccion INTEGER,
 valor_pernocta INTEGER,
 valor_turno_am INTEGER,
 valor_turno_pm INTEGER,
 fecha_hora_inicio TIMESTAMP NOT NULL
);
CREATE INDEX idx_tarifa_tipo_inicio ON tarifa(tipo_vehiculo, fecha_hora_inicio DESC);

CREATE SEQUENCE recibo_carro_seq START WITH 1;
CREATE SEQUENCE recibo_moto_seq START WITH 1;
CREATE SEQUENCE recibo_bicicleta_seq START WITH 1;

CREATE TABLE servicio (
 id_servicio BIGSERIAL PRIMARY KEY,
 codigo_recibo VARCHAR(10) NOT NULL UNIQUE,
 placa VARCHAR(30),
 identificacion_usuario VARCHAR(50),
 tipo_vehiculo VARCHAR(20) NOT NULL CHECK (tipo_vehiculo IN ('Carro','Moto','Bicicleta')),
 vehiculo_especial BOOLEAN NOT NULL DEFAULT FALSE,
 fecha_hora_entrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_hora_salida TIMESTAMP,
 tiempo_total INTEGER,
 estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','finalizado')),
 valor_calculado INTEGER,
 id_tarifa BIGINT NOT NULL REFERENCES tarifa(id_tarifa),
 id_colaborador_entrada BIGINT NOT NULL REFERENCES colaborador(id_colaborador),
 id_colaborador_salida BIGINT REFERENCES colaborador(id_colaborador)
);

CREATE UNIQUE INDEX uq_placa_servicio_activo
ON servicio(UPPER(placa)) WHERE estado='activo' AND placa IS NOT NULL;

CREATE OR REPLACE FUNCTION generar_codigo_recibo() RETURNS TRIGGER AS $$
BEGIN
 IF NEW.codigo_recibo IS NULL THEN
  CASE NEW.tipo_vehiculo
   WHEN 'Carro' THEN NEW.codigo_recibo := 'C-'||LPAD(nextval('recibo_carro_seq')::TEXT,6,'0');
   WHEN 'Moto' THEN NEW.codigo_recibo := 'M-'||LPAD(nextval('recibo_moto_seq')::TEXT,6,'0');
   WHEN 'Bicicleta' THEN NEW.codigo_recibo := 'B-'||LPAD(nextval('recibo_bicicleta_seq')::TEXT,6,'0');
  END CASE;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_generar_codigo_recibo BEFORE INSERT ON servicio
FOR EACH ROW EXECUTE FUNCTION generar_codigo_recibo();

CREATE OR REPLACE FUNCTION calcular_tarifa_diurna(p_minutos INTEGER,p_id_tarifa BIGINT)
RETURNS INTEGER AS $$
DECLARE vi INTEGER; mi INTEGER; vf INTEGER; mf INTEGER;
BEGIN
 SELECT valor_inicial,minutos_iniciales,valor_fraccion,minutos_fraccion
 INTO vi,mi,vf,mf FROM tarifa WHERE id_tarifa=p_id_tarifa;
 IF NOT FOUND THEN RAISE EXCEPTION 'Tarifa % no encontrada',p_id_tarifa; END IF;
 IF vi IS NULL OR mi IS NULL OR vf IS NULL OR mf IS NULL OR mf <= 0 THEN
  RAISE EXCEPTION 'Tarifa % no corresponde al modelo vigente por minutos',p_id_tarifa;
 END IF;
 IF p_minutos <= mi THEN RETURN vi; END IF;
 RETURN vi + CEIL((p_minutos-mi)::NUMERIC/mf)::INTEGER*vf;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_tarifa_servicio(p_entrada TIMESTAMP,p_salida TIMESTAMP,p_id_tarifa BIGINT)
RETURNS INTEGER AS $$
DECLARE mt INTEGER;
BEGIN
 IF p_salida<p_entrada THEN RAISE EXCEPTION 'La salida no puede ser anterior a la entrada'; END IF;
 mt:=CEIL(EXTRACT(EPOCH FROM(p_salida-p_entrada))/60)::INTEGER;
 RETURN calcular_tarifa_diurna(mt,p_id_tarifa);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_tarifa_bicicleta(p_entrada TIMESTAMP,p_salida TIMESTAMP,p_id_tarifa BIGINT)
RETURNS INTEGER AS $$
BEGIN
 IF p_salida<p_entrada THEN RAISE EXCEPTION 'La salida no puede ser anterior a la entrada'; END IF;
 RETURN calcular_tarifa_servicio(p_entrada,p_salida,p_id_tarifa);
END; $$ LANGUAGE plpgsql;

CREATE TABLE caja (
 id_caja BIGSERIAL PRIMARY KEY,
 turno VARCHAR(10) NOT NULL CHECK(turno IN('AM','PM','T1','T2','T3')),
 fecha_hora_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_hora_cierre TIMESTAMP,
 recaudo_total INTEGER NOT NULL DEFAULT 0,
 total_efectivo INTEGER NOT NULL DEFAULT 0,
 total_nequi INTEGER NOT NULL DEFAULT 0,
 efectivo_real INTEGER,
 faltante_caja INTEGER NOT NULL DEFAULT 0,
 sobrante_caja INTEGER NOT NULL DEFAULT 0,
 id_colaborador BIGINT NOT NULL REFERENCES colaborador(id_colaborador),
 estado VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK(estado IN('abierta','cerrada','pendiente')),
 novedades TEXT,
 id_administrador_regulariza BIGINT REFERENCES colaborador(id_colaborador),
 fecha_hora_regularizacion TIMESTAMP
);
CREATE UNIQUE INDEX uq_caja_abierta_colaborador ON caja(id_colaborador) WHERE estado='abierta';

CREATE OR REPLACE FUNCTION calcular_diferencia_caja() RETURNS TRIGGER AS $$
BEGIN
 IF NEW.estado='cerrada' AND OLD.estado<>'cerrada' THEN
  IF NEW.efectivo_real IS NULL THEN
   RAISE EXCEPTION 'No se puede cerrar la caja sin registrar el efectivo real';
  END IF;
  NEW.faltante_caja:=GREATEST(NEW.total_efectivo-NEW.efectivo_real,0);
  NEW.sobrante_caja:=GREATEST(NEW.efectivo_real-NEW.total_efectivo,0);
  NEW.fecha_hora_cierre:=CURRENT_TIMESTAMP;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_calcular_diferencia_caja BEFORE UPDATE ON caja
FOR EACH ROW EXECUTE FUNCTION calcular_diferencia_caja();

CREATE TABLE pago (
 id_pago BIGSERIAL PRIMARY KEY,
 id_servicio BIGINT NOT NULL UNIQUE REFERENCES servicio(id_servicio),
 id_caja BIGINT NOT NULL REFERENCES caja(id_caja),
 valor_pagado INTEGER NOT NULL,
 medio_pago VARCHAR(20) NOT NULL CHECK(medio_pago IN('Efectivo','Nequi')),
 referencia_nequi VARCHAR(100),
 fecha_hora_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 id_colaborador BIGINT NOT NULL REFERENCES colaborador(id_colaborador)
);

CREATE OR REPLACE FUNCTION validar_caja_abierta_pago() RETURNS TRIGGER AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM caja WHERE id_caja=NEW.id_caja AND estado='abierta') THEN
  RAISE EXCEPTION 'Pago rechazado: la caja % no está abierta',NEW.id_caja;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_validar_caja_abierta_pago BEFORE INSERT ON pago
FOR EACH ROW EXECUTE FUNCTION validar_caja_abierta_pago();

CREATE TABLE auditoria (
 id_auditoria BIGSERIAL PRIMARY KEY,
 fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 id_administrador_auditor BIGINT NOT NULL REFERENCES colaborador(id_colaborador),
 id_operador_auditado BIGINT REFERENCES colaborador(id_colaborador),
 id_caja BIGINT REFERENCES caja(id_caja),
 carros_sistema INTEGER NOT NULL DEFAULT 0,
 carros_fisico INTEGER NOT NULL DEFAULT 0,
 motos_sistema INTEGER NOT NULL DEFAULT 0,
 motos_fisico INTEGER NOT NULL DEFAULT 0,
 bicicletas_sistema INTEGER NOT NULL DEFAULT 0,
 bicicletas_fisico INTEGER NOT NULL DEFAULT 0,
 observaciones TEXT
);

COMMENT ON TABLE auditoria IS
  'Control histórico e independiente de ocupación física frente a servicios activos registrados.';

COMMENT ON COLUMN tarifa.valor_pernocta IS
  'Campo legacy del modelo anterior; las tarifas vigentes de 24 horas lo almacenan como NULL.';
COMMENT ON COLUMN tarifa.valor_turno_am IS
  'Campo legacy del modelo anterior de Bicicleta; las tarifas vigentes de 24 horas lo almacenan como NULL.';
COMMENT ON COLUMN tarifa.valor_turno_pm IS
  'Campo legacy del modelo anterior de Bicicleta; las tarifas vigentes de 24 horas lo almacenan como NULL.';

INSERT INTO tarifa(tipo_vehiculo,valor_inicial,minutos_iniciales,valor_fraccion,minutos_fraccion,valor_pernocta,valor_turno_am,valor_turno_pm,fecha_hora_inicio) VALUES
('Carro',3000,120,300,20,NULL,NULL,NULL,TIMESTAMP '2026-09-23 00:00:00'),
('Moto',2000,120,200,20,NULL,NULL,NULL,TIMESTAMP '2026-09-23 00:00:00'),
('Bicicleta',1000,240,200,60,NULL,NULL,NULL,TIMESTAMP '2026-09-23 00:00:00');

COMMIT;
