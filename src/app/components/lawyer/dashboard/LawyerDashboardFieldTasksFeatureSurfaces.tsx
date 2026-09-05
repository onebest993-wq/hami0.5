import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import type { DeferredFieldTasks } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import type { LawyerDashboardFieldTasksFeatureSurfacesProps } from '@/app/components/lawyer/dashboard/LawyerDashboardFieldTasksFeatureSurfaces.types';

function fieldTasksFeatureFingerprint(fieldTasks: DeferredFieldTasks): string {
    return [
        fieldTasks.fieldTasksSheetOpen ? 1 : 0,
        fieldTasks.fieldTasksHostMounted ? 1 : 0,
        fieldTasks.showTasksManager ? 1 : 0,
        fieldTasks.fieldTasksManagerHostMounted ? 1 : 0,
        fieldTasks.fieldTasksSheetSessionKey,
        fieldTasks.tasksManagerSessionKey,
        fieldTasks.tasksManagerFocusTaskId ?? '',
    ].join(':');
}

function FieldTasksFeatureSurfacesInner({
    params,
    onReady,
}: {
    params: LawyerDashboardFieldTasksFeatureSurfacesProps['params'];
    onReady: (fieldTasks: DeferredFieldTasks) => void;
}) {
    const fieldTasks = useLawyerDashboardFieldTasks({
        userId: params.userId,
        setActiveTab: params.setActiveTab,
        closeCommunity: params.closeCommunity,
    });
    const fingerprint = fieldTasksFeatureFingerprint(fieldTasks);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const fieldTasksRef = useRef(fieldTasks);
    fieldTasksRef.current = fieldTasks;

    useLayoutEffect(() => {
        onReadyRef.current(fieldTasksRef.current);
    }, [fingerprint]);

    return null;
}

/**
 * خطاف ستارة الميدان فقط — جزيرة Vite منفصلة عن Deferred (معاملات+بحث).
 * لمسة المهام لا تنزّل مقاطع المعاملات/البحث الشامل.
 */
export function LawyerDashboardFieldTasksFeatureSurfaces({
    earlyArm,
    forceArm,
    params,
    onReady,
}: LawyerDashboardFieldTasksFeatureSurfacesProps) {
    const [armed, setArmed] = useState(() => earlyArm || forceArm);

    useEffect(() => {
        if (forceArm) setArmed(true);
    }, [forceArm]);

    useEffect(() => {
        if (armed) return;
        return onBootContentReady(() => setArmed(true));
    }, [armed]);

    if (!armed) return null;

    return <FieldTasksFeatureSurfacesInner params={params} onReady={onReady} />;
}
