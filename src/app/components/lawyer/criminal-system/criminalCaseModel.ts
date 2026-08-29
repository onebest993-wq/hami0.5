/**
 * Criminal case model — public barrel.
 * Types live in domain siblings; import path `./criminalCaseModel` is preserved.
 */

export type {
    CriminalLawyerRole,
    PhysicalLocation,
    CriminalCaseStage,
    CrimeType,
    DefendantStatus,
    InvestigationPapersAt,
    DetentionHistory,
    InAbsentiaDetails,
    SocialInquiryWorkflowStatus,
    JuvenileDetentionPlacement,
    SocialInquiryReport,
    CriminalComplainant,
    CriminalDefendant,
    DefendantAgeCategory,
} from './criminalCasePartyTypes';

export type {
    StatementHighlightColor,
    StatementContentHighlight,
    Statement,
    OtherEvidenceItem,
    TimelineEvent,
} from './criminalCaseEvidenceTypes';

export type {
    LegalArticleChange,
    ExhibitLifecycleStatus,
    InvestigationLog,
    LawyerRequest,
} from './criminalCaseProcedureTypes';

export type {
    StageConclusion,
    CriminalCaseLocation,
    CriminalCaseDraft,
    CriminalDossierStatus,
    InvestigationDossierClosureKind,
    InvestigationDossierClosure,
    CriminalCase,
    JudicialSeveranceDraft,
    PendingSeveranceContext,
} from './criminalCaseRecordTypes';

export type { CriminalCaseUserRole } from './complainantCassationGovernance';
