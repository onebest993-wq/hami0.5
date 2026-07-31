import { buildExecutionDashboardCoreScopeLocalBundles } from './buildExecutionDashboardCoreScopeLocalBundles';
import { buildExecutionDashboardCoreScopeRestBundles } from './buildExecutionDashboardCoreScopeRestBundles';
import { collectScopeLocalBundleInput } from './collectScopeLocalBundleInput';
import { collectScopeRestBundleInput } from './collectScopeRestBundleInput';
import { buildScopeLocalBundleGroups, buildScopeRestBundleGroups } from './buildScopeBundleGroups';
import { pickHandlerClusterRestExtras } from './pickHandlerClusterAssemblyHandlers';

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

const EXECUTION_DASHBOARD_SCOPE_GROUP_BINDING_KEYS: Record<string, string> = {
    executionDashboardCoreQueueMicrotask: 'queueMicrotask',
    persistExecutionMergeBinding: 'persistExecutionMerge',
    pushTimelineEventBinding: 'pushTimelineEvent',
};

export function buildExecutionDashboardCoreScopeSourceGroups(
    input: ExecutionDashboardCoreDeferredChunkScopeSourcesInput,
): Record<string, unknown> {
    const localBundleInput = collectScopeLocalBundleInput(
        buildScopeLocalBundleGroups(input.scopeLocalFlat),
    ) as Parameters<typeof buildExecutionDashboardCoreScopeLocalBundles>[0];
    const restBundleInput = collectScopeRestBundleInput({
        ...buildScopeRestBundleGroups({
            ...input.scopeRestFlat,
            specificDeliveryConvertedAmount: input.specificDeliveryConvertedAmount,
            specificDeliveryFinancialized: input.specificDeliveryFinancialized,
        }),
        handlerClusterExtras: pickHandlerClusterRestExtras(input.handlerCluster),
    } as unknown as Parameters<typeof collectScopeRestBundleInput>[0]);

    return {
        scopeRuntimeBindings: input.scopeRuntimeBindings,
        executionModalFlags: input.executionModalFlags,
        executionModalSetters: input.executionModalSetters,
        ...input.assemblyHandlers,
        ...buildExecutionDashboardCoreScopeLocalBundles(localBundleInput),
        ...buildExecutionDashboardCoreScopeRestBundles(restBundleInput),
    };
}

export function mergeExecutionDashboardCoreScopeSourceGroups(
    sourceGroups: Record<string, unknown>,
    predicate: (groupKey: string) => boolean,
): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const [groupKey, groupValue] of Object.entries(sourceGroups)) {
        if (!predicate(groupKey)) continue;
        if (groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue)) {
            Object.assign(merged, groupValue as Record<string, unknown>);
            // الإبقاء على الحقيبة المتداخلة — PhoneBody يعتمد dossierLifecycleActions.*
            // عند غياب المفاتيح المسطّحة (أو stubs).
            if (
                groupKey === 'dossierLifecycleActions' ||
                groupKey === 'dossierLifecyclePanel'
            ) {
                merged[groupKey] = groupValue;
            }
            continue;
        }
        const targetKey = EXECUTION_DASHBOARD_SCOPE_GROUP_BINDING_KEYS[groupKey] ?? groupKey;
        merged[targetKey] = groupValue;
    }
    return merged;
}
