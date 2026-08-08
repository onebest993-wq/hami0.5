import { isSparkTextAuditEnabled } from '@/app/spark/audit/sparkAuditConfig';
import type { SparkTextAuditResult } from '@/app/spark/audit/types';

export type SparkShellReviewOutcome =
    | { ok: true; result: SparkTextAuditResult }
    | {
          ok: false;
          reason: 'disabled' | 'cooldown' | 'short' | 'rate_limit' | 'unavailable';
          message: string;
      };

const SHELL_REVIEW_COOLDOWN_MS = 5 * 60 * 1000;
const lastReviewAt = new Map<string, number>();

function mapInvokeError(error: unknown): SparkShellReviewOutcome {
    const message = String((error as { message?: string })?.message ?? error ?? '').trim();
    if (/429|rate.?limit|quota/i.test(message)) {
        return {
            ok: false,
            reason: 'rate_limit',
            message: 'حصة التدقيق ممتلئة مؤقتاً — جرّب لاحقاً.',
        };
    }
    return {
        ok: false,
        reason: 'unavailable',
        message: 'المراجعة غير متاحة الآن — تحقق من الاتصال أو الإعدادات.',
    };
}

export async function requestSparkShellOrganizationalReview(params: {
    dossierKey: string;
    text: string;
    fieldType: 'petition' | 'attachment' | 'note';
    caseNo?: string;
    court?: string;
}): Promise<SparkShellReviewOutcome> {
    if (!isSparkTextAuditEnabled()) {
        return {
            ok: false,
            reason: 'disabled',
            message: 'المراجعة عند الطلب معطّلة — فعّل VITE_SPARK_TEXT_AUDIT_ENABLED.',
        };
    }

    const text = String(params.text ?? '').trim();
    if (text.length < 24) {
        return {
            ok: false,
            reason: 'short',
            message: 'لا يوجد نص كافٍ في الإضبارة للمراجعة.',
        };
    }

    const now = Date.now();
    const lastAt = lastReviewAt.get(params.dossierKey) ?? 0;
    if (now - lastAt < SHELL_REVIEW_COOLDOWN_MS) {
        return {
            ok: false,
            reason: 'cooldown',
            message: 'تم طلب مراجعة مؤخراً — انتظر بضع دقائق.',
        };
    }

    lastReviewAt.set(params.dossierKey, now);

    try {
        const { requestSparkTextAudit } = await import('@/app/spark/audit/sparkTextAuditService');
        const result = await requestSparkTextAudit({
            text,
            fieldType: params.fieldType,
            caseNo: params.caseNo,
            court: params.court,
        });

        if (!result) {
            return {
                ok: false,
                reason: 'unavailable',
                message: 'لم تُرجع الخدمة نتيجة — قد تكون الحصة ممتلئة أو الخدمة غير منشورة.',
            };
        }

        return { ok: true, result };
    } catch (error) {
        return mapInvokeError(error);
    }
}

export function resetSparkShellReviewRuntimeForTests(): void {
    lastReviewAt.clear();
}
