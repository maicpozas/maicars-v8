// Crea el usuario a partir del password_hash global actual (app_config) y
// asigna todas las filas existentes de inventario/vendidos a ese usuario.
// Idempotente: se puede correr más de una vez sin duplicar nada.
// Uso: DUMP_DB_URL=... node db/migrate-existing-data.js --email=x@y.com --nombre="Nombre"
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const connStr = process.env.DUMP_DB_URL;
if (!connStr) { console.error('Falta DUMP_DB_URL'); process.exit(1); }
const sql = neon(connStr);

function argValue(name, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

const email = argValue('email', 'maic.pozas@gmail.com').trim().toLowerCase();
const nombre = argValue('nombre', null);

async function main() {
  const [config] = await sql`SELECT value FROM app_config WHERE key = 'password_hash'`;
  if (!config) {
    console.error('No hay password_hash en app_config. ¿Ya se migró antes, o es una base nueva?');
    process.exit(1);
  }

  let [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (user) {
    console.log(`Usuario ya existe (${email}), se reusa id=${user.id}`);
  } else {
    const id = crypto.randomUUID();
    await sql`INSERT INTO users (id, email, password_hash, nombre, plan) VALUES (${id}, ${email}, ${config.value}, ${nombre}, 'free')`;
    user = { id };
    console.log(`Usuario creado: ${email} (id=${id})`);
  }

  const inv = await sql`UPDATE inventario SET user_id = ${user.id} WHERE user_id IS NULL RETURNING id`;
  const ven = await sql`UPDATE vendidos SET user_id = ${user.id} WHERE user_id IS NULL RETURNING id`;

  console.log(`inventario asignado: ${inv.length} fila(s)`);
  console.log(`vendidos asignado: ${ven.length} fila(s)`);
  console.log('\nSiguiente paso: node db/run-migrations.js --finalize');
}

main().catch(e => { console.error(e); process.exit(1); });
