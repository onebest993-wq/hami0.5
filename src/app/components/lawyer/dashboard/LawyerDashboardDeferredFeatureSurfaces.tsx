import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';
import { deferredFeatureBagFingerprint } from '@/app/components/lawyer/dashboard/deferredFeatureBagFingerprint';
import type {
    DeferredFeatureBag,
    LawyerDashboardDeferredFeatureSurfacesProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';

function DeferredFeatureSurfacesInner({
    params,
    onReady,
}: {
    params: LawyerDashboardDeferredFeatureSurfacesProps['params'];
    onReady: (bag: DeferredFeatureBag) => void;
}) {
    const transactions = useLawyerDashboardTransactions({
        userId: params.userId,
        setArchiveType: params.setArchiveType,
        setShowLawsuitsWorkspace: params.setShowLawsuitsWorkspace,
    });
    const profile = useLawyerDashboardProfileTab({
        userId: params.userId,
        activeTab: params.activeTab,
        setActiveTab: params.setActiveTab,
        setShowCommunity: params.setShowCommunity,
        closeSettings: params.closeSettings,
    });
    const fieldTasks = useLawyerDashboardFieldTasks({
        userId: params.userId,
        setActiveTab: params.setActiveTab,
        closeCommunity: params.closeCommunity,
    });
    const globalSearch = useLawyerDashboardGlobalSearch({ userId: params.userId });

    const globalSearchNav = useLawyerDashboardGlobalSearchNav({
        userId: params.userId,
        files: params.files,
        executionFiles: params.executionFiles,
        closeGlobalSearch: globalSearch.closeGlobalSearch,
        openNotifications: params.openNotifications,
        openProfileTab: params.openProfileTab,
        openScheduleTab: params.openScheduleTab,
        setActiveTab: params.setActiveTab,
        openCommunityTab: params.openCommunityTab,
        setCommunityDeepLink: params.setCommunityDeepLink,
        openUrgentInLawsuitsWorkspace: params.openUrgentInLawsuitsWorkspace,
        openCriminalCase: params.openCriminalCase,
        openTransactionsHub: params.openTransactionsHub,
        openTasksManager: fieldTasks.openTasksManager,
        openNotepad: params.openNotepad,
        openVaultModal: params.openVaultModal,
        setActiveFile: params.setActiveFile,
        selectCase: params.selectCase,
        onNavigateToCase: params.onNavigateToCase,
    });

    const bag: DeferredFeatureBag = {
        transactions,
        profile,
        fieldTasks,
        globalSearch,
        globalSearchNav,
    };

    const fingerprint = deferredFeatureBagFingerprint(bag);
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
 * hooks للأسطح غير الرئيسية — بعد boot-content-ready (أو earlyArm/forceArm لجلسة مستعادة).
 * المنتدى خارج هذه الجزيرة (حي في orchestration مثل الإعدادات).
 * تُحمَّل كـ chunk منفصل حتى لا تذوب في LawyerDashboard stem.
 * لا تُسلَّح على interactive — كان ينافس أول طلاء المنزل وكشف الشعار.
 */
export function LawyerDashboardDeferredFeatureSurfaces({
    earlyArm,
    forceArm,
    params,
    onReady,
}: LawyerDashboardDeferredFeatureSurfacesProps) {
    const [armed, setArmed] = useState(() => earlyArm || forceArm);

    useEffect(() => {
        if (forceArm) setArmed(true);
    }, [forceArm]);

    useEffect(() => {
        if (armed) return;
        return onBootContentReady(() => setArmed(true));
    }, [armed]);

    if (!armed) return null;

    return <DeferredFeatureSurfacesInner params={params} onReady={onReady} />;
}
