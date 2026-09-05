export async function expireDuePlans(sql) {
  await sql`UPDATE users SET plan = 'free', plan_expires_at = NULL
            WHERE plan = 'pro' AND plan_expires_at IS NOT NULL AND plan_expires_at < now()`;
}
