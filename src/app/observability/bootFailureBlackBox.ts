import { sentryCaptureMessage } from '@/app/observability/sentryClient';

/**
 * يقرأ سجل فشل الإقلاع الذي كتبه `public/hami-boot.js` ويُبلّغ عنه.
 *
 * فشل الإقلاع هو العطل الوحيد الذي لا تلتقطه أي طبقة: حدود الأخطاء لم تُركَّب
 * بعد، والحزمة التي تحمل عميل الإبلاغ هي نفسها ما تعذّر تحميله. فيُكتب السجل في
 * التخزين قبل React، ويُرسل من هنا عند أول إقلاع ينجح — ولو بعد أيام.
 */

export const BOOT_FAILURE_KEY = 'hami:boot-failure:last';

export interface BootFailureRecord {
    title: string;
    detail: string;
    at: string;
    native: 0 | 1;
    url: string;
}

/** لا يُبلَّغ عن سجل قديم: ما مضى عليه أسبوع لم يعد يصف البناء الحالي */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseRecord(raw: string): BootFailureRecord | null {
    try {
        const parsed = JSON.parse(raw) as Partial<BootFailureRecord>;
        if (typeof parsed?.title !== 'string' || typeof parsed?.at !== 'string') return null;
        return {
            title: parsed.title,
            detail: typeof parsed.detail === 'string' ? parsed.detail : '',
            at: parsed.at,
            native: parsed.native === 1 ? 1 : 0,
            url: typeof parsed.url === 'string' ? parsed.url : '/',
        };
    } catch {
        return null;
    }
}

export function readBootFailureRecord(): BootFailureRecord | null {
    try {
        const raw = localStorage.getItem(BOOT_FAILURE_KEY);
        return raw ? parseRecord(raw) : null;
    } catch {
        return null;
    }
}

export function clearBootFailureRecord(): void {
    try {
        localStorage.removeItem(BOOT_FAILURE_KEY);
    } catch {
        /* محظور أو غير متاح — لا شيء يعتمد على النجاح */
    }
}

/**
 * يُستدعى بعد نجاح الإقلاع. يُفرغ السجل في كل الأحوال: بلاغ واحد لا سيل متكرر
 * عند كل تشغيل لاحق.
 */
export function reportPendingBootFailure(): void {
    const record = readBootFailureRecord();
    if (!record) return;
    clearBootFailureRecord();

    const failedAt = Date.parse(record.at);
    if (Number.isNaN(failedAt) || Date.now() - failedAt > MAX_AGE_MS) return;

    void sentryCaptureMessage(`boot-failure: ${record.title}`, {
        bootFailureDetail: record.detail,
        bootFailureAt: record.at,
        bootFailurePlatform: record.native === 1 ? 'native' : 'web',
        bootFailurePath: record.url,
        recoveredAfterMs: Date.now() - failedAt,
    });
}
