/**
 * مرساة نسخة البيانات على الجهاز.
 *
 * البيانات القانونية تعيش على جهاز المحامي وتبقى عبر التحديثات. وحين يتغيّر
 * شكل حقلٍ في إصدار قادم، يحتاج الترحيل أن يعرف **بأي إصدار كُتبت** البيانات
 * التي أمامه. بلا ختم مكتوب من اليوم، لا سبيل لمعرفة ذلك لاحقاً: كل جهاز
 * يحمل بيانات بلا نسب، والترحيل يصير تخميناً على أضابير لا تُعوَّض.
 *
 * ولهذا يُكتب الختم قبل الإطلاق لا بعده: بعده تبقى أجهزةٌ بلا ختم إلى الأبد.
 */

export const STORAGE_SCHEMA_KEY = 'hami:schema:v';

/**
 * النسخة الحالية لشكل البيانات المخزَّنة.
 *
 * تُرفع **فقط** حين يتغيّر شكل بيانات مُخزَّنة تغييراً لا يقرأه الكود القديم
 * أو لا يقرأه الجديد. ورفعها يوجب إضافة ترحيل في `storageSchemaMigrations`.
 */
export const CURRENT_STORAGE_SCHEMA_VERSION = 1;

/** أول إقلاع على هذا الجهاز: بيانات موجودة قبل الختم، أم تثبيت جديد */
export type StorageSchemaOrigin = 'fresh' | 'pre-stamp';

export interface StorageSchemaRecord {
    /** نسخة شكل البيانات المكتوبة على هذا الجهاز */
    v: number;
    /** أول لحظة وُضع فيها ختم — لا تُكتب ثانية */
    firstSeenAt: string;
    /** هل وُجدت بيانات قبل أول ختم */
    origin: StorageSchemaOrigin;
    /** آخر إصدار تطبيق كتب هنا — لتتبّع الترقية والتنزيل */
    lastRelease: string;
    /** آخر ترحيل نُفِّذ فعلاً */
    lastMigratedAt?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * تحليل صارم: ختم لا يُفهَم أسوأ من غياب ختم، لأنه يدّعي نسباً كاذباً.
 * الرجوع بـ`null` يدفع المُشغّل إلى إعادة الختم من جديد بدل البناء على وهم.
 */
export function parseStorageSchemaRecord(raw: string | null | undefined): StorageSchemaRecord | null {
    if (!raw?.trim()) return null;
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!isPlainObject(parsed)) return null;

    const v = parsed.v;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null;

    const firstSeenAt = typeof parsed.firstSeenAt === 'string' ? parsed.firstSeenAt : '';
    if (!firstSeenAt) return null;

    const origin: StorageSchemaOrigin = parsed.origin === 'pre-stamp' ? 'pre-stamp' : 'fresh';
    const lastRelease = typeof parsed.lastRelease === 'string' ? parsed.lastRelease : 'unknown';
    const lastMigratedAt = typeof parsed.lastMigratedAt === 'string' ? parsed.lastMigratedAt : undefined;

    return { v, firstSeenAt, origin, lastRelease, ...(lastMigratedAt ? { lastMigratedAt } : {}) };
}

export function serializeStorageSchemaRecord(record: StorageSchemaRecord): string {
    return JSON.stringify(record);
}
