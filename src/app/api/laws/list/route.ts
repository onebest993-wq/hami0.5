import { ALLOWED_IRAQI_LAW_NAMES, isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { devLocalListLaws, shouldUseDevLocalLawsStore } from '../devLawsLocalStore.ts';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isMissingRelationError(message: string): boolean {
  const hay = message.toLowerCase();
  return hay.includes('does not exist') || hay.includes('relation') || hay.includes('schema cache');
}

/**
 * WIFE-protected law catalog read — replaces direct Edge list-laws invoke from the client.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }

    const lawName =
      isRecord(payload) && typeof payload.law_name === 'string' ? payload.law_name.trim() : '';

    if (lawName && !isAllowedIraqiLawName(lawName)) {
      return wifeJsonResponse(400, { ok: false, error: 'Law name is not in the allowed catalog.' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      if (shouldUseDevLocalLawsStore()) {
        const items = await devLocalListLaws(lawName || undefined);
        return wifeJsonResponse(200, { ok: true, items });
      }
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    let query = admin.from('iraqi_laws').select('id, law_name, article_number, content');
    if (lawName) {
      query = query.eq('law_name', lawName);
    } else {
      query = query.in('law_name', [...ALLOWED_IRAQI_LAW_NAMES]);
    }

    const { data, error } = await query
      .order('law_name', { ascending: true })
      .order('article_number', { ascending: true });
    if (error) {
      if (isMissingRelationError(error.message ?? '')) {
        return wifeJsonResponse(200, { ok: true, items: [] });
      }
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load laws' });
    }

    return wifeJsonResponse(200, { ok: true, items: data ?? [] });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal laws list error' });
  }
}
