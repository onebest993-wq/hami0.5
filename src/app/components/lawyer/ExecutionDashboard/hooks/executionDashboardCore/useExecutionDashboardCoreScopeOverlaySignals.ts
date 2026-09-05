import { useMemo } from 'react';
import type { ExecutionModalFlags } from './buildExecutionDashboardModalScope';

/** نوافذ shell التي لا تمر عبر Zustand ModalStates — تُقرأ من flat أو من assemblyHandlers. */
export function isLocalShellOverlayOpen(bag: Record<string, unknown>): boolean {
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

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

/**
 * editPartyTarget / heirsQuickView / partyDeathModalParty ليست في SCOPE_LOCAL/REST
 * (ولا مفاتيح runtime مسطّحة) — تبقى داخل partyEditWorkflow / followupOrchestrator
 * أو تُفلَّت في assemblyHandlers. بدون قراءتها هنا تبقى shellOverlaysReady=false
 * فيبدو «تعديل الورثة» و«وريث» ونافذة الوفاة كأن الأزرار لا تعمل.
 */
export function collectShellOverlayIntentBags(
    scopeLocalFlat: Record<string, unknown>,
    scopeRestFlat: Record<string, unknown>,
    assemblyHandlers: Record<string, unknown> = {},
): Record<string, unknown>[] {
    return [
        scopeLocalFlat,
        scopeRestFlat,
        assemblyHandlers,
        asRecord(assemblyHandlers.partyEditWorkflow),
        asRecord(assemblyHandlers.followupOrchestrator),
        asRecord(assemblyHandlers.dossierMetaWorkflow),
    ];
}

function readShellOverlayIntentFlag(
    bags: Record<string, unknown>[],
    key: string,
): unknown {
    for (const bag of bags) {
        if (bag[key] != null && bag[key] !== false) return bag[key];
    }
    return undefined;
}

export function useExecutionDashboardCoreScopeOverlaySignals(p: {
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    executionModalFlags: ExecutionModalFlags;
    /** assemblyHandlers — مصدر الحقيقة لنوايا تعديل الطرف / الورثة / الوفاة */
    assemblyHandlers?: Record<string, unknown>;
}) {
    const assemblyHandlers = p.assemblyHandlers ?? {};
    const partyEditWorkflow = asRecord(assemblyHandlers.partyEditWorkflow);
    const followupOrchestrator = asRecord(assemblyHandlers.followupOrchestrator);
    const dossierMetaWorkflow = asRecord(assemblyHandlers.dossierMetaWorkflow);

    const overlayUrgent = useMemo(() => {
        const local = p.scopeLocalFlat;
        const rest = p.scopeRestFlat;
        return Boolean(
            local.showExecutionFinancialHub ||
                local.movableSeizureRequestModalOpen ||
                local.propertySeizureRequestModalOpen ||
                rest.showExecutionFinancialHub ||
                rest.movableSeizureRequestModalOpen ||
                rest.propertySeizureRequestModalOpen,
        );
    }, [
        p.scopeLocalFlat.showExecutionFinancialHub,
        p.scopeLocalFlat.movableSeizureRequestModalOpen,
        p.scopeLocalFlat.propertySeizureRequestModalOpen,
        p.scopeRestFlat.showExecutionFinancialHub,
        p.scopeRestFlat.movableSeizureRequestModalOpen,
        p.scopeRestFlat.propertySeizureRequestModalOpen,
    ]);

    const intentBags = useMemo(
        () => collectShellOverlayIntentBags(p.scopeLocalFlat, p.scopeRestFlat, assemblyHandlers),
        [
            p.scopeLocalFlat,
            p.scopeRestFlat,
            assemblyHandlers,
            assemblyHandlers.editPartyTarget,
            assemblyHandlers.heirsQuickView,
            assemblyHandlers.partyDeathModalParty,
            partyEditWorkflow.editPartyTarget,
            partyEditWorkflow.heirsQuickView,
            followupOrchestrator.partyDeathModalParty,
            followupOrchestrator.alimonyBeneficiaryDeathModalOpen,
            dossierMetaWorkflow.showEditDossierMetaModal,
        ],
    );

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
        const editParty = readShellOverlayIntentFlag(intentBags, 'editPartyTarget') ? '1' : '0';
        const heirsQuick = readShellOverlayIntentFlag(intentBags, 'heirsQuickView') ? '1' : '0';
        const partyDeath = readShellOverlayIntentFlag(intentBags, 'partyDeathModalParty')
            ? '1'
            : '0';
        return `${unifiedModalTab}|${executionDebtorTabIndex}|${followupSolidaryDebtorIndex}|notes:${savedNotesCount}|ep:${editParty}|hq:${heirsQuick}|pd:${partyDeath}`;
    }, [
        p.scopeLocalFlat.unifiedModalTab,
        p.scopeRestFlat.unifiedModalTab,
        p.scopeLocalFlat.executionDebtorTabIndex,
        p.scopeRestFlat.executionDebtorTabIndex,
        p.scopeLocalFlat.followupSolidaryDebtorIndex,
        p.scopeRestFlat.followupSolidaryDebtorIndex,
        p.scopeLocalFlat.savedNotesSplit,
        p.scopeRestFlat.savedNotesSplit,
        intentBags,
    ]);

    const overlayIntentUrgent = useMemo(() => {
        return (
            Boolean(p.executionModalFlags.showEditDossierMetaModal) ||
            intentBags.some((bag) => isLocalShellOverlayOpen(bag))
        );
    }, [p.executionModalFlags.showEditDossierMetaModal, intentBags]);

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
