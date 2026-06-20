import { isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { requirePlatformAdmin } from '../lawsAdminAuth.ts';
import { unwrapWifeUser } from '../../security/bffAuth.ts';
import { clearIraqiLaws, parseOptionalArticleBound } from '../lawsAdminUtils.ts';
import {
  devLocalClearLaws,
  shouldUseDevLocalLawsStore,
} from '../devLawsLocalStore.ts';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * WIFE + platform-admin — clear law articles (replaces Edge clear-laws).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requirePlatformAdmin(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }
    if (!isRecord(payload)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
    }

    const lawName = typeof payload.law_name === 'string' ? payload.law_name.trim() : '';
    if (!lawName) {
      return wifeJsonResponse(400, {
        ok: false,
        error: 'law_name مطلوب لتحديد التبويب المستهدف للحذف.',
      });
    }
    if (!isAllowedIraqiLawName(lawName)) {
      return wifeJsonResponse(400, { ok: false, error: 'Law name is not in the allowed catalog.' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      if (shouldUseDevLocalLawsStore()) {
        const result = await devLocalClearLaws({
          lawName,
          articleFrom: parseOptionalArticleBound(payload.article_from),
          articleTo: parseOptionalArticleBound(payload.article_to),
        });
        if (result.ok === false) {
          return wifeJsonResponse(400, { ok: false, error: result.error });
        }
        return wifeJsonResponse(200, {
          ok: true,
          message: result.message,
          deletedCount: result.deletedCount,
          article_from: result.article_from,
          article_to: result.article_to,
        });
      }
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const result = await clearIraqiLaws({
      admin,
      lawName,
      articleFrom: parseOptionalArticleBound(payload.article_from),
      articleTo: parseOptionalArticleBound(payload.article_to),
    });

    if (result.ok === false) {
      return wifeJsonResponse(400, { ok: false, error: result.error });
    }

    return wifeJsonResponse(200, {
      ok: true,
      message: result.message,
      deletedCount: result.deletedCount,
      article_from: result.article_from,
      article_to: result.article_to,
    });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal laws clear error' });
  }
}
