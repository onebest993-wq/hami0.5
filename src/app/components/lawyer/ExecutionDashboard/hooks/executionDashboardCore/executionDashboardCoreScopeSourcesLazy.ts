import { buildExecutionDashboardCoreScopeFromParts } from './buildExecutionDashboardCoreScopeFromParts';
import { collectScopeLocalBundleInput } from './collectScopeLocalBundleInput';
import { collectScopeRestBundleInput } from './collectScopeRestBundleInput';
import { buildScopeLocalBundleGroups, buildScopeRestBundleGroups } from './buildScopeBundleGroups';
import { pickHandlerClusterRestExtras } from './pickHandlerClusterAssemblyHandlers';
import { buildExecutionDashboardCoreDynamicScope } from './buildExecutionDashboardCoreDynamicScope';
import { buildExecutionDashboardChunkScopeSources } from '../buildExecutionDashboardChunkScopeSources';

export type ExecutionDashboardCoreDeferredChunkScopeSourcesInput = {
    scopeRuntimeBindings: Record<string, unknown>;
    assemblyHandlers: Record<string, unknown>;
    handlerCluster: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    specificDeliveryConvertedAmount: number | null;
    specificDeliveryFinancialized: boolean;
    executionModalFlags: Record<string, unknown>;
    executionModalSetters: Record<string, unknown>;
};

export function buildExecutionDashboardCoreDeferredChunkScopeSources(
    input: ExecutionDashboardCoreDeferredChunkScopeSourcesInput,
): Record<string, unknown> {
    const {
        scopeRuntimeBindings,
        assemblyHandlers,
        handlerCluster,
        scopeLocalFlat,
        scopeRestFlat,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        executionModalFlags,
        executionModalSetters,
    } = input;

    const {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
    } = buildExecutionDashboardCoreScopeFromParts({
        scopeRuntimeBindings,
        assemblyHandlers,
        localBundleInput: collectScopeLocalBundleInput(
            buildScopeLocalBundleGroups(scopeLocalFlat),
        ) as Parameters<typeof buildExecutionDashboardCoreScopeFromParts>[0]['localBundleInput'],
        restBundleInput: collectScopeRestBundleInput({
            ...buildScopeRestBundleGroups({
                ...scopeRestFlat,
                specificDeliveryConvertedAmount,
                specificDeliveryFinancialized,
            }),
            handlerClusterExtras: pickHandlerClusterRestExtras(handlerCluster),
        } as unknown as Parameters<typeof collectScopeRestBundleInput>[0]) as Parameters<
            typeof buildExecutionDashboardCoreScopeFromParts
        >[0]['restBundleInput'],
    });

    return buildExecutionDashboardChunkScopeSources(
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
    );
}
