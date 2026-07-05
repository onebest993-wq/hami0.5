import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { prefetchExecutionOverlayModals } from '../executionDashboardLazyRegistry';
import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

export type ExecutionDashboardPhoneBodyMountFlags = ExecutionShellOverlayModalFlags & {
    movableSeizureRequestModalOpen?: boolean;
    propertySeizureRequestModalOpen?: boolean;
    showExecutionFinancialHub?: boolean;
    showUnifiedSeizureLogModal?: boolean;
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

    const [secondaryStageReady, setSecondaryStageReady] = useState(false);
    const [tertiaryStageReady, setTertiaryStageReady] = useState(false);

    useEffect(() => {
        if (!tertiaryStageUrgent) return;
        setSecondaryStageReady(true);
        setTertiaryStageReady(true);
        prefetchExecutionOverlayModals();
    }, [tertiaryStageUrgent]);

    useEffect(() => {
        if (secondaryStageReady) return;
        return scheduleIdleWork(() => setSecondaryStageReady(true), 180);
    }, [secondaryStageReady]);

    useEffect(() => {
        if (!secondaryStageReady || tertiaryStageReady) return;
        return scheduleIdleWork(() => setTertiaryStageReady(true), 900);
    }, [secondaryStageReady, tertiaryStageReady]);

    return {
        secondaryStageReady,
        tertiaryStageReady,
        tertiaryStageUrgent,
    };
}
