import React from 'react';
import type { CoerciveTabProps } from './CoerciveTab.types';
import type { EvictionFieldProceduresPanelProps } from '@/app/components/lawyer/execution/evictionField';
import type { EvictionPremisesUse, EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

type EvictionPanelProps = Pick<
    CoerciveTabProps,
    | 'evictionProcedureLocked'
    | 'evictionProcedureLockHint'
    | 'activeTimelineEvents'
    | 'evictionPremisesUseResolved'
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'showResidentialEvictionGraceControl'
    | 'residentialGracePeriodSaved'
    | 'openEvictionResidentialGraceModal'
    | 'showResidentialGraceEarlyEndRequest'
    | 'showBreakInventoryRequest'
    | 'showEvictionFieldworkRequests'
    | 'evictionHeirsNotificationDateYmd'
    | 'handleEvictionHeirsNotificationDateChange'
    | 'handleIssueHeirsExecutionNoticeMemo'
    | 'tryOpenPendingBreakInventoryLedger'
    | 'tryOpenPendingCustodianDetails'
    | 'saveJudicialCustodianDetails'
    | 'openPoliceAssistanceDetails'
    | 'savePoliceAssistance'
    | 'saveBreakInventoryLedger'
    | 'finalizeBreakInventoryRequest'
    | 'isMaritalFurnitureClaim'
    | 'maritalFurnitureItems'
    | 'saveMaritalFurnitureDeliveryInventory'
> & {
    EvictionFieldPanel: React.ComponentType<EvictionFieldProceduresPanelProps> & {
        isPreloaded?: () => boolean;
    };
    recordEvictionTimelineAction: (input: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
    }) => void;
};

export function CoerciveTabEvictionPanel({
    EvictionFieldPanel,
    recordEvictionTimelineAction,
    evictionProcedureLocked,
    evictionProcedureLockHint,
    activeTimelineEvents,
    evictionPremisesUseResolved,
    decisionsStorageExecutionId,
    executionData,
    showResidentialEvictionGraceControl,
    residentialGracePeriodSaved = false,
    openEvictionResidentialGraceModal,
    showResidentialGraceEarlyEndRequest,
    showBreakInventoryRequest = true,
    showEvictionFieldworkRequests = true,
    evictionHeirsNotificationDateYmd,
    handleEvictionHeirsNotificationDateChange,
    handleIssueHeirsExecutionNoticeMemo,
    tryOpenPendingBreakInventoryLedger,
    tryOpenPendingCustodianDetails,
    saveJudicialCustodianDetails,
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
}: EvictionPanelProps) {
    return (
        <PreloadableOverlayGate
            lazy={EvictionFieldPanel}
            lazyProps={{
                locked: evictionProcedureLocked,
                lockHint: evictionProcedureLockHint,
                timelineEvents: activeTimelineEvents,
                premisesUse: evictionPremisesUseResolved as EvictionPremisesUse,
                decisionsStorageExecutionId,
                executionData: (executionData ?? null) as Record<string, unknown> | null,
                showResidentialEvictionGraceButton: showResidentialEvictionGraceControl,
                residentialGracePeriodSaved,
                onResidentialEvictionGraceClick: openEvictionResidentialGraceModal,
                showResidentialGraceEarlyEndRequest,
                showBreakInventoryRequest,
                showEvictionFieldworkRequests,
                showDebtorHeirsEvictionTools: false,
                heirsNotificationDateYmd: evictionHeirsNotificationDateYmd,
                onHeirsNotificationDateYmdChange: handleEvictionHeirsNotificationDateChange,
                onIssueHeirsExecutionNoticeMemo: handleIssueHeirsExecutionNoticeMemo,
                onRecordAction: recordEvictionTimelineAction,
                tryOpenPendingBreakInventoryLedger,
                tryOpenPendingCustodianDetails,
                saveJudicialCustodianDetails,
                openPoliceAssistanceDetails,
                savePoliceAssistance,
                saveBreakInventoryLedger,
                finalizeBreakInventoryRequest,
                isMaritalFurnitureClaim,
                maritalFurnitureItems,
                saveMaritalFurnitureDeliveryInventory,
            }}
            fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
        />
    );
}
