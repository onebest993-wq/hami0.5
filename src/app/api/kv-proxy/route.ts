import { requireWifeCloudWrite, unwrapWifeUser } from '../security/bffAuth.ts';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership.ts';
import { kvDel, kvDelByPrefix, kvGet, kvGetByPrefix, kvKeysByPrefix, kvSet } from '../security/kvStoreAdmin.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';
import {
    parseProfileKvOwnerId,
    redactProfileKvValueForViewer,
} from '@/app/services/profile/profileKvReadRedact';
import { resignProfileMediaUrlsForOwner } from './resignProfileMediaForKv.ts';
import { applyCanonicalDisplayNameToProfileValue } from '../security/displayNameCorrection.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * WIFE-protected KV BFF — same-origin only.
 * Replaces direct Edge kv-proxy calls; uses privileged Supabase key server-side after ownership checks.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeCloudWrite(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const payload = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const action = payload.action;

    if (action === 'set') {
      if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'write')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not owned by current user' });
      }
      let value = payload.value;
      const ownerId = parseProfileKvOwnerId(payload.key);
      if (ownerId && ownerId === userId.trim()) {
        try {
          value = await applyCanonicalDisplayNameToProfileValue(userId, value);
        } catch {
          /* إن تعذّر القراءة نكتب القيمة كما وصلت — التصحيح يُقفل في PATCH الاسم */
        }
      }
      await kvSet(payload.key, value);
      return wifeJsonResponse(200, { ok: true, success: true });
    }

    if (action === 'get') {
      if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'read')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not readable by current user' });
      }
      let value = await kvGet(payload.key);
      const ownerId = parseProfileKvOwnerId(payload.key);
      if (
        ownerId &&
        ownerId !== userId.trim() &&
        value &&
        typeof value === 'object' &&
        'header' in (value as object)
      ) {
        try {
          value = await resignProfileMediaUrlsForOwner(value as never, ownerId);
        } catch {
          /* احتفظ بالروابط المخزّنة إن فشل إعادة التوقيع */
        }
      }
      return wifeJsonResponse(200, {
        ok: true,
        value: await redactProfileKvValueForViewer(payload.key, userId, value),
      });
    }

    if (action === 'getByPrefix') {
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId, 'read')) {
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
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId, 'write')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: prefix not scoped to current user' });
      }
      const deleted = await kvDelByPrefix(payload.prefix);
      return wifeJsonResponse(200, { ok: true, success: true, deleted });
    }

    if (action === 'listKeysByPrefix') {
      if (typeof payload.prefix !== 'string' || !isPrefixOwnedBy(payload.prefix, userId, 'read')) {
        return wifeJsonResponse(403, { ok: false, error: 'Forbidden: prefix not scoped to current user' });
      }
      const keys = await kvKeysByPrefix(payload.prefix);
      return wifeJsonResponse(200, { ok: true, keys });
    }

    return wifeJsonResponse(400, { ok: false, error: `Unknown action: ${action}` });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal kv-proxy error' });
  }
}
