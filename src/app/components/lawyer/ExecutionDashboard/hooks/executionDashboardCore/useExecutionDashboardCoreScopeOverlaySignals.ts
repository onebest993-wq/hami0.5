import { useMemo } from 'react';
import type { ExecutionModalFlags } from './buildExecutionDashboardModalScope';

function isLocalShellOverlayOpen(bag: Record<string, unknown>): boolean {
    return Boolean(
        bag.showEditDossierMetaModal ||
            bag.showExecutionTrashModal ||
            bag.editPartyTarget ||
            bag.timelineEditDraft ||
            bag.heirsQuickView ||
            bag.permanentDeleteTimelineId ||
            bag.executorScheduleModalOpen ||
            bag.policeAssistanceModalOpen ||
            bag.breakInventoryFurnitureModalOpen ||
            bag.judicialCustodianModalOpen ||
            bag.executionReportPrompt ||
            bag.partyDeathModalParty ||
            bag.alimonyBeneficiaryDeathModalOpen ||
            bag.seizedPropertyStepModalOpen ||
            bag.seizedPropertyAuctionResultModalOpen ||
            bag.seizureMarkModalOpen ||
            bag.publicationModalOpen,
    );
}

export function useExecutionDashboardCoreScopeOverlaySignals(p: {
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    executionModalFlags: ExecutionModalFlags;
}) {
    const overlayUrgent = useMemo(() => {
        const local = p.scopeLocalFlat;
        const rest = p.scopeRestFlat;
        return Boolean(
            local.showExecutionFinancialHub ||
                local.showUnifiedSeizureLogModal ||
                local.movableSeizureRequestModalOpen ||
                local.propertySeizureRequestModalOpen ||
                rest.showExecutionFinancialHub ||
                rest.showUnifiedSeizureLogModal ||
                rest.movableSeizureRequestModalOpen ||
                rest.propertySeizureRequestModalOpen,
        );
    }, [
        p.scopeLocalFlat.showExecutionFinancialHub,
        p.scopeLocalFlat.showUnifiedSeizureLogModal,
        p.scopeLocalFlat.movableSeizureRequestModalOpen,
        p.scopeLocalFlat.propertySeizureRequestModalOpen,
        p.scopeRestFlat.showExecutionFinancialHub,
        p.scopeRestFlat.showUnifiedSeizureLogModal,
        p.scopeRestFlat.movableSeizureRequestModalOpen,
        p.scopeRestFlat.propertySeizureRequestModalOpen,
    ]);

    const shellOverlayStateToken = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        const unifiedModalTab = String(local.unifiedModalTab ?? rest.unifiedModalTab ?? '');
        const executionDebtorTabIndex = String(
            local.executionDebtorTabIndex ?? rest.executionDebtorTabIndex ?? '',
        );
        const followupSolidaryDebtorIndex = String(
            local.followupSolidaryDebtorIndex ?? rest.followupSolidaryDebtorIndex ?? '',
        );
        const savedNotesSplit = (local.savedNotesSplit ?? rest.savedNotesSplit) as
            | { notes?: unknown[] }
            | undefined;
        const savedNotesCount = Array.isArray(savedNotesSplit?.notes)
            ? String(savedNotesSplit.notes.length)
            : '0';
        return `${unifiedModalTab}|${executionDebtorTabIndex}|${followupSolidaryDebtorIndex}|notes:${savedNotesCount}`;
    }, [
        p.scopeLocalFlat.unifiedModalTab,
        p.scopeRestFlat.unifiedModalTab,
        p.scopeLocalFlat.executionDebtorTabIndex,
        p.scopeRestFlat.executionDebtorTabIndex,
        p.scopeLocalFlat.followupSolidaryDebtorIndex,
        p.scopeRestFlat.followupSolidaryDebtorIndex,
        p.scopeLocalFlat.savedNotesSplit,
        p.scopeRestFlat.savedNotesSplit,
    ]);

    const overlayIntentUrgent = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        return (
            Boolean(p.executionModalFlags.showEditDossierMetaModal) ||
            isLocalShellOverlayOpen(local) ||
            isLocalShellOverlayOpen(rest)
        );
    }, [
        p.executionModalFlags.showEditDossierMetaModal,
        p.scopeLocalFlat.showEditDossierMetaModal,
        p.scopeRestFlat.showEditDossierMetaModal,
        p.scopeLocalFlat.showExecutionTrashModal,
        p.scopeRestFlat.showExecutionTrashModal,
        p.scopeLocalFlat.editPartyTarget,
        p.scopeRestFlat.editPartyTarget,
        p.scopeLocalFlat.timelineEditDraft,
        p.scopeRestFlat.timelineEditDraft,
        p.scopeLocalFlat.heirsQuickView,
        p.scopeRestFlat.heirsQuickView,
        p.scopeLocalFlat.permanentDeleteTimelineId,
        p.scopeRestFlat.permanentDeleteTimelineId,
        p.scopeLocalFlat.executorScheduleModalOpen,
        p.scopeRestFlat.executorScheduleModalOpen,
        p.scopeLocalFlat.policeAssistanceModalOpen,
        p.scopeRestFlat.policeAssistanceModalOpen,
        p.scopeLocalFlat.breakInventoryFurnitureModalOpen,
        p.scopeRestFlat.breakInventoryFurnitureModalOpen,
        p.scopeLocalFlat.judicialCustodianModalOpen,
        p.scopeRestFlat.judicialCustodianModalOpen,
        p.scopeLocalFlat.executionReportPrompt,
        p.scopeRestFlat.executionReportPrompt,
        p.scopeLocalFlat.partyDeathModalParty,
        p.scopeRestFlat.partyDeathModalParty,
        p.scopeLocalFlat.alimonyBeneficiaryDeathModalOpen,
        p.scopeRestFlat.alimonyBeneficiaryDeathModalOpen,
        p.scopeLocalFlat.seizedPropertyStepModalOpen,
        p.scopeRestFlat.seizedPropertyStepModalOpen,
        p.scopeLocalFlat.seizedPropertyAuctionResultModalOpen,
        p.scopeRestFlat.seizedPropertyAuctionResultModalOpen,
        p.scopeLocalFlat.seizureMarkModalOpen,
        p.scopeRestFlat.seizureMarkModalOpen,
        p.scopeLocalFlat.publicationModalOpen,
        p.scopeRestFlat.publicationModalOpen,
    ]);

    const dossierScopeId = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        return String(
            local.executionId ??
                rest.executionId ??
                (local.executionData as { id?: string })?.id ??
                (rest.executionData as { id?: string })?.id ??
                '',
        );
    }, [
        p.scopeLocalFlat.executionId,
        p.scopeRestFlat.executionId,
        (p.scopeLocalFlat as { executionData?: { id?: string } }).executionData?.id,
        (p.scopeRestFlat as { executionData?: { id?: string } }).executionData?.id,
    ]);

    return { overlayUrgent, shellOverlayStateToken, overlayIntentUrgent, dossierScopeId };
}
