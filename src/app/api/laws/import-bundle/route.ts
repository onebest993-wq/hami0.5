import { isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { buildIraqiLawInsertRow } from '../lawsAdminUtils.ts';
import { requirePlatformAdmin } from '../lawsAdminAuth.ts';
import { devLocalImportLawArticles, shouldUseDevLocalLawsStore } from '../devLawsLocalStore.ts';

export const runtime = 'nodejs';

const INSERT_CHUNK_SIZE = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeImportArticle(raw: unknown): { article_number: string; content: string } | null {
  if (!isRecord(raw)) return null;
  const article_number =
    raw.article_number === null || raw.article_number === undefined
      ? ''
      : String(raw.article_number).trim();
  const content = typeof raw.content === 'string' ? raw.content.trim() : '';
  if (!article_number || !content) return null;
  return { article_number, content };
}

/**
 * WIFE + platform-admin — bulk import law articles in one request.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requirePlatformAdmin(request);
    if (!auth.ok) return auth.response;

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
    if (!law_name) {
      return wifeJsonResponse(400, { ok: false, error: 'الحقل law_name مطلوب وغير فارغ.' });
    }
    if (!isAllowedIraqiLawName(law_name)) {
      return wifeJsonResponse(400, {
        ok: false,
        error: 'اسم القانون غير مسموح. استخدم أحد القوانين المعتمدة في النظام فقط.',
      });
    }

    if (!Array.isArray(payload.articles) || payload.articles.length === 0) {
      return wifeJsonResponse(400, {
        ok: false,
        error: 'الحقل articles مطلوب ويجب أن يكون مصفوفة غير فارغة.',
      });
    }

    const rawCount = payload.articles.length;
    const articles: Array<{ article_number: string; content: string }> = [];
    const skipped: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < payload.articles.length; i++) {
      const normalized = normalizeImportArticle(payload.articles[i]);
      if (!normalized) {
        skipped.push({ index: i + 1, reason: 'article_number أو content غير صالح' });
        continue;
      }
      articles.push(normalized);
    }

    if (articles.length === 0) {
      return wifeJsonResponse(400, {
        ok: false,
        error: `لم يُقبل أي عنصر (${rawCount} في الطلب).`,
        rawCount,
        skipped,
      });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      if (shouldUseDevLocalLawsStore()) {
        const result = await devLocalImportLawArticles({ law_name, articles });
        return wifeJsonResponse(200, {
          ok: true,
          message: `تم حفظ ${result.imported} مادة في ملف الحزمة المحلية.`,
          imported: result.imported,
          rawCount,
          skipped: skipped.length,
          skippedDetails: skipped.slice(0, 5),
        });
      }
      return wifeJsonResponse(503, {
        ok: false,
        error: 'قاعدة البيانات غير مهيأة على الخادم.',
        details: 'أضف SUPABASE_SERVICE_ROLE_KEY في ملف .env ثم أعد تشغيل npm run dev.',
      });
    }

    let imported = 0;
    for (let i = 0; i < articles.length; i += INSERT_CHUNK_SIZE) {
      const chunk = articles.slice(i, i + INSERT_CHUNK_SIZE).map((row) =>
        buildIraqiLawInsertRow(law_name, row.article_number, row.content),
      );
      const { error } = await admin.from('iraqi_laws').insert(chunk);
      if (error) {
        return wifeJsonResponse(500, {
          ok: false,
          error: 'فشل حفظ دفعة المواد في قاعدة البيانات.',
          details: error.message,
          imported,
          rawCount,
        });
      }
      imported += chunk.length;
    }

    return wifeJsonResponse(200, {
      ok: true,
      message: `تم حفظ ${imported} مادة بنجاح.`,
      imported,
      rawCount,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 5),
    });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal laws import-bundle error' });
  }
}
