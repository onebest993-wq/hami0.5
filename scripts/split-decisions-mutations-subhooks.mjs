/**
 * Split useDecisionsAppealsMutations into row / executor / appeal-workflow hooks.
 * Run: node scripts/split-decisions-mutations-subhooks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks');
const mutationsPath = path.join(srcDir, 'useDecisionsAppealsMutations.ts');

const raw = fs.readFileSync(mutationsPath, 'utf8');
const lines = raw.split(/\r?\n/);

const sharedParamsType = `import type { TimelineEvent } from '@/app/types/execution';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';

export type DecisionsAppealsMutationsCoreParams = {
    executionId: string;
    decisions: Decision[];
    setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>;
    persistDecisionsToStorage: (next: Decision[]) => void;
    appealPerspective: AppealUiPerspective;
    reloadFromStorage: () => void;
    onTimelineUpdate: (event: TimelineEvent) => void;
    getMilestoneTimelineSnapshot?: () => unknown;
    resolveDecision: (args: {
        row: Decision;
        resolution: 'approved' | 'rejected';
        executorNote?: string;
    }) => void;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setDecisionsHubTab: React.Dispatch<
        React.SetStateAction<'current' | 'previous' | 'appeals' | 'archive'>
    >;
    goToAppealsWithScroll: (decisionId: string) => void;
    newTitle: string;
    newBody: string;
    newDate: string;
    resetAddDecisionForm: () => void;
    setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
};
`;

const rowBody = [
    ...lines.slice(85, 97),
    ...lines.slice(480, 500),
    ...lines.slice(606, 689),
].join('\n');

fs.writeFileSync(
    path.join(srcDir, 'useDecisionsAppealsRowMutations.ts'),
    `import React from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import type { Decision } from '../types';
import { newEventId } from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsRowMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        setDecisionsHubTab,
        executionId,
        newTitle,
        newBody,
        newDate,
        resetAddDecisionForm,
        setShowAddModal,
    } = params;

${rowBody}

    return {
        patchDecisionRow,
        logAppealTimeline,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
    };
}
`,
);

const executorBody = lines.slice(500, 606).join('\n');

fs.writeFileSync(
    path.join(srcDir, 'useDecisionsAppealsExecutorResolve.ts'),
    `import React from 'react';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import type { Decision } from '../types';
import {
    normalizeBaseDossierIdFromDecisionsKey,
    dispatchHeirSubstitutionOutcomeIfAny,
} from '../engine/decisionsEngineTypes';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsExecutorResolve(params: DecisionsAppealsMutationsCoreParams) {
    const {
        executionId,
        decisions,
        resolveDecision,
        hubNoteById,
        setHubNoteById,
        setDecisionsHubTab,
        reloadFromStorage,
    } = params;

${executorBody}

    return { handleExecutorResolveById };
}
`,
);

const appealBody = [
    ...lines.slice(98, 480),
    ...lines.slice(689, 934),
].join('\n');

fs.writeFileSync(
    path.join(srcDir, 'useDecisionsAppealsAppealWorkflowMutations.ts'),
    `import React, { useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import { isExecutionAppealTerminal } from '@/app/utils/executionDecisionAppealActive';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
import type { Decision } from '../types';
import type { ManualAppealAppellantActor } from '../utils';
import {
    newEventId,
    appealGrievanceFilingClockPatch,
    petitionGrantedAfterCassation,
    buildGrievanceResolutionPatch,
    grievancePetitionGranted,
    hubWithInferredAppealOrigin,
    buildExecutorSideAppealCommitPatch,
    executorSideAppealTimelineMessage,
    resolveCassationFilerActor,
    resolveUnderlyingDecisionHub,
    canWaiveLawyerAwaitingCassation,
    isCreditorInitiatedExecutorRequest,
} from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsAppealWorkflowMutations(
    params: DecisionsAppealsMutationsCoreParams,
) {
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
    } = params;

${appealBody}

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
`,
);

fs.writeFileSync(path.join(srcDir, 'decisionsAppealsMutationsTypes.ts'), sharedParamsType);

const composer = `import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';
import { useDecisionsAppealsRowMutations } from './useDecisionsAppealsRowMutations';
import { useDecisionsAppealsExecutorResolve } from './useDecisionsAppealsExecutorResolve';
import { useDecisionsAppealsAppealWorkflowMutations } from './useDecisionsAppealsAppealWorkflowMutations';

export type { DecisionsAppealsMutationsCoreParams as UseDecisionsAppealsMutationsParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        patchDecisionRow,
        logAppealTimeline,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
    } = useDecisionsAppealsRowMutations(params);

    const { handleExecutorResolveById } = useDecisionsAppealsExecutorResolve(params);

    const {
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyLawyerCassationEntry,
    } = useDecisionsAppealsAppealWorkflowMutations(params);

    return {
        patchDecisionRow,
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        logAppealTimeline,
        handleExecutorResolveById,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyLawyerCassationEntry,
    };
}
`;

fs.writeFileSync(mutationsPath, composer);
console.log('Split useDecisionsAppealsMutations into sub-hooks');
