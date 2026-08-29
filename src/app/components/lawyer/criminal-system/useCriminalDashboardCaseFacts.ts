import { useMemo } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import type {
    CriminalCase,
    LegalArticleChange,
    OurRepresentation,
    PendingSeveranceContext,
    PhysicalLocation,
} from './criminalStore';
import { resolveEffectiveComplainantsForDisplay } from './publicProsecutionGovernance';
import {
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    hasIdentifiedDefendant,
    hasUnrevealedUnknownDefendants,
    investigationDossierHasMixedUnknownAndIdentified,
    normalizeCaseDefendantsForUnknown,
} from './criminalUnknownDefendant';
import { normalizeTrashBin } from './criminalCaseTrash';
import {
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    filterActiveInvestigationDefendants,
    filterStatementEligibleDefendants,
    investigationDossierIsSealed,
    investigationDossierIsTemporarilyClosed,
    investigationDossierSealMessage,
    resolveVisibleInvestigationDefendants,
} from './investigationDefendantPurge';
import {
    hasJuvenileAccused,
    hasJuvenileParty,
    isJuvenileTrialStage,
    isValidSocialInquiryWorkflowStatus,
} from './criminalStagePresentationCore';
import { buildActiveParties, buildAllParties } from './partyContextFilter';
import { resolveCriminalCaseUserRole } from './judicialDecisionsEngine';
import { formatConcernedPartyLabel, type SocialInquiryWorkflowStatus } from './criminalStageUtils';
import { resolveInvestigationDefendantsPartyMix } from './juvenileInvestigationRules';

type UseCriminalDashboardCaseFactsParams = {
    id: string;
    criminalCase: CriminalCase;
    stage: string;
    caseStage: CaseStage;
    isInvestigationPhase: boolean;
    pendingSeveranceContext: PendingSeveranceContext | null;
};

/**
 * حقائق/مشتقّات القضية الأساسية (الهوية، الأطراف، حالات الحبس/الوصاية، صلاحيات التحرير...) —
 * مستخرَجة من الـ runtime لتقليص composition root دون أي تغيير في القيم أو الاعتماديات.
 */
