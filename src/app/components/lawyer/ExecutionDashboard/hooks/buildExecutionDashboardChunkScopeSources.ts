import { spreadExecutionDashboardLazyChunkScope } from './executionDashboardLazyChunkScope';
import { spreadExecutionDashboardRuntimeChunkScope } from '../executionDashboardRuntimeChunkScope';
import { spreadExecutionDashboardStaticChunkScope } from '../executionDashboardStaticChunkScope';
import { spreadExecutionDashboardUiChunkScope } from '../executionDashboardUiChunkScope';

/** يدمج chunk scopes الثابتة مع مصادر الـ hook الديناميكية لـ PhoneBody / ShellOverlays */
export function buildExecutionDashboardChunkScopeSources(
    dynamicSources: Record<string, unknown>,
): Record<string, unknown> {
    return {
        ...spreadExecutionDashboardStaticChunkScope(),
        ...spreadExecutionDashboardUiChunkScope(),
        ...spreadExecutionDashboardRuntimeChunkScope(),
        ...spreadExecutionDashboardLazyChunkScope(),
        ...dynamicSources,
    };
}
