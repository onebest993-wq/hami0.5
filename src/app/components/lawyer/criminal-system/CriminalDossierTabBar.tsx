import React from 'react';
import type { CaseStage } from '@/app/types/criminal';
import { prefetchCriminalDashboardTab } from './criminalDashboardLazyRegistry';
import {
    criminalDashboardTabClass,
    CRIMINAL_DASHBOARD_TAB_LABELS,
    resolveCriminalDashboardTabLabel,
    type CriminalDashboardTab,
} from './criminalDashboardTabChrome';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

export type CriminalDossierTabBarProps = {
    caseStage: CaseStage;
    activeTab: CriminalDashboardTab;
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
};

/**
 * شريط تبويبات الإضبارة الجزائية — مستخرَج حرفياً من CriminalDashboardDossierBody
 * (صفر تغيير بصري؛ الـ prefetch والكلاس والـ testids كما هي).
 */
export function CriminalDossierTabBar({
    caseStage,
    activeTab,
    switchDashboardTab,
}: CriminalDossierTabBarProps) {
    return (
        <div className="max-w-5xl mx-auto w-full px-6 pb-1 print:hidden">
            <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => switchDashboardTab('requests')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('requests')}
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.tabRequests}
                    className={criminalDashboardTabClass('requests', activeTab === 'requests')}
                >
                    {resolveCriminalDashboardTabLabel('requests', caseStage)}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('statements')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('statements')}
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.tabStatements}
                    className={criminalDashboardTabClass('statements', activeTab === 'statements')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.statements}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('tracking')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('tracking')}
                    className={criminalDashboardTabClass('tracking', activeTab === 'tracking')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.tracking}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('legal_codes')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('legal_codes')}
                    className={criminalDashboardTabClass('legal_codes', activeTab === 'legal_codes')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.legal_codes}
                </button>
            </div>
        </div>
    );
}
