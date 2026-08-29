/**
 * Criminal Zustand store — composition root (Wave 7f).
 * Actions: criminalStore*Actions. Public re-exports preserved for barrel importers.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    createCriminalStorePersistStorage,
    criminalStorePartialize,
    CRIMINAL_STORE_PERSIST_VERSION,
    CRIMINAL_STORE_KEY,
} from './criminalStorePersistOptions';
import { migrateCriminalPersistState } from './criminalStorePersistMigrate';
import { installCriminalStorePersistMergeListener } from './criminalStorePersistMerge';
import { makeInitialDraft } from './criminalCaseDraftFactory';
import { createCriminalSessionDraftActions } from './criminalStoreSessionDraftActions';
import { createCriminalInvestigationActions } from './criminalStoreInvestigationActions';
import { createCriminalProceduralActions } from './criminalStoreProceduralActions';
import { createCriminalRequestsActions } from './criminalStoreRequestsActions';
import { createCriminalTrialActions } from './criminalStoreTrialActions';
import { createCriminalLifecycleActions } from './criminalStoreLifecycleActions';
import { validateDefendantSeveranceSelection } from './investigationDefendantPurge';
import { debug } from '@/app/utils/debug';
import { sentryCaptureException } from '@/app/observability/sentryClient';
import type { CriminalDefendant } from './criminalCaseModel';
import type { CriminalStoreState } from './criminalStoreState.types';

export type {
    AddTrialSessionInput,
    FinalizeTrialVerdictInput,
    TrialSession,
    TrialSessionVerdict,
    TrialSessionStatus,
    TrialVerdictOutcome,
    TrialWitnessExpert,
    TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';
export type {
    AddTrialDepositionInput,
    TrialDeposition,
    TrialDepositionComparison,
    TrialDepositionCrossExam,
    UpdateTrialDepositionPatch,
} from './trialDepositionsEngine';
export type { ModifyTrialChargeInput, TrialChargeModification } from './trialChargeEngine';
export type {
    CassationAppeal,
    CassationAppealResult,
    CassationAppealRemandTarget,
    CaseStage,
    CriminalCaseSeverance,
    Defendant,
    JourneyNode,
    ProceduralTransitionActionId,
    StageJourneyNode,
} from '@/app/types/criminal';
export type { RecordCassationResultOutcome, RecordCassationResultPayload } from './cassationEngine';
export type { RecordJudicialCassationResultPayload } from './cassationJudicialForm';
export type {
    GuarantorBailKind,
    GuarantorPerson,
    GuarantorDetails,
} from './criminalGuarantorModel';
export {
    makeEmptyGuarantorDetails,
    normalizeGuarantorDetails,
    isGuarantorForfeited,
} from './criminalGuarantorModel';
export type { SeizedAsset } from './criminalSeizedAssetModel';
export { normalizeSeizedAssets } from './criminalSeizedAssetModel';
export type { OurRepresentation } from './criminalProceduralPartyUtils';
export {
    classifyAssetSeizurePartyKind,
    resolveOurRepresentationFromCaseRecord,
    resolveProceduralDefendantId,
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
export {
    isInternalCaseIdentifier,
    looksLikeRealCaseReference,
    resolveCriminalCaseDisplayLabel,
    resolveOfficialCaseNumber,
    sanitizeCaseReferenceField,
} from './criminalCaseReferenceUtils';
export { resolveMergedCaseIds } from './criminalCaseMergeUtils';
export { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
export { MergeValidationError } from './caseMergeMigration';
export type { MergeValidationCode } from './caseMergeMigration';
export type {
    CriminalLawyerRole,
    PhysicalLocation,
    CriminalCaseStage,
    CrimeType,
    DefendantStatus,
    InvestigationPapersAt,
    CriminalComplainant,
    DetentionHistory,
    InAbsentiaDetails,
    SocialInquiryWorkflowStatus,
    JuvenileDetentionPlacement,
    SocialInquiryReport,
    CriminalDefendant,
    DefendantAgeCategory,
    StatementHighlightColor,
    StatementContentHighlight,
    Statement,
    OtherEvidenceItem,
    TimelineEvent,
    LegalArticleChange,
    ExhibitLifecycleStatus,
    InvestigationLog,
    LawyerRequest,
    StageConclusion,
    CriminalCaseLocation,
    CriminalCaseDraft,
    CriminalDossierStatus,
    InvestigationDossierClosureKind,
    InvestigationDossierClosure,
    CriminalCase,
    JudicialSeveranceDraft,
    PendingSeveranceContext,
} from './criminalCaseModel';
export type { CriminalCaseUserRole } from './complainantCassationGovernance';

export function validateInvestigationSeveranceTargets(
    defendants: CriminalDefendant[] | undefined,
    targetIds: string[],
): string | null {
    return validateDefendantSeveranceSelection(defendants, targetIds);
}

export type { CriminalStoreState };

const criminalPersistStorage = createCriminalStorePersistStorage<CriminalStoreState>();

/**
 * zustand يبتلع فشل الترحيل في catch داخلي، فيُقلع المتجر بحالة فارغة دون أي إشارة —
 * المحامي يفتح التطبيق فلا يجد أضابيره. هذا هو الإبلاغ الوحيد عن ذلك.
 */
function reportCriminalRehydrateFailure(error: unknown): void {
    debug.error('[criminalStore] فشل استرجاع الحالة المحفوظة — الأضابير لن تظهر', error);
    void sentryCaptureException(error, {
        area: 'criminal-store',
        phase: 'rehydrate',
        persistVersion: CRIMINAL_STORE_PERSIST_VERSION,
        storeKey: CRIMINAL_STORE_KEY,
    });
}

export const useCriminalStore = create<CriminalStoreState>()(
    persist(
        (set, get) => ({
            draft: makeInitialDraft(),
            casesById: {},
            sessionOwnerLawyerId: null,
            pendingSeveranceContext: null,
            ...createCriminalSessionDraftActions(set, get),
            ...createCriminalInvestigationActions(set, get),
            ...createCriminalProceduralActions(set, get),
            ...createCriminalRequestsActions(set, get),
            ...createCriminalTrialActions(set, get),
            ...createCriminalLifecycleActions(set, get),
        }),
        {
            name: CRIMINAL_STORE_KEY,
            version: CRIMINAL_STORE_PERSIST_VERSION,
            migrate: migrateCriminalPersistState,
            storage: criminalPersistStorage as import('zustand/middleware').PersistStorage<unknown, unknown>,
            partialize: criminalStorePartialize,
            onRehydrateStorage: () => (_state, error) => {
                if (error) reportCriminalRehydrateFailure(error);
            },
        },
    ),
);

installCriminalStorePersistMergeListener(useCriminalStore.setState);

if (
    typeof window !== 'undefined' &&
    import.meta.env.VITE_SHELL_AUTH_OPEN === 'true' &&
    !import.meta.env.VITEST
) {
    const w = window as Window & {
        __hamiE2eCriminalStore?: {
            rehydrate: () => Promise<void>;
            caseIds: () => string[];
        };
    };
    w.__hamiE2eCriminalStore = {
        rehydrate: async () => {
            await useCriminalStore.persist.rehydrate();
        },
        caseIds: () => Object.keys(useCriminalStore.getState().casesById ?? {}),
    };
}
