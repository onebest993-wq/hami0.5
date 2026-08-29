// Shared scope definition for the "دعاوى" (Lawsuits) section audit.
// ArchivePortal/ is a MIXED folder (Lawsuit+Criminal archive AND Execution archive share it) —
// these exact files are Execution-only and must be EXCLUDED from lawsuit-section accounting.
export const ARCHIVE_PORTAL_EXECUTION_ONLY = new Set([
  'src/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface.tsx',
  'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
  'src/app/components/lawyer/ArchivePortal/archiveFinancialSync.ts',
  'src/app/components/lawyer/ArchivePortal/__tests__/archiveFinancialSync.test.ts',
  'src/app/components/lawyer/ArchivePortal/executionArchiveEnrichment.ts',
  'src/app/components/lawyer/ArchivePortal/executionArchiveFilterUtils.ts',
  'src/app/components/lawyer/ArchivePortal/__tests__/executionArchiveFilterUtils.test.ts',
  'src/app/components/lawyer/ArchivePortal/__tests__/executionArchiveLifecycle.test.ts',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionArchivePartyBlock.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveLifecycleBars.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveTrashDialogs.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard.tsx',
  'src/app/components/lawyer/ArchivePortal/components/ArchivePortalExecutionPreviewModal.tsx',
  'src/app/components/lawyer/ArchivePortal/components/__tests__/ExecutionArchiveToolbar.test.tsx',
  'src/app/components/lawyer/ArchivePortal/components/__tests__/ExecutionArchiveTrashDialogs.integration.test.tsx',
  'src/app/components/lawyer/ArchivePortal/components/__tests__/ExecutionSmartCard.toolbar.test.tsx',
  'src/app/components/lawyer/ArchivePortal/hooks/useExecutionArchiveCardLiveRevision.ts',
]);

export const SCOPE_PREFIXES = [
  'src/app/domain/lawsuit/',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/smart-modal/',
  'src/app/components/lawyer/criminal-system/',
  'src/app/components/lawyer/personal-status/',
  'src/app/components/lawyer/caseShare/',
  'src/app/components/lawyer/NeuralAlertsCard/',
];

export function inLawsuitScope(p) {
  if (ARCHIVE_PORTAL_EXECUTION_ONLY.has(p)) return false;
  return SCOPE_PREFIXES.some((pre) => p === pre.replace(/\/$/, '') || p.startsWith(pre));
}
