import type React from 'react';
import type {
    ExecutionFile,
    SeizedMovable,
    SeizedProperty,
    ThirdPartySeizure,
    SeizedAsset,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SalarySeizureDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';

export type UnifiedSeizureLogEntryFooterProps = {
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: ThirdPartySeizureAsset[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
    thirdPartyFundsDraftById: Record<string, string>;
    setThirdPartyFundsDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setThirdPartySeizuresUi: React.Dispatch<React.SetStateAction<ThirdPartySeizure[]>>;
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionData?: ExecutionFile | null;
    seizureLogExecutorDecisions: Array<Record<string, unknown>>;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    decisionsReloadEpoch: number;
    appealPerspective: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    focusSeizurePropertyInlineCompletion: (decisionId: string, title: string) => void;
    focusSeizureMovableInlineCompletion: (decisionId: string, title: string) => void;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
    movableInlineSaveCtx: MovableInlineSaveContext;
    followupSalarySeizureLabel: string;
    activeDebtorIsDeceased?: boolean;
    patchSalarySeizureAssetDetails: (assetId: string, patch: SalarySeizureDetailsPatch) => void;
    releaseSeizureAssetRow: (asset: SeizedAsset) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    onLedgerRevision: () => void;
    beginThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    updateThirdPartyReceiveDraft: (assetId: string, v: string) => void;
    cancelThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    confirmThirdPartyReceive: (asset: SeizedAsset) => void;
};
