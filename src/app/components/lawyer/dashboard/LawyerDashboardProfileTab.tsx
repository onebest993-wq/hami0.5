import React, { Suspense } from 'react';
import { LazyRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { LAWYER_PROFILE_FALLBACK } from '../LawyerDashboardParts/constants';

export type LawyerDashboardProfileTabProps = {
    visible: boolean;
    onBack: () => void;
};

export function LawyerDashboardProfileTab({ visible, onBack }: LawyerDashboardProfileTabProps) {
    if (!visible) return null;

    return (
        <div className="block">
            <div className="h-full">
                <Suspense fallback={LAWYER_PROFILE_FALLBACK}>
                    <LazyRoyalLawyerProfile isScreenMode onBack={onBack} />
                </Suspense>
            </div>
        </div>
    );
}
