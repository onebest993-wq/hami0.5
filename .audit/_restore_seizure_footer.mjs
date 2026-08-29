import fs from 'node:fs';

const helpersPath =
    'src/app/components/lawyer/ExecutionDashboard/components/unifiedSeizureLogEntryFooter/unifiedSeizureLogEntryFooterHelpers.tsx';
const helpers = fs.readFileSync(helpersPath, 'utf8').split(/\r?\n/);
const start = helpers.findIndex((l) => l.startsWith('function resolveExecutorDecisionRow'));
const body = helpers.slice(start).join('\n');

const header = `import React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, ThirdPartySeizure } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import { SeizedPropertyWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel';
import { SeizedMovableWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedMovableWorkflowPanel';
import { MovableSeizureInitInlineCard } from '@/app/components/lawyer/ExecutionDashboard/components/MovableSeizureInitInlineCard';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import {
    SalarySeizureLogDetailCard,
    type SalarySeizureDetailsPatch,
} from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import {
    ThirdPartySeizureRegistryCard,
    ThirdPartySeizureWorkflowCard,
} from '@/app/components/lawyer/execution/ThirdPartySeizureLogCards';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { SeizedAsset } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
    mergeSeizedAssetLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { isExecutionHandlerStubLeaf } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import { applySalarySeizureAssetDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSalarySeizurePatch';
import { buildSeizureAssetRowReleasePatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSeizureRowPatch';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    dispatchUnifiedSeizureLogFooterAction,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';

export type UnifiedSeizureLogEntryFooterProps = {
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: any[];
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
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<any[]>>;
    nextTimelineId: () => string;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    onLedgerRevision: () => void;
    beginThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    updateThirdPartyReceiveDraft: (assetId: string, v: string) => void;
    cancelThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    confirmThirdPartyReceive: (asset: SeizedAsset) => void;
};

`;

const restored = `${header}${body}\n`;
const out =
    'src/app/components/lawyer/ExecutionDashboard/components/UnifiedSeizureLogEntryFooter.tsx';
fs.writeFileSync(out, restored);
console.log('restored lines', restored.split(/\r?\n/).length);
console.log('has export function', restored.includes('export function UnifiedSeizureLogEntryFooter'));
console.log('has salaryAssetOverrides', restored.includes('salaryAssetOverrides'));
