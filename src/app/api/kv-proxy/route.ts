import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  assertWifeSignatureRequest,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../security/wifeValidator.ts';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership.ts';
import { kvDel, kvDelByPrefix, kvGet, kvGetByPrefix, kvKeysByPrefix, kvSet } from '../security/kvStoreAdmin.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * WIFE-protected KV BFF — same-origin only.
 * Replaces direct Edge kv-proxy calls; uses service_role server-side after ownership checks.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    const wifeBlock = await assertWifeSignatureRequest(request, userToken);
    if (wifeBlock) return wifeBlock;

    const userId = await getVerifiedTokenSubject(userToken);
    if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const payload = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const action = payload.action;

    if (action === 'set') {
      if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'write')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not owned by current user' });
      }
      await kvSet(payload.key, payload.value);
      return wifeJsonResponse(200, { ok: true, success: true });
    }

    if (action === 'get') {
      if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'read')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not readable by current user' });
      }
      const value = await kvGet(payload.key);
      return wifeJsonResponse(200, { ok: true, value });
    }

    if (action === 'getByPrefix') {
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId)) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: prefix not scoped to current user' });
      }
      const values = await kvGetByPrefix(payload.prefix);
      return wifeJsonResponse(200, { ok: true, values });
    }

    if (action === 'del') {
      if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'write')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not owned by current user' });
      }
      await kvDel(payload.key);
      return wifeJsonResponse(200, { ok: true, success: true });
    }

    if (action === 'delByPrefix') {
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId)) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: prefix not scoped to current user' });
      }
      const deleted = await kvDelByPrefix(payload.prefix);
      return wifeJsonResponse(200, { ok: true, success: true, deleted });
    }

    if (action === 'listKeysByPrefix') {
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId)) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: prefix not scoped to current user' });
      }
      const keys = await kvKeysByPrefix(payload.prefix);
      return wifeJsonResponse(200, { ok: true, keys });
    }

    return wifeJsonResponse(400, { ok: false, error: `Unknown action: ${action}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal kv-proxy error';
    return wifeJsonResponse(500, { ok: false, error: message });
  }
}
