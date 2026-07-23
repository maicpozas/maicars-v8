import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  return Response.json({ authenticated: isAuthenticated(req) });
}
