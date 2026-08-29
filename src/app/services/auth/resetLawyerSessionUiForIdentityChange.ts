import { setLawyerProfileBootWarmPending } from '@/app/services/profile/profileBootWarmPending';
import { resetUserIdentityUiState } from '@/app/services/profile/userIdentityUiState';

/**
 * عند تبديل هوية الجلسة: يصفّر تجميد الاسم/الصورة وستارة المنتدى العالقة.
 * لا يُستدعى عند أول ملء من null → حساب (حتى لا يُمسح كروم الإقلاع).
 */
export function resetLawyerSessionUiForIdentityChange(): void {
    resetUserIdentityUiState();
    setLawyerProfileBootWarmPending(false);

    if (typeof window === 'undefined') return;

    queueMicrotask(() => {
        void import('@/app/runtime/overlayHubLayerSpecs')
            .then(async ({ FORUM_HUB_LAYER }) => {
                const motion = await import('@/app/runtime/overlayHubLayerMotion');
                motion.clearHubLayerEnter(FORUM_HUB_LAYER);
                motion.clearHubLayerClosing(FORUM_HUB_LAYER);
            })
            .catch(() => undefined);
        void import('@/app/runtime/forumInstantPaint')
            .then((m) => {
                m.concealForumWarmShell();
            })
            .catch(() => undefined);
        void import('@/app/hooks/lawyerDashboard/community/communityShellOpenFlow')
            .then((m) => {
                m.resetCommunityOpenFlow();
            })
            .catch(() => undefined);
    });
}
