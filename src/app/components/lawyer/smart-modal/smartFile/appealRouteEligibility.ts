import { isExtraordinaryProcedureStage, isFixedFeeType } from '@/app/components/lawyer/LawyerNewCase/validation';

/** حد القيمة التقديرية — ما دونها أو يساويها: تمييز فقط (بدون استئناف) */
export const APPELLATE_CLAIM_THRESHOLD_IQD = 1_000_000;

export type AppealRouteStageRef = {
    id?: string | number | null;
    stageName?: string | null;
    name?: string | null;
    status?: string | null;
    claimValue?: string | null;
    docType?: string | null;
    type?: string | null;
    isUndeterminedValue?: boolean | null;
    isFixedFee?: boolean | null;
    appealMetadata?: { previousStage?: string | null } | null;
};

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

function normalizeClaimDigits(raw?: string | null): string {
    return String(raw ?? '')
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[^0-9]/g, '');
}

export function parseClaimValueIqd(raw?: string | null): number {
    return Number.parseInt(normalizeClaimDigits(raw), 10) || 0;
}

export function readPersistedClaimValue(
    file?: {
        claimValue?: string | null;
        details?: { claimValue?: string | null } | null;
    } | null,
): string | undefined {
    const direct = String(file?.claimValue ?? '').trim();
    if (direct) return direct;
    const nested = String(file?.details?.claimValue ?? '').trim();
    return nested || undefined;
}

function stageLabelOf(stage?: AppealRouteStageRef | null): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

/** بداءة فعلية — تستثني الطعن الاستثنائي والاستئناف والتمييز */
export function isAppealRouteFirstInstanceStage(stageName?: string | null): boolean {
    const label = String(stageName ?? '').trim();
    if (!label) return false;
    if (isExtraordinaryProcedureStage(label)) return false;
    if (label.includes('استئناف') || label.includes('تمييز')) return false;
    return true;
}

/**
 * عند الوقوف على مرحلة طعن استثنائي (اعتراض غيابي / اعتراض الغير / إعادة محاكمة)
 * نرجع لمرحلة البداءة المقفولة — مصدر القيمة وقواعد الاستئناف.
 */
export function findFirstInstanceBasisStage(
    stages: AppealRouteStageRef[],
    currentStage: AppealRouteStageRef | null | undefined,
): AppealRouteStageRef | undefined {
    if (!Array.isArray(stages) || stages.length === 0) return undefined;

    if (!currentStage) {
        return (
            stages.find(
                (stage) =>
                    isAppealRouteFirstInstanceStage(stageLabelOf(stage))
                    && (stage.status === 'locked' || stage.status === 'completed'),
            ) ?? stages.find((stage) => isAppealRouteFirstInstanceStage(stageLabelOf(stage)))
        );
    }

    const currentName = stageLabelOf(currentStage);
    if (isAppealRouteFirstInstanceStage(currentName)) {
        return currentStage;
    }

    const previousFromMeta = String(currentStage?.appealMetadata?.previousStage ?? '').trim();
    if (previousFromMeta && isAppealRouteFirstInstanceStage(previousFromMeta)) {
        const matched = stages.find((stage) => stageLabelOf(stage) === previousFromMeta);
        if (matched) return matched;
        return { ...currentStage, stageName: previousFromMeta };
    }

    const activeIdx = stages.findIndex(
        (stage) => stage.id != null && currentStage.id != null && stage.id === currentStage.id,
    );
    const searchFrom = activeIdx >= 0 ? activeIdx : stages.length - 1;
    for (let i = searchFrom - 1; i >= 0; i--) {
        const candidate = stages[i];
        if (isAppealRouteFirstInstanceStage(stageLabelOf(candidate))) {
            return candidate;
        }
    }

    return (
        stages.find(
            (stage) =>
                isAppealRouteFirstInstanceStage(stageLabelOf(stage))
                && (stage.status === 'locked' || stage.status === 'completed'),
        ) ?? stages.find((stage) => isAppealRouteFirstInstanceStage(stageLabelOf(stage)))
    );
}

