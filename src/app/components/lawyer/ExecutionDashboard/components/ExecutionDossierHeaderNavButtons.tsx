import React from 'react';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';

export type ExecutionDossierHeaderNavButtonsProps = {
    onBack?: () => void;
    onExit: () => void;
    showBack?: boolean;
};

/** زرّ رجوع تدريجي + زرّ مغادرة نهائية — موحّد لكل إضابير التنفيذ */
export function ExecutionDossierHeaderNavButtons({
    onBack,
    onExit,
    showBack = true,
}: ExecutionDossierHeaderNavButtonsProps) {
    return (
        <DossierHeaderNavButtons
            onBack={onBack}
            onExit={onExit}
            showBack={showBack}
            backTestId={EXECUTION_DOSSIER_TEST_IDS.back}
            exitTestId={EXECUTION_DOSSIER_TEST_IDS.close}
        />
    );
}
