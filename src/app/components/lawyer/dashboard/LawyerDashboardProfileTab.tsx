import { Suspense } from 'react';
import { useProfileTabMobileSuspend } from '@/app/hooks/lawyerDashboard/useProfileTabMobileSuspend';
import { LazyRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { LawyerProfileTabLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';

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

    if (!visible) return null;

    return (
        <div className="h-full" data-testid="lawyer-profile-tab-shell">
            <Suspense fallback={<LawyerProfileTabLoadingFallback onBack={onBack} />}>
                <LazyRoyalLawyerProfile
                    key={`lawyer-profile-tab-${sessionKey}`}
                    isScreenMode
                    perfOpenEpoch={perfOpenEpoch}
                    screenActive
                    onBack={onBack}
                />
            </Suspense>
        </div>
    );
}
