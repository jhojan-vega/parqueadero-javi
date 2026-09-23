-- Auditoría de ocupación: el operador auditado pasa a ser contexto opcional.
-- La migración conserva íntegramente las auditorías históricas existentes.
ALTER TABLE auditoria
  ALTER COLUMN id_operador_auditado DROP NOT NULL;

COMMENT ON TABLE auditoria IS
  'Control histórico e independiente de ocupación física frente a servicios activos registrados.';
