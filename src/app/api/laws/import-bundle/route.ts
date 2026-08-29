import { isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { buildIraqiLawInsertRow } from '../lawsAdminUtils.ts';
import { requirePlatformAdmin } from '../lawsAdminAuth.ts';
import { unwrapWifeUser } from '../../security/bffAuth.ts';
import { devLocalImportLawArticles, shouldUseDevLocalLawsStore } from '../devLawsLocalStore.ts';
import { IRAQI_LAWS_TABLE_MISSING, isMissingIraqiLawsRelation } from '../iraqiLawsRelation.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';

export const runtime = 'nodejs';

const INSERT_CHUNK_SIZE = 50;
const MAX_IMPORT_ARTICLES = 800;

function normalizeImportArticle(raw: unknown): { article_number: string; content: string } | null {
  if (!isJsonObjectRecord(raw)) return null;
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
    const authGate = unwrapWifeUser(await requirePlatformAdmin(request, { stepUp: true }));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const allowed = await consumeRateLimitSlot(`admin-hq-laws-import:${userId}`, {
      maxRequests: 8,
      windowMs: 15 * 60_000,
    });
    if (!allowed) {
      return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
    }

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }
    if (!isJsonObjectRecord(payload)) {
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
    if (payload.articles.length > MAX_IMPORT_ARTICLES) {
      return wifeJsonResponse(400, {
        ok: false,
        error: `عدد المواد يتجاوز الحد (${MAX_IMPORT_ARTICLES}).`,
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
        const auditRecorded = await recordHeadquartersAudit({
          actorId: userId,
          action: 'laws.import',
          details: { law_name, imported: result.imported, local: true },
        });
        return wifeJsonResponse(200, {
          ok: true,
          auditRecorded,
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
        details: 'أضف مفتاح إدارة Supabase في ملف .env ثم أعد تشغيل npm run dev.',
      });
    }

    let imported = 0;
    for (let i = 0; i < articles.length; i += INSERT_CHUNK_SIZE) {
      const chunk = articles.slice(i, i + INSERT_CHUNK_SIZE).map((row) =>
        buildIraqiLawInsertRow(law_name, row.article_number, row.content),
      );
      const { error } = await admin.from('iraqi_laws').insert(chunk);
        if (error) {
          if (isMissingIraqiLawsRelation(error.message ?? '')) {
            return wifeJsonResponse(503, {
              ok: false,
              error: IRAQI_LAWS_TABLE_MISSING,
              imported,
              rawCount,
            });
          }
          return wifeJsonResponse(500, {
            ok: false,
            error: 'فشل حفظ دفعة المواد في قاعدة البيانات.',
            imported,
            rawCount,
          });
        }
      imported += chunk.length;
    }

    const auditRecorded = await recordHeadquartersAudit({
      actorId: userId,
      action: 'laws.import',
      details: { law_name, imported },
    });
    return wifeJsonResponse(200, {
      ok: true,
      auditRecorded,
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
