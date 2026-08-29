/**
 * توافق خلفي — first-paint يجب أن يستورد Shell مباشرة.
 * لا تعيد تصدير overlays من هنا حتى لا يسحبها أي مستورد للبرميل.
 */
export {
    EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL as EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE,
    spreadExecutionDashboardLazyChunkScopeShell as spreadExecutionDashboardLazyChunkScope,
} from './executionDashboardLazyChunkScopeShell';
