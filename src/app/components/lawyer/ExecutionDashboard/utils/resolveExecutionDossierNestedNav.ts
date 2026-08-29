/** هل زر الرجوع سيُغلق طبقة داخلية قبل مغادرة إضبارة التنفيذ؟ */
export function resolveExecutionDossierNestedNav(input: {
    showExecutionTrashModal: boolean;
    showUnifiedSeizureLogModal: boolean;
    propertySeizureRequestModalOpen: boolean;
    movableSeizureRequestModalOpen: boolean;
    showExecutionFinancialHub: boolean;
    dossierActionModalOpen: boolean;
    dossierLifecyclePanelOpen: boolean;
    hasChildDossiers: boolean;
    isInabaActive: boolean;
    activeTabId: string;
    currentFileId: string;
    activeSubFileId?: string | null;
}): boolean {
    return (
        input.showExecutionTrashModal ||
        input.showUnifiedSeizureLogModal ||
        input.propertySeizureRequestModalOpen ||
        input.movableSeizureRequestModalOpen ||
        input.showExecutionFinancialHub ||
        input.dossierActionModalOpen ||
        input.dossierLifecyclePanelOpen ||
        (input.hasChildDossiers &&
            !input.isInabaActive &&
            String(input.activeTabId) !== String(input.currentFileId)) ||
        (input.isInabaActive && Boolean(input.activeSubFileId))
    );
}
