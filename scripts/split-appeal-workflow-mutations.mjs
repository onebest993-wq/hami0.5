/**
 * Split useDecisionsAppealsAppealWorkflowMutations into cassation / grievance / waive / transition hooks.
 * Run: node scripts/split-appeal-workflow-mutations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const hooksDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks');
const srcPath = path.join(hooksDir, 'useDecisionsAppealsAppealWorkflowMutations.ts');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const bodyStart = lines.findIndex((l) => l.includes('const applyCassationCourtDecision'));
const cassationEnd = lines.findIndex((l) => l.startsWith('    const applyGrievanceCourtOutcome'));
const grievanceEnd = lines.findIndex((l) => l.startsWith('    const applyWaiveCassationAfterDebtorGrievance'));
const waiveEnd = lines.findIndex((l) => l.startsWith('    const transitionAppealWorkflow'));
const transitionEnd = lines.findIndex((l) => l.startsWith('    const commitExecutorSideAppealEntry'));
const endBeforeReturn = lines.findIndex((l, i) => i > transitionEnd && l.trim() === 'return {');

const destructuring = lines.slice(31, 44).join('\n');

const cassationBody = lines.slice(bodyStart, cassationEnd).join('\n');
const grievanceBody = lines.slice(cassationEnd, grievanceEnd).join('\n');
const waiveBody = lines.slice(grievanceEnd, waiveEnd).join('\n');
const transitionBody = lines.slice(waiveEnd, transitionEnd).join('\n');
const entryBody = lines.slice(transitionEnd, endBeforeReturn).join('\n');

const coreImport = `import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';\n`;

fs.writeFileSync(
    path.join(hooksDir, 'useDecisionsAppealsCassationMutations.ts'),
    `import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import type { Decision } from '../types';
import {
    petitionGrantedAfterCassation,
    hubWithInferredAppealOrigin,
    resolveCassationFilerActor,
    isCreditorInitiatedExecutorRequest,
} from '../utils';
${coreImport}
export function useDecisionsAppealsCassationMutations(params: DecisionsAppealsMutationsCoreParams) {
${destructuring}
${cassationBody}
    return { applyCassationCourtDecision };
}
`,
);

fs.writeFileSync(
    path.join(hooksDir, 'useDecisionsAppealsGrievanceMutations.ts'),
    `import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import type { Decision } from '../types';
import {
    buildGrievanceResolutionPatch,
    grievancePetitionGranted,
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
} from '../utils';
${coreImport}
export function useDecisionsAppealsGrievanceMutations(params: DecisionsAppealsMutationsCoreParams) {
${destructuring}
${grievanceBody}
    return { applyGrievanceCourtOutcome };
}
`,
);

fs.writeFileSync(
    path.join(hooksDir, 'useDecisionsAppealsWaiveAppealMutations.ts'),
    `import React, { useEffect } from 'react';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import type { Decision } from '../types';
import { newEventId, canWaiveLawyerAwaitingCassation } from '../utils';
${coreImport}
export function useDecisionsAppealsWaiveAppealMutations(params: DecisionsAppealsMutationsCoreParams) {
${destructuring}
${waiveBody}
    return { applyWaiveCassationAfterDebtorGrievance, applyWaiveInitialAppeal };
}
`,
);

fs.writeFileSync(
    path.join(hooksDir, 'useDecisionsAppealsTransitionWorkflow.ts'),
    `import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutionAppealTerminal } from '@/app/utils/executionDecisionAppealActive';
import type { Decision } from '../types';
import { newEventId, appealGrievanceFilingClockPatch, resolveUnderlyingDecisionHub } from '../utils';
${coreImport}
export function useDecisionsAppealsTransitionWorkflow(params: DecisionsAppealsMutationsCoreParams) {
${destructuring}
${transitionBody}
    return { transitionAppealWorkflow };
}
`,
);

fs.writeFileSync(
    path.join(hooksDir, 'useDecisionsAppealsAppealEntryMutations.ts'),
    `import React, { useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
import type { Decision } from '../types';
import type { ManualAppealAppellantActor } from '../utils';
import {
    newEventId,
    buildExecutorSideAppealCommitPatch,
    executorSideAppealTimelineMessage,
    resolveUnderlyingDecisionHub,
} from '../utils';
${coreImport}

export type AppealEntryMutationsParams = DecisionsAppealsMutationsCoreParams & {
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        timelineTitle: string,
        timelineDescription: string,
        tone: 'emerald' | 'rose' | 'amber' | 'slate',
    ) => void;
};

export function useDecisionsAppealsAppealEntryMutations(params: AppealEntryMutationsParams) {
    const {
        executionId,
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        reloadFromStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        transitionAppealWorkflow,
    } = params;

${entryBody}
    return { commitExecutorSideAppealEntry, applyLawyerCassationEntry };
}
`,
);

const composer = `import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';
import { useDecisionsAppealsCassationMutations } from './useDecisionsAppealsCassationMutations';
import { useDecisionsAppealsGrievanceMutations } from './useDecisionsAppealsGrievanceMutations';
import { useDecisionsAppealsWaiveAppealMutations } from './useDecisionsAppealsWaiveAppealMutations';
import { useDecisionsAppealsTransitionWorkflow } from './useDecisionsAppealsTransitionWorkflow';
import { useDecisionsAppealsAppealEntryMutations } from './useDecisionsAppealsAppealEntryMutations';

export function useDecisionsAppealsAppealWorkflowMutations(
    params: DecisionsAppealsMutationsCoreParams,
) {
    const { applyCassationCourtDecision } = useDecisionsAppealsCassationMutations(params);
    const { applyGrievanceCourtOutcome } = useDecisionsAppealsGrievanceMutations(params);
    const { applyWaiveCassationAfterDebtorGrievance, applyWaiveInitialAppeal } =
        useDecisionsAppealsWaiveAppealMutations(params);
    const { transitionAppealWorkflow } = useDecisionsAppealsTransitionWorkflow(params);
    const { commitExecutorSideAppealEntry, applyLawyerCassationEntry } =
        useDecisionsAppealsAppealEntryMutations({ ...params, transitionAppealWorkflow });

    return {
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyLawyerCassationEntry,
    };
}
`;

fs.writeFileSync(srcPath, composer);
console.log('Split appeal workflow mutations into 5 focused hooks');
