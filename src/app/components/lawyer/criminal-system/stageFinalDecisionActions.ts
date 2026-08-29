import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import { computeOrdinaryCassationWindow, resolveAppealPeriodStartExclusive } from './decisionAppealPeriodEngine';
import type { VerdictCard } from './verdictCardsEngine';
import {
    canShowVerdictCassationCorrection,
    isVerdictCassationFilingComplete,
    isVerdictCassationUnderReview,
    isVerdictCorrectionAppealFiled,
    isVerdictCorrectionAppealPending,
} from './verdictCardsEngine';
import {
    applyStageGatesToVerdictCardActions,
    isVerdictInterventionLockActive,
} from './stageCassationActionGates';
import { resolveStageFinalDecisionBadge } from './stageFinalDecisionBadge';
import type {
    StageFinalDecisionActionsContext,
    StageFinalDecisionCardActions,
    StageFinalDecisionUserRole,
} from './stageFinalDecisionTypes';

function normalizeStageFinalDecisionUserRole(
    userRole?: StageFinalDecisionUserRole,
): CriminalCaseUserRole {
    const r = String(userRole ?? '').trim();
    if (r === 'defendant_lawyer' || r === 'lawyer_of_defendant') return 'defendant_lawyer';
    if (r === 'complainant_lawyer' || r === 'lawyer_of_claimant') return 'complainant_lawyer';
    return '';
}

function isStageFinalConvictionOutcome(card: VerdictCard): boolean {
    return card.outcome === 'conviction' || card.finalDecisionKind === 'conviction_penalty';
}

function isStageFinalAcquittalOrReleaseOutcome(card: VerdictCard): boolean {
    return (
        card.outcome === 'acquittal' ||
        card.outcome === 'release' ||
        card.finalDecisionKind === 'acquittal' ||
        card.finalDecisionKind === 'release'
    );
}

/** يتحكم بظهور زر «تسجيل طعن تمييزي» حسب دور المحامي ونتيجة القرار الختامي. */
export function canShowStageFinalCassationAppealByRole(
    card: VerdictCard,
    userRole?: StageFinalDecisionUserRole,
): boolean {
    const role = normalizeStageFinalDecisionUserRole(userRole);
    if (role === 'defendant_lawyer') {
        return isStageFinalConvictionOutcome(card);
    }
    if (role === 'complainant_lawyer') {
        return isStageFinalConvictionOutcome(card) || isStageFinalAcquittalOrReleaseOutcome(card);
    }
    return isStageFinalConvictionOutcome(card) || isStageFinalAcquittalOrReleaseOutcome(card);
}

export function resolveStageFinalDecisionActions(
    card: VerdictCard,
    contextOrReadOnly?: StageFinalDecisionActionsContext | boolean,
    legacyReferenceDate = new Date(),
): StageFinalDecisionCardActions {
    const ctx: StageFinalDecisionActionsContext =
        typeof contextOrReadOnly === 'boolean'
            ? { readOnly: contextOrReadOnly, referenceDate: legacyReferenceDate }
            : { referenceDate: new Date(), ...contextOrReadOnly };
    const { readOnly, referenceDate = new Date(), userRole, caseStage } = ctx;
    const normalizedRole = normalizeStageFinalDecisionUserRole(userRole);
    const roleAllowsCassation = canShowStageFinalCassationAppealByRole(card, userRole);
    const underReview = isVerdictCassationUnderReview(card);
    const showCorrection = canShowVerdictCassationCorrection(card, { userRole, referenceDate });

    if (readOnly) {
        return {
            showCassationAppeal: false,
            showAbsentiaPublication: false,
            showAbsentiaObjection: false,
            showComplainantCassation: false,
            showRecordCassationResult: false,
            showCassationCorrection: false,
        };
    }
    const presence = card.presenceType ?? 'وجاهي';
    const badge = resolveStageFinalDecisionBadge(card, referenceDate);

    if (presence === 'غيابي') {
        const pub = String(card.absentiaPublicationDate ?? '').trim();
        const absentiaCassationReady =
            Boolean(pub) &&
            (card.absentiaTreatedAsInPerson === true || badge.label.includes('بمنزلة الوجاهي'));
        const window = computeOrdinaryCassationWindow(
            resolveAppealPeriodStartExclusive(card.issuedAt) || card.issuedAt,
            referenceDate,
        );
        const withinWindow = !isVerdictCassationFilingComplete(card) && !window.isExpired;
        const gated = applyStageGatesToVerdictCardActions({
            caseStage,
            interventionLock: isVerdictInterventionLockActive(card),
            ordinaryAppealPending: isVerdictCassationUnderReview(card),
            ordinaryAppealFiled: isVerdictCassationFilingComplete(card),
            correctionAppealPending: isVerdictCorrectionAppealPending(card),
            correctionAppealFiled: isVerdictCorrectionAppealFiled(card),
            showCassationAppeal:
                roleAllowsCassation &&
                normalizedRole === 'defendant_lawyer' &&
                absentiaCassationReady &&
                withinWindow,
            showComplainantCassation:
                roleAllowsCassation &&
                normalizedRole === 'complainant_lawyer' &&
                absentiaCassationReady &&
                withinWindow,
            showCassationCorrection: showCorrection,
            showRecordCassationResult: underReview,
        });
        return {
            showAbsentiaPublication: !pub,
            showAbsentiaObjection:
                Boolean(pub) && !card.absentiaObjectionFiled && badge.tone === 'absentee_objection',
            ...gated,
        };
    }

    const window = computeOrdinaryCassationWindow(
        resolveAppealPeriodStartExclusive(card.issuedAt) || card.issuedAt,
        referenceDate,
    );
    const withinWindow = !isVerdictCassationFilingComplete(card) && !window.isExpired;
    const gated = applyStageGatesToVerdictCardActions({
        caseStage,
        interventionLock: isVerdictInterventionLockActive(card),
        ordinaryAppealPending: isVerdictCassationUnderReview(card),
        ordinaryAppealFiled: isVerdictCassationFilingComplete(card),
        correctionAppealPending: isVerdictCorrectionAppealPending(card),
        correctionAppealFiled: isVerdictCorrectionAppealFiled(card),
        showCassationAppeal: roleAllowsCassation && withinWindow,
        showComplainantCassation: false,
        showCassationCorrection: showCorrection,
        showRecordCassationResult: underReview,
    });
    return {
        showAbsentiaPublication: false,
        showAbsentiaObjection: false,
        ...gated,
    };
}
