import type { LawyerRequest } from './criminalCaseModel';
import { isLawyerRequestFinalStatus, isLawyerRequestLocked } from './lawyerRequestStatusMachine';
import { validateDetentionDateRange } from './detentionEngine';
import { isTimelineNextDateInvalid } from './criminalStageUtils';
import {
    isAssetSeizureTemplate,
    isCustomJudicialTemplate,
    isCustomLawyerMotionTemplate,
    isComplaintCourtReferralTemplate,
    isDefendantBailTemplate,
    isJudicialDecisionTemplate,
    requiresDetentionDateRange,
    resolveStoredRequestTypeFields,
} from './proceduralRequestTypes';
import { requiresLegalArticleBasis } from './orderEnforcementEngine';

export type CreateLawyerRequestInput = {
    requestDate: string;
    lawyerNote: string;
    defendantIds?: string[];
    proceduralTemplate: string;
    customTypeName?: string;
    isAppealable?: boolean;
    detentionStartDate?: string;
    detentionEndDate?: string;
    legalArticleBasis?: string;
    enforcementKind?: 'summons' | 'arrest';
    referredCourtName?: string;
    /** بيانات «تكفيل المتهم» المهيكلة. */
    defendantBail?: {
        kind: 'financial' | 'personal';
        bailAmount?: string;
        guarantors?: { id: string; fullName: string }[];
    };
    /** بيانات «حجز الأموال» المهيكلة — قائمة أصناف لكل متهم هارب مُختار. */
    assetSeizure?: {
        perDefendant: Array<{
            defendantId: string;
            assets: Array<{
                description: string;
                referenceNumber?: string;
                seizureDate?: string;
                notes?: string;
            }>;
        }>;
    };
};

export type FinalizeLawyerRequestInput = {
    status: 'approved' | 'rejected';
    judgeMargin: string;
    decisionDate: string;
};

export function validateCreateLawyerRequestInput(input: CreateLawyerRequestInput): string | null {
    if (!String(input.requestDate ?? '').trim()) return 'تاريخ الطلب مطلوب.';
    const template = String(input.proceduralTemplate ?? '').trim();
    if (!template) return 'نوع الطلب/الإجراء مطلوب.';
    if (
        (isCustomJudicialTemplate(template) || isCustomLawyerMotionTemplate(template)) &&
        !String(input.customTypeName ?? '').trim()
    ) {
        return 'أدخل اسم الإجراء المخصص.';
    }
    const resolved = resolveStoredRequestTypeFields(
        template,
        String(input.customTypeName ?? ''),
        input.isAppealable === true,
    );
    if (!String(resolved.type ?? '').trim()) return 'نوع الطلب/الإجراء مطلوب.';
    if (!String(input.lawyerNote ?? '').trim()) {
        return isJudicialDecisionTemplate(template) ? 'تفاصيل القرار مطلوبة.' : 'تفاصيل الطلب مطلوبة.';
    }
    if (requiresDetentionDateRange(template)) {
        const rangeErr = validateDetentionDateRange(
            String(input.detentionStartDate ?? ''),
            String(input.detentionEndDate ?? ''),
        );
        if (rangeErr) return rangeErr;
    }
    if (requiresLegalArticleBasis(template) && !String(input.legalArticleBasis ?? '').trim()) {
        return 'المادة القانونية المستند عليها مطلوبة لأمر الاستقدام/القبض.';
    }
    if (isComplaintCourtReferralTemplate(template) && !String(input.referredCourtName ?? '').trim()) {
        return 'اسم المحكمة الجديدة مطلوب لإحالة الشكوى.';
    }
    if (isDefendantBailTemplate(template)) {
        if (!Array.isArray(input.defendantIds) || input.defendantIds.length === 0) {
            return 'اختر متهماً واحداً على الأقل لقرار التكفيل.';
        }
        const bail = input.defendantBail;
        if (!bail || (bail.kind !== 'financial' && bail.kind !== 'personal')) {
            return 'حدد نوع الكفالة (مالية أو شخص ضامن).';
        }
        if (bail.kind === 'financial') {
            const amt = String(bail.bailAmount ?? '').trim();
            if (!amt) return 'مبلغ الكفالة المالية مطلوب.';
        }
        if (bail.kind === 'personal') {
            const list = Array.isArray(bail.guarantors) ? bail.guarantors : [];
            const names = list.map((g) => String(g?.fullName ?? '').trim()).filter(Boolean);
            if (names.length === 0) return 'أدخل اسم كفيل واحد على الأقل.';
        }
    }
    if (isAssetSeizureTemplate(template)) {
        if (!Array.isArray(input.defendantIds) || input.defendantIds.length === 0) {
            return 'اختر متهماً هارباً واحداً على الأقل لقرار حجز الأموال.';
        }
        const seizure = input.assetSeizure;
        const perDefendant = Array.isArray(seizure?.perDefendant) ? seizure!.perDefendant : [];
        if (perDefendant.length === 0) {
            return 'أضف صنف مال محجوز واحد على الأقل لكل متهم مُختار.';
        }
        for (const p of perDefendant) {
            const did = String(p?.defendantId ?? '').trim();
            if (!did) return 'بيانات حجز الأموال غير مكتملة.';
            const assets = Array.isArray(p?.assets) ? p.assets : [];
            const hasOne = assets.some((a) => String(a?.description ?? '').trim().length > 0);
            if (!hasOne) return 'أدخل وصفاً لصنف محجوز واحد على الأقل لكل متهم مُختار.';
        }
    }
    return null;
}

