// @ts-nocheck
/** Phase C Slice 24 — scope assembly + modal scope + lazy chunk */
import { useExecutionDashboardCoreScopeRuntimeBindings } from './useExecutionDashboardCoreScopeRuntimeBindings';
import { buildExecutionDashboardCoreScopeFromParts } from './buildExecutionDashboardCoreScopeFromParts';
import { pickHandlerClusterAssemblyHandlers, pickHandlerClusterRestExtras } from './pickHandlerClusterAssemblyHandlers';
import { collectScopeLocalBundleInput } from './collectScopeLocalBundleInput';
import { collectScopeRestBundleInput } from './collectScopeRestBundleInput';
import { buildScopeLocalBundleGroups, buildScopeRestBundleGroups } from './buildScopeBundleGroups';
import { buildExecutionDashboardModalScope } from './buildExecutionDashboardModalScope';
import { useExecutionDashboardLazyChunkSetup } from '../useExecutionDashboardLazyChunkSetup';
import { buildExecutionDashboardCoreDynamicScope } from './buildExecutionDashboardCoreDynamicScope';
import { buildExecutionDashboardChunkScopeSources } from '../buildExecutionDashboardChunkScopeSources';

export function useExecutionDashboardCoreScopeAndChunk(p: {
    scopeRuntimeInput: Record<string, unknown>;
    handlerCluster: Record<string, unknown>;
    assemblyHandlers: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    specificDeliveryConvertedAmount: number | null;
    specificDeliveryFinancialized: boolean;
    modalScopeInput: Record<string, unknown>;
    chunkSetupInput: {
        fingerprintInput: Record<string, unknown>;
        chunkDataReady: boolean;
    };
}) {
    const specificDeliveryConvertedAmount = p.specificDeliveryConvertedAmount;
    const specificDeliveryFinancialized = p.specificDeliveryFinancialized;

    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings(
        p.scopeRuntimeInput as Parameters<typeof useExecutionDashboardCoreScopeRuntimeBindings>[0],
    );

    const {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
    } = buildExecutionDashboardCoreScopeFromParts({
        scopeRuntimeBindings,
        assemblyHandlers: {
            ...pickHandlerClusterAssemblyHandlers(p.handlerCluster),
            ...p.assemblyHandlers,
        },
        localBundleInput: collectScopeLocalBundleInput(buildScopeLocalBundleGroups(p.scopeLocalFlat)),
        restBundleInput: collectScopeRestBundleInput({
            ...buildScopeRestBundleGroups({
                ...p.scopeRestFlat,
                specificDeliveryConvertedAmount,
                specificDeliveryFinancialized,
            }),
            handlerClusterExtras: pickHandlerClusterRestExtras(p.handlerCluster),
        }),
    });

    const { executionModalFlags, executionModalSetters } = buildExecutionDashboardModalScope(
        p.modalScopeInput as Parameters<typeof buildExecutionDashboardModalScope>[0],
    );

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardLazyChunkSetup({
        ...p.chunkSetupInput,
        modalFlags: executionModalFlags,
        getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
                    financialScopeBag,
                    timelineDossierScopeBag,
                    decisionsSeizureEvictionScopeBag,
                    workspaceScopeBag,
                }),
            ),
    });

    return {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
        executionModalFlags,
        executionModalSetters,
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    };
}
