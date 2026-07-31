import type { CriminalCase, CriminalCaseDraft, CriminalDefendant, StageConclusion, TimelineEvent } from './criminalCaseModel';
import type { JudicialDecision } from '@/app/types/criminal';
import type { InvestigationReferralTargetStage } from './juvenileInvestigationRules';
import type { MisdemeanorType } from './caseClassificationEngine';
import { makeInitialDraft } from './criminalCaseDraftFactory';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { createCriminalId as createId } from './criminalIdUtils';
import {
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import {
    investigationDossierMaterialMutationBlocked,
    normalizeInvestigationDefendantStatus,
} from './investigationDefendantPurge';
import { hasIdentifiedDefendant, isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import {
    buildJuvenileInvestigationReferralJudicialDecision,
    investigationReferralScopeMixesJuvenileAndAdult,
    resolveInvestigationReferralStageLabel,
    storedStageFromInvestigationReferralTarget,
    type InvestigationReferralTargetStage as ReferralStageTarget,
} from './juvenileInvestigationRules';

export type InvestigationReferralPayload = {
    targetCaseStage: InvestigationReferralTargetStage;
    courtName: string;
    courtCaseNumber: string;
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    decisionDate: string;
    decisionDetails: string;
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
    defendantIds: string[];
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    referralMisdemeanorType?: MisdemeanorType;
};

export type InvestigationReferralTrialPayload = {
    defendantIds: string[];
    targetCaseStage: ReferralStageTarget;
    courtName: string;
    courtCaseNumber: string;
    decisionDate: string;
    decisionDetails: string;
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    referralMisdemeanorType?: MisdemeanorType;
};

type ApplyInvestigationReferralDeps = {
    isMisdemeanorType: (value: unknown) => boolean;
    patchInvestigationReferralCase: (
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
    ) => CriminalCase;
    patchDefendantsInvestigationStatus: (
        caseRecord: CriminalCase,
        defendantIds: string[],
        status: string,
    ) => CriminalCase;
};

type FinalizeReferralTrialDeps = {
    patchInvestigationReferralCase: ApplyInvestigationReferralDeps['patchInvestigationReferralCase'];
    applyTrialChargeReferralSeed: (caseRecord: CriminalCase) => CriminalCase;
    applyPersonalStagesToDefendants: (
        caseRecord: CriminalCase,
        defendantIds: string[],
        personalStage: string,
        patch?: { status?: string },
    ) => CriminalCase;
    mapDecisionStatusToDefendantStatus: (
        status: StageConclusion['defendantStatusAtDecision'],
    ) => string;
    patchDefendantsInvestigationStatus: ApplyInvestigationReferralDeps['patchDefendantsInvestigationStatus'];
    appendJudicialDecisionOnCase: (caseRecord: CriminalCase, decision: JudicialDecision) => CriminalCase;
};

type PreparedReferralTrial = {
    seededDraft: CriminalCaseDraft;
    snapshots: CriminalDefendant[];
    sourceDefendantIds: string[];
    stageLabel: string;
    date: string;
    details: string;
};

function referralPayloadValid(input: {
    courtName?: string;
    courtCaseNumber?: string;
    decisionDate?: string;
}): boolean {
    return Boolean(String(input.courtName ?? '').trim() && String(input.decisionDate ?? '').trim());
}

export function applyInvestigationReferralOnCase(
    current: CriminalCase,
    payload: InvestigationReferralPayload,
    deps: ApplyInvestigationReferralDeps,
): CriminalCase | null {
    if (current.isArchived) return null;
    if (current.unknownDefendant && !hasIdentifiedDefendant(current.defendants)) return null;
    if (
        !referralPayloadValid({
            courtName: payload.courtName,
            courtCaseNumber: payload.courtCaseNumber,
            decisionDate: payload.decisionDate,
        })
    ) {
        return null;
    }
    if (payload.targetCaseStage === 'misdemeanor' && !deps.isMisdemeanorType(payload.referralMisdemeanorType)) {
        return null;
    }
    const referralDefendantIds = (payload.defendantIds ?? []).map((item) => String(item ?? '').trim()).filter(Boolean);
    if (
        investigationReferralScopeMixesJuvenileAndAdult(
            Array.isArray(current.defendants) ? current.defendants : [],
            referralDefendantIds,
        )
    ) {
        return null;
    }

    let nextCase = deps.patchInvestigationReferralCase(
        current,
        payload.targetCaseStage,
        payload.courtName,
        payload.courtCaseNumber,
        payload.decisionDate,
        payload.decisionDetails,
        payload.defendantStatusAtDecision,
        payload.defendantIds ?? [],
        {
            publicProsecutionNumber: payload.publicProsecutionNumber,
            referralLegalArticle: payload.referralLegalArticle,
            referralMisdemeanorType: payload.referralMisdemeanorType,
            defendantStatusesByDefendantId: payload.defendantStatusesByDefendantId,
        },
    );
    const ids = (payload.defendantIds ?? []).map((item) => String(item ?? '').trim()).filter(Boolean);
    if (ids.length) {
        nextCase = deps.patchDefendantsInvestigationStatus(nextCase, ids, 'referred');
    }
    return nextCase;
}

export function prepareReferralTrialFork(
    parent: CriminalCase,
    payload: InvestigationReferralTrialPayload,
): PreparedReferralTrial | null {
    if (parent.isArchived) return null;
    if (parent.unknownDefendant && !hasIdentifiedDefendant(parent.defendants)) return null;
    if (investigationDossierMaterialMutationBlocked(parent)) return null;

    const requestedIds = (Array.isArray(payload.defendantIds) ? payload.defendantIds : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);
    if (!requestedIds.length) return null;

    if (
        investigationReferralScopeMixesJuvenileAndAdult(
            Array.isArray(parent.defendants) ? parent.defendants : [],
            requestedIds,
        )
    ) {
        return null;
    }

    const parentDefendants = Array.isArray(parent.defendants) ? parent.defendants : [];
    const snapshots = requestedIds
        .map((id) => parentDefendants.find((defendant) => defendant.id === id))
        .filter((defendant): defendant is CriminalDefendant => {
            if (!defendant) return false;
            if (isDefendantIdentityUnknown(defendant)) return false;
            return normalizeInvestigationDefendantStatus(defendant.investigationStatus) === 'active';
        });
    if (!snapshots.length) return null;

    const stageLabel = resolveInvestigationReferralStageLabel(payload.targetCaseStage);
    const storedStage = storedStageFromInvestigationReferralTarget(payload.targetCaseStage);
    const seededDraft: CriminalCaseDraft = {
        ...makeInitialDraft(),
        basics: {
            ...parent.basics,
            stage: storedStage,
            legalArticle: String(parent.basics.legalArticle ?? parent.currentAccusationArticle ?? '').trim(),
        },
        location: {
            ...parent.location,
            courtName: String(payload.courtName ?? '').trim(),
            caseNumber: String(payload.courtCaseNumber ?? '').trim(),
            publicProsecutionNumber:
                String(payload.publicProsecutionNumber ?? parent.location.publicProsecutionNumber ?? '').trim() ||
                undefined,
        },
        complainants: (Array.isArray(parent.complainants) ? parent.complainants : []).map((complainant) => ({
            ...complainant,
        })),
        defendants: snapshots.map((defendant) =>
            normalizeDefendantPersonalFields({
                ...defendant,
                id: createId(),
                investigationStatus: 'active',
                personalStage: 'under_investigation',
            }),
        ),
        unknownDefendant: false,
        isMutualComplaint: parent.isMutualComplaint,
    };

    const referredNames = snapshots
        .map((defendant) => String(defendant.fullName ?? '').trim())
        .filter(Boolean)
        .join('، ');
    const date = String(payload.decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details =
        String(payload.decisionDetails ?? '').trim() ||
        `إحالة المتهمين (${referredNames || '—'}) إلى ${stageLabel}.`;

    return {
        seededDraft,
        snapshots,
        sourceDefendantIds: snapshots.map((defendant) => defendant.id),
        stageLabel,
        date,
        details,
    };
}

export function finalizeReferralTrialFork(
    parent: CriminalCase,
    child: CriminalCase,
    newCaseId: string,
    payload: InvestigationReferralTrialPayload,
    prepared: PreparedReferralTrial,
    deps: FinalizeReferralTrialDeps,
): { nextParent: CriminalCase; nextChild: CriminalCase } {
    let nextChild: CriminalCase = {
        ...child,
        parentCaseId: parent.id,
        caseStage: payload.targetCaseStage === 'juvenile' ? 'misdemeanor' : payload.targetCaseStage,
        courtCaseNumber: String(payload.courtCaseNumber ?? '').trim() || child.courtCaseNumber,
        referralArticle:
            String(payload.referralLegalArticle ?? parent.referralArticle ?? '').trim() || undefined,
    };
    nextChild = deps.applyTrialChargeReferralSeed(nextChild);

    const childDefendantIds = (nextChild.defendants ?? []).map((defendant) => defendant.id);
    nextChild = deps.patchInvestigationReferralCase(
        nextChild,
        payload.targetCaseStage,
        payload.courtName,
        payload.courtCaseNumber,
        prepared.date,
        prepared.details,
        payload.defendantStatusAtDecision,
        childDefendantIds,
        {
            publicProsecutionNumber: payload.publicProsecutionNumber,
            referralLegalArticle: payload.referralLegalArticle,
            referralMisdemeanorType: payload.referralMisdemeanorType,
        },
    );

    let nextParent = deps.patchInvestigationReferralCase(
        parent,
        payload.targetCaseStage,
        payload.courtName,
        payload.courtCaseNumber,
        prepared.date,
        prepared.details,
        payload.defendantStatusAtDecision,
        prepared.sourceDefendantIds,
        {
            publicProsecutionNumber: payload.publicProsecutionNumber,
            referralLegalArticle: payload.referralLegalArticle,
            referralMisdemeanorType: payload.referralMisdemeanorType,
        },
    );
    nextParent = deps.applyPersonalStagesToDefendants(
        nextParent,
        prepared.sourceDefendantIds,
        'referred_to_trial',
        {
            status: deps.mapDecisionStatusToDefendantStatus(payload.defendantStatusAtDecision),
        },
    );
    nextParent = deps.patchDefendantsInvestigationStatus(nextParent, prepared.sourceDefendantIds, 'referred');

    const referralEvent: TimelineEvent = {
        id: createId(),
        date: prepared.date,
        type: 'decision',
        category: 'قرار إحالة إلى محكمة الموضوع',
        title: `إحالة إلى ${prepared.stageLabel}`,
        description: `${prepared.details}\nإضبارة المحكمة: ${resolveOfficialCaseNumber(nextChild) || newCaseId}`,
        defendantIds: prepared.sourceDefendantIds,
    };

    const priorChildren = Array.isArray(nextParent.severedChildCaseIds) ? nextParent.severedChildCaseIds : [];
    nextParent = {
        ...nextParent,
        severedChildCaseIds: priorChildren.includes(newCaseId) ? priorChildren : [...priorChildren, newCaseId],
        timelineEvents: [
            ...(Array.isArray(nextParent.timelineEvents) ? nextParent.timelineEvents : []),
            referralEvent,
        ],
    };

    if (payload.targetCaseStage === 'juvenile') {
        const referralCard = buildJuvenileInvestigationReferralJudicialDecision({
            decisionDate: prepared.date,
            courtName: String(payload.courtName ?? '').trim(),
            courtCaseNumber: String(payload.courtCaseNumber ?? '').trim(),
            defendantIds: prepared.sourceDefendantIds,
            childCaseId: newCaseId,
            childCaseNumber: resolveOfficialCaseNumber(nextChild) || newCaseId,
            referralLegalArticle: payload.referralLegalArticle,
        });
        nextParent = deps.appendJudicialDecisionOnCase(nextParent, referralCard);
    }

    return { nextParent, nextChild };
}
