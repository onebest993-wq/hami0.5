import type { ExecutionFile } from '@/app/types/execution';
import { parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export function hasActiveFinancialGuarantorFollowup(executionData: ExecutionFile | null | undefined): boolean {
    const gf = executionData?.guarantor_followup;
    if (!gf?.executor_approved) return false;
    if (gf.channel === 'procedural') return false;
    return true;
}

/** تظهر بطاقة الضامن بعد إتمام مسار الكفيل الضامن (موافقة المنفذ + حفظ البيانات) */
export function shouldShowGuarantorExternalHub(executionData: ExecutionFile | null | undefined): boolean {
    return hasActiveFinancialGuarantorFollowup(executionData);
}

/** أهلية تبليغ الكفيل — دون تكرار مع تبليغ المدين */
function normalizeGuarantorIqdDigits(raw: string): string {
    return String(raw || '')
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .replace(/\u066B/g, '.')
        .trim();
}

/** قراءة مبلغ د.ع من التخزين (رقم أو نص بعد JSON) */
export function readGuarantorIqd(value: unknown): number | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const t = normalizeGuarantorIqdDigits(String(value));
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

/** تحويل إدخال المستخدم (عربي/إنجليزي + فواصل) إلى د.ع */
export function parseGuarantorIqdInput(raw: string): number | null {
    const n = parseAmount(raw);
    return Number.isFinite(n) ? n : null;
}

export function formatGuarantorIqdForDisplay(value: unknown, emptyLabel = 'لم يُحدَّد'): string {
    const n = readGuarantorIqd(value);
    if (n == null) return emptyLabel;
    return `${n.toLocaleString('ar-IQ')} د.ع`;
}

/** اسم الكفيل وجهة العمل — من متابعة الكفيل الضامن */
export function resolveGuarantorIdentity(
    executionData: ExecutionFile | null | undefined,
    gf?: ExecutionFile['guarantor_followup'] | null
): { name: string; workplace: string } {
    const g = gf ?? executionData?.guarantor_followup;
    return {
        name: String(g?.guarantor_name || '').trim(),
        workplace: String(g?.guarantor_workplace || '').trim(),
    };
}

/** آخر صف طلب كفيل «مفتوح» يحكم واجهة المحضر — يتجاهل الدورات المؤرشفة أو المكتملة بعد إزالة الكفيل */
export function findOpenGuarantorRequestDecisionRow(
    decisions: Record<string, unknown>[],
    executionData: ExecutionFile | null | undefined
): Record<string, unknown> | null {
    for (const raw of decisions) {
        if (!isGuarantorRequestDecisionRow(raw)) continue;
        if (isExecutorHubRowSuperseded(raw)) continue;
        if ((raw as { isArchived?: boolean }).isArchived === true) continue;

        const rejected = isExecutorRowRejectedAndFinal(raw);
        const outcome = String((raw as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
        const pending = outcome === 'pending' || outcome === '';
        const alternative = outcome === 'alternative';
        const approved =
            !rejected && (alternative || isExecutorRowApprovedWorkflowActive(raw, decisions));
        const detailsSaved = Boolean(
            String((raw as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()
        );

        if (pending) return raw;
        if (rejected) return raw;
        if (approved && !detailsSaved) return raw;
        if (approved && detailsSaved && !hasActiveFinancialGuarantorFollowup(executionData)) continue;
        if (approved && detailsSaved) continue;
    }
    return null;
}

export function isGuarantorSummonsEligible(executionData: ExecutionFile | null | undefined): boolean {
    if (!hasActiveFinancialGuarantorFollowup(executionData)) return false;
    const gf = executionData?.guarantor_followup;
    return (
        gf?.details_saved === true ||
        (Boolean(String(gf?.guarantor_name || '').trim()) &&
            Boolean(String(gf?.guarantor_workplace || '').trim()))
    );
}

/** أحدث صف حجز على الكفيل الضامن — للمتابعة داخل الطلبات المخفية */
export function findGuarantorSeizureRowFromDecisions(
    decisions: Record<string, unknown>[],
    kind: 'salary' | 'property' | 'movable'
): Record<string, unknown> | null {
    const subtype = kind === 'movable' ? 'movable_auction' : kind;
    for (const raw of decisions) {
        if (String((raw as { requestKind?: string }).requestKind || '') !== 'seizure') continue;
        if (readSeizureRequestTarget(raw) !== 'guarantor') continue;
        const rowSubtype = String((raw as { seizureSubtype?: string }).seizureSubtype || '').trim();
        if (rowSubtype !== subtype) continue;
        if (isExecutorHubRowSuperseded(raw)) continue;
        if ((raw as { isArchived?: boolean }).isArchived === true) continue;
        return raw;
    }
    return null;
}
