import { useProfileTabMobileSuspend } from '@/app/hooks/lawyerDashboard/useProfileTabMobileSuspend';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { RoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile';

export type LawyerDashboardProfileTabProps = {
    visible: boolean;
    sessionKey: number;
    perfOpenEpoch?: number;
    onBack: () => void;
    /** مركّب مخفياً لتسخين شجرة الملف قبل الظهور */
    keepAlive?: boolean;
};

/**
 * تبويب الملف المهني — مع keepAlive تبقى الشجرة مركّبة (screenActive)
 * والظهور عبر سطح التبويب فقط (مثل الإعدادات).
 */
export function LawyerDashboardProfileTab({
    visible,
    sessionKey,
    perfOpenEpoch,
    onBack,
    keepAlive = false,
}: LawyerDashboardProfileTabProps) {
    useProfileTabMobileSuspend(visible);
    useOpaqueFeatureSurface(visible, '#020408');

    if (!visible && !keepAlive) {
        return null;
    }

    return (
        <div
            className="h-full overflow-y-auto overscroll-y-none touch-pan-y"
            data-testid="lawyer-profile-tab-shell"
            aria-hidden={!visible}
            style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
        >
            <RoyalLawyerProfile
                key={`lawyer-profile-tab-${sessionKey}`}
                isScreenMode
                perfOpenEpoch={perfOpenEpoch}
                screenActive={visible}
                onBack={onBack}
            />
        </div>
    );
}
