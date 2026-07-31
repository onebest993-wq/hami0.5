/**
 * Pure case transforms for CriminalCase — draft-to-case seeding: snapshot
 * cloning/preparation, initial case seeding from a draft, trial-charge
 * referral seeding, and severance draft builders. None of these touch the
 * Zustand store directly.
 */
import {
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import {
    makePublicRightComplainant,
} from './publicProsecutionGovernance';
import {
    normalizeOurRepresentation,
} from './criminalProceduralPartyUtils';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    CriminalCaseDraft,
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
} from './criminalCaseModel';
import {
    finalizeDraftComplainantsCounterComplaint,
    makeEmptyComplainant,
    makeEmptyLocation,
    makeInitialDraft,
    normalizeCriminalCaseLocation,
} from './criminalCaseDraftFactory';
import {
    normalizeTrialSessions,
} from './trialSessionsEngine';
import {
    normalizeTrialDepositions,
} from './trialDepositionsEngine';
import {
    normalizeChargeModifications,
    seedTrialChargeFieldsOnReferral,
} from './trialChargeEngine';
import {
    caseStageFromStoredStage,
} from './criminalStageRuntimeCore';
import {
    hasUnrevealedUnknownDefendants,
    isDefendantIdentityUnknown,
    pruneEmptyDefendantShells,
} from './criminalUnknownDefendant';
import {
    syncJuvenileInvestigationCaseFlags,
} from './juvenileInvestigationRules';
import {
    buildInitialStageJourney,
} from './stageJourneyRuntimeCore';
import {
    syncCaseSovereignContext,
} from './caseClassificationEngine';

export function resolveArticleAtReferralFromCase(c: CriminalCase): string {
    const history = Array.isArray(c.legalArticleHistory) ? c.legalArticleHistory : [];
    if (history.length) {
        return String(history[history.length - 1]?.article ?? '').trim();
    }
    return String(c.basics?.legalArticle ?? '').trim();
}

export function applyTrialChargeReferralSeed(caseRecord: CriminalCase): CriminalCase {
    const articleAtReferral = resolveArticleAtReferralFromCase(caseRecord);
    const seeded = seedTrialChargeFieldsOnReferral(articleAtReferral, {
        referralArticle: caseRecord.referralArticle,
        currentAccusationArticle: caseRecord.currentAccusationArticle,
    });
    if (!seeded) return caseRecord;
    return {
        ...caseRecord,
        referralArticle: seeded.referralArticle,
        currentAccusationArticle: seeded.currentAccusationArticle,
        chargeModifications: normalizeChargeModifications(caseRecord.chargeModifications),
    };
}

/** نسخة مستقلة من المسودة — تمنع تشارك المراجع بين الأضابير في casesById */
export function prepareDraftSnapshotForCaseCreation(nextDraft: CriminalCaseDraft): CriminalCaseDraft {
    const caseSnapshot = cloneDraftSnapshot(nextDraft);
    const prunedDefendants = pruneEmptyDefendantShells(caseSnapshot.defendants);
    let snapshotWithUnknown: CriminalCaseDraft = {
        ...caseSnapshot,
        defendants: prunedDefendants,
        unknownDefendant: hasUnrevealedUnknownDefendants(prunedDefendants),
    };

    if (snapshotWithUnknown.isPublicProsecutionComplainant === true) {
        return {
            ...snapshotWithUnknown,
            complainants: [makePublicRightComplainant()],
            isMutualComplaint: false,
            articleIncludesPublicRight: false,
        };
    }

    const defendantIds = (Array.isArray(snapshotWithUnknown.defendants) ? snapshotWithUnknown.defendants : [])
        .map((d) => String(d.id ?? '').trim())
        .filter(Boolean);
    const finalizedComplainants = finalizeDraftComplainantsCounterComplaint(
        Array.isArray(snapshotWithUnknown.complainants) ? snapshotWithUnknown.complainants : [],
        defendantIds,
    );
    const complainantsForCase = finalizedComplainants.map((c) => {
        const { counterComplaintTargetDefendantIds: _targets, ...rest } = c;
        return rest;
    });
    return {
        ...snapshotWithUnknown,
        complainants: complainantsForCase,
        isMutualComplaint: snapshotWithUnknown.isMutualComplaint === true,
    };
}

