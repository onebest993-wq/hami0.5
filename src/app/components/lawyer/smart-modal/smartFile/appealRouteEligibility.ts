import { isExtraordinaryProcedureStage, isFixedFeeType } from '@/app/components/lawyer/LawyerNewCase/validation';

/** حد القيمة التقديرية — ما دونها أو يساويها: تمييز فقط (بدون استئناف) */
export const APPELLATE_CLAIM_THRESHOLD_IQD = 1_000_000;

export type AppealRouteContext = {
    claimValue?: string | null;
    isUndeterminedValue?: boolean | null;
    isFixedFee?: boolean | null;
    docType?: string | null;
    type?: string | null;
    stageName?: string | null;
    currentStage?: string | null;
    /** مرحلة الحكم الأصلي عند الطعن الاستثنائي (إعادة محاكمة / اعتراض غيابي / اعتراض الغير) */
    retrialTargetStage?: string | null;
};

export function parseClaimValueIqd(raw?: string | null): number {
    return Number.parseInt(String(raw ?? '').replace(/[^0-9]/g, ''), 10) || 0;
}

/** المرحلة الفعلية لقواعد الطعن — تغطية الطعن الاستثنائي بغطاء المرحلة الأصلية */
export function resolveAppealEffectiveStage(ctx: AppealRouteContext): string {
    const current = String(ctx.currentStage ?? ctx.stageName ?? '');
    if (isExtraordinaryProcedureStage(current) && ctx.retrialTargetStage) {
        return String(ctx.retrialTargetStage);
    }
    return current;
}

function isAppealOnlyCassationStage(stageLabel: string): boolean {
    return stageLabel.includes('استئناف') && !stageLabel.includes('تمييز');
}

/**
 * هل يحق الطعن استئنافاً؟ إن لم يحق — تمييز حصراً.
 * - قيمة ≤ 1,000,000 د.ع
 * - دعوى غير مقدرة القيمة
 * - دعوى خاضعة للرسم المقطوع
 * - مرحلة «بداءة بدرجة أخيرة»
 */
export function isAppellateAppealAllowed(ctx: AppealRouteContext): boolean {
    if (ctx.isUndeterminedValue === true || ctx.isFixedFee === true) {
        return false;
    }

    const stageLabel = resolveAppealEffectiveStage(ctx);
    if (stageLabel.includes('بدرجة أخيرة')) {
        return false;
    }
    if (isAppealOnlyCassationStage(stageLabel)) {
        return false;
    }

    const docLabel = String(ctx.docType ?? ctx.type ?? '');
    if (docLabel && isFixedFeeType(docLabel)) {
        return false;
    }

    const value = parseClaimValueIqd(ctx.claimValue);
    if (value > 0 && value <= APPELLATE_CLAIM_THRESHOLD_IQD) {
        return false;
    }

    return true;
}

export function resolveCassationOnlyHint(ctx: AppealRouteContext): string {
    if (ctx.isUndeterminedValue) {
        return 'دعوى غير مقدرة القيمة — الطعن تمييزاً فقط.';
    }
    if (ctx.isFixedFee) {
        return 'دعوى خاضعة للرسم المقطوع — الطعن تمييزاً فقط.';
    }
    const value = parseClaimValueIqd(ctx.claimValue);
    if (value > 0 && value <= APPELLATE_CLAIM_THRESHOLD_IQD) {
        return `القيمة التقديرية (${value.toLocaleString('ar-IQ')} د.ع) ضمن حد الدرجة الأخيرة — الطعن تمييزاً فقط.`;
    }
    const stageLabel = resolveAppealEffectiveStage(ctx);
    if (stageLabel.includes('بدرجة أخيرة')) {
        return 'دعوى بداءة بدرجة أخيرة — الطعن تمييزاً فقط.';
    }
    if (isAppealOnlyCassationStage(stageLabel)) {
        return 'مرحلة الاستئناف — الطعن تمييزاً فقط.';
    }
    return 'الطعن في هذه الدعوى تمييزاً فقط (لا استئناف).';
}

export function resolveAppealRouteContext(
    file?: {
        claimValue?: string | null;
        isUndeterminedValue?: boolean | null;
        isFixedFee?: boolean | null;
        docType?: string | null;
        type?: string | null;
        currentStage?: string | null;
        retrialTargetStage?: string | null;
    } | null,
    stage?: {
        claimValue?: string | null;
        docType?: string | null;
        type?: string | null;
        stageName?: string | null;
        isUndeterminedValue?: boolean | null;
        isFixedFee?: boolean | null;
    } | null,
): AppealRouteContext {
    return {
        claimValue: stage?.claimValue ?? file?.claimValue,
        isUndeterminedValue: stage?.isUndeterminedValue ?? file?.isUndeterminedValue,
        isFixedFee: stage?.isFixedFee ?? file?.isFixedFee,
        docType: stage?.docType ?? stage?.type ?? file?.docType,
        type: stage?.type ?? file?.type,
        stageName: stage?.stageName,
        currentStage: file?.currentStage,
        retrialTargetStage: file?.retrialTargetStage,
    };
}

export function filterMethodsForAppealRoute(
    methods: string[],
    appealRoute: AppealRouteContext,
): string[] {
    if (isAppellateAppealAllowed(appealRoute)) {
        return methods;
    }
    return methods.filter((m) => m !== 'استئناف');
}
