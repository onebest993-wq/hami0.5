import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';

/**
 * تحميل مسبق خفيف بعد جاهزية chunk اللوحة — تبويب الرئيسية فقط.
 * Header / Dock / HubCard تُؤجَّل إلى scheduleLawyerShellPrefetch (post-interactive idle).
 */
export function prefetchLawyerDashboardInteractiveShell(): void {
    if (typeof window === 'undefined') return;
    prefetchLawyerHomeTabModule();
}
