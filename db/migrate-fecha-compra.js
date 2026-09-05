// Backfill de fecha_compra para filas existentes. Idempotente
// (solo toca filas con fecha_compra IS NULL).
// inventario: usa created_at::date (fecha real de carga).
// vendidos: no tiene created_at, así que usa fecha_venta::date como
// respaldo — para las ventas ya existentes "vendido en N días" saldrá
// en 0, ya que no hay forma de recuperar la fecha de compra real.
// Uso: DUMP_DB_URL=... node db/migrate-fecha-compra.js
import { neon } from '@neondatabase/serverless';

const connStr = process.env.DUMP_DB_URL;
if (!connStr) { console.error('Falta DUMP_DB_URL'); process.exit(1); }
const sql = neon(connStr);

async function main() {
  const inv = await sql`UPDATE inventario SET fecha_compra = created_at::date WHERE fecha_compra IS NULL RETURNING id`;
  const ven = await sql`UPDATE vendidos SET fecha_compra = fecha_venta::date WHERE fecha_compra IS NULL RETURNING id`;
  console.log(`inventario: fecha_compra asignada a ${inv.length} fila(s)`);
  console.log(`vendidos: fecha_compra asignada a ${ven.length} fila(s)`);
  console.log('\nSiguiente paso: node db/run-migrations.js --finalize');
}

main().catch(e => { console.error(e); process.exit(1); });
