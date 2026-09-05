import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onLawyerDashboardFirstTabOpen } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import type {
    LawyerDashboardPreDockFeatureSurfacesProps,
    PreDockLiveBag,
} from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';

function preDockLiveBagFingerprint(bag: PreDockLiveBag): string {
    return [
        bag.community.communitySessionKey,
        bag.community.showCommunity ? 1 : 0,
        bag.community.communityHostMounted ? 1 : 0,
        bag.schedule.scheduleTabSessionKey,
        bag.schedule.scheduleHostMounted ? 1 : 0,
    ].join(':');
}

function PreDockFeatureSurfacesInner({
    params,
    onReady,
}: {
    params: LawyerDashboardPreDockFeatureSurfacesProps['params'];
    onReady: (bag: PreDockLiveBag) => void;
}) {
    const community = useLawyerDashboardCommunity({
        userId: params.userId,
        activeTab: params.activeTab,
    });
    const schedule = useLawyerDashboardScheduleTab({
        userId: params.userId,
        activeTab: params.activeTab,
        setActiveTab: params.setActiveTab,
    });

    const bag: PreDockLiveBag = { community, schedule };
    const fingerprint = preDockLiveBagFingerprint(bag);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const bagRef = useRef(bag);
    bagRef.current = bag;

    useLayoutEffect(() => {
        onReadyRef.current(bagRef.current);
    }, [fingerprint]);

    return null;
}

/**
 * منتدى/تقويم فقط — بعد first-tab-open (أو earlyArm لجلسة مستعادة).
 * المستودع في `LawyerDashboardRepositoryFeatureSurfaces` حتى لا تجرّ لمسته المنتدى/التقويم.
 * لا يُسلَّح على interactive — كان ينافس أول طلاء المنزل.
 */
export function LawyerDashboardPreDockFeatureSurfaces({
    earlyArm,
    forceArm,
    params,
    onReady,
}: LawyerDashboardPreDockFeatureSurfacesProps) {
    const [armed, setArmed] = useState(() => earlyArm || forceArm);

    useEffect(() => {
        if (forceArm) setArmed(true);
    }, [forceArm]);

    useEffect(() => {
        if (armed) return;
        return onLawyerDashboardFirstTabOpen(() => {
            queueMicrotask(() => setArmed(true));
        });
    }, [armed]);

    if (!armed) return null;

    return <PreDockFeatureSurfacesInner params={params} onReady={onReady} />;
}
