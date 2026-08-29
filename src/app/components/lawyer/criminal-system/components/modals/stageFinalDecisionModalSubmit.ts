import type { CriminalDefendant, StageConclusion } from '../../criminalStore';
import type { CaseSovereignContext } from '../../caseClassificationEngine';
import {
    validateStageFinalDecisionForm,
    type StageFinalDecisionFormPayload,
    type StageFinalDecisionKind,
    type StageFinalPenaltyBlock,
} from '../../stageFinalDecisionEngine';
import type { DecisionPresenceType } from '../../decisionAppealPeriodEngine';
import {
    validateExpirationReasonSelection,
    type StageExpirationReason,
} from '../../stageExpirationReasons';
import { resolveTrialFinalDecisionScopeIds } from '../../partyPersonalStage';

export type StageFinalDecisionSubmitInput = {
    defendants: CriminalDefendant[];
    selectableDefendants: CriminalDefendant[];
    scopedDefendantIds: string[];
    isSummaryPath: boolean;
    kind: StageFinalDecisionKind | '';
    showFullConvictionFields: boolean;
    expirationReason: StageExpirationReason | '';
    expirationCustomDetail: string;
    penalty: StageFinalPenaltyBlock;
    supplementaryPenaltiesEnabled: boolean;
    penaltiesSupplementary: string | null;
    issuedAt: string;
    inferredPresenceType: DecisionPresenceType;
    decisionText: string;
    convictionText: string;
    caseContext: CaseSovereignContext;
};

export type StageFinalDecisionSubmitResult =
    | { ok: false; error: string }
    | {
          ok: true;
          payload: StageFinalDecisionFormPayload;
          meta: { defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'] };
      };

export function buildStageFinalDecisionSubmit(
    input: StageFinalDecisionSubmitInput,
): StageFinalDecisionSubmitResult {
    const {
        defendants,
        selectableDefendants,
        scopedDefendantIds,
        isSummaryPath,
        kind,
        showFullConvictionFields,
        expirationReason,
        expirationCustomDetail,
        penalty,
        supplementaryPenaltiesEnabled,
        penaltiesSupplementary,
        issuedAt,
        inferredPresenceType,
        decisionText,
        convictionText,
        caseContext,
    } = input;

    if (!selectableDefendants.length) {
        return { ok: false, error: 'لا يوجد متهمون قابلون للإدراج في القرار.' };
    }
    const effectiveScopeIds = resolveTrialFinalDecisionScopeIds(defendants, scopedDefendantIds);
    if (!effectiveScopeIds.length) {
        return { ok: false, error: 'حدّد متهماً واحداً على الأقل.' };
    }

    const resolvedKind: StageFinalDecisionKind = isSummaryPath
        ? 'conviction_penalty'
        : (kind as StageFinalDecisionKind);

    if (resolvedKind === 'criminal_expiration') {
        const expirationErr = validateExpirationReasonSelection(expirationReason, expirationCustomDetail);
        if (expirationErr) return { ok: false, error: expirationErr };
    }

    const resolvedPenalty =
        isSummaryPath || showFullConvictionFields
            ? {
                  ...penalty,
                  penalties_supplementary:
                      supplementaryPenaltiesEnabled && String(penaltiesSupplementary ?? '').trim()
                          ? String(penaltiesSupplementary).trim()
                          : null,
              }
            : undefined;
    const payload: StageFinalDecisionFormPayload = {
        kind: resolvedKind,
        issuedAt,
        presenceType: inferredPresenceType,
        decisionText: isSummaryPath
            ? ''
            : resolvedKind === 'criminal_expiration' && expirationReason === 'custom_manual'
              ? expirationCustomDetail.trim() || decisionText
              : decisionText,
        convictionText: showFullConvictionFields ? convictionText : undefined,
        defendantIds: effectiveScopeIds,
        expirationReason:
            resolvedKind === 'criminal_expiration' && expirationReason ? expirationReason : undefined,
        penalty: resolvedPenalty,
        decisionPath: isSummaryPath ? 'summary' : 'full',
    };

    const validationErr = validateStageFinalDecisionForm(payload, caseContext);
    if (validationErr) return { ok: false, error: validationErr };

    const defaultStatus: StageConclusion['defendantStatusAtDecision'] = defendants.some(
        (d) => d.status === 'موقوف' || d.status === 'ملقى القبض عليه',
    )
        ? 'detained'
        : defendants.some((d) => d.status === 'مكفل' || d.status === 'bailed_pending_appeal')
          ? 'bailed'
          : defendants.some((d) => d.status === 'هارب')
            ? 'fugitive'
            : 'bailed';

    return { ok: true, payload, meta: { defendantStatusAtDecision: defaultStatus } };
}
