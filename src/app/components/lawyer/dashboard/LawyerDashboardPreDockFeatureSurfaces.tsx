import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onLawyerDashboardFirstTabOpen } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type {
    LawyerDashboardPreDockFeatureSurfacesProps,
    PreDockFeatureBag,
} from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';

function preDockFeatureBagFingerprint(bag: PreDockFeatureBag): string {
    return [
        bag.community.communitySessionKey,
        bag.community.showCommunity ? 1 : 0,
        bag.community.communityHostMounted ? 1 : 0,
        bag.schedule.scheduleTabSessionKey,
        bag.schedule.scheduleHostMounted ? 1 : 0,
        bag.repository.repositorySessionKey,
        bag.repository.isRepositoryOpen ? 1 : 0,
        bag.repository.repositoryHostMounted ? 1 : 0,
    ].join(':');
}

function PreDockFeatureSurfacesInner({
    params,
    onReady,
}: {
    params: LawyerDashboardPreDockFeatureSurfacesProps['params'];
    onReady: (bag: PreDockFeatureBag) => void;
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
    const repository = useLawyerDashboardRepository({
        userId: params.userId,
    });

    const bag: PreDockFeatureBag = { community, schedule, repository };
    const fingerprint = preDockFeatureBagFingerprint(bag);
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
 * منتدى/تقويم/مستودع — بعد first-tab-open (أو earlyArm لجلسة مستعادة).
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
