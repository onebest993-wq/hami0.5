import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return wifeJsonResponse(200, {
    ok: true,
    ts: Date.now(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    env: process.env.NODE_ENV ?? null,
  });
}

