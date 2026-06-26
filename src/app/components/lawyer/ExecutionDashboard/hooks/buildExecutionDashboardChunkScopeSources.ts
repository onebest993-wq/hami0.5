import { spreadExecutionDashboardLazyChunkScope } from './executionDashboardLazyChunkScope';
import { spreadExecutionDashboardRuntimeChunkScope } from '../executionDashboardRuntimeChunkScope';
import { spreadExecutionDashboardStaticChunkScope } from '../executionDashboardStaticChunkScope';
import { spreadExecutionDashboardUiChunkScope } from '../executionDashboardUiChunkScope';
import { spreadExecutionDashboardImportedHelpersChunkScope } from '../executionDashboardImportedHelpersChunkScope';
import { spreadExecutionDashboardPhoneBodyComponentsChunkScope } from '../executionDashboardPhoneBodyComponentsChunkScope';

/** يدمج chunk scopes الثابتة مع مصادر الـ hook الديناميكية لـ PhoneBody / ShellOverlays */
export function buildExecutionDashboardChunkScopeSources(
    dynamicSources: Record<string, unknown>,
): Record<string, unknown> {
    return {
        ...spreadExecutionDashboardStaticChunkScope(),
        ...spreadExecutionDashboardUiChunkScope(),
        ...spreadExecutionDashboardRuntimeChunkScope(),
        ...spreadExecutionDashboardImportedHelpersChunkScope(),
        ...spreadExecutionDashboardPhoneBodyComponentsChunkScope(),
        ...spreadExecutionDashboardLazyChunkScope(),
        ...dynamicSources,
    };
}
