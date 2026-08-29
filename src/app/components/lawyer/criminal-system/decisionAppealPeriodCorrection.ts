import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import { normalizeCassationAppealResult } from './cassationJudicialForm';
import { latestConcludedAppealWithBeneficiary } from './judicialDecisionsEngine';
import { resolveCassationCorrectionRemainingDaysForAnchor } from './decisionAppealPeriodCalendar';
import { resolveAppealResultCategory, resolveAppealResultRecordedAt, resolveStoredAppealResultRaw } from './decisionAppealPeriodResults';
import type {
    CassationCorrectionDecisionOutcome,
    CassationCorrectionEligibilityInput,
    CassationCorrectionUserRole,
} from './decisionAppealPeriodTypes';

function normalizeCassationCorrectionUserRole(
    userRole?: CassationCorrectionUserRole,
): CriminalCaseUserRole {
    const r = String(userRole ?? '').trim();
    if (r === 'defendant_lawyer' || r === 'lawyer_of_defendant') return 'defendant_lawyer';
    if (r === 'complainant_lawyer' || r === 'lawyer_of_claimant') return 'complainant_lawyer';
    return '';
}

export function isCassationResultQuashRemand(raw: string): boolean {
    const key = String(raw ?? '').trim();
    if (!key) return false;
    if (key === 'verdict_quash_remand_retrial') return true;
    if (normalizeCassationAppealResult(key) === 'quash_remand') return true;
    return key === 'نقض وإعادة' || /نقض\s*و\s*إعادة/i.test(key);
}

export function isCassationIssuedByGeneralAssembly(issuedBy: string | undefined): boolean {
    const v = String(issuedBy ?? '').trim();
    if (!v) return false;
    return v === 'الهيئة العامة' || /الهيئة\s*العامة/i.test(v);
}

/** م 267 — منع مطلق لتصحيح نقض وإعادة أو قرارات الهيئة العامة. */
export function isCassationCorrectionBlockedByArticle267(
    cassationResultRaw: string,
    issuedBy?: string,
): boolean {
    return isCassationResultQuashRemand(cassationResultRaw) || isCassationIssuedByGeneralAssembly(issuedBy);
}

export function isCassationResultAffirmationUpheld(raw: string): boolean {
    const key = String(raw ?? '').trim();
    if (!key) return false;
    if (resolveAppealResultCategory(key) === 'upheld') return true;
    const norm = normalizeCassationAppealResult(key);
    return norm === 'affirmation' || norm === 'procedural_affirmation';
}

export function resolveJudicialCassationCorrectionOutcome(
    decision: JudicialDecision,
): CassationCorrectionDecisionOutcome {
    const text = `${decision.title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (/براءة|تبرئة/i.test(text) && !/إدانة/i.test(text)) return 'acquittal';
    if (/إدانة|محكوم|عقوبة/i.test(text)) return 'conviction';
    if (decision.disposition === 'favors_defendant') return 'acquittal';
    if (decision.disposition === 'favors_complainant') return 'conviction';
    return '';
}

export function hasCassationCorrectionPartyInterest(
    userRole: CassationCorrectionUserRole | undefined,
    decisionOutcome: CassationCorrectionDecisionOutcome,
): boolean {
    const role = normalizeCassationCorrectionUserRole(userRole);
    if (role === 'defendant_lawyer' && decisionOutcome === 'conviction') return true;
    if (role === 'complainant_lawyer' && decisionOutcome === 'acquittal') return true;
    return false;
}

export function resolveJudicialCassationIssuedBy(decision: JudicialDecision): string {
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    const fromAppeal = String(
        (concluded as { cassationIssuedBy?: string; panelName?: string } | undefined)?.cassationIssuedBy ??
            (concluded as { panelName?: string } | undefined)?.panelName ??
            '',
    ).trim();
    if (isCassationIssuedByGeneralAssembly(fromAppeal)) return fromAppeal;
    const combined = `${decision.title} ${decision.summary}`;
    if (/الهيئة\s*العامة/i.test(combined)) return 'الهيئة العامة';
    return fromAppeal;
}

/** يتحكم بظهور زر «طلب تصحيح القرار التمييزي» — م 266/267. */
export function canShowCassationCorrectionButton(input: CassationCorrectionEligibilityInput): boolean {
    if (input.correctionAlreadyPending || input.correctionAlreadyFiled) return false;

    const resultRaw = String(input.cassationResultRaw ?? '').trim();
    if (!resultRaw) return false;
    if (isCassationCorrectionBlockedByArticle267(resultRaw, input.issuedBy)) return false;
    if (!isCassationResultAffirmationUpheld(resultRaw)) return false;
    if (!hasCassationCorrectionPartyInterest(input.userRole, input.decisionOutcome)) return false;

    const recordedAt = String(input.resultRecordedAt ?? '').trim();
    if (!recordedAt) return false;
    return resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, input.referenceDate) > 0;
}

export function canShowCassationCorrectionForJudicialDecision(
    decision: JudicialDecision,
    context?: {
        userRole?: CassationCorrectionUserRole;
        referenceDate?: Date;
        correctionAlreadyPending?: boolean;
        correctionAlreadyFiled?: boolean;
    },
): boolean {
    return canShowCassationCorrectionButton({
        cassationResultRaw: resolveStoredAppealResultRaw(decision),
        issuedBy: resolveJudicialCassationIssuedBy(decision),
        resultRecordedAt: resolveAppealResultRecordedAt(decision),
        decisionOutcome: resolveJudicialCassationCorrectionOutcome(decision),
        userRole: context?.userRole,
        referenceDate: context?.referenceDate,
        correctionAlreadyPending: context?.correctionAlreadyPending ?? decision.cassationCorrectionPending === true,
        correctionAlreadyFiled: context?.correctionAlreadyFiled,
    });
}
