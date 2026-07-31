/**
 * Public surface — شريحة الجزائي (لوحة + جسر).
 * نماذج الإنشاء: `@/app/slices/criminal/newCase`
 * ثابت الجسر فقط: `@/app/slices/criminal/bridgeEvent`
 * كاش القوانين: `@/app/slices/criminal/legalCodes`
 * المستودع: `@/app/slices/criminal/storePublic`
 */
export { CriminalDashboardPortal } from '@/app/components/lawyer/criminal-system/CriminalDashboardPortal';
export { CriminalDashboardBootChrome } from '@/app/components/lawyer/criminal-system/CriminalDashboardBootChrome';
export { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridgeContext';
export {
    CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT,
    requestCriminalDashboardBridgeActivate,
} from '@/app/slices/criminal/bridgeEvent';
export { CRIMINAL_DOSSIER_TEST_IDS } from '@/app/components/lawyer/criminal-system/criminalDossierTestIds';
export type { CriminalCase } from '@/app/slices/criminal/storePublic';
