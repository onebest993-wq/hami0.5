import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { VerdictCard } from './verdictCardsEngine';
import {
    decisionHasActiveAppealOfPath,
    hasJudicialAppealBeenFiledOnPath,
} from './judicialDecisionsEngine';

export type CassationCorrectionUserRole =
    | CriminalCaseUserRole
    | 'lawyer_of_defendant'
    | 'lawyer_of_claimant';

export type CassationActionKind =
    | 'cassation_appeal'
    | 'intervention_cassation'
    | 'cassation_correction'
    | 'declare_judgment_final'
    | 'record_appeal_result';

export type DashboardCassationStage = 'investigation' | 'misdemeanor' | 'felony' | 'other';

/** أعلام ظهور الأزرار القضائية — محكومة بحسب مرحلة الإضبارة. */
export type StageCassationButtonFlags = {
    showCassationAppeal: boolean;
    showInterventionCassation: boolean;
    showCassationCorrection: boolean;
    showDeclareJudgmentFinal: boolean;
    showRecordAppealResult: boolean;
};

const STAGE_ALLOWED_ACTIONS: Record<
    Exclude<DashboardCassationStage, 'other'>,
    ReadonlySet<CassationActionKind>
> = {
    investigation: new Set(['cassation_appeal', 'intervention_cassation', 'record_appeal_result']),
    misdemeanor: new Set([
        'cassation_appeal',
        'intervention_cassation',
        'cassation_correction',
        'record_appeal_result',
    ]),
    felony: new Set(['cassation_appeal', 'cassation_correction', 'record_appeal_result']),
};

export function normalizeDashboardCassationStage(caseStage?: CaseStage): DashboardCassationStage {
    if (caseStage === 'investigation') return 'investigation';
    if (caseStage === 'misdemeanor') return 'misdemeanor';
    if (caseStage === 'felony') return 'felony';
    return 'other';
}

function normalizeCassationUserRole(userRole?: CassationCorrectionUserRole): string {
    const r = String(userRole ?? '').trim();
    if (r === 'defendant_lawyer' || r === 'lawyer_of_defendant') return 'defendant_lawyer';
    if (r === 'complainant_lawyer' || r === 'lawyer_of_claimant') return 'complainant_lawyer';
    return '';
}

/** قفل ذهبي — بعد تفعيل طلب التدخل التمييزي تختفي كل وسائل الطعن على البطاقة. */
export function isInterventionCassationLockActive(decision: JudicialDecision): boolean {
    return (
        decision.interventionCassationPending === true ||
        decisionHasActiveAppealOfPath(decision, 'intervention_264b') ||
        hasJudicialAppealBeenFiledOnPath(decision, 'intervention_264b')
    );
}

export function isVerdictInterventionLockActive(card: VerdictCard): boolean {
    const ia = card.interventionAppeal;
    if (!ia) return false;
    const status = String(ia.status ?? '').trim();
    if (status === 'pending' || status === 'filed') return true;
    return Boolean(
        String(ia.interventionRequestNumber ?? '').trim() ||
            String(ia.filedAt ?? '').trim() ||
            String(ia.targetedDecisionDescription ?? '').trim(),
    );
}

