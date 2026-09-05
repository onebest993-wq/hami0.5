import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';
import { deferredFeatureBagFingerprint } from '@/app/components/lawyer/dashboard/deferredFeatureBagFingerprint';
import type {
    DeferredFeatureBag,
    DeferredFieldTasks,
    LawyerDashboardDeferredFeatureSurfacesProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';

const noop = () => undefined;

/** شكل الحقيبة فقط — خطاف الميدان في جزيرة مستقلة */
const FIELD_TASKS_BAG_PLACEHOLDER: DeferredFieldTasks = {
    fieldTasksSheetSessionKey: 0,
    fieldTasksHostMounted: false,
    fieldTasksManagerHostMounted: false,
    fieldTasksSheetOpen: false,
    showTasksManager: false,
    tasksManagerFocusTaskId: undefined,
    tasksManagerSessionKey: 0,
    primeFieldTasksShellMount: noop,
    resetFieldTasksShell: noop,
    openFieldTasksSheet: noop,
    openTasksManager: noop,
    switchToTasksManager: noop,
    closeFieldTasksSheet: noop,
    closeTasksManager: noop,
};

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
    const globalSearch = useLawyerDashboardGlobalSearch({ userId: params.userId });

    const globalSearchNav = useLawyerDashboardGlobalSearchNav({
        userId: params.userId,
        files: params.files,
        executionFiles: params.executionFiles,
        criminalCases: params.criminalCases,
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
        openTasksManager: params.openTasksManager,
        openNotepad: params.openNotepad,
        openVaultModal: params.openVaultModal,
        setActiveFile: params.setActiveFile,
        selectCase: params.selectCase,
        onNavigateToCase: params.onNavigateToCase,
    });

    const bag: DeferredFeatureBag = {
        transactions,
        fieldTasks: FIELD_TASKS_BAG_PLACEHOLDER,
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
 * الملف المهني حي في orchestration (مثل الإعدادات) — ليس هنا.
 * المنتدى/التقويم/المستودع في PreDockFeatureSurfaces (بعد first-tab-open).
 * ستارة الميدان في FieldTasksFeatureSurfaces — لمسة المهام لا تجرّ المعاملات/البحث.
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
