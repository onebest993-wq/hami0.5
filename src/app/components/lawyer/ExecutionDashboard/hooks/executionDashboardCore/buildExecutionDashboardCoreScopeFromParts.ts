// @ts-nocheck
/** Phase C Slice 22 — تجميع local + rest bundles + assembly في خطوة واحدة */
import { buildExecutionDashboardCoreScopeBagAssembly } from './buildExecutionDashboardCoreScopeBagAssembly.generated';
import { buildExecutionDashboardCoreScopeLocalBundles } from './buildExecutionDashboardCoreScopeLocalBundles';
import { buildExecutionDashboardCoreScopeRestBundles } from './buildExecutionDashboardCoreScopeRestBundles';
import type { ExecutionDashboardCoreScopeLocalBundlesInput } from './buildExecutionDashboardCoreScopeLocalBundles';

export type BuildExecutionDashboardCoreScopeFromPartsInput = {
    scopeRuntimeBindings: Record<string, unknown>;
    assemblyHandlers: Record<string, unknown>;
    localBundleInput: ExecutionDashboardCoreScopeLocalBundlesInput;
    restBundleInput: Record<string, unknown>;
};

export function buildExecutionDashboardCoreScopeFromParts(
    input: BuildExecutionDashboardCoreScopeFromPartsInput,
) {
    const scopeLocalBundles = buildExecutionDashboardCoreScopeLocalBundles(input.localBundleInput);
    const scopeRestBundles = buildExecutionDashboardCoreScopeRestBundles(input.restBundleInput);

    return buildExecutionDashboardCoreScopeBagAssembly({
        scopeRuntimeBindings: input.scopeRuntimeBindings,
        ...input.assemblyHandlers,
        ...scopeLocalBundles,
        ...scopeRestBundles,
    });
}
