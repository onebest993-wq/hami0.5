import {
    isSparkTextAuditEnabled,
    SPARK_TEXT_AUDIT_COOLDOWN_MS,
} from '@/app/spark/audit/sparkAuditConfig';
import {
    setSparkAuditNudge,
    toDocumentCompletenessNudge,
} from '@/app/spark/audit/sparkAuditNudgeStore';
import type { SparkTextAuditFieldType } from '@/app/spark/audit/types';

export type TriggerSparkDocumentAuditParams = {
    dossierKey: string;
    fieldType: SparkTextAuditFieldType;
    text: string;
    caseNo?: string;
    court?: string;
};

const inFlight = new Set<string>();
const lastAuditAt = new Map<string, number>();

function notifyAuditUpdated(dossierKey: string): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('spark-audit-updated', { detail: { dossierKey } }),
    );
}

/**
 * جدولة تدقيق نصي غير حاجب بعد الحفظ — Wave 2
 * - معطّل افتراضياً (VITE_SPARK_TEXT_AUDIT_ENABLED=true)
 * - تبريد 10 دقائق لكل إضبارة
 * - تحميل كسول لعميل الشبكة
 */
export function triggerSparkDocumentAudit(params: TriggerSparkDocumentAuditParams): void {
    if (!isSparkTextAuditEnabled()) return;

    const text = String(params.text ?? '').trim();
    if (text.length < 24) return;

    const now = Date.now();
    const lastAt = lastAuditAt.get(params.dossierKey) ?? 0;
    if (now - lastAt < SPARK_TEXT_AUDIT_COOLDOWN_MS) return;

    const flightKey = `${params.dossierKey}:${params.fieldType}`;
    if (inFlight.has(flightKey)) return;
    inFlight.add(flightKey);
    lastAuditAt.set(params.dossierKey, now);

    void (async () => {
        try {
            const { requestSparkTextAudit } = await import(
                '@/app/spark/audit/sparkTextAuditService'
            );
            const audit = await requestSparkTextAudit({
                text,
                fieldType: params.fieldType,
                caseNo: params.caseNo,
                court: params.court,
            });
            if (!audit) return;

            const nudge = toDocumentCompletenessNudge(params.dossierKey, audit);
            setSparkAuditNudge(params.dossierKey, nudge);
            if (nudge) notifyAuditUpdated(params.dossierKey);
        } catch {
            // حصة Gemini أو شبكة — لا نُلوّث الكونسول؛ التنبيهات المحلية تكفي
        } finally {
            inFlight.delete(flightKey);
        }
    })();
}

export function buildLawsuitDossierKey(caseNo: string | undefined, fileId: string | number): string {
    const no = String(caseNo ?? '').trim();
    const id = String(fileId ?? 'unknown');
    return no ? `lawsuit:${no}` : `lawsuit:${id}`;
}

/** للاختبارات — إعادة ضبط حالة التبريد */
export function resetSparkAuditRuntimeForTests(): void {
    inFlight.clear();
    lastAuditAt.clear();
}
