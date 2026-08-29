import fs from 'node:fs';
import path from 'node:path';

const base = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/components',
);
const srcPath = path.join(base, 'UnifiedSeizureLogEntryFooter.tsx');
const outDir = path.join(base, 'unifiedSeizureLogEntryFooter');
fs.mkdirSync(outDir, { recursive: true });
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const exportIdx = lines.findIndex((l) =>
    l.startsWith('export function UnifiedSeizureLogEntryFooter'),
);
if (exportIdx < 0) throw new Error('export function not found');
console.log('export at line', exportIdx + 1, 'total', lines.length);

const typesFile = `import type React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, ThirdPartySeizure, SeizedAsset } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SalarySeizureDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';

${slice(47, 84)}
`;

// helpers only: from resolveExecutor through end of resolveMovableInlineSaveCtx (line before export)
const helpersRaw = slice(86, exportIdx);
const helpersFile = `import React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { isExecutionHandlerStubLeaf } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import { dispatchUnifiedSeizureLogFooterAction } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';

${helpersRaw
    .replace(/^function /gm, 'export function ')
    .replace(/^function Seizure/gm, 'export function Seizure')}
`;

const markers = {
    property: lines.findIndex((l) => l.includes("entry.id.startsWith('property:')")),
    movableEntity: lines.findIndex((l) =>
        l.includes("entry.id.startsWith('movable_entity:')"),
    ),
    salaryDecision: lines.findIndex((l) =>
        l.includes("entry.id.startsWith('salary_decision:')"),
    ),
};
console.log(markers);

const ctxTypeFile = `import type React from 'react';
import type { SeizedMovable, SeizedProperty, SeizedAsset, ThirdPartySeizure } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { UnifiedSeizureLogEntryFooterProps } from './UnifiedSeizureLogEntryFooterProps';

export type UnifiedSeizureLogFooterBranchCtx = {
    props: UnifiedSeizureLogEntryFooterProps;
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: any[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
    movableInlineSaveCtx: MovableInlineSaveContext;
    salaryAssetOverrides: Record<string, SeizedAsset>;
    setSalaryAssetOverrides: React.Dispatch<React.SetStateAction<Record<string, SeizedAsset>>>;
};
`;

const propertyBranchesBody = slice(markers.property + 1, markers.movableEntity);
const movableBranchesBody = slice(markers.movableEntity + 1, markers.salaryDecision);
const salaryBranchesBody = slice(markers.salaryDecision + 1, lines.length - 1);

const indent = (body) =>
    body
        .split('\n')
        .map((l) => (l.length ? `    ${l}` : l))
        .join('\n');

const propertyFile = `import React from 'react';
import type { SeizedProperty, SeizedAsset } from '@/app/types/execution';
import { SeizedPropertyWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
    inferSeizureWorkflowStatusFromLogEntry,
    inferPropertyWorkflowStatus,
    SeizureWorkflowLoadingShell,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderPropertySeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const { props, entry, seizedPropertiesForSeizureLog, realEstateSeizureRegistryAssets } = ctx;
${indent(propertyBranchesBody)}
    return undefined;
}
`;

const movableFile = `import React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import { SeizedMovableWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedMovableWorkflowPanel';
import { MovableSeizureInitInlineCard } from '@/app/components/lawyer/ExecutionDashboard/components/MovableSeizureInitInlineCard';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
    inferMovableWorkflowStatus,
    SeizureWorkflowLoadingShell,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderMovableSeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const { props, entry, seizedMovablesForSeizureLog, movableInlineSaveCtx } = ctx;
${indent(movableBranchesBody)}
    return undefined;
}
`;

const salaryFile = `import React from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import {
    SalarySeizureLogDetailCard,
} from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import {
    ThirdPartySeizureRegistryCard,
    ThirdPartySeizureWorkflowCard,
} from '@/app/components/lawyer/execution/ThirdPartySeizureLogCards';
import {
    mergeSeizedAssetLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import {
    coalesceDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { applySalarySeizureAssetDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSalarySeizurePatch';
import { buildSeizureAssetRowReleasePatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSeizureRowPatch';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderSalaryThirdPartySeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const {
        props,
        entry,
        salarySeizureTabRows,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        salaryAssetOverrides,
        setSalaryAssetOverrides,
    } = ctx;
${indent(salaryBranchesBody)}
    return undefined;
}
`;

