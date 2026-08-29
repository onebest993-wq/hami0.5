import { wifeJsonResponse } from './wifeSecurityHeaders.ts';

/** Postgres `uuid` columns reject `guest-lawyer-1` with 22P02 → HTTP 500. */
const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostgresUuidSubject(userId: string): boolean {
  return POSTGRES_UUID_RE.test(userId.trim());
}

export function emptyUuidScopedRows(userId: string): Response | null {
  if (isPostgresUuidSubject(userId)) return null;
  return wifeJsonResponse(200, { ok: true, rows: [] });
}

export function emptyUuidScopedEventIds(userId: string): Response | null {
  if (isPostgresUuidSubject(userId)) return null;
  return wifeJsonResponse(200, { ok: true, eventIds: [] });
}

export function rejectNonUuidCloudWrite(userId: string): Response | null {
  if (isPostgresUuidSubject(userId)) return null;
  return wifeJsonResponse(403, {
    ok: false,
    error: 'Cloud identity required',
    code: 'NON_UUID_SUBJECT',
  });
}
