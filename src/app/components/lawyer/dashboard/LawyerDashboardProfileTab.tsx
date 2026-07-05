import { useProfileTabMobileSuspend } from '@/app/hooks/lawyerDashboard/useProfileTabMobileSuspend';
import { RoyalLawyerProfileHost } from '@/app/components/lawyer/dashboard/profile/RoyalLawyerProfileHost';

export type LawyerDashboardProfileTabProps = {
    visible: boolean;
    sessionKey: number;
    perfOpenEpoch?: number;
    onBack: () => void;
};

export function LawyerDashboardProfileTab({
    visible,
    sessionKey,
    perfOpenEpoch,
    onBack,
}: LawyerDashboardProfileTabProps) {
    useProfileTabMobileSuspend(visible);

    if (!visible) {
        return null;
    }

    return (
        <div className="h-full" data-testid="lawyer-profile-tab-shell" aria-hidden={!visible}>
            <RoyalLawyerProfileHost
                key={`lawyer-profile-tab-${sessionKey}`}
                isScreenMode
                perfOpenEpoch={perfOpenEpoch}
                screenActive={visible}
                onBack={onBack}
            />
        </div>
    );
}