export function inferRetrialTargetStageLabel(
    fileRetrialTargetStage: string | null | undefined,
    basisStage: AppealRouteStageRef | undefined,
    currentStage: AppealRouteStageRef | null | undefined,
): string | undefined {
    const currentName = stageLabelOf(currentStage);
    const fromBasis = stageLabelOf(basisStage);
    const fromMeta = String(currentStage?.appealMetadata?.previousStage ?? '').trim();

    // على مرحلة طعن استثنائي: سجل المراحل (البداءة المقفولة) يقدّم المرحلة الأصلية
    // وليس حقل retrialTargetStage من إنشاء الدعوى الذي قد يبقى «بدرجة أخيرة» خطأً.
    if (isExtraordinaryProcedureStage(currentName)) {
        if (fromBasis && isAppealRouteFirstInstanceStage(fromBasis)) return fromBasis;
        if (fromMeta && isAppealRouteFirstInstanceStage(fromMeta)) return fromMeta;
    }

    const fromFile = String(fileRetrialTargetStage ?? '').trim();
    if (fromFile) return fromFile;
    if (fromBasis && isAppealRouteFirstInstanceStage(fromBasis)) return fromBasis;
    if (fromMeta && isAppealRouteFirstInstanceStage(fromMeta)) return fromMeta;
    return undefined;
}

/** يطابق منطق إنشاء الدعوى — قيمة > 1M تُرقّي «بدرجة أخيرة» إلى «بدرجة أولى» */
function applyValueBasedStageCorrection(stageLabel: string, value: number): string {
    if (!stageLabel.trim()) return stageLabel;
    if (value > APPELLATE_CLAIM_THRESHOLD_IQD && stageLabel.includes('بدرجة أخيرة')) {
        return stageLabel.replace('بدرجة أخيرة', 'بدرجة أولى');
    }
    if (
        value > 0
        && value <= APPELLATE_CLAIM_THRESHOLD_IQD
        && stageLabel.includes('بدرجة أولى')
        && !stageLabel.includes('استئناف')
        && !stageLabel.includes('تمييز')
    ) {
        return stageLabel.replace('بدرجة أولى', 'بدرجة أخيرة');
    }
    return stageLabel;
}

export function pickQuantifiedClaimValue(
    ...sources: Array<string | null | undefined>
): string | undefined {
    let best: string | undefined;
    let bestValue = 0;
    for (const raw of sources) {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed) continue;
        const parsed = parseClaimValueIqd(trimmed);
        if (parsed > bestValue) {
            bestValue = parsed;
            best = trimmed;
        } else if (!best) {
            best = trimmed;
        }
    }
    return best;
}

