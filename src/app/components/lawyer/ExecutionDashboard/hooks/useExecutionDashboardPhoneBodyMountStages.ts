import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { prefetchExecutionOverlayModals } from '../executionDashboardLazyRegistry';
import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

export type ExecutionDashboardPhoneBodyMountFlags = ExecutionShellOverlayModalFlags & {
    movableSeizureRequestModalOpen?: boolean;
    propertySeizureRequestModalOpen?: boolean;
    showExecutionFinancialHub?: boolean;
    showUnifiedSeizureLogModal?: boolean;
    showVisitationCalendarModal?: boolean;
};

/** يوزّع mount داخل جسم الإضبارة على موجات قصيرة بدل تجميعها عند أول رسم */
export function useExecutionDashboardPhoneBodyMountStages(
    flags: ExecutionDashboardPhoneBodyMountFlags,
) {
    const tertiaryStageUrgent = useMemo(
        () =>
            Boolean(
                flags.showExecutionFinancialHub ||
                    flags.showUnifiedSeizureLogModal ||
                    flags.propertySeizureRequestModalOpen ||
                    flags.movableSeizureRequestModalOpen,
            ),
        [flags],
    );

    const [secondaryStageReady, setSecondaryStageReady] = useState(true);
    const [tertiaryStageReady, setTertiaryStageReady] = useState(false);
    const [quaternaryStageReady, setQuaternaryStageReady] = useState(false);

    const quaternaryStageUrgent = useMemo(
        () => Boolean(flags.showVisitationCalendarModal),
        [flags.showVisitationCalendarModal],
    );

    useEffect(() => {
        if (!tertiaryStageUrgent) return;
        setSecondaryStageReady(true);
        setTertiaryStageReady(true);
        setQuaternaryStageReady(true);
        prefetchExecutionOverlayModals();
    }, [tertiaryStageUrgent]);

    useEffect(() => {
        if (!quaternaryStageUrgent) return;
        setQuaternaryStageReady(true);
    }, [quaternaryStageUrgent]);

    useEffect(() => {
        if (secondaryStageReady) return;
        return scheduleIdleWork(() => setSecondaryStageReady(true), 0);
    }, [secondaryStageReady]);

    useEffect(() => {
        if (!secondaryStageReady || tertiaryStageReady) return;
        return scheduleIdleWork(() => setTertiaryStageReady(true), 900);
    }, [secondaryStageReady, tertiaryStageReady]);

    useEffect(() => {
        if (!tertiaryStageReady || quaternaryStageReady) return;
        return scheduleIdleWork(() => setQuaternaryStageReady(true), 1_800);
    }, [tertiaryStageReady, quaternaryStageReady]);

    return {
        secondaryStageReady,
        tertiaryStageReady,
        quaternaryStageReady,
        tertiaryStageUrgent,
        quaternaryStageUrgent,
    };
}
