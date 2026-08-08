import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type {
    ExecutionDashboardPhoneBodyDeferredScope,
    GraceTaskCard,
} from './ExecutionDashboardPhoneBodyDeferredScope';
import { ExecutionDashboardPhoneBodyQuaternaryPanels } from './ExecutionDashboardPhoneBodyQuaternaryPanels';
import { ExecutionDashboardPhoneBodyTertiaryPanels } from './ExecutionDashboardPhoneBodyTertiaryPanels';

export type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';

type ExecutionDashboardPhoneBodyDeferredPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    quaternaryStageReady: boolean;
    tertiaryStageReady: boolean;
    safeActiveGraceTasks: GraceTaskCard[];
    safeShouldShowGuarantorExternalHub: (value: unknown) => boolean;
    visitationFileNumber?: string;
    directOpenUnifiedSummonsHub: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    removeJudicialCustodianEntry: (id: string) => void;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    movableInlineSaveCtx: MovableInlineSaveContext;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => void | null;
    openGuarantorFollowupDetails: () => void;
    closeFinancialHubPortal: () => void;
    toggleFinancialCenterExpanded: () => void;
    directOpenPaymentCalculator: () => void;
    directOpenSettlementCalculator: () => void;
    directOpenLedgerModal: () => void;
    directOpenEvictionExpenseModal: () => void;
};

export function ExecutionDashboardPhoneBodyDeferredPanels({
    scope,
    quaternaryStageReady,
    tertiaryStageReady,
    safeActiveGraceTasks,
    safeShouldShowGuarantorExternalHub,
    visitationFileNumber,
    directOpenUnifiedSummonsHub,
    removeJudicialCustodianEntry,
    propertyInlineSaveCtx,
    movableInlineSaveCtx,
    saveSeizedMovableInitForDecision,
    openGuarantorFollowupDetails,
    closeFinancialHubPortal,
    toggleFinancialCenterExpanded,
    directOpenPaymentCalculator,
    directOpenSettlementCalculator,
    directOpenLedgerModal,
    directOpenEvictionExpenseModal,
}: ExecutionDashboardPhoneBodyDeferredPanelsProps) {
    return (
        <>
            <ExecutionDashboardPhoneBodyQuaternaryPanels
                scope={scope}
                quaternaryStageReady={quaternaryStageReady}
                safeActiveGraceTasks={safeActiveGraceTasks}
                safeShouldShowGuarantorExternalHub={safeShouldShowGuarantorExternalHub}
                visitationFileNumber={visitationFileNumber}
                directOpenUnifiedSummonsHub={directOpenUnifiedSummonsHub}
                removeJudicialCustodianEntry={removeJudicialCustodianEntry}
                openGuarantorFollowupDetails={openGuarantorFollowupDetails}
            />
            <ExecutionDashboardPhoneBodyTertiaryPanels
                scope={scope}
                tertiaryStageReady={tertiaryStageReady}
                propertyInlineSaveCtx={propertyInlineSaveCtx}
                movableInlineSaveCtx={movableInlineSaveCtx}
                saveSeizedMovableInitForDecision={saveSeizedMovableInitForDecision}
                closeFinancialHubPortal={closeFinancialHubPortal}
                toggleFinancialCenterExpanded={toggleFinancialCenterExpanded}
                openGuarantorFollowupDetails={openGuarantorFollowupDetails}
                directOpenPaymentCalculator={directOpenPaymentCalculator}
                directOpenSettlementCalculator={directOpenSettlementCalculator}
                directOpenLedgerModal={directOpenLedgerModal}
                directOpenEvictionExpenseModal={directOpenEvictionExpenseModal}
            />
        </>
    );
}
