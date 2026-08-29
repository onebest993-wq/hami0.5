import { useProfileTabMobileSuspend } from '@/app/hooks/lawyerDashboard/useProfileTabMobileSuspend';
import { RoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/index';

type LawyerDashboardProfileTabProps = {
    visible: boolean;
    perfOpenEpoch?: number;
    onBack: () => void;
    /** مركّب مخفياً لتسخين شجرة الملف قبل الظهور */
    keepAlive?: boolean;
};

/**
 * تبويب الملف المهني — مع keepAlive تبقى الشجرة مركّبة (screenActive)
 * والظهور عبر سطح التبويب + html[data-hami-profile-open] فقط.
 *
 * لا useOpaqueFeatureSurface هنا: كان يضبط data-hami-feature-open فيخفي
 * غطاء الرئيسية ويصارع عقد الـ snap → وميض أسود عند الخروج.
 */
export function LawyerDashboardProfileTab({
    visible,
    perfOpenEpoch,
    onBack,
    keepAlive = false,
}: LawyerDashboardProfileTabProps) {
    useProfileTabMobileSuspend(visible);

    if (!visible && !keepAlive) {
        return null;
    }

    return (
        <div
            className="h-full min-h-[100dvh] overflow-y-auto overscroll-y-none touch-pan-y scrollbar-hide"
            data-testid="lawyer-profile-tab-shell"
            aria-hidden={!visible}
            style={{
                overscrollBehavior: 'none',
                WebkitOverflowScrolling: 'touch',
                overflowAnchor: 'none',
            }}
        >
            <RoyalLawyerProfile
                isScreenMode
                perfOpenEpoch={perfOpenEpoch}
                screenActive={visible}
                onBack={onBack}
            />
        </div>
    );
}
