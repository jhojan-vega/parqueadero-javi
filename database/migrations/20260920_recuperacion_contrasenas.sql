ALTER TABLE colaborador
ADD COLUMN IF NOT EXISTS requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS recuperacion_contrasena (
 id_recuperacion BIGSERIAL PRIMARY KEY,
 id_colaborador BIGINT NOT NULL REFERENCES colaborador(id_colaborador),
 codigo_hash VARCHAR(64) NOT NULL,
 fecha_hora_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_hora_expiracion TIMESTAMP NOT NULL,
 intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0 AND intentos <= 3),
 utilizado BOOLEAN NOT NULL DEFAULT FALSE,
 invalidado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_recuperacion_contrasena_colaborador
ON recuperacion_contrasena(id_colaborador, fecha_hora_creacion DESC);
