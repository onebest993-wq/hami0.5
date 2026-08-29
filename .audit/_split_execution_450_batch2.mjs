import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
}
function write(rel, contents) {
    const abs = path.join(root, rel);
    fs.writeFileSync(abs, contents.endsWith('\n') ? contents : contents + '\n');
    console.log(contents.split('\n').length, rel);
}
function linesOf(src) {
    return src.split('\n');
}

function exportify(block) {
    return block
        .replace(/^type /gm, 'export type ')
        .replace(/^interface /gm, 'export interface ')
        .replace(/^function /gm, 'export function ')
        .replace(/^const genStepId/gm, 'export const genStepId');
}

function extractBlock(rel, start1, end1, destRel, destHeader, reexport) {
    const src = read(rel);
    const lines = linesOf(src);
    const block = exportify(lines.slice(start1 - 1, end1).join('\n'));
    write(destRel, `${destHeader}${block}\n`);
    const before = lines.slice(0, start1 - 1).join('\n');
    const after = lines.slice(end1).join('\n');
    const next = `${before}\n${reexport}\n${after}`.replace(/\n{3,}/g, '\n\n');
    write(rel, next);
}

// --- followup debtor input type ---
{
    const rel =
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreFollowupDebtorPipeline.ts';
    const src = read(rel);
    const lines = linesOf(src);
    const start = lines.findIndex((l) =>
        l.startsWith('export function useExecutionDashboardCoreFollowupDebtorPipeline(p: {'),
    );
    const end = lines.findIndex((l, i) => i > start && l === '}) {');
    if (start < 0 || end < 0) throw new Error('followup debtor param type not found');
    const paramBody = lines.slice(start + 1, end).join('\n');
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreFollowupDebtorPipeline.types.ts',
        `import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionFollowupOrchestratorSlice } from '../../orchestrators/executionFollowupOrchestratorTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';

export type UseExecutionDashboardCoreFollowupDebtorPipelineInput = {
${paramBody}
};
`,
    );
    lines[start] =
        'export function useExecutionDashboardCoreFollowupDebtorPipeline(p: UseExecutionDashboardCoreFollowupDebtorPipelineInput) {';
    lines.splice(start + 1, end - start);
    const importLine = `import type { UseExecutionDashboardCoreFollowupDebtorPipelineInput } from './useExecutionDashboardCoreFollowupDebtorPipeline.types';`;
    const out = [lines[0], importLine, ...lines.slice(1)].join('\n');
    write(rel, out);
}

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers.ts',
    18,
    74,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers.types.ts',
    `import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

`,
    `export type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';
import type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionTasksSection.tsx',
    17,
    67,
    'src/app/components/lawyer/ExecutionDashboard/components/executionTasksSection.types.ts',
    '',
    `import {
    type DoneTaskNote,
    type ExecutionTask,
    type ExecutionTasksSectionProps,
    type TaskStep,
    genStepId,
    normalizeSteps,
} from './executionTasksSection.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSolidaryAndEvictionFollowupModalsContainer.tsx',
    13,
    68,
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSolidaryAndEvictionFollowupModalsContainer.types.ts',
    `import type React from 'react';

`,
    `export type {
    SolidaryTargetDebtorRow,
    EvictionExpensePayMode,
    LawyerFeeDisburseMode,
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps,
} from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';
import type { ExecutionSolidaryAndEvictionFollowupModalsContainerProps } from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesAndAppointmentModals.tsx',
    28,
    90,
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesAndAppointmentModals.types.ts',
    `import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

`,
    `export type { ExecutionNotesAndAppointmentModalsProps } from './ExecutionNotesAndAppointmentModals.types';
import type {
    CaseNoteLogRow,
    CaseTaskPending,
    CaseTaskStep,
    ExecutionNotesAndAppointmentModalsProps,
} from './ExecutionNotesAndAppointmentModals.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardPartyDeathHandlers.ts',
    23,
    48,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardPartyDeathHandlers.types.ts',
    `import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Creditor, Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { AlimonyBeneficiaryProfile } from '@/app/utils/alimonyBeneficiaryDeathUtils';

`,
    `export type { UseExecutionDashboardPartyDeathHandlersParams } from './useExecutionDashboardPartyDeathHandlers.types';
import type { UseExecutionDashboardPartyDeathHandlersParams } from './useExecutionDashboardPartyDeathHandlers.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardGuarantorFollowupHandlers.ts',
    21,
    42,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardGuarantorFollowupHandlers.types.ts',
    `import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

`,
    `export type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';
import type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';`,
);

console.log('batch2 types done');