export function seedCriminalCaseFromDraftSnapshot(
    snapshotWithUnknown: CriminalCaseDraft,
    caseId: string,
    nowDate: string,
    ownerLawyerId?: string | null,
): CriminalCase {
    const storedStage = String(snapshotWithUnknown.basics.stage ?? '').trim();
    const resolvedCaseStage = caseStageFromStoredStage(storedStage) ?? 'investigation';
    const owner = String(ownerLawyerId ?? '').trim() || undefined;
    let seededCase: CriminalCase = applyTrialChargeReferralSeed({
        id: caseId,
        createdAt: new Date().toISOString(),
        ...(owner ? { ownerLawyerId: owner } : {}),
        ...snapshotWithUnknown,
        location: normalizeCriminalCaseLocation(snapshotWithUnknown.location),
        statements: Array.isArray(snapshotWithUnknown.statements) ? snapshotWithUnknown.statements : [],
        timelineEvents: Array.isArray(snapshotWithUnknown.timelineEvents) ? snapshotWithUnknown.timelineEvents : [],
        investigationLogs: Array.isArray(snapshotWithUnknown.investigationLogs)
            ? snapshotWithUnknown.investigationLogs
            : [],
        proceduralContainers: Array.isArray(snapshotWithUnknown.proceduralContainers)
            ? snapshotWithUnknown.proceduralContainers
            : [],
        proceduralCanvasAudit: Array.isArray(snapshotWithUnknown.proceduralCanvasAudit)
            ? snapshotWithUnknown.proceduralCanvasAudit
            : [],
        lawyerRequests: Array.isArray(snapshotWithUnknown.lawyerRequests) ? snapshotWithUnknown.lawyerRequests : [],
        trials: normalizeTrialSessions(snapshotWithUnknown.trials),
        trialDepositions: normalizeTrialDepositions(snapshotWithUnknown.trialDepositions),
        legalArticleHistory: snapshotWithUnknown.basics.legalArticle.trim()
            ? [
                  {
                      id: createId(),
                      article: snapshotWithUnknown.basics.legalArticle.trim(),
                      changedAtDate: nowDate,
                      changedBy: 'trial_court',
                  },
              ]
            : [],
        dossierStatus: 'active',
        mergedCasesTexts: [],
        mergedCaseIds: [],
        caseStage: resolvedCaseStage,
        courtCaseNumber: String(snapshotWithUnknown.location.caseNumber ?? '').trim() || undefined,
        stageJourney: buildInitialStageJourney(),
    });
    seededCase = syncJuvenileInvestigationCaseFlags(seededCase);
    seededCase = syncCaseSovereignContext(seededCase);
    return {
        ...seededCase,
        defendants: (Array.isArray(seededCase.defendants) ? seededCase.defendants : []).map((d) =>
            normalizeDefendantPersonalFields(d),
        ),
    };
}

export function cloneDraftSnapshot(draft: CriminalCaseDraft): CriminalCaseDraft {
    return {
        ...draft,
        basics: { ...draft.basics },
        location: { ...draft.location },
        complainants: (Array.isArray(draft.complainants) ? draft.complainants : []).map((c) => ({ ...c })),
        defendants: (Array.isArray(draft.defendants) ? draft.defendants : []).map((d) => ({
            ...d,
            detentionHistoryLog: Array.isArray(d.detentionHistoryLog)
                ? d.detentionHistoryLog.map((h) => ({ ...h }))
                : [],
        })),
        statements: Array.isArray(draft.statements) ? draft.statements.map((s) => ({ ...s })) : [],
        otherEvidenceItems: Array.isArray(draft.otherEvidenceItems)
            ? draft.otherEvidenceItems.map((it) => ({ ...it }))
            : [],
        timelineEvents: Array.isArray(draft.timelineEvents) ? draft.timelineEvents.map((e) => ({ ...e })) : [],
        investigationLogs: Array.isArray(draft.investigationLogs)
            ? draft.investigationLogs.map((l) => ({ ...l }))
            : [],
        proceduralContainers: Array.isArray(draft.proceduralContainers)
            ? draft.proceduralContainers.map((c) => ({
                  ...c,
                  subItems: Array.isArray(c.subItems) ? [...c.subItems] : [],
              }))
            : [],
        proceduralCanvasAudit: Array.isArray(draft.proceduralCanvasAudit)
            ? draft.proceduralCanvasAudit.map((e) => ({ ...e }))
            : [],
        lawyerRequests: Array.isArray(draft.lawyerRequests) ? draft.lawyerRequests.map((r) => ({ ...r })) : [],
        trials: normalizeTrialSessions((draft as CriminalCaseDraft).trials),
        trialDepositions: normalizeTrialDepositions((draft as CriminalCaseDraft).trialDepositions),
    };
}

export function copyComplainantsForSeveranceDraft(
    parentComplainants: CriminalComplainant[] | undefined,
): CriminalComplainant[] {
    const source = Array.isArray(parentComplainants) ? parentComplainants : [];
    const copied = source
        .map((c) => {
            const {
                counterComplaintTargetDefendantIds: _targets,
                isCrossComplaint: _cross,
                ...rest
            } = c;
            return {
                ...rest,
                id: createId(),
                fullName: String(rest.fullName ?? '').trim(),
            };
        })
        .filter((c) => c.fullName);
    return copied.length ? copied : [makeEmptyComplainant()];
}

export function buildSeveranceDraftFromParent(
    parent: CriminalCase,
    draftDefendants: CriminalDefendant[],
): CriminalCaseDraft {
    const role = parent.basics?.role ?? '';
    const ourRepresentation = normalizeOurRepresentation(
        String(parent.basics?.ourRepresentation ?? ''),
        role,
    );
    const parentStage = String(parent.basics?.stage ?? '').trim();
    return {
        ...makeInitialDraft(),
        basics: {
            role,
            ourRepresentation,
            stage: (parentStage || 'مرحلة التحقيق') as CriminalCaseStage,
            legalArticle: String(parent.basics?.legalArticle ?? '').trim(),
            crimeType: parent.basics?.crimeType ?? '',
        },
        location: normalizeCriminalCaseLocation(parent.location ?? makeEmptyLocation()),
        complainants: copyComplainantsForSeveranceDraft(parent.complainants),
        defendants: draftDefendants,
        unknownDefendant:
            draftDefendants.some((d) => isDefendantIdentityUnknown(d)) ||
            parent.unknownDefendant === true,
        isMutualComplaint: parent.isMutualComplaint === true,
        isArticle3Offense: parent.isArticle3Offense === true,
        crimeDiscoveryDate: String(parent.crimeDiscoveryDate ?? '').trim(),
        physicalLocation: parent.physicalLocation ?? 'custom',
        physicalLocationCustomName: String(parent.physicalLocationCustomName ?? '').trim(),
    };
}
