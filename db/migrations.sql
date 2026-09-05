-- ============================================================
-- MaiCars — esquema completo (multiusuario)
-- Ejecutar con: node db/run-migrations.js
--
-- Fase 1 (todo lo que está antes de ==FINALIZE==): aditiva y segura
-- de correr sobre la base de datos con datos existentes.
--
-- Fase 2 (después de ==FINALIZE==): SOLO correr después de
-- db/migrate-existing-data.js, que asigna user_id a las filas
-- existentes. Se ejecuta con: node db/run-migrations.js --finalize
-- ============================================================

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NULL = sin vencimiento (free/owner siempre; pro lo lleva mientras
-- esté vigente). Se limpia solo cuando el plan pro vence (ver
-- netlify/functions/lib/plans.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Registro de intentos (login, registro, recuperación de contraseña)
-- para limitar fuerza bruta / spam. Ver netlify/functions/lib/ratelimit.js.
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(action, identifier, created_at);

-- plan solo acepta estos tres valores (DROP+ADD porque Postgres no
-- soporta "ADD CONSTRAINT IF NOT EXISTS"; así queda idempotente).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free','pro','owner'));

-- Se reafirma en cada corrida de migrations.sql: si la base se
-- recrea o se restaura desde un backup y esta fila vuelve a existir,
-- queda marcada como owner sin depender de un script aparte.
UPDATE users SET plan = 'owner' WHERE email = 'maic.pozas@gmail.com';

-- Tablas de negocio (mismo DDL que antes, por si la base es nueva/vacía)
CREATE TABLE IF NOT EXISTS inventario (
  id TEXT PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  compra INTEGER NOT NULL,
  img TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gastos (
  id TEXT PRIMARY KEY,
  auto_id TEXT NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto INTEGER NOT NULL,
  fecha TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS vendidos (
  id TEXT PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  compra INTEGER NOT NULL,
  gastos_total INTEGER NOT NULL,
  venta INTEGER NOT NULL,
  ganancia INTEGER NOT NULL,
  fecha_venta TIMESTAMPTZ NOT NULL,
  img TEXT
);

CREATE TABLE IF NOT EXISTS vendidos_gastos (
  id TEXT PRIMARY KEY,
  vendido_id TEXT NOT NULL REFERENCES vendidos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto INTEGER NOT NULL,
  fecha TIMESTAMPTZ
);

-- user_id nuevo, nullable por ahora (se completa con el backfill)
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
ALTER TABLE vendidos ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_inventario_user ON inventario(user_id);
CREATE INDEX IF NOT EXISTS idx_vendidos_user ON vendidos(user_id);

-- Si alguna vez se borra un usuario, sus vehículos/ventas se borran
-- con él en vez de bloquear el DELETE por llave foránea (gastos y
-- vendidos_gastos ya tenían CASCADE hacia inventario/vendidos, así
-- que esto cierra la cadena completa).
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_user_id_fkey;
ALTER TABLE inventario ADD CONSTRAINT inventario_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE vendidos DROP CONSTRAINT IF EXISTS vendidos_user_id_fkey;
ALTER TABLE vendidos ADD CONSTRAINT vendidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- fecha_compra nueva, nullable por ahora (se completa con
-- db/migrate-fecha-compra.js antes de la fase de finalize)
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE vendidos ADD COLUMN IF NOT EXISTS fecha_compra DATE;

-- categoria de gasto: lista fija reforzada con CHECK. Se puede agregar
-- directo como NOT NULL DEFAULT porque Postgres rellena las filas
-- existentes con el default al momento del ALTER.
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'otros'
  CHECK (categoria IN ('mecanica','carroceria','papeles','transporte','publicidad','comision','otros'));
ALTER TABLE vendidos_gastos ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'otros'
  CHECK (categoria IN ('mecanica','carroceria','papeles','transporte','publicidad','comision','otros'));

-- app_config: se mantiene por compatibilidad (password_hash global queda inerte)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- password_resets pasa a ser por usuario (antes era global; en producción
-- tenía 0 filas al momento de esta migración, así que no hay nada que preservar)
DROP TABLE IF EXISTS password_resets;
CREATE TABLE password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ==FINALIZE==
-- A partir de aquí: SOLO ejecutar después de que
-- db/migrate-existing-data.js haya asignado user_id a todas las
-- filas existentes de inventario y vendidos, y de que
-- db/migrate-fecha-compra.js haya asignado fecha_compra. Si se corre
-- antes, esto falla (columna NOT NULL con filas NULL existentes).

ALTER TABLE inventario ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE vendidos ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE inventario ALTER COLUMN fecha_compra SET NOT NULL;
ALTER TABLE inventario ALTER COLUMN fecha_compra SET DEFAULT CURRENT_DATE;
ALTER TABLE vendidos ALTER COLUMN fecha_compra SET NOT NULL;