export function useCriminalDashboardCaseFacts({
    id,
    criminalCase,
    stage,
    caseStage: _caseStage,
    isInvestigationPhase,
    pendingSeveranceContext,
}: UseCriminalDashboardCaseFactsParams) {
    const crimeType = criminalCase.basics.crimeType;
    const legalArticleHistory = Array.isArray(criminalCase.legalArticleHistory)
        ? criminalCase.legalArticleHistory
        : ([] as LegalArticleChange[]);
    const activeLegalArticle = legalArticleHistory.length
        ? String(legalArticleHistory[legalArticleHistory.length - 1]?.article ?? '').trim()
        : criminalCase.basics.legalArticle.trim();
    const complainants = useMemo(
        () => (Array.isArray(criminalCase.complainants) ? criminalCase.complainants : []),
        [criminalCase.complainants],
    );
    const displayComplainants = useMemo(
        () => resolveEffectiveComplainantsForDisplay(criminalCase),
        [criminalCase],
    );
    const defendants = useMemo(
        () => normalizeCaseDefendantsForUnknown(criminalCase),
        [criminalCase],
    );
    const hasUnrevealedUnknown = hasUnrevealedUnknownDefendants(defendants);
    const isAllDefendantsUnknown = hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants);
    const unknownDefendantsForPartyDisplay = useMemo(
        () => getUnknownIdentityDefendants(defendants),
        [defendants],
    );
    const isFrozen = Boolean(criminalCase.isFrozen);
    const isPrejudicialPostponed = Boolean((criminalCase as { isPrejudicialPostponed?: boolean }).isPrejudicialPostponed);
    const isDefaultJudgmentArchived = Boolean(
        (criminalCase as { isDefaultJudgmentArchived?: boolean }).isDefaultJudgmentArchived,
    );
    const mergedIntoCaseId = String(criminalCase.mergedIntoCaseId ?? '').trim();
    const mergedIntoCaseNumber = String(criminalCase.mergedIntoCaseNumber ?? '').trim();
    const isMergedDossier = criminalCase.dossierStatus === 'merged' || Boolean(mergedIntoCaseId);
    const isArchived = Boolean(criminalCase.isArchived);
    const isEffectivelyArchived = isArchived || isMergedDossier;
    const isDashboardReadOnly = isMergedDossier;
    const canManageDossier = !isArchived && !isDashboardReadOnly;
    const canEditIdentity = canManageDossier && !isFrozen && !isDashboardReadOnly;
    const depositEntityName =
        criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي'
            ? criminalCase.location.investigationOfficeName
            : criminalCase.location.policeStationName;
    const showEditDeposition =
        isInvestigationPhase &&
        (criminalCase.location.investigationPapersAt === 'مركز شرطة' ||
            criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي');
    const showEditInvestigationCourt = isInvestigationPhase;
    const showEditTrialCourt = !isInvestigationPhase;
    const showEditVenueIdentity =
        canManageDossier && (showEditDeposition || showEditInvestigationCourt || showEditTrialCourt);
    const trashItems = useMemo(() => normalizeTrashBin(criminalCase.trashBin), [criminalCase.trashBin]);
    const trashCount = trashItems.length;
    const isSentToCassation = Boolean(criminalCase.isSentToCassation);
    const rawPhysicalLocation = String(criminalCase.physicalLocation ?? '').trim();
    const physicalLocation: PhysicalLocation =
        rawPhysicalLocation === 'judge_desk' ||
        rawPhysicalLocation === 'investigator_room' ||
        rawPhysicalLocation === 'prosecution' ||
        rawPhysicalLocation === 'police_station' ||
        rawPhysicalLocation === 'archive' ||
        rawPhysicalLocation === 'custom'
            ? (rawPhysicalLocation as PhysicalLocation)
            : 'custom';
    const physicalLocationCustomName = String(criminalCase.physicalLocationCustomName ?? '');
    const isArticle3Offense = Boolean(criminalCase.isArticle3Offense);
    const crimeDiscoveryDate = String(criminalCase.crimeDiscoveryDate ?? '').trim();
    const article3ElapsedDays = useMemo(() => {
        if (!isArticle3Offense) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crimeDiscoveryDate);
        if (!m) return null;
        const startMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const now = new Date();
        const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        if (todayMs < startMs) return 0;
        return Math.floor((todayMs - startMs) / (24 * 60 * 60 * 1000));
    }, [crimeDiscoveryDate, isArticle3Offense]);
    const shouldShowArticle3DeadlineBanner =
        isArticle3Offense && typeof article3ElapsedDays === 'number' && article3ElapsedDays > 90;
    const cassationCaseDetails = criminalCase.cassationCaseDetails;
    const finalDecision = criminalCase.finalDecision;
    const shouldShowMandatoryCassationBanner =
        finalDecision?.decisionType === 'conviction' &&
        (finalDecision.punishmentType === 'death' || finalDecision.punishmentType === 'life') &&
        !isSentToCassation;
    const isPrivateRightWaived = Boolean(criminalCase.isPrivateRightWaived);
    const investigationDossierClosure = criminalCase.investigationDossierClosure;
    const isInvestigationDossierSealed =
        isInvestigationPhase && investigationDossierIsSealed(criminalCase);
    const investigationDossierSealLabel = investigationDossierSealMessage(investigationDossierClosure);
    const showEndTemporaryClosureAction = investigationDossierIsTemporarilyClosed(investigationDossierClosure);
    const waiverDate = String(criminalCase.waiverDate ?? '').trim();
    const visibleDefendants = useMemo(() => {
        const pendingSeveranceDefendantIds =
            pendingSeveranceContext?.parentCaseId === id
                ? pendingSeveranceContext.parentDefendantIds
                : undefined;
        if (isInvestigationPhase) {
            return resolveVisibleInvestigationDefendants(defendants, {
                alwaysIncludeDefendantIds: pendingSeveranceDefendantIds,
            });
        }
        return defendants;
    }, [defendants, isInvestigationPhase, pendingSeveranceContext, id]);
    const isMutualComplaint = criminalCase.isMutualComplaint === true;
    const partyScopeDefendants = isInvestigationPhase ? visibleDefendants : defendants;
    const statementEligibleDefendants = useMemo(
        () =>
            isInvestigationPhase
                ? filterStatementEligibleDefendants(defendants)
                : defendants,
        [defendants, isInvestigationPhase],
    );
    const allParties = useMemo(
        () => buildAllParties(complainants, partyScopeDefendants, { isMutualComplaint }),
        [complainants, partyScopeDefendants, isMutualComplaint],
    );
    const activeParties = useMemo(() => {
        const defendantRows = hasUnrevealedUnknown
            ? getIdentifiedDefendants(defendants)
            : defendants;
        const base = buildActiveParties(complainants, defendantRows, { isMutualComplaint });
        if (!isInvestigationPhase) return base;
        const activeDefIds = new Set(
            filterActiveInvestigationDefendants(defendantRows).map((d) => d.id),
        );
        return base.filter((p) => p.source !== 'defendant' || activeDefIds.has(p.id));
    }, [complainants, defendants, isMutualComplaint, isInvestigationPhase, hasUnrevealedUnknown]);
    const primaryDefendant = defendants[0] ?? null;
    const juvenileDefendants = defendants.filter((d) => Boolean(d.isJuvenile));
    const firstJuvenileDefendant = juvenileDefendants[0] ?? null;
    const juvenileAccused = hasJuvenileAccused(defendants);
    const hasJuvenileInCase = hasJuvenileParty(defendants, complainants);
    const isJuvenileTrial = isJuvenileTrialStage(stage, defendants);
    const allowSeveranceOrDossierStrike = useMemo(
        () => caseAllowsSeveranceOrDossierStrike(complainants, defendants),
        [complainants, defendants],
    );
    const allowDefendantSeverance = useMemo(
        () => caseAllowsDefendantSeverance(defendants),
        [defendants],
    );
    const ourRepresentation: OurRepresentation = (() => {
        const incoming = String(criminalCase.basics?.ourRepresentation ?? '').trim();
        const role = String(criminalCase.basics?.role ?? '').trim();
        if (incoming === 'complainant_side' || incoming === 'defendant_side') return incoming;
        if (incoming === 'defendant') return 'defendant_side';
        if (incoming === 'complainant' || incoming === 'civil_claimant') return 'complainant_side';
        if (role === 'وكيل المشكو منه') return 'defendant_side';
        return 'complainant_side';
    })();
    const isDefense = ourRepresentation === 'defendant_side';
    const isComplainantSide = ourRepresentation === 'complainant_side';
    const criminalCaseUserRole = useMemo(() => {
        const resolved = resolveCriminalCaseUserRole(criminalCase);
        if (resolved) return resolved;
        if (isDefense) return 'defendant_lawyer' as const;
        if (isComplainantSide) return 'complainant_lawyer' as const;
        return '' as const;
    }, [criminalCase, isDefense, isComplainantSide]);
    const autoConcernedPartyId = useMemo(() => {
        if (hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants)) return null;
        if (activeParties.length === 1) return activeParties[0]!.id;
        if (complainants.length === 1 && defendants.length === 1) {
            const sole = isDefense
                ? activeParties.find((p) => p.source === 'defendant')
                : activeParties.find((p) => p.source === 'complainant');
            return sole?.id ?? null;
        }
        return null;
    }, [activeParties, complainants, defendants, isDefense, hasUnrevealedUnknown]);
    const autoConcernedPartyLabel = useMemo(() => {
        if (!autoConcernedPartyId) return '';
        const p = activeParties.find((x) => x.id === autoConcernedPartyId);
        return p ? formatConcernedPartyLabel(p) : '—';
    }, [autoConcernedPartyId, activeParties]);
    const pendingBailDefendantIds = defendants.filter((d) => d.status === 'bailed_pending_appeal').map((d) => d.id);
    const hasPendingBail = pendingBailDefendantIds.length > 0;
    const investigationDefendantsPartyMix = useMemo(
        () => resolveInvestigationDefendantsPartyMix(getIdentifiedDefendants(defendants)),
        [defendants],
    );
    const investigationHasMixedUnknownAndIdentified = useMemo(
        () => investigationDossierHasMixedUnknownAndIdentified(defendants),
        [defendants],
    );
    const firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus = (() => {
        const raw = String(firstJuvenileDefendant?.socialInquiryReport?.workflowStatus ?? '').trim();
        if (isValidSocialInquiryWorkflowStatus(raw)) return raw;
        return firstJuvenileDefendant?.socialInquiryReport?.isAttached === true
            ? 'submitted'
            : 'not_requested';
    })();

    return {
        crimeType,
        legalArticleHistory,
        activeLegalArticle,
        complainants,
        displayComplainants,
        defendants,
        hasUnrevealedUnknown,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
        isFrozen,
        isPrejudicialPostponed,
        isDefaultJudgmentArchived,
        mergedIntoCaseId,
        mergedIntoCaseNumber,
        isMergedDossier,
        isArchived,
        isEffectivelyArchived,
        isDashboardReadOnly,
        canManageDossier,
        canEditIdentity,
        depositEntityName,
        showEditDeposition,
        showEditInvestigationCourt,
        showEditTrialCourt,
        showEditVenueIdentity,
        trashItems,
        trashCount,
        isSentToCassation,
        physicalLocation,
        physicalLocationCustomName,
        isArticle3Offense,
        crimeDiscoveryDate,
        article3ElapsedDays,
        shouldShowArticle3DeadlineBanner,
        cassationCaseDetails,
        finalDecision,
        shouldShowMandatoryCassationBanner,
        isPrivateRightWaived,
        investigationDossierClosure,
        isInvestigationDossierSealed,
        investigationDossierSealLabel,
        showEndTemporaryClosureAction,
        waiverDate,
        visibleDefendants,
        isMutualComplaint,
        partyScopeDefendants,
        statementEligibleDefendants,
        allParties,
        activeParties,
        primaryDefendant,
        juvenileDefendants,
        firstJuvenileDefendant,
        juvenileAccused,
        hasJuvenileInCase,
        isJuvenileTrial,
        allowSeveranceOrDossierStrike,
        allowDefendantSeverance,
        ourRepresentation,
        isDefense,
        isComplainantSide,
        criminalCaseUserRole,
        autoConcernedPartyId,
        autoConcernedPartyLabel,
        pendingBailDefendantIds,
        hasPendingBail,
        investigationDefendantsPartyMix,
        investigationHasMixedUnknownAndIdentified,
        firstJuvenileSocialWorkflow,
    };
}
