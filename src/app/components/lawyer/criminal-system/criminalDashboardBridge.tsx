/**
 * واجهة الجسر الخفيفة — بلا ArchivePortal / criminalStore runtime.
 * التحميل الثقيل في criminalDashboardBridgeRuntime عبر LazyProvider.
 */
export {
    CRIMINAL_DASHBOARD_STUB,
    CriminalDashboardBridgeContext,
    useCriminalDashboardBridge,
    type CriminalDashboardBridge,
} from './criminalDashboardBridgeContext';

export { CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT } from '@/app/slices/criminal/bridgeEvent';
