/**
 * Public barrel — preserve import path `@/app/components/lawyer/LawyerShared`
 * (and relative `../LawyerShared` / `../../LawyerShared`).
 */
export { normalizeArabicSearch as normalizeArabic } from '@/app/services/search/normalizeArabicSearch';
export { HighlightedText } from './lawyerShared/lawyerSharedHighlight';
export { getJurisdictionPartyRole } from './lawyerShared/jurisdictionPartyRoles';
export { getLegalRole } from './lawyerShared/legalRoleLabels';
export {
    THEMES,
    SHAPES,
    useThemeStyles,
    type ThemeKey,
    type ShapeKey,
} from './lawyerShared/lawyerThemes';
export {
    type CaseType,
    type FileData,
    type ConsolidationSecondaryRef,
    type CaseLinkRecord,
    type Party,
    type Alert,
} from '@/app/domain/lawsuit/fileDataTypes';
export {
    type EventType,
    type AppointmentType,
    type DocumentCategory,
    type NotificationStatus,
    type TimelineEvent,
    type ProvisionalOrder,
    type ThirdParty,
    type CaseStage,
    type Task,
} from '@/app/domain/lawsuit/stageTimelineTypes';
export {
    type StageOutcome,
    type JudgmentFormType,
    type CourtJurisdiction,
    type FirstInstanceDegree,
    type StageTransitionMetadata,
    type AppealStageMetadata,
} from '@/app/domain/lawsuit/stageTransitionMetadataTypes';
export {
    type IncidentalType,
    type IncidentalStatus,
    type ThirdPartyEntryMode,
    type IncidentalEntryDecision,
    type AffiliationSide,
    type IncidentalFileLink,
    type IncidentalCase,
} from '@/app/domain/lawsuit/incidentalTypes';
