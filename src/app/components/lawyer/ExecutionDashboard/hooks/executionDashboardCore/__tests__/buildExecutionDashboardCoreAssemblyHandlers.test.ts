import { describe, expect, it, vi } from 'vitest';
import { buildExecutionDashboardCoreAssemblyHandlers } from '../buildExecutionDashboardCoreAssemblyHandlers';

describe('buildExecutionDashboardCoreAssemblyHandlers', () => {
    it('prefers core dossier lifecycle actions over cluster stubs', () => {
        const coreDossierLifecycleActions = {
            handleDossierLifecyclePick: () => 'core-pick',
        };
        const result = buildExecutionDashboardCoreAssemblyHandlers({
            handlerCluster: {
                dossierLifecycleActions: {
                    handleDossierLifecyclePick: () => 'cluster-pick',
                },
            },
            coreRuntimeVars: {
                handleMemoFollowupClick: () => 'memo',
                openFollowupModalPersisted: () => undefined,
                dossierLifecycleActions: coreDossierLifecycleActions,
            },
            coreDossierLifecycleActions,
            coreResidentHandlers: {},
        });

        expect((result.dossierLifecycleActions as { handleDossierLifecyclePick: () => string }).handleDossierLifecyclePick()).toBe(
            'core-pick',
        );
        expect(result.handleMemoFollowupClick).toBeTypeOf('function');
    });

    it('flattens core partyDeathHandlers onto assembly output', () => {
        const debtorDeath = vi.fn();
        const result = buildExecutionDashboardCoreAssemblyHandlers({
            handlerCluster: {
                partyDeathHandlers: {
                    handleDebtorDeathMenuAction: () => 'cluster',
                },
            },
            coreRuntimeVars: {
                handleMemoFollowupClick: () => 'memo',
                openFollowupModalPersisted: () => undefined,
                partyDeathHandlers: {
                    handleDebtorDeathMenuAction: debtorDeath,
                    handleCreditorDeathMenuAction: vi.fn(),
                },
            },
            coreDossierLifecycleActions: {},
            coreResidentHandlers: {},
        });

        expect(result.handleDebtorDeathMenuAction).toBe(debtorDeath);
    });

    it('flattens trash / party-edit / dossier-meta bags onto assembly output', () => {
        const restoreTimeline = vi.fn();
        const saveParty = vi.fn();
        const saveDossierMeta = vi.fn();
        const result = buildExecutionDashboardCoreAssemblyHandlers({
            handlerCluster: {},
            coreRuntimeVars: {
                handleMemoFollowupClick: () => 'memo',
                openFollowupModalPersisted: () => undefined,
                trashAndPinsHandlers: {
                    restoreTimelineEventFromTrash: restoreTimeline,
                    permanentlyDeleteTimelineEvent: vi.fn(),
                },
                partyEditWorkflow: {
                    savePartyEditDraft: saveParty,
                    editPartyTarget: null,
                },
                dossierMetaWorkflow: {
                    dossierMetaDraft: { fileNumber: '1' },
                    saveDossierMetaDraft: saveDossierMeta,
                },
            },
            coreDossierLifecycleActions: {},
            coreResidentHandlers: {},
        });

        expect(result.restoreTimelineEventFromTrash).toBe(restoreTimeline);
        expect(result.savePartyEditDraft).toBe(saveParty);
        expect(result.saveDossierMetaDraft).toBe(saveDossierMeta);
        expect(result.dossierMetaDraft).toEqual({ fileNumber: '1' });
    });
});
