import { useEffect, useMemo } from 'react';
import {
    prefetchMaritalFurnitureModule,
    prefetchVisitationScheduleModule,
} from '../executionDashboardLazyRegistryShell';
import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

export type ExecutionDashboardPhoneBodyMountFlags = ExecutionShellOverlayModalFlags & {
    movableSeizureRequestModalOpen?: boolean;
    propertySeizureRequestModalOpen?: boolean;
    showExecutionFinancialHub?: boolean;
    isVisitationClaim?: boolean;
    isMaritalFurnitureClaim?: boolean;
};

/**
 * جسم الإضبارة جاهز بموجاته معاً — التأخير 900/1800 كان يُظهر بلاطات تنبثق أمام المستخدم.
 * التسخين العاجل للمركز المالي / الزيارة / الأثاث يبقى عند فتح تلك الأسطح.
 */
export function useExecutionDashboardPhoneBodyMountStages(
    flags: ExecutionDashboardPhoneBodyMountFlags,
) {
    const tertiaryStageUrgent = useMemo(
        () =>
            Boolean(
                flags.showExecutionFinancialHub ||
                    flags.propertySeizureRequestModalOpen ||
                    flags.movableSeizureRequestModalOpen,
            ),
        [flags],
    );

    const quaternaryStageUrgent = useMemo(
        () =>
            Boolean(
                flags.isVisitationClaim ||
                    flags.isMaritalFurnitureClaim,
            ),
        [flags.isVisitationClaim, flags.isMaritalFurnitureClaim],
    );

    useEffect(() => {
        if (!tertiaryStageUrgent) return;
        if (flags.showExecutionFinancialHub) {
            void import('../executionDashboardOverlayPrefetch')
                .then((m) => {
                    m.prefetchExecutionFinanceOverlay({ force: true });
                })
                .catch(() => undefined);
        }
        if (flags.propertySeizureRequestModalOpen || flags.movableSeizureRequestModalOpen) {
            void import('../executionDashboardSeizureRequestSubjectModalLazy')
                .then((m) => m.LazySeizureRequestSubjectModal.preload())
                .catch(() => undefined);
        }
    }, [
        tertiaryStageUrgent,
        flags.showExecutionFinancialHub,
        flags.propertySeizureRequestModalOpen,
        flags.movableSeizureRequestModalOpen,
    ]);

    useEffect(() => {
        if (!quaternaryStageUrgent) return;
        if (flags.isVisitationClaim) {
            prefetchVisitationScheduleModule();
        }
        if (flags.isMaritalFurnitureClaim) {
            prefetchMaritalFurnitureModule();
        }
    }, [quaternaryStageUrgent, flags.isVisitationClaim, flags.isMaritalFurnitureClaim]);

    return {
        secondaryStageReady: true,
        tertiaryStageReady: true,
        quaternaryStageReady: true,
        tertiaryStageUrgent,
        quaternaryStageUrgent,
    };
}