export function validateFinalizeLawyerRequestInput(
    input: FinalizeLawyerRequestInput,
    requestDate?: string,
): string | null {
    if (!isLawyerRequestFinalStatus(input.status)) return 'اختر نتيجة القاضي (موافقة أو رفض).';
    if (!String(input.judgeMargin ?? '').trim()) return 'هامش القاضي الختامي مطلوب.';
    if (!String(input.decisionDate ?? '').trim()) return 'تاريخ قرار القاضي مطلوب.';
    const reqD = String(requestDate ?? '').trim();
    const decD = String(input.decisionDate ?? '').trim();
    if (reqD && decD && isTimelineNextDateInvalid(reqD, decD)) {
        return 'لا يمكن أن يكون تاريخ القرار سابقاً لتاريخ تقديم الطلب.';
    }
    return null;
}

/** هوامش المتابعة — لا تُضاف على قرار نافذ/مقفل نهائياً */
export function canAddLawyerRequestFollowUpMargin(
    request: Pick<LawyerRequest, 'status' | 'isLocked' | 'decisionArchived'>,
): boolean {
    if (request.status === 'executed') return false;
    if (isLawyerRequestLocked(request)) return false;
    return request.status === 'pending';
}

export function canEditLawyerRequestAttachments(
    request: Pick<LawyerRequest, 'status' | 'isLocked' | 'decisionArchived'>,
): boolean {
    if (request.status === 'executed') return false;
    if (isLawyerRequestLocked(request)) return false;
    if (isLawyerRequestFinalStatus(request.status)) return false;
    return request.status === 'pending';
}

/** يمنع القفل النهائي عبر مسار التحديث العادي — يُستخدم finalizeLawyerRequest للموافقة/الرفض. */
export function stripLawyerRequestDecisionPatch(
    patch: Partial<Omit<LawyerRequest, 'id'>>,
): Partial<Omit<LawyerRequest, 'id'>> {
    const next = { ...patch };
    const status = next.status as LawyerRequest['status'];
    if (isLawyerRequestFinalStatus(status) || status === 'executed') {
        delete next.status;
        delete next.judgeMargin;
        delete next.decisionDate;
    }
    delete next.isLocked;
    delete next.decisionArchived;
    return next;
}

export type CreateLawyerRequestResult = {
    error: string | null;
    requestId: string | null;
};
