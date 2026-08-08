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
});
