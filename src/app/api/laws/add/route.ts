import { isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { buildIraqiLawInsertRow } from '../lawsAdminUtils.ts';
import { requirePlatformAdmin } from '../lawsAdminAuth.ts';
import { unwrapWifeUser } from '../../security/bffAuth.ts';
import { devLocalInsertLaw, shouldUseDevLocalLawsStore } from '../devLawsLocalStore.ts';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * WIFE + platform-admin — insert one law article (replaces Edge add-law).
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

    const law_name = typeof payload.law_name === 'string' ? payload.law_name.trim() : '';
    const article_number =
      payload.article_number === null || payload.article_number === undefined
        ? ''
        : String(payload.article_number).trim();
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';

    if (!law_name) {
      return wifeJsonResponse(400, { ok: false, error: 'الحقل law_name مطلوب وغير فارغ.' });
    }
    if (!isAllowedIraqiLawName(law_name)) {
      return wifeJsonResponse(400, {
        ok: false,
        error: 'اسم القانون غير مسموح. استخدم أحد القوانين المعتمدة في النظام فقط.',
      });
    }
    if (!article_number) {
      return wifeJsonResponse(400, { ok: false, error: 'الحقل article_number مطلوب وغير فارغ.' });
    }
    if (!content) {
      return wifeJsonResponse(400, { ok: false, error: 'الحقل content مطلوب وغير فارغ.' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      if (shouldUseDevLocalLawsStore()) {
        const record = await devLocalInsertLaw({ law_name, article_number, content });
        return wifeJsonResponse(200, {
          ok: true,
          message: 'تم حفظ المادة في ملف الحزمة المحلية داخل المشروع.',
          record: {
            id: record.id,
            law_name: record.law_name,
            article_number: record.article_number,
          },
        });
      }
      return wifeJsonResponse(503, {
        ok: false,
        error: 'قاعدة البيانات غير مهيأة على الخادم.',
        details: 'أضف مفتاح إدارة Supabase في ملف .env ثم أعد تشغيل npm run dev.',
      });
    }

    const { data, error } = await admin
      .from('iraqi_laws')
      .insert(buildIraqiLawInsertRow(law_name, article_number, content))
      .select('id, law_name, article_number')
      .single();

    if (error) {
      return wifeJsonResponse(500, {
        ok: false,
        error: 'فشل حفظ السجل في قاعدة البيانات.',
        details: error.message,
      });
    }

    return wifeJsonResponse(200, {
      ok: true,
      message: 'تم حفظ المادة بنجاح.',
      record: data,
    });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal laws add error' });
  }
}
