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
    'src/app/components/lawyer/ExecutionDashboard/components/DebtorCardRowBadgesCluster.tsx',
    22,
    86,
    'src/app/components/lawyer/ExecutionDashboard/components/DebtorCardRowBadgesCluster.types.ts',
    `import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import type { DebtorsSectionProps } from './DebtorsSection.types';

`,
    `export type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';
import type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/seizedMovableWorkflow/buildMovableWorkflowStepContent.tsx',
    25,
    56,
    'src/app/components/lawyer/ExecutionDashboard/components/seizedMovableWorkflow/movableWorkflowStepContent.types.ts',
    `import type React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import type { MovableInlineSectionKey } from '../MovableSeizureInlineSections';
import type { MovableWorkflowStep2Lane } from './seizedMovableWorkflowTypes';

`,
    `export type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';
import type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyWorkflow/buildPropertyWorkflowStepContent.tsx',
    25,
    56,
    'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyWorkflow/propertyWorkflowStepContent.types.ts',
    `import type React from 'react';
import type { SeizedProperty } from '@/app/types/execution';
import type { PropertyInlineSectionKey } from '../PropertySeizureInlineSections';
import type { PropertyWorkflowStep2Lane } from './seizedPropertyWorkflowTypes';

`,
    `export type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';
import type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome.ts',
    17,
    77,
    'src/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome.helpers.ts',
    `import type { ExecutionFile } from '@/app/types/execution';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRowReliable,
} from '@/app/utils/executorSeizureDecisionQueue';

`,
    `import {
    asExecutionFiles,
    parseDecisionPayload,
    normalizeBaseDossierIdFromDecisionsKey,
    markDossierSpecialFollowupApplied,
    dispatchToast,
    type ExecutionFileLike,
    type DecisionPayload,
} from './applyDossierSpecialFollowupOutcome.helpers';`,
);

extractBlock(
    'src/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils.ts',
    27,
    85,
    'src/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils.types.ts',
    `import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';
import type { ExecutionFile } from '@/app/types/execution';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';

`,
    `export type {
    HiddenFollowupVisibilityInput,
    HiddenPersonalCoerciveRequestKey,
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveCatalogItem,
    HiddenGuarantorCatalogItem,
    HiddenGuarantorContext,
} from './hiddenFollowupRequestsUtils.types';
import type {
    HiddenFollowupVisibilityInput,
    HiddenPersonalCoerciveRequestKey,
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveCatalogItem,
    HiddenGuarantorCatalogItem,
    HiddenGuarantorContext,
} from './hiddenFollowupRequestsUtils.types';`,
);

console.log('batch3 done');
