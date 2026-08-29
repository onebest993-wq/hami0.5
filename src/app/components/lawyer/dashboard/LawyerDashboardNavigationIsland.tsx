import React, { useLayoutEffect, useRef } from 'react';
import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import { useAfterFirstTabOpen } from '@/app/hooks/lawyerDashboard/useAfterFirstTabOpen';
import type { LawyerDashboardNavigationIslandProps } from '@/app/components/lawyer/dashboard/LawyerDashboardNavigationIsland.types';

function NavigationIslandInner({
    params,
    onReady,
}: LawyerDashboardNavigationIslandProps) {
    const bag = useLawyerDashboardNavigation(params);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const bagRef = useRef(bag);
    bagRef.current = bag;

    useLayoutEffect(() => {
        onReadyRef.current(bagRef.current);
    }, [bag.handleNotificationRouting, bag.openSecretaryAlert, bag.navigateWorkspaceRoute]);

    return null;
}

/**
 * تنقّل اللوحة — بعد first-tab-open فقط.
 * كان sync في orchestration فيسحب execution/archive contracts قبل أول طلاء المنزل.
 */
export function LawyerDashboardNavigationIsland(props: LawyerDashboardNavigationIslandProps) {
    const afterFirstTabOpen = useAfterFirstTabOpen();
    if (!afterFirstTabOpen) return null;
    return <NavigationIslandInner {...props} />;
}
