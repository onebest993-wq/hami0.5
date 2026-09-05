import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onLawyerDashboardFirstTabOpen } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type {
    LawyerDashboardRepositoryFeatureSurfacesProps,
    PreDockRepository,
} from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';

function repositoryFeatureFingerprint(repository: PreDockRepository): string {
    return [
        repository.repositorySessionKey,
        repository.isRepositoryOpen ? 1 : 0,
        repository.repositoryHostMounted ? 1 : 0,
        repository.repositoryTab,
        repository.vaultOpenScanner ? 1 : 0,
    ].join(':');
}

function RepositoryFeatureSurfacesInner({
    userId,
    onReady,
}: {
    userId: string | null;
    onReady: (repository: PreDockRepository) => void;
}) {
    const repository = useLawyerDashboardRepository({ userId });
    const fingerprint = repositoryFeatureFingerprint(repository);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const repositoryRef = useRef(repository);
    repositoryRef.current = repository;

    useLayoutEffect(() => {
        onReadyRef.current(repositoryRef.current);
    }, [fingerprint]);

    return null;
}

/**
 * خطاف المستودع فقط — جزيرة Vite منفصلة عن PreDock (منتدى+تقويم).
 * لمسة المستودع لا تنزّل مقاطع المنتدى/التقويم.
 */
export function LawyerDashboardRepositoryFeatureSurfaces({
    earlyArm,
    forceArm,
    userId,
    onReady,
}: LawyerDashboardRepositoryFeatureSurfacesProps) {
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

    return <RepositoryFeatureSurfacesInner userId={userId} onReady={onReady} />;
}
