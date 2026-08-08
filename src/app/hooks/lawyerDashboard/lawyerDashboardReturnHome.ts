import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { snapProfileShellClose } from '@/app/services/profile/profileShellSnap';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type ReturnToLawyerHomeParams = {
    setActiveTab: (tab: LawyerDashboardTab) => void;
    closeHubShellOverlays: () => void;
    exitCriminalDossierToHome?: () => void;
    /** افتراضي true — يُعطَّل فقط في اختبارات العزل */
    dismissOverlays?: boolean;
};

/**
 * العودة الموحّدة للواجهة الرئيسية — يُغلق snap الملف فوراً
 * قبل أي setState/async حتى لا تبقى أزرار الملف قابلة للمس تحت الطبقات.
 */
export function returnToLawyerHomeDashboard({
    setActiveTab,
    closeHubShellOverlays,
    exitCriminalDossierToHome,
    dismissOverlays = true,
}: ReturnToLawyerHomeParams): void {
    snapProfileShellClose();
    exitCriminalDossierToHome?.();
    closeHubShellOverlays();
    setActiveTab('home');
    if (dismissOverlays) {
        queueMicrotask(() => dismissTransientOverlays());
    }
}