/** النتيجة الأصلية للحكم — براءة أو إفراج. */
export function isOriginalJudicialDecisionAcquittalOrRelease(decision: JudicialDecision): boolean {
    const text = `${decision.title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (/إفراج|release/i.test(text)) return true;
    if (/براءة|تبرئة|acquittal/i.test(text) && !/إدانة/i.test(text)) return true;
    if (decision.disposition === 'favors_defendant') return true;
    const textOutcome =
        /براءة|تبرئة|acquittal/i.test(text) && !/إدانة/i.test(text)
            ? 'acquittal'
            : /إدانة|محكوم|عقوبة/i.test(text)
              ? 'conviction'
              : '';
    return textOutcome === 'acquittal';
}

/** جنح/جنايات — يختفي طعن وكيل المتهم عند البراءة أو الإفراج. */
export function shouldHideCassationAppealForDefendantCounsel(
    decision: JudicialDecision,
    userRole?: CassationCorrectionUserRole,
    caseStage?: CaseStage,
): boolean {
    const dashboard = normalizeDashboardCassationStage(caseStage);
    if (dashboard !== 'misdemeanor' && dashboard !== 'felony') return false;
    if (normalizeCassationUserRole(userRole) !== 'defendant_lawyer') return false;
    return isOriginalJudicialDecisionAcquittalOrRelease(decision);
}

export function actionsToStageCassationButtonFlags(
    actions: CassationActionKind[],
): StageCassationButtonFlags {
    return {
        showCassationAppeal: actions.includes('cassation_appeal'),
        showInterventionCassation: actions.includes('intervention_cassation'),
        showCassationCorrection: actions.includes('cassation_correction'),
        showDeclareJudgmentFinal: actions.includes('declare_judgment_final'),
        showRecordAppealResult: actions.includes('record_appeal_result'),
    };
}

/**
 * تطبيق قواعد الظهور/الاختفاء الصارمة حسب مرحلة الإضبارة على قائمة الإجراءات.
 * كل زر يُستخدم مرة واحدة — القفل الذهبي للتدخل يخفي جميع وسائل الطعن.
 */
export function applyStageCassationActionGates(
    actions: CassationActionKind[],
    decision: JudicialDecision,
    context?: {
        caseStage?: CaseStage;
        userRole?: CassationCorrectionUserRole;
    },
): CassationActionKind[] {
    const dashboard = normalizeDashboardCassationStage(context?.caseStage);
    const interventionLock = isInterventionCassationLockActive(decision);
    const ordinaryPending = decisionHasActiveAppealOfPath(decision, 'ordinary');
    const ordinaryFiled = hasJudicialAppealBeenFiledOnPath(decision, 'ordinary');
    const interventionFiled = hasJudicialAppealBeenFiledOnPath(decision, 'intervention_264b');
    const correctionPending =
        decision.cassationCorrectionPending === true ||
        decisionHasActiveAppealOfPath(decision, 'correction_266');
    const correctionFiled = hasJudicialAppealBeenFiledOnPath(decision, 'correction_266');
    const hideCassationForDefendant = shouldHideCassationAppealForDefendantCounsel(
        decision,
        context?.userRole,
        context?.caseStage,
    );

    let filtered = actions.filter((action) => action !== 'declare_judgment_final');

    if (dashboard === 'investigation') {
        filtered = filtered.filter((action) => action !== 'cassation_correction');
    }

    if (dashboard === 'felony') {
        filtered = filtered.filter((action) => action !== 'intervention_cassation');
    }

    if (hideCassationForDefendant) {
        filtered = filtered.filter((action) => action !== 'cassation_appeal');
    }

    if (interventionLock) {
        filtered = filtered.filter(
            (action) =>
                action !== 'cassation_appeal' &&
                action !== 'intervention_cassation' &&
                action !== 'cassation_correction',
        );
    } else {
        if (ordinaryPending) {
            filtered = filtered.filter(
                (action) => action !== 'cassation_appeal' && action !== 'intervention_cassation',
            );
        } else if (ordinaryFiled) {
            filtered = filtered.filter((action) => action !== 'cassation_appeal');
        }
        if (correctionPending) {
            filtered = filtered.filter(
                (action) =>
                    action !== 'cassation_correction' && action !== 'intervention_cassation',
            );
        } else if (correctionFiled) {
            filtered = filtered.filter((action) => action !== 'cassation_correction');
        }
        if (interventionFiled) {
            filtered = filtered.filter((action) => action !== 'intervention_cassation');
        }
    }

    const allowed = dashboard !== 'other' ? STAGE_ALLOWED_ACTIONS[dashboard] : null;
    if (allowed) {
        filtered = filtered.filter((action) => allowed.has(action));
    }

    return filtered;
}

export function resolveStageCassationButtonFlags(
    actions: CassationActionKind[],
    decision: JudicialDecision,
    context?: {
        caseStage?: CaseStage;
        userRole?: CassationCorrectionUserRole;
    },
): StageCassationButtonFlags {
    return actionsToStageCassationButtonFlags(
        applyStageCassationActionGates(actions, decision, context),
    );
}

/** بوابات بطاقات الحكم الختامي — نفس المنطق المرحلي. */
export function applyStageGatesToVerdictCardActions(input: {
    caseStage?: CaseStage;
    showCassationAppeal: boolean;
    showComplainantCassation: boolean;
    showCassationCorrection: boolean;
    showRecordCassationResult: boolean;
    interventionLock: boolean;
    ordinaryAppealPending?: boolean;
    ordinaryAppealFiled?: boolean;
    correctionAppealPending?: boolean;
    correctionAppealFiled?: boolean;
}): {
    showCassationAppeal: boolean;
    showComplainantCassation: boolean;
    showCassationCorrection: boolean;
    showRecordCassationResult: boolean;
} {
    const dashboard = normalizeDashboardCassationStage(input.caseStage);
    let showCassationAppeal = input.showCassationAppeal;
    let showComplainantCassation = input.showComplainantCassation;
    let showCassationCorrection = input.showCassationCorrection;
    let showRecordCassationResult = input.showRecordCassationResult;

    if (dashboard === 'investigation') {
        showCassationCorrection = false;
    }

    if (input.interventionLock) {
        showCassationAppeal = false;
        showComplainantCassation = false;
        showCassationCorrection = false;
    } else {
        if (input.ordinaryAppealPending) {
            showCassationAppeal = false;
            showComplainantCassation = false;
        } else if (input.ordinaryAppealFiled) {
            showCassationAppeal = false;
        }
        if (input.correctionAppealPending) {
            showCassationCorrection = false;
            showComplainantCassation = false;
        } else if (input.correctionAppealFiled) {
            showCassationCorrection = false;
        }
    }

    return {
        showCassationAppeal,
        showComplainantCassation,
        showCassationCorrection,
        showRecordCassationResult,
    };
}
