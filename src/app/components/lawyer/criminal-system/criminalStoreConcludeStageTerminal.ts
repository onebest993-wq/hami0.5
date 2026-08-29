/**
 * Merge, conclude, draft, severance commit/cancel — split from criminalStoreLifecycleActions.ts
 */

import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
} from '@/app/types/criminal';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';

import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';

import {
    caseStageFromStoredStage,
    isInvestigationStoredStage,
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    recordCassationResult,
    stageConclusionToCassationPayload,
} from './cassationEngine';
import {
    resolvePersonalStageTargets,
} from './criminalCaseGovernance';

import {
    applyInvestigationClosureFromStageConclusion,
} from './investigationDefendantPurge';
import {
    hasIdentifiedDefendant,
} from './criminalUnknownDefendant';
import {
    JUVENILE_TRIAL_COURT_NAME,
} from './juvenileInvestigationRules';
import type {
    InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';

import {
    buildInitialStageJourney,
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    proceduralActionFromConclusion,
} from './stageJourneyTransitionCore';
import {
    upsertVerdictCardFromConclusion,
} from './verdictCardsEngine';
import {
    buildProceduralRouteLawyerRequest,
    isProceduralStageRouteActionId,
} from './trialReferralOrdersEngine';

import {
    allDefendantsTerminal,
    applyCaseSplitFugitiveReferral,
    applyDefaultJudgmentArchive,
    applyDefaultJudgmentOpposition,
    applyPersonalStagesFromConclusion,
    applyPrejudicialPostponement,
    applyProceduralActionToCase,
    applyProceduralRouteTransition,
    normalizeReferralDefendantIds,
    patchInvestigationReferralCase,
    referralPayloadValid,
    stampProceduralNodeId,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';


/** concludeStage + referCaseToTrial — extracted for ≤1000 budget. */

import type { ConcludeStageReferral } from './criminalStoreConcludeStageEarly';

export function applyConcludeStageTerminal(
    state: CriminalStoreState,
    caseId: string,
    target: CriminalCase,
    conclusion: StageConclusion,
    referral: ConcludeStageReferral | undefined,
): CriminalStoreState {
    if (conclusion.decisionType === 'referral') {
        if (!referral) return state;
        const stageKey =
            referral.stage === 'محكمة الجنايات'
                ? 'felony'
                : referral.stage === 'محكمة الجنح'
                  ? 'misdemeanor'
                  : null;
        if (stageKey) {
            const { isPartialReferral } = normalizeReferralDefendantIds(
                target,
                conclusion.defendantIds ?? [],
            );
            const updated = patchInvestigationReferralCase(
                target,
                stageKey,
                referral.courtName,
                referral.caseNumber,
                String(conclusion.date ?? '').trim(),
                String(conclusion.details ?? '').trim(),
                conclusion.defendantStatusAtDecision,
                conclusion.defendantIds ?? [],
            );
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: isPartialReferral ? updated : { ...updated, finalDecision: conclusion },
                },
            };
        }
        const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
        const details = String(conclusion.details ?? '').trim() || 'تمت الإحالة إلى المحكمة المختصة.';
        const event: TimelineEvent = {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار إحالة إلى المحكمة المختصة',
            title: 'إحالة',
            description:
                `${details}` +
                `\nالمحكمة: ${String(referral.courtName ?? '').trim() || '—'} • الرقم: ${String(
                    referral.caseNumber ?? '',
                ).trim() || '—'}`,
        };
        const updated: CriminalCase = {
            ...target,
            basics: { ...target.basics, stage: referral.stage },
            location: { ...target.location, courtName: referral.courtName, caseNumber: referral.caseNumber },
            timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
        };
        return {
            casesById: {
                ...state.casesById,
                [caseId]: updated,
            },
        };
    }

    const isExpiration = conclusion.decisionType === 'expiration';

    const shouldKeepEditableForMandatoryCassation =
        conclusion.decisionType === 'conviction' &&
        (conclusion.punishmentType === 'death' || conclusion.punishmentType === 'life');
    const isTemporaryClosing = conclusion.decisionType === 'temporary_closing';
    const isInvestigationClosure =
        resolveCaseStageFromRecord(target) === 'investigation' &&
        (conclusion.decisionType === 'closing' ||
            conclusion.decisionType === 'temporary_closing');
    const frozenTarget: CriminalCase = {
        ...target,
        isFrozen: isInvestigationClosure
            ? target.isFrozen
            : isTemporaryClosing || shouldKeepEditableForMandatoryCassation
              ? false
              : true,
        finalDecision: conclusion,
    };

    if (isExpiration) {
        const rawIds = Array.isArray(conclusion.defendantIds) ? conclusion.defendantIds : [];
        const partyIds = rawIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
        const defendantIds = resolveProceduralDefendantIds(
            Array.isArray(target.complainants) ? target.complainants : [],
            Array.isArray(target.defendants) ? target.defendants : [],
            partyIds,
            target.isMutualComplaint === true,
        );
        const scopedConclusion: StageConclusion = { ...conclusion, defendantIds };
        let nextCase = applyPersonalStagesFromConclusion(frozenTarget, scopedConclusion);
        const endDate = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
        const idSet = new Set(defendantIds);
        nextCase = {
            ...nextCase,
            defendants: (nextCase.defendants ?? []).map((d) => {
                if (!idSet.has(d.id)) return normalizeDefendantPersonalFields(d);
                const history = Array.isArray(d.detentionHistoryLog) ? d.detentionHistoryLog : [];
                const openIdx = (() => {
                    for (let i = history.length - 1; i >= 0; i--) {
                        const it = history[i];
                        if (it && !String(it.endDate ?? '').trim()) return i;
                    }
                    return -1;
                })();
                const nextHistory =
                    openIdx >= 0
                        ? history.map((h, i) => (i === openIdx ? { ...h, endDate } : h))
                        : history;
                return normalizeDefendantPersonalFields({
                    ...d,
                    detentionHistoryLog: nextHistory,
                });
            }),
        };
        return {
            casesById: {
                ...state.casesById,
                [caseId]: {
                    ...nextCase,
                    isArchived: allDefendantsTerminal(nextCase.defendants ?? []),
                },
            },
        };
    }

    if (conclusion.decisionType === 'conviction') {
        const verdictDate = String(conclusion.date ?? '').trim();

        const decisionDefendantIds = resolvePersonalStageTargets(target, conclusion);
        const scopeIds = decisionDefendantIds.length ? new Set(decisionDefendantIds) : null;

        const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
            const inScope = scopeIds ? scopeIds.has(d.id) : true;
            if (!inScope) return d;
            if (d.status !== 'هارب') return d;
            return {
                ...d,
                inAbsentiaDetails: {
                    verdictDate,
                    objectionDeadline: '',
                    isObjectionFiled: false,
                    notifiedDate: undefined,
                    notificationMethod: undefined,
                },
            };
        });

        let convictionCase = upsertVerdictCardFromConclusion(
            applyPersonalStagesFromConclusion(
                { ...frozenTarget, defendants: nextDefendants },
                conclusion,
            ),
            conclusion,
        );
        return {
            casesById: {
                ...state.casesById,
                [caseId]: convictionCase,
            },
        };
    }
    let withParties = upsertVerdictCardFromConclusion(
        applyPersonalStagesFromConclusion(frozenTarget, conclusion),
        conclusion,
    );
    if (isInvestigationClosure) {
        const closureIds = resolvePersonalStageTargets(target, conclusion);
        const closedAt =
            String(conclusion.date ?? '').trim() ||
            new Date().toISOString().slice(0, 10);
        withParties = applyInvestigationClosureFromStageConclusion(withParties, {
            kind: conclusion.decisionType as 'closing' | 'temporary_closing',
            defendantIds: closureIds,
            closedAt,
            conclusionId: conclusion.id,
            details: conclusion.details,
        });
    }
    return {
        casesById: {
            ...state.casesById,
            [caseId]: withParties,
        },
    };
}
