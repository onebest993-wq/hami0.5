/**
 * Extract decision mutations + hub list memos from DecisionsAndAppealsEngine.
 * Run: node scripts/split-decisions-mutations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enginePath = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine.tsx');
const mutationsPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsMutations.ts',
);
const hubListsPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsHubLists.ts',
);

const raw = fs.readFileSync(enginePath, 'utf8');
const lines = raw.split(/\r?\n/);

const mutationsBody = [
    ...lines.slice(467, 988),
    ...lines.slice(989, 1072),
    ...lines.slice(1218, 1463),
].join('\n');

const mutationsFile = `import React, { useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { TimelineEvent } from '@/app/types/execution';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import { isExecutionAppealTerminal } from '@/app/utils/executionDecisionAppealActive';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
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
import {
    normalizeBaseDossierIdFromDecisionsKey,
    dispatchHeirSubstitutionOutcomeIfAny,
} from '../engine/decisionsEngineTypes';

export type UseDecisionsAppealsMutationsParams = {
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

export function useDecisionsAppealsMutations(params: UseDecisionsAppealsMutationsParams) {
    const {
        executionId,
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        reloadFromStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        resolveDecision,
        hubNoteById,
        setHubNoteById,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        newTitle,
        newBody,
        newDate,
        resetAddDecisionForm,
        setShowAddModal,
    } = params;

${mutationsBody}

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

fs.writeFileSync(mutationsPath, mutationsFile);

const hubListsBody = lines.slice(1073, 1217).join('\n');

const hubListsFile = `import React, { useEffect, useMemo } from 'react';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import {
    sortDecisionsNewestFirst,
    sortDecisionsNewestFirstTerminatedManualLast,
    sortDecisionsAppealActivityNewestFirst,
    resolveAppealsHubFilterOptions,
    resolveAppealHubProponentCategory,
    decisionAppealPipelineActive,
    hubHasActiveAppealLedgerEntry,
    manualExecutorAppealPipelineActive,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    type AppealsHubProponentFilter,
} from '../utils';

export type UseDecisionsAppealsHubListsParams = {
    domainVisibleDecisions: Decision[];
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    previousFilter: 'all' | 'approved' | 'rejected';
    previousProponentFilter: AppealsHubProponentFilter;
    appealsProponentFilter: AppealsHubProponentFilter;
    setPreviousProponentFilter: React.Dispatch<React.SetStateAction<AppealsHubProponentFilter>>;
    setAppealsProponentFilter: React.Dispatch<React.SetStateAction<AppealsHubProponentFilter>>;
};

export function useDecisionsAppealsHubLists(params: UseDecisionsAppealsHubListsParams) {
    const {
        domainVisibleDecisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        previousFilter,
        previousProponentFilter,
        appealsProponentFilter,
        setPreviousProponentFilter,
        setAppealsProponentFilter,
    } = params;

${hubListsBody}

    return {
        archiveHubDecisions,
        archivePendingDecisions,
        archiveSettledDecisions,
        archivedDecisions,
        appealsHubDecisions,
        previousHubFilterOptions,
        appealsHubFilterOptions,
        filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions,
    };
}
`;

fs.writeFileSync(hubListsPath, hubListsFile);

const patchIdx = lines.findIndex((l) => l.startsWith('    const patchDecisionRow'));
const hubIdx = lines.findIndex((l) => l.includes('/** قرارات أصلية فقط'));
const hubEndIdx = lines.findIndex(
    (l, i) => i > hubIdx && l === '    }, [appealsHubFilterOptions, appealsProponentFilter]);',
);
const transitionIdx = lines.findIndex((l) => l.startsWith('    const transitionAppealWorkflow'));
const appealRenderLineIdx = lines.findIndex((l) =>
    l.includes('} = useDecisionsAppealsAppealRenderers({'),
);

const hookCallMutations = `    const {
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
    } = useDecisionsAppealsMutations({
        executionId,
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        reloadFromStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        resolveDecision,
        hubNoteById,
        setHubNoteById,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        newTitle,
        newBody,
        newDate,
        resetAddDecisionForm,
        setShowAddModal,
    });

    const {
        archiveHubDecisions,
        archivePendingDecisions,
        archiveSettledDecisions,
        archivedDecisions,
        appealsHubDecisions,
        previousHubFilterOptions,
        appealsHubFilterOptions,
        filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions,
    } = useDecisionsAppealsHubLists({
        domainVisibleDecisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        previousFilter,
        previousProponentFilter,
        appealsProponentFilter,
        setPreviousProponentFilter,
        setAppealsProponentFilter,
    });

`;

const newLines = [
    ...lines.slice(0, patchIdx),
    hookCallMutations,
    ...lines.slice(appealRenderLineIdx),
];

let engineOut = newLines.join('\n');
const modalImportAnchor =
    "import { DecisionsAppealsAppealDetailModal } from './DecisionsAndAppealsEngine/components/DecisionsAppealsAppealDetailModal';";
const importInsert = `import { useDecisionsAppealsMutations } from './DecisionsAndAppealsEngine/hooks/useDecisionsAppealsMutations';
import { useDecisionsAppealsHubLists } from './DecisionsAndAppealsEngine/hooks/useDecisionsAppealsHubLists';
import { useDecisionsAppealsAppealRenderers } from './DecisionsAndAppealsEngine/hooks/useDecisionsAppealsAppealRenderers';
`;

engineOut = engineOut.replace(modalImportAnchor, `${modalImportAnchor}\n${importInsert}`);

fs.writeFileSync(enginePath, engineOut);
console.log('Split DecisionsAndAppealsEngine mutations + hub lists');
