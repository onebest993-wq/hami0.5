import React from 'react';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';

export type ExecutionDossierHeaderNavButtonsProps = {
    onBack?: () => void;
    onExit: () => void;
    nestedNavigation?: boolean;
};

/** زرّ رجوع تدريجي + زرّ مغادرة نهائية — موحّد لكل إضابير التنفيذ */
export function ExecutionDossierHeaderNavButtons({
    onBack,
    onExit,
    nestedNavigation = false,
}: ExecutionDossierHeaderNavButtonsProps) {
    const nav = resolveDossierHeaderNavVisibility(nestedNavigation);

    return (
        <DossierHeaderNavButtons
            onBack={onBack}
            onExit={onExit}
            showBack={nav.showBack}
            showExit={nav.showExit}
            backTestId={EXECUTION_DOSSIER_TEST_IDS.back}
            exitTestId={EXECUTION_DOSSIER_TEST_IDS.close}
        />
    );
}
