import type { InlineActionGateKey } from '../../types';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { EvictionRequestKind } from '@/app/utils/executorSeizureDecisionQueue';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import type { TimelineEvent } from '@/app/types/execution';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

export type EvictionProcedureExpandKey =
    | 'field_visit'
    | 'police'
    | 'break_inventory'
    | 'marital_furniture_delivery'
    | 'custodian'
    | 'forced_eviction';

export interface EvictionProceduresSectionProps {
    executionCoerciveButtonDisabled: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    gracePeriodEnded: boolean | null | undefined;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleEndGracePeriod: () => void;
    appendEvictionProcedure: (procedure: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
        supersedeCompletedHub?: boolean;
    }) => void;
    appendEvictionExecutorRequest: (request: {
        executionId: string;
        title: string;
        body: string;
        requestKind: EvictionRequestKind;
        evictionWorkflowKey?: EvictionExecutorWorkflowKey;
        supersedeCompletedHub?: boolean;
        executionData?: Record<string, unknown> | null;
    }) => boolean;
    decisionsStorageExecutionId: string;
    executionData?: Record<string, unknown> | null;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean },
    ) => void;
    EVICTION_TIMELINE_ACTION_IDS: {
        FIELD_VISIT: string;
        POLICE_FORCE: string;
        BREAK_INVENTORY: string;
        CUSTODIAN: string;
    };
    hideEncroachmentEvictionProcedureItems?: boolean;
    hideEvictionCustodianProcedure?: boolean;
    showGenericFieldProcedureCards?: boolean;
    showSpecificDeliveryBreakInventoryCard?: boolean;
    showSpecificDeliverySurveyorCard?: boolean;
    showSpecificDeliveryConversionCard?: boolean;
    specificDeliveryItemName?: string;
    specificDeliveryItemNature?: string | null;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    specificDeliveryFinancialized?: boolean;
    onSpecificDeliveryFinancialized?: (amount: number, itemId?: string) => void;
    onSpecificDeliveryItemDeclaredDestroyed?: (itemId: string) => void;
    onSpecificDeliveryExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
    openPoliceAssistanceDetails?: (input: { decisionId: string; requestTitle: string }) => void;
    savePoliceAssistance?: (input: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    saveBreakInventoryLedger?: (input: {
        decisionId: string;
        payload: BreakInventoryFurnitureSavePayload;
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: MaritalFurnitureItem[];
    onOpenDecisionsModal?: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
    saveJudicialCustodianDetails?: (input: {
        decisionId: string;
        name: string;
        salary: string;
    }) => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
    pushTimelineEvent?: (event: TimelineEvent) => void;
    nextTimelineId?: () => string;
    expandProcedureKey?: EvictionProcedureExpandKey | null;
    onExpandProcedureConsumed?: () => void;
}
