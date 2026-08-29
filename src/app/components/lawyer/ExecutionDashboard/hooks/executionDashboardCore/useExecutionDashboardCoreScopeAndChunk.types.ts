import type { ExecutionModalFlags } from './buildExecutionDashboardModalScope';

/** نوع محلي — لا يستورد executionDashboardCoreScopeSourceGroups حتى لا يُسحب إلى الـ chunk الرئيسي */
export type BaseScopeBuilderInput = {
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

export type BaseScopeBuilder = (input: BaseScopeBuilderInput) => Record<string, unknown>;

export function fingerprintExecutionModalFlags(flags: ExecutionModalFlags): string {
    return Object.values(flags)
        .map((value) => (value ? '1' : '0'))
        .join('');
}
