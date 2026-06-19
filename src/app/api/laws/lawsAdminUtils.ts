const DELETE_CHUNK_SIZE = 100;
const IRAQI_LAW_EMBEDDING_DIM = 768;

export function buildZeroLawEmbedding(): number[] {
  return Array.from({ length: IRAQI_LAW_EMBEDDING_DIM }, () => 0);
}

export function buildIraqiLawInsertRow(law_name: string, article_number: string, content: string) {
  return {
    law_name,
    article_number,
    content,
    embedding: buildZeroLawEmbedding(),
  };
}

function normalizeArabicDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function extractArticleSortNumber(articleNumber: string): number | null {
  const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
  const m = normalized.match(/\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalArticleBound(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type AdminClient = ReturnType<
  typeof import('@supabase/supabase-js').createClient
>;

export async function clearIraqiLaws(params: {
  admin: AdminClient;
  lawName: string;
  articleFrom?: number | null;
  articleTo?: number | null;
}): Promise<
  | { ok: true; deletedCount: number; message: string; article_from?: number; article_to?: number }
  | { ok: false; error: string }
> {
  const { admin, lawName } = params;
  const articleFrom = params.articleFrom ?? null;
  const articleTo = params.articleTo ?? null;
  const hasRange = articleFrom !== null || articleTo !== null;

  if (hasRange && (articleFrom === null || articleTo === null)) {
    return { ok: false, error: 'لحذف نطاق محدد، أرسل article_from و article_to معاً.' };
  }
  if (hasRange && articleFrom! > articleTo!) {
    return { ok: false, error: 'article_from يجب أن يكون أصغر من أو يساوي article_to.' };
  }

  if (!hasRange) {
    const { count, error: countError } = await admin
      .from('iraqi_laws')
      .select('id', { count: 'exact', head: true })
      .eq('law_name', lawName);
    if (countError) {
      return { ok: false, error: countError.message };
    }

    const { error: deleteError } = await admin.from('iraqi_laws').delete().eq('law_name', lawName);
    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    return {
      ok: true,
      deletedCount: count ?? 0,
      message: `تم تنظيف مواد (${lawName}) بنجاح.`,
    };
  }

  const { data: rows, error: selectError } = await admin
    .from('iraqi_laws')
    .select('id, article_number')
    .eq('law_name', lawName)
    .limit(10000);
  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const idsToDelete = (rows ?? [])
    .filter((row) => {
      const n = extractArticleSortNumber(String(row.article_number ?? ''));
      return n !== null && n >= articleFrom! && n <= articleTo!;
    })
    .map((row) => String(row.id));

  if (idsToDelete.length === 0) {
    return {
      ok: true,
      deletedCount: 0,
      message: `لا توجد مواد ضمن النطاق ${articleFrom}–${articleTo} في (${lawName}).`,
      article_from: articleFrom!,
      article_to: articleTo!,
    };
  }

  for (let i = 0; i < idsToDelete.length; i += DELETE_CHUNK_SIZE) {
    const chunk = idsToDelete.slice(i, i + DELETE_CHUNK_SIZE);
    const { error: deleteError } = await admin.from('iraqi_laws').delete().in('id', chunk);
    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }
  }

  return {
    ok: true,
    deletedCount: idsToDelete.length,
    message: `تم حذف ${idsToDelete.length} مادة (من ${articleFrom} إلى ${articleTo}) من (${lawName}).`,
    article_from: articleFrom!,
    article_to: articleTo!,
  };
}
