import { prefetchProfileHubModule, resetProfileHubModuleCacheForTests } from '@/app/runtime/profileHubLoader';

/** shell تبويب الملف — يحمّل hub التبويب + الواجهة */
export function prefetchLawyerDashboardProfileTabShell(): void {
    prefetchProfileHubModule();
}

export function resetLawyerDashboardProfileTabShellForTests(): void {
    resetProfileHubModuleCacheForTests();
}
