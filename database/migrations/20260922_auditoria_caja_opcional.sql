-- Auditoría de ocupación: la Caja es contexto opcional.
-- Conserva la columna, su clave foránea y todas las auditorías históricas.
ALTER TABLE auditoria
  ALTER COLUMN id_caja DROP NOT NULL;
