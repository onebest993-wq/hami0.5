import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const payload: Record<string, unknown> = { ok: true, ts: Date.now() };
  if ((process.env.NODE_ENV ?? '').toLowerCase() !== 'production') {
    payload.commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
    payload.env = process.env.NODE_ENV ?? null;
  }
  return wifeJsonResponse(200, payload);
}

