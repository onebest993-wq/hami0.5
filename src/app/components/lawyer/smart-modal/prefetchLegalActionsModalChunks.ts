/** Prefetch modal chunks opened from LegalActionsMenu — avoids first-click flash. */
export function prefetchLegalActionsModalChunks(): void {
    if (typeof window === 'undefined') return;
    void import('./procedural-modals/TransferJurisdictionModal').catch(() => undefined);
    void import('./procedural-modals/CaseConsolidationModal').catch(() => undefined);
    void import('./procedural-modals/CaseLinkModal').catch(() => undefined);
    void import('./procedural-modals/CorrespondenceModal').catch(() => undefined);
    void import('./modals/flow-modals/AddIncidentalCaseModal').catch(() => undefined);
    void import('./modals/appealObjectionModals').catch(() => undefined);
}
