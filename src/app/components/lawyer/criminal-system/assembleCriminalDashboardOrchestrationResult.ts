import type { CriminalDashboardDossierBodyProps } from './CriminalDashboardDossierBody';
import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import type { CriminalCase, CriminalStoreState } from './criminalStore';

export type CriminalDashboardOrchestrationResult = {
    isCaseHydrating: boolean;
    isMissingCase: boolean;
    missingRecoveryDone: boolean;
    criminalCase: CriminalCase | undefined;
    legalToast: string;
    dossierBodyProps: CriminalDashboardDossierBodyProps;
    modalsHostProps: CriminalDashboardModalsHostProps;
    modalsHostMounted: boolean;
    forceModalsHost: boolean;
    isInlineSeveranceFormOpen: boolean;
    pendingSeveranceContext: CriminalStoreState['pendingSeveranceContext'];
    closeInlineSeveranceForm: () => void;
    setIsInlineSeveranceFormOpen: (open: boolean) => void;
};

/** تجميع ناتج orchestration الإضبارة — نقطة واحدة للاختبار والتوسعة. */
export function assembleCriminalDashboardOrchestrationResult(
    input: CriminalDashboardOrchestrationResult,
): CriminalDashboardOrchestrationResult {
    return input;
}
