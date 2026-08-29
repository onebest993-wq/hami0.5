import React from 'react';
import { ConsolidationNavBar } from '@/app/components/lawyer/smart-modal/parts/ConsolidationNavBar';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'dossier'>;

/**
 * شريط توحيد/ربط الدعاوى — على MainView كسولاً.
 * الشريط CSS فقط؛ لا مكتبة حركة على مدخل الطبقة.
 */
export function LawyerDashboardConsolidationNavOverlayEntry({
    dossier,
}: Props): React.ReactElement | null {
    const { consolidationSpawnNav } = dossier;

    if (!consolidationSpawnNav) return null;

    return (
        <ConsolidationNavBar
            primaryCaseNo={consolidationSpawnNav.primaryCaseNo}
            secondaryLabel="الدعوى الثانية (جديدة)"
            activeView={consolidationSpawnNav.activeView}
            onSelectPrimary={consolidationSpawnNav.onSelectPrimary}
            onSelectSecondary={consolidationSpawnNav.onSelectSecondary}
        />
    );
}
