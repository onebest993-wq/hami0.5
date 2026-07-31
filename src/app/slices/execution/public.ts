/**
 * Public surface — شريحة التنفيذ.
 * الاستيراد من خارج الشريحة يمر من هنا (أو من loaders في runtime/).
 */
export { loadExecutionDashboardModule } from '@/app/runtime/executionDashboardLoader';
export type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';
export {
    LazyExecutionDashboardPortal,
    prefetchExecutionDashboardPortal,
} from '@/app/components/lawyer/dashboard/executionDashboardPortalLazy';
export { ExecutionDashboardPortal } from '@/app/components/lawyer/dashboard/ExecutionDashboardPortal';
