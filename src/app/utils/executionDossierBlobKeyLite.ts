/**
 * مفاتيح إضبارة التنفيذ + حماية المسح — بلا SecureStore / executionFilesStorage.
 * يُستخدم من SecureStore على المسار البارد دون سحب blobPersistence الثقيل.
 */

const EXECUTION_BLOB_SATELLITE_MARKERS = [
  '_decisions_ns_',
  '_decisions',
  '_documents',
  '_document_folders',
  '_eviction_field_visit',
] as const;

/** مفتاح الإضبارة الرئيسي execution_{id} — ليس executionFiles ولا مفاتيح قرارات/وثائق */
export function isExecutionDossierMainBlobKey(key: string): boolean {
  const k = String(key || '').trim();
  if (!k.startsWith('execution_')) return false;
  if (k === 'executionFiles' || k === 'execution_expenses') return false;
  if (k.startsWith('execution_form_')) return false;
  return !EXECUTION_BLOB_SATELLITE_MARKERS.some((m) => k.includes(m));
}

export function isExecutionSubDossierBlobKey(key: string): boolean {
  return isExecutionDossierMainBlobKey(key) && key.includes('__sub__');
}

export function isExecutionParentDossierBlobKey(key: string): boolean {
  return isExecutionDossierMainBlobKey(key) && !key.includes('__sub__');
}

export function parseDossierBlob(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function countMeaningfulDossierFields(blob: Record<string, unknown>): number {
  let score = 0;
  for (const [key, value] of Object.entries(blob)) {
    if (key === 'id' || key === 'updatedAt') continue;
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) score += 1;
      continue;
    }
    if (typeof value === 'object') {
      if (Object.keys(value as object).length > 0) score += 1;
      continue;
    }
    if (String(value).trim() !== '') score += 1;
  }
  return score;
}

/** يمنع استبدال إضبارة غنية ببيانات شبه فارغة */
export function shouldRejectExecutionDossierBlobWipe(
  storageKey: string,
  incomingRaw: string,
  existingRaw: string | null | undefined,
): boolean {
  if (!isExecutionDossierMainBlobKey(storageKey)) return false;
  if (!existingRaw?.trim()) return false;

  const trimmed = incomingRaw.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === '{}') return true;

  const existing = parseDossierBlob(existingRaw);
  const incoming = parseDossierBlob(incomingRaw);

  /*
   * `!existing || !incoming → false` كان يفتح الباب في الحالة التي وُضع الحارس
   * لأجلها: موجودٌ لا يُقرأ لأنه تالف. حينها لا سبيل لمعرفة كم كان فيه، فتمرّ
   * الكتابة شبه الفارغة وتحسم الأمر. وحمولة واردة لا تُحلَّل ليست حفظاً صحيحاً
   * بحال — `JSON.stringify` لا يُنتج نصّاً يعجز `JSON.parse` عنه.
   */
  if (!existing) return !incoming || countMeaningfulDossierFields(incoming) === 0;
  if (!incoming) return true;

  const existingScore = countMeaningfulDossierFields(existing);
  const incomingScore = countMeaningfulDossierFields(incoming);
  if (existingScore >= 3 && incomingScore === 0) return true;

  const existingTimeline = Array.isArray(existing.timelineEvents) ? existing.timelineEvents.length : 0;
  const incomingTimeline = Array.isArray(incoming.timelineEvents) ? incoming.timelineEvents.length : 0;
  if (existingTimeline > 0 && incomingTimeline === 0 && !Array.isArray(incoming.timelineEvents)) {
    return true;
  }

  return false;
}
