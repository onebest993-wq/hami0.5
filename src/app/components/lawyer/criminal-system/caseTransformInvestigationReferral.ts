/**
 * Pure case transforms for CriminalCase — investigation referral to trial:
 * description formatting, metadata patching, per-defendant status effects,
 * and the full (possibly partial) referral case-patch. None of these touch
 * the Zustand store directly.
 */
import {
    ensureStageJourneyOnCase,
    resolveInvestigationCaseNumberSnapshot,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
} from '@/app/types/criminal';
import type {
    CriminalCase,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';
import {
    JUVENILE_TRIAL_COURT_NAME,
    resolveInvestigationReferralStageLabel,
    storedStageFromInvestigationReferralTarget,
    type InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import {
    buildInitialStageJourney,
    forkStageJourneyFromCurrent,
} from './stageJourneyRuntimeCore';
import {
    findTransitionOption,
    journeyNodeLabel,
    resolveJourneyTransitionMeta,
} from './stageJourneyTransitionCore';
import type {
    MisdemeanorType,
} from './caseClassificationEngine';
import {
    applyReferralClassificationOverride,
    syncCaseSovereignContext,
} from './caseClassificationEngine';
import {
    stampProceduralNodeId,
    mapDecisionStatusToDefendantStatus,
    normalizeReferralDefendantIds,
} from './caseTransformShared';
import {
    applyPersonalStagesToDefendants,
} from './caseTransformPersonalStage';
import {
    applyTrialChargeReferralSeed,
} from './caseTransformDraftSeed';
import {
    applyStageJourneyTransition,
} from './caseTransformJourneyLifecycle';

function formatInvestigationReferralDescription(input: {
    details: string;
    courtName: string;
    courtLabel: string;
    courtCaseNumber: string;
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    misdemeanorType?: MisdemeanorType;
}): string {
    const lines = [
        input.details,
        `المحكمة: ${String(input.courtName ?? '').trim() || input.courtLabel} • رقم دعوى المحكمة: ${String(input.courtCaseNumber ?? '').trim() || '—'}`,
    ];
    const pp = String(input.publicProsecutionNumber ?? '').trim();
    if (pp) lines.push(`رقم الادعاء العام: ${pp}`);
    const article = String(input.referralLegalArticle ?? '').trim();
    if (article) lines.push(`مادة الإحالة / الاتهام: ${article}`);
    if (input.misdemeanorType) {
        lines.push(
            `نوع الدعوى: ${input.misdemeanorType === 'موجزة' ? 'جنحة موجزة' : 'جنحة غير موجزة'}`,
        );
    }
    return lines.join('\n');
}

function applyReferralMetadataToCase(
    caseRecord: CriminalCase,
    meta?: {
        publicProsecutionNumber?: string;
        referralLegalArticle?: string;
        referralDecisionText?: string;
        referralTargetStage?: InvestigationReferralTargetStage;
        referralMisdemeanorType?: MisdemeanorType;
    },
): CriminalCase {
    const pp = String(meta?.publicProsecutionNumber ?? '').trim();
    const article = String(meta?.referralLegalArticle ?? '').trim();
    let next: CriminalCase = caseRecord;
    if (pp) {
        next = {
            ...next,
            location: { ...next.location, publicProsecutionNumber: pp },
        };
    }
    if (article) {
        next = {
            ...next,
            referralArticle: article,
            currentAccusationArticle: article,
            basics: { ...next.basics, legalArticle: article },
        };
    }
    if (meta?.referralTargetStage) {
        next = applyReferralClassificationOverride(
            next,
            meta.referralTargetStage,
            meta.referralMisdemeanorType,
        );
    }
    return applyTrialChargeReferralSeed(syncCaseSovereignContext(next, meta?.referralDecisionText));
}

function applyReferralStatusesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'],
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>,
): CriminalCase {
    if (!defendantIds.length) return caseRecord;
    const perDefendant =
        defendantStatusesByDefendantId &&
        Object.keys(defendantStatusesByDefendantId).some((id) => defendantIds.includes(id));
    if (perDefendant) {
        let next = caseRecord;
        for (const defId of defendantIds) {
            const decisionStatus =
                defendantStatusesByDefendantId?.[defId] ?? defendantStatusAtDecision;
            next = applyPersonalStagesToDefendants(next, [defId], 'referred_to_trial', {
                status: mapDecisionStatusToDefendantStatus(decisionStatus),
            });
        }
        return next;
    }
    return applyPersonalStagesToDefendants(caseRecord, defendantIds, 'referred_to_trial', {
        status: mapDecisionStatusToDefendantStatus(defendantStatusAtDecision),
    });
}

export function patchInvestigationReferralCase(
    target: CriminalCase,
    targetCaseStage: InvestigationReferralTargetStage,
    courtName: string,
    courtCaseNumber: string,
    decisionDate: string,
    decisionDetails: string,
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'],
    defendantIds: string[],
    referralMeta?: {
        publicProsecutionNumber?: string;
        referralLegalArticle?: string;
        referralMisdemeanorType?: MisdemeanorType;
        defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    },
): CriminalCase {
    const invNum = resolveInvestigationCaseNumberSnapshot(target);
    const courtNum = String(courtCaseNumber ?? '').trim();
    const details = String(decisionDetails ?? '').trim() || 'تمت الإحالة إلى المحكمة المختصة.';
    const date = String(decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtLabel = resolveInvestigationReferralStageLabel(targetCaseStage);
    const referralDescription = formatInvestigationReferralDescription({
        details,
        courtName: String(courtName ?? '').trim(),
        courtLabel,
        courtCaseNumber: courtNum,
        publicProsecutionNumber: referralMeta?.publicProsecutionNumber,
        referralLegalArticle: referralMeta?.referralLegalArticle,
        misdemeanorType:
            targetCaseStage === 'misdemeanor' ? referralMeta?.referralMisdemeanorType : undefined,
    });
    const actionId =
        targetCaseStage === 'felony'
            ? 'refer_felony'
            : targetCaseStage === 'juvenile'
              ? 'refer_misdemeanor'
              : 'refer_misdemeanor';
    const option = findTransitionOption('investigation', actionId);
    const meta = option
        ? resolveJourneyTransitionMeta(actionId, option)
        : {
              transitionKind: 'forward_referral' as const,
              transitionText:
                  targetCaseStage === 'felony'
                      ? 'قرار إحالة (محكمة الجنايات)'
                      : targetCaseStage === 'juvenile'
                        ? `قرار إحالة (${JUVENILE_TRIAL_COURT_NAME})`
                        : 'قرار إحالة (محكمة الجنح)',
          };
    const { scopedIds, remainingIds, isPartialReferral } = normalizeReferralDefendantIds(target, defendantIds);
    const effectiveScopedIds = scopedIds.length
        ? scopedIds
        : normalizeReferralDefendantIds(target, []).allDefIds;

    if (isPartialReferral) {
        let base = ensureStageJourneyOnCase(target);
        const nodes = forkStageJourneyFromCurrent(base.stageJourney ?? buildInitialStageJourney(), {
            startedAt: date,
            transitionText: meta.transitionText,
            branches: [
                {
                    branchId: 'partial-investigation',
                    branchLabel: 'تحقيق — مستمر',
                    stage: 'investigation',
                    label: 'تحقيق (إضبارة مستمرة)',
                    defendantIds: remainingIds,
                    transitionKind: 'parallel_fork',
                },
                {
                    branchId: 'partial-trial',
                    branchLabel:
                        targetCaseStage === 'felony'
                            ? 'جنايات — محالون'
                            : targetCaseStage === 'juvenile'
                              ? 'أحداث — محالون'
                              : 'جنح — محالون',
                    stage: targetCaseStage === 'juvenile' ? 'misdemeanor' : targetCaseStage,
                    label: journeyNodeLabel(
                        targetCaseStage === 'juvenile' ? 'juvenile' : targetCaseStage,
                        courtNum,
                    ),
                    defendantIds: scopedIds,
                    transitionKind: 'parallel_fork',
                },
            ],
        });
        const trialNodeId =
            nodes.find((n) => n.branchId === 'partial-trial' && n.status === 'current')?.id ?? '';
        const invNodeId =
            nodes.find((n) => n.branchId === 'partial-investigation' && n.status === 'current')?.id ?? '';
        const trialEvent = stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision',
                category: 'قرار إحالة إلى محكمة الموضوع',
                title: `إحالة جزئية إلى ${courtLabel}`,
                description: referralDescription,
                defendantIds: scopedIds,
            },
            trialNodeId,
        );
        const invEvent = stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision',
                category: 'استمرار التحقيق',
                title: 'استمرار التحقيق بحق باقي المتهمين',
                description: details,
                defendantIds: remainingIds,
            },
            invNodeId,
        );
        let next: CriminalCase = {
            ...base,
            caseStage: 'investigation',
            investigationCaseNumber: invNum !== '—' ? invNum : base.investigationCaseNumber,
            stageJourney: nodes,
            timelineEvents: [
                ...(Array.isArray(base.timelineEvents) ? base.timelineEvents : []),
                trialEvent,
                invEvent,
            ],
        };
        next = applyReferralStatusesToDefendants(
            next,
            scopedIds,
            defendantStatusAtDecision,
            referralMeta?.defendantStatusesByDefendantId,
        );
        return applyReferralMetadataToCase(next, {
            ...referralMeta,
            referralDecisionText: referralDescription,
            referralTargetStage: targetCaseStage,
        });
    }

    const journeyTargetStage: CaseStage =
        targetCaseStage === 'juvenile' ? 'misdemeanor' : targetCaseStage;
    const { caseRecord: withNodes, activeNodeId } = applyStageJourneyTransition(ensureStageJourneyOnCase(target), {
        targetStage: journeyTargetStage,
        storedStageOverride: storedStageFromInvestigationReferralTarget(targetCaseStage),
        transitionText: meta.transitionText,
        transitionKind: meta.transitionKind,
        startedAt: date,
        courtCaseNumber: courtNum,
        courtName,
    });
    const event: TimelineEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار إحالة إلى محكمة الموضوع',
            title: `إحالة إلى ${courtLabel}`,
            description: referralDescription,
            defendantIds: effectiveScopedIds.length ? effectiveScopedIds : undefined,
        },
        activeNodeId,
    );
    const conclusion: StageConclusion = {
        id: createId(),
        stageType: 'investigation',
        decisionType: 'referral',
        date,
        details,
        defendantStatusAtDecision,
        defendantIds: effectiveScopedIds.length ? effectiveScopedIds : undefined,
        ...(referralMeta?.defendantStatusesByDefendantId
            ? { defendantStatusesByDefendantId: referralMeta.defendantStatusesByDefendantId }
            : {}),
    };
    let next: CriminalCase = {
        ...withNodes,
        investigationCaseNumber: invNum !== '—' ? invNum : withNodes.investigationCaseNumber,
        isInvestigationLocked: true,
        finalDecision: conclusion,
        timelineEvents: [...(Array.isArray(withNodes.timelineEvents) ? withNodes.timelineEvents : []), event],
    };
    if (effectiveScopedIds.length) {
        next = applyReferralStatusesToDefendants(
            next,
            effectiveScopedIds,
            defendantStatusAtDecision,
            referralMeta?.defendantStatusesByDefendantId,
        );
    }
    return applyReferralMetadataToCase(next, {
        ...referralMeta,
        referralDecisionText: referralDescription,
        referralTargetStage: targetCaseStage,
    });
}

export function referralPayloadValid(input: {
    courtName?: string;
    courtCaseNumber?: string;
    decisionDate?: string;
}): boolean {
    return Boolean(String(input.courtName ?? '').trim() && String(input.decisionDate ?? '').trim());
}
