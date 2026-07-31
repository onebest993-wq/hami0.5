/**
 * Pure case transforms for CriminalCase — extracted from criminalStore.ts.
 * Each function takes a case record (or related value) and returns a new value;
 * none of these touch the Zustand store directly.
 *
 * This module is a re-export barrel: the implementation now lives in the
 * caseTransform* domain modules below. Split for maintainability — no
 * behavior change, all public exports preserved.
 */
export * from './caseTransformShared';
export * from './caseTransformSeverance';
export * from './caseTransformPersonalStage';
export * from './caseTransformDraftSeed';
export * from './caseTransformJourneyLifecycle';
export * from './caseTransformInvestigationReferral';
export * from './caseTransformProceduralRoute';
export * from './caseTransformJudicialOutcome';
export * from './caseTransformGuardsTrash';
