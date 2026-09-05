import { neon } from '@netlify/neon';
import { expireDuePlans } from './lib/plans.js';

export default async () => {
  await expireDuePlans(neon());
  return new Response('ok');
}

export const config = { schedule: '@daily' };