/** المرحلة الفعلية لقواعد الطعن — تغطية الطعن الاستثنائي بغطاء المرحلة الأصلية */
export function resolveAppealEffectiveStage(ctx: AppealRouteContext): string {
    const current = String(ctx.currentStage ?? '').trim();
    const stageName = String(ctx.stageName ?? '').trim();
    const claimValue = parseClaimValueIqd(ctx.claimValue);

    if (isExtraordinaryProcedureStage(current)) {
        const underlying = String(ctx.retrialTargetStage ?? '').trim() || stageName;
        if (underlying) {
            return applyValueBasedStageCorrection(underlying, claimValue);
        }
    }

    // file.currentStage قد يبقى «بدرجة أخيرة» بينما المرحلة النشطة في الإضبارة هي بداءة أولى
    if (
        current.includes('بدرجة أخيرة')
        && stageName
        && !stageName.includes('بدرجة أخيرة')
        && !stageName.includes('استئناف')
        && !stageName.includes('تمييز')
    ) {
        return applyValueBasedStageCorrection(stageName, claimValue);
    }
    const effective = current || stageName;
    return applyValueBasedStageCorrection(effective, claimValue);
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
    const stageLabel = resolveAppealEffectiveStage(ctx);
    if (isAppealOnlyCassationStage(stageLabel)) {
        return false;
    }

    if (ctx.isUndeterminedValue === true || ctx.isFixedFee === true) {
        return false;
    }

    const value = parseClaimValueIqd(ctx.claimValue);
    const docLabel = String(ctx.docType ?? ctx.type ?? '');

    if (stageLabel.includes('بدرجة أخيرة')) {
        return false;
    }

    if (docLabel && isFixedFeeType(docLabel)) {
        return false;
    }

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
        activeStage?: AppealRouteStageRef | null;
        stages?: Array<{
            id?: string | number | null;
            claimValue?: string | null;
            isUndeterminedValue?: boolean | null;
            isFixedFee?: boolean | null;
            stageName?: string | null;
            name?: string | null;
            status?: string | null;
            appealMetadata?: { previousStage?: string | null } | null;
        }> | null;
    } | null,
    stage?: {
        id?: string | number | null;
        claimValue?: string | null;
        docType?: string | null;
        type?: string | null;
        stageName?: string | null;
        name?: string | null;
        status?: string | null;
        isUndeterminedValue?: boolean | null;
        isFixedFee?: boolean | null;
        appealMetadata?: { previousStage?: string | null } | null;
    } | null,
): AppealRouteContext {
    const liveStages = Array.isArray(file?.stages) ? file.stages : [];
    const stageClaimValues = liveStages.map((entry) => entry?.claimValue);

    const activeStageRef: AppealRouteStageRef =
        file?.activeStage && typeof file.activeStage === 'object'
            ? file.activeStage
            : stage ?? { stageName: file?.currentStage ?? stage?.stageName ?? null };

    const basisStage =
        liveStages.length > 0
            ? findFirstInstanceBasisStage(liveStages, activeStageRef)
            : isAppealRouteFirstInstanceStage(stageLabelOf(activeStageRef))
              ? activeStageRef
              : undefined;

    const claimValue = pickQuantifiedClaimValue(
        file?.claimValue,
        basisStage?.claimValue,
        stage?.claimValue,
        activeStageRef?.claimValue,
        readPersistedClaimValue(file),
        ...stageClaimValues,
    );
    const parsedValue = parseClaimValueIqd(claimValue);
    const docLabel = String(
        basisStage?.docType ??
            basisStage?.type ??
            stage?.docType ??
            stage?.type ??
            activeStageRef?.docType ??
            activeStageRef?.type ??
            file?.docType ??
            file?.type ??
            '',
    );

    const activeLabel = stageLabelOf(activeStageRef);
    const useBasisAppealFlags =
        isExtraordinaryProcedureStage(activeLabel) && basisStage != null;

    let isUndeterminedValue = file?.isUndeterminedValue === true;
    let isFixedFee = file?.isFixedFee === true;

    if (useBasisAppealFlags) {
        isUndeterminedValue = basisStage.isUndeterminedValue === true;
        isFixedFee = basisStage.isFixedFee === true;
    } else {
        if (stage?.isUndeterminedValue === true) {
            isUndeterminedValue = true;
        }
        if (stage?.isFixedFee === true) {
            isFixedFee = true;
        }
        if (activeStageRef?.isUndeterminedValue === true) {
            isUndeterminedValue = true;
        }
        if (activeStageRef?.isFixedFee === true) {
            isFixedFee = true;
        }
        for (const entry of liveStages) {
            if (entry?.isUndeterminedValue === true) {
                isUndeterminedValue = true;
            }
            if (entry?.isFixedFee === true) {
                isFixedFee = true;
            }
        }
    }

    if (docLabel && isFixedFeeType(docLabel)) {
        isFixedFee = true;
    }

    if (parsedValue > APPELLATE_CLAIM_THRESHOLD_IQD) {
        isUndeterminedValue = false;
        if (!isFixedFeeType(docLabel)) {
            isFixedFee = false;
        }
    }

    const currentStage =
        typeof file?.currentStage === 'string' && file.currentStage.trim()
            ? file.currentStage.trim()
            : (stageLabelOf(activeStageRef) || stage?.stageName) ?? null;

    const retrialTargetStage =
        inferRetrialTargetStageLabel(file?.retrialTargetStage, basisStage, activeStageRef)
        ?? file?.retrialTargetStage
        ?? undefined;

    return {
        claimValue,
        isUndeterminedValue,
        isFixedFee,
        docType: docLabel || undefined,
        type: stage?.type ?? activeStageRef?.type ?? file?.type,
        stageName:
            stageLabelOf(basisStage) ||
            stage?.stageName ||
            stageLabelOf(activeStageRef) ||
            undefined,
        currentStage,
        retrialTargetStage,
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
