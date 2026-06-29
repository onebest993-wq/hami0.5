/**
 * Prefetch execution-core-handlers — dynamic import only (no static edge from core chunk).
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { prefetchExecutionHandlerClusterBridge } from './executionDashboardHandlerClusterBridgeLazy';

export function prefetchExecutionCoreHandlers(): void {
    if (isLitePerformanceActive()) return;
    prefetchExecutionHandlerClusterBridge();
}
