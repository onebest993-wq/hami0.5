import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
}
function write(rel, contents) {
    fs.writeFileSync(path.join(root, rel), contents.endsWith('\n') ? contents : contents + '\n');
    console.log(contents.split('\n').length, rel);
}
function linesOf(src) {
    return src.split('\n');
}
function exportify(block) {
    return block
        .replace(/^type /gm, 'export type ')
        .replace(/^interface /gm, 'export interface ')
        .replace(/^function /gm, 'export function ');
}
function extractBlock(rel, start1, end1, destRel, destHeader, reexport) {
    const src = read(rel);
    const lines = linesOf(src);
    const block = exportify(lines.slice(start1 - 1, end1).join('\n'));
    write(destRel, `${destHeader}${block}\n`);
    const before = lines.slice(0, start1 - 1).join('\n');
    const after = lines.slice(end1).join('\n');
    write(rel, `${before}\n${reexport}\n${after}`.replace(/\n{3,}/g, '\n\n'));
}

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreClaimGracePersistSegment.ts',
    26,
    44,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreClaimGracePersistSegment.types.ts',
    `import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionDashboardProps } from '../../types';
import type { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import type { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

`,
    `export type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment.types';
import type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionCoerciveActionsModalContainer.tsx',
    18,
    33,
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionCoerciveActionsModalContainer.types.ts',
    '',
    `export type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';
import type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/SpecificDeliveryMovableValuationExpertCard.tsx',
    38,
    62,
    'src/app/components/lawyer/ExecutionDashboard/components/specificDeliveryMovableValuationExpertCard.helpers.ts',
    `import type { InlineActionGateKey } from '../types';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

`,
    `export type { SpecificDeliveryMovableValuationExpertCardProps } from './specificDeliveryMovableValuationExpertCard.helpers';
import {
    type SpecificDeliveryMovableValuationExpertCardProps,
    buildExpertNameSlots,
} from './specificDeliveryMovableValuationExpertCard.helpers';`,
);

console.log('batch4 done');
