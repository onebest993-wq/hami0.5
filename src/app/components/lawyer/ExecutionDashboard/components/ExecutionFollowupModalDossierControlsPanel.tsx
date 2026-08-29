import React from 'react';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalDossierControlsPanel({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const {
        TabDossierControls,
        activeFollowupDebtorKey,
        activePanelKey,
        activeSubFileId,
        appealPerspective,
        decisionsStorageExecutionId,
        dossierActionModalSaving,
        executionData,
        executionPaused,
        handleDossierAction,
        inabaCorrespondenceLog,
        inabaTargets,
        isInabaActive,
        panelsToRender,
        parentDossierId,
        setDossierActionModalSaving,
        setExecutionStorageTick,
        stayOfExecutionActive,
    } = c;

    if (!panelsToRender.has('dossier_controls')) return null;

    return (
        <FollowupTabKeepAlivePanel
            key={`dossier_controls:${String(activeFollowupDebtorKey ?? '')}`}
            panelId="dossier_controls"
            active={activePanelKey === 'dossier_controls'}
            className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
            dir="rtl"
        >
            <TabDossierControls
                parentFileId={parentDossierId}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                appealPerspective={appealPerspective}
                inabaTargets={inabaTargets}
                inabaCorrespondenceLog={inabaCorrespondenceLog}
                onExecutorOutcomeApplied={() => {
                    setExecutionStorageTick((t) => t + 1);
                }}
                showInabaCorrespondence={
                    activeSubFileId === null && !isInabaActive && inabaTargets.length > 0
                }
                showRenew={
                    activeSubFileId === null &&
                    (executionPaused ||
                        stayOfExecutionActive ||
                        normalizeDossierLifecycleStatus(
                            executionData?.dossier_lifecycle_status
                        ) === 'paused' ||
                        normalizeDossierLifecycleStatus(
                            executionData?.dossier_lifecycle_status
                        ) === 'suspended')
                }
                saving={dossierActionModalSaving}
                onSubmit={async (payload) => {
                    setDossierActionModalSaving(true);
                    return await handleDossierAction(payload);
                }}
            />
        </FollowupTabKeepAlivePanel>
    );
}
