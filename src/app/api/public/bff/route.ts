import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return wifeJsonResponse(200, { ok: true });
}