const composer = `import React from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import type { UnifiedSeizureLogEntryFooterProps } from './unifiedSeizureLogEntryFooter/UnifiedSeizureLogEntryFooterProps';
import {
    list,
    mergeSeizedMovables,
    mergeSeizedProperties,
    resolveMovableInlineSaveCtxForUnifiedLog,
} from './unifiedSeizureLogEntryFooter/unifiedSeizureLogEntryFooterHelpers';
import { renderPropertySeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderPropertySeizureLogFooterBranches';
import { renderMovableSeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderMovableSeizureLogFooterBranches';
import { renderSalaryThirdPartySeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderSalaryThirdPartySeizureLogFooterBranches';

export type { UnifiedSeizureLogEntryFooterProps } from './unifiedSeizureLogEntryFooter/UnifiedSeizureLogEntryFooterProps';

export function UnifiedSeizureLogEntryFooter(props: UnifiedSeizureLogEntryFooterProps) {
    const [salaryAssetOverrides, setSalaryAssetOverrides] = React.useState<Record<string, SeizedAsset>>({});
    const seizedPropertiesForSeizureLog = mergeSeizedProperties(
        list(props.seizedPropertiesForSeizureLog),
        props.executionData,
    );
    const seizedMovablesForSeizureLog = mergeSeizedMovables(
        list(props.seizedMovablesForSeizureLog),
        props.executionData,
    );
    const realEstateSeizureRegistryAssets = list(props.realEstateSeizureRegistryAssets);
    const movableSeizureRegistryAssets = list(props.movableSeizureRegistryAssets);
    const salarySeizureTabRows = list(props.salarySeizureTabRows);
    const thirdPartySeizureRegistryAssets = list(props.thirdPartySeizureRegistryAssets);
    const thirdPartySeizuresUi = list(props.thirdPartySeizuresUi);
    const movableInlineSaveCtx = React.useMemo(
        () =>
            resolveMovableInlineSaveCtxForUnifiedLog(
                props.movableInlineSaveCtx,
                seizedMovablesForSeizureLog,
                props.persistExecutionMerge,
            ),
        [
            props.movableInlineSaveCtx,
            seizedMovablesForSeizureLog,
            props.persistExecutionMerge,
        ],
    );
    const { entry } = props;
    const ctx = {
        props,
        entry,
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        realEstateSeizureRegistryAssets,
        movableSeizureRegistryAssets,
        salarySeizureTabRows,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        movableInlineSaveCtx,
        salaryAssetOverrides,
        setSalaryAssetOverrides,
    };

    return (
        renderPropertySeizureLogFooterBranches(ctx) ??
        renderMovableSeizureLogFooterBranches(ctx) ??
        renderSalaryThirdPartySeizureLogFooterBranches(ctx) ??
        null
    );
}
`;

fs.writeFileSync(path.join(outDir, 'UnifiedSeizureLogEntryFooterProps.ts'), typesFile);
fs.writeFileSync(path.join(outDir, 'unifiedSeizureLogEntryFooterHelpers.tsx'), helpersFile);
fs.writeFileSync(path.join(outDir, 'UnifiedSeizureLogFooterBranchCtx.ts'), ctxTypeFile);
fs.writeFileSync(path.join(outDir, 'renderPropertySeizureLogFooterBranches.tsx'), propertyFile);
fs.writeFileSync(path.join(outDir, 'renderMovableSeizureLogFooterBranches.tsx'), movableFile);
fs.writeFileSync(path.join(outDir, 'renderSalaryThirdPartySeizureLogFooterBranches.tsx'), salaryFile);
fs.writeFileSync(srcPath, composer);
fs.writeFileSync(
    path.join(outDir, 'index.ts'),
    `export type { UnifiedSeizureLogEntryFooterProps } from './UnifiedSeizureLogEntryFooterProps';
`,
);

for (const [name, content] of [
    ['types', typesFile],
    ['helpers', helpersFile],
    ['property', propertyFile],
    ['movable', movableFile],
    ['salary', salaryFile],
    ['composer', composer],
]) {
    console.log(name, content.split('\n').length);
}
