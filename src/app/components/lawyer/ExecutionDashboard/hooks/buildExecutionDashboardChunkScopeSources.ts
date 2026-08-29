import { spreadExecutionDashboardLazyChunkScopeShell } from './executionDashboardLazyChunkScopeShell';
import { spreadExecutionDashboardRuntimeChunkScope } from '../executionDashboardRuntimeChunkScope';
import { spreadExecutionDashboardStaticChunkScope } from '../executionDashboardStaticChunkScope';
import { spreadExecutionDashboardUiChunkScope } from '../executionDashboardUiChunkScope';
import { spreadExecutionDashboardImportedHelpersChunkScope } from '../executionDashboardImportedHelpersChunkScope';

/** يدمج chunk scopes الثابتة مع مصادر الـ hook الديناميكية لـ PhoneBody / ShellOverlays */
export function buildExecutionDashboardChunkScopeSources(
    dynamicSources: Record<string, unknown>,
): Record<string, unknown> {
    return {
        ...spreadExecutionDashboardStaticChunkScope(),
        ...spreadExecutionDashboardUiChunkScope(),
        ...spreadExecutionDashboardRuntimeChunkScope(),
        ...spreadExecutionDashboardImportedHelpersChunkScope(),
        ...spreadExecutionDashboardLazyChunkScopeShell(),
        ...dynamicSources,
    };
}
