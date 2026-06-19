/**
 * Fix DecisionsAppealsHubView + wire engine shell + appeal renderers hook.
 * Run: node scripts/patch-decisions-engine-shell.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enginePath = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine.tsx');
const hubPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/components/DecisionsAppealsHubView.tsx',
);
const addModalPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/components/DecisionsAppealsAddDecisionModal.tsx',
);
const detailModalPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/components/DecisionsAppealsAppealDetailModal.tsx',
);
const renderersPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsAppealRenderers.tsx',
);

const engineLines = fs.readFileSync(enginePath, 'utf8').split(/\r?\n/);

function slice(start, end) {
    return engineLines.slice(start - 1, end).join('\n');
}

// --- Hub view body from engine (2033-2276) ---
let hubBody = slice(2033, 2276)
    .replace(/\$\{DECISION_BTN_PRIMARY\}/g, '${decisionBtnPrimary}')
    .replace(/DECISION_BTN_PRIMARY/g, 'decisionBtnPrimary');

fs.writeFileSync(
    hubPath,
    `import React from 'react';
import { Plus, Scale } from 'lucide-react';
import DecisionCard from './DecisionCard';
import AppealWorkflowCard from './AppealWorkflowCard';
import type { Decision } from '../types';
import type { AppealsHubProponentFilter } from '../utils';
import { appealsHubProponentFilterLabel } from '../utils';
import type { DecisionCardProps } from './decisionCardTypes';

export type DecisionsAppealsHubViewProps = {
    isHistoricalMode: boolean;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    setDecisionsHubTab: (tab: 'current' | 'previous' | 'appeals' | 'archive') => void;
    setShowAddModal: (v: boolean) => void;
    decisionBtnPrimary: string;
    archivePendingDecisions: Decision[];
    archiveSettledDecisions: Decision[];
    archivedDecisions: Decision[];
    filteredPreviousSettledDecisions: Decision[];
    filteredAppealsHubDecisions: Decision[];
    appealsHubDecisions: Decision[];
    previousFilter: 'all' | 'approved' | 'rejected';
    setPreviousFilter: (f: 'all' | 'approved' | 'rejected') => void;
    previousHubFilterOptions: AppealsHubProponentFilter[];
    previousProponentFilter: AppealsHubProponentFilter;
    setPreviousProponentFilter: (f: AppealsHubProponentFilter) => void;
    appealsHubFilterOptions: AppealsHubProponentFilter[];
    appealsProponentFilter: AppealsHubProponentFilter;
    setAppealsProponentFilter: (f: AppealsHubProponentFilter) => void;
    decisionCardProps: Omit<DecisionCardProps, 'decision'>;
    appealWorkflowCardProps: React.ComponentProps<typeof AppealWorkflowCard>;
};

export function DecisionsAppealsHubView(props: DecisionsAppealsHubViewProps) {
    const {
        isHistoricalMode,
        decisions,
        decisionsHubTab,
        setDecisionsHubTab,
        setShowAddModal,
        decisionBtnPrimary,
        archivePendingDecisions,
        archiveSettledDecisions,
        archivedDecisions,
        filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions,
        appealsHubDecisions,
        previousFilter,
        setPreviousFilter,
        previousHubFilterOptions,
        previousProponentFilter,
        setPreviousProponentFilter,
        appealsHubFilterOptions,
        appealsProponentFilter,
        setAppealsProponentFilter,
        decisionCardProps,
        appealWorkflowCardProps,
    } = props;

    return (
${hubBody.split('\n').map((l) => (l ? `        ${l}` : l)).join('\n')}
    );
}
`,
);

// --- Appeal renderers hook (1465-1986) ---
const renderersBody = slice(1465, 1986);

const renderersImports = `import React from 'react';
import DecisionHintTooltip from '../components/DecisionHintTooltip';
import { AppealDeadlineLapsePanel } from '../components/AppealDeadlineLapsePanel';
import { ExecutorSideAppealEntryPanel } from '../components/ExecutorSideAppealEntryPanel';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import {
    DECISION_APPEAL_TOOLBAR_BTN_PRIMARY,
    DECISION_APPEAL_TOOLBAR_BTN_SECONDARY,
    DECISION_APPEAL_TOOLBAR_ROW,
    DECISION_BTN_DEBTOR_APPEAL_NOTICE,
    DECISION_BTN_GRIEVANCE_ACCEPT,
    DECISION_BTN_GRIEVANCE_REJECT,
    DECISION_NOTICE_GLASS,
} from '../decisionCardPresentation';
import {
    appealWindowsForDecision,
    appealGrievanceFilingClockPatch,
    buildGrievanceResolutionPatch,
    buildGrievanceDeadlineLapsePatch,
    buildAppealPerpetualEnforcementPatch,
    appealDeadlineLapsePanelMessage,
    resolveAppealDeadlineExpiryKind,
    canWaiveInitialAppeal,
    creditorAgentDebtorIsSoleAppellant,
    resolveHarmedPartyAppealActor,
    resolveUnderlyingDecisionHub,
    resolveCassationAppealClockYmd,
    resolveEffectiveAwaitingCassationParty,
    canWaiveCassationAfterDebtorGrievance,
    canWaiveLawyerAwaitingCassation,
    cassationButtonTitles,
    renderDecisionHubStatusPill,
    appealPipelineRowForCard,
    isExecutorDecisionAppealFinal,
    resolveCreditorDecisionEnforcementState,
    type AppealDeadlineWindows,
    type DecisionsAppealsAppealSlot,
} from '../utils';
import {
    appealCassationEntryLabels,
    appealDirectCassationButtonLabel,
    appealInitialCassationEntryButtonLabel,
    appealInitialGrievanceEntryButtonLabel,
    appealInitialCassationTimeline,
    appealInitialGrievanceTimeline,
    appealLawyerCassationAutoEntryDescription,
} from '../appealUiLabels';

export type UseDecisionsAppealsAppealRenderersArgs = {
    appealPerspective: AppealUiPerspective;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    setAppealDetailDecision: (d: Decision | null) => void;
    setDecisionsHubTab: (tab: 'current' | 'previous' | 'appeals' | 'archive') => void;
    goToAppealsWithScroll: (id: string) => void;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    getAppealStatus: (d: Decision) => AppealDeadlineWindows;
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        title: string,
        timelineMsg: string,
        toastTone?: 'amber' | 'emerald' | 'rose'
    ) => void;
    commitExecutorSideAppealEntry: (
        decision: Decision,
        stage: 'grievance' | 'cassation',
        appellants: import('../utils').ManualAppealAppellantActor[]
    ) => void;
    applyWaiveInitialAppeal: (decision: Decision) => void;
    applyCassationCourtDecision: (
        decision: Decision,
        outcome: 'rad_laheeza' | 'naqd'
    ) => void;
    applyGrievanceCourtOutcome: (
        decision: Decision,
        granted: boolean,
        opts?: { skipHubTabSwitch?: boolean }
    ) => void;
    applyWaiveCassationAfterDebtorGrievance: (decision: Decision) => void;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    tamyeezNumberDraftById: Record<string, string>;
    setTamyeezNumberDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    tamyeezEditOpenById: Record<string, boolean>;
    setTamyeezEditOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

export function useDecisionsAppealsAppealRenderers(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        appealPerspective,
        decisions,
        decisionsHubTab,
        setAppealDetailDecision,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        requestNeedsExecutorOutcome,
        getAppealStatus,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyWaiveInitialAppeal,
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        patchDecisionRow,
        logAppealTimeline,
        tamyeezNumberDraftById,
        setTamyeezNumberDraftById,
        tamyeezEditOpenById,
        setTamyeezEditOpenById,
    } = args;

${renderersBody}

    return {
        DECISION_BTN_PRIMARY,
        DECISION_BTN_PRIMARY_WFULL,
        DECISION_BTN_PRIMARY_FLEX,
        DECISION_BTN_SECONDARY_FLEX,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealDeadlineLapseActions,
        buildDecisionCardStatus,
    };
}
`;

fs.mkdirSync(path.dirname(renderersPath), { recursive: true });
fs.writeFileSync(renderersPath, renderersImports);

// --- Fix add modal ---
const addBody = slice(2282, 2373);
fs.writeFileSync(
    addModalPath,
    `import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export type DecisionsAppealsAddDecisionModalProps = {
    showAddModal: boolean;
    setShowAddModal: (v: boolean) => void;
    resetAddDecisionForm: () => void;
    newTitle: string;
    setNewTitle: (v: string) => void;
    newDate: string;
    setNewDate: (v: string) => void;
    newBody: string;
    setNewBody: (v: string) => void;
    handleAddDecision: () => void;
    decisionBtnPrimaryWFull: string;
};

export function DecisionsAppealsAddDecisionModal({
    showAddModal,
    setShowAddModal,
    resetAddDecisionForm,
    newTitle,
    setNewTitle,
    newDate,
    setNewDate,
    newBody,
    setNewBody,
    handleAddDecision,
    decisionBtnPrimaryWFull,
}: DecisionsAppealsAddDecisionModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
${addBody.split('\n').map((l) => `            ${l}`).join('\n').replace(/DECISION_BTN_PRIMARY_WFULL/g, 'decisionBtnPrimaryWFull')}
        </AnimatePresence>,
        document.body,
    );
}
`,
);

// --- Fix detail modal ---
const detailBody = slice(2381, 2456);
fs.writeFileSync(
    detailModalPath,
    `import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import type { Decision } from '../types';

export type DecisionsAppealsAppealDetailModalProps = {
    appealDetailDecision: Decision | null;
    setAppealDetailDecision: (d: Decision | null) => void;
    goToAppealsWithScroll: (id: string) => void;
    decisionBtnPrimaryWFull: string;
};

export function DecisionsAppealsAppealDetailModal({
    appealDetailDecision,
    setAppealDetailDecision,
    goToAppealsWithScroll,
    decisionBtnPrimaryWFull,
}: DecisionsAppealsAppealDetailModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
${detailBody.split('\n').map((l) => `            ${l}`).join('\n').replace(/DECISION_BTN_PRIMARY_WFULL/g, 'decisionBtnPrimaryWFull')}
        </AnimatePresence>,
        document.body,
    );
}
`,
);

// --- Patch engine: remove renderers block + replace return ---
let engine = fs.readFileSync(enginePath, 'utf8');

engine = engine.replace(
    /\n    const APPEAL_ORIGINAL_LOCKED_HINT =[\s\S]*?const appealWorkflowCardProps = \{[\s\S]*?\};\n\n    return \([\s\S]*?<\/TooltipProvider>\n    \);\n\};/,
    `
    const {
        DECISION_BTN_PRIMARY,
        DECISION_BTN_PRIMARY_WFULL,
        DECISION_BTN_PRIMARY_FLEX,
        DECISION_BTN_SECONDARY_FLEX,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealDeadlineLapseActions,
        buildDecisionCardStatus,
    } = useDecisionsAppealsAppealRenderers({
        appealPerspective,
        decisions,
        decisionsHubTab,
        setAppealDetailDecision,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        requestNeedsExecutorOutcome,
        getAppealStatus,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyWaiveInitialAppeal,
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        patchDecisionRow,
        logAppealTimeline,
        tamyeezNumberDraftById,
        setTamyeezNumberDraftById,
        tamyeezEditOpenById,
        setTamyeezEditOpenById,
    });

    const decisionCardProps = {
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        hubNoteById,
        setHubNoteById,
        handleExecutorResolveById,
        goToAppealsWithScroll,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        patchDecisionRow,
        logAppealTimeline,
        btnPrimaryWFull: DECISION_BTN_PRIMARY_WFULL,
        btnPrimaryFlex: DECISION_BTN_PRIMARY_FLEX,
        btnSecondaryFlex: DECISION_BTN_SECONDARY_FLEX,
        onDeleteDecision: handleDeleteDecision,
        onArchiveDecision: handleArchiveDecision,
        onOpenArchiveTab: () => setDecisionsHubTab('archive'),
        renderAppealDeadlineLapseActions,
    };

    const appealWorkflowCardProps = {
        decisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealAwaitingCassationButtons,
        renderAppealDeadlineLapseActions,
        transitionAppealWorkflow,
    };

    return (
        <TooltipProvider delayDuration={DECISIONS_APPEALS_TOOLTIP_DELAY_MS}>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <DecisionsAppealsHubView
                    isHistoricalMode={isHistoricalMode}
                    decisions={decisions}
                    decisionsHubTab={decisionsHubTab}
                    setDecisionsHubTab={setDecisionsHubTab}
                    setShowAddModal={setShowAddModal}
                    decisionBtnPrimary={DECISION_BTN_PRIMARY}
                    archivePendingDecisions={archivePendingDecisions}
                    archiveSettledDecisions={archiveSettledDecisions}
                    archivedDecisions={archivedDecisions}
                    filteredPreviousSettledDecisions={filteredPreviousSettledDecisions}
                    filteredAppealsHubDecisions={filteredAppealsHubDecisions}
                    appealsHubDecisions={appealsHubDecisions}
                    previousFilter={previousFilter}
                    setPreviousFilter={setPreviousFilter}
                    previousHubFilterOptions={previousHubFilterOptions}
                    previousProponentFilter={previousProponentFilter}
                    setPreviousProponentFilter={setPreviousProponentFilter}
                    appealsHubFilterOptions={appealsHubFilterOptions}
                    appealsProponentFilter={appealsProponentFilter}
                    setAppealsProponentFilter={setAppealsProponentFilter}
                    decisionCardProps={decisionCardProps}
                    appealWorkflowCardProps={appealWorkflowCardProps}
                />
                <DecisionsAppealsAddDecisionModal
                    showAddModal={showAddModal}
                    setShowAddModal={setShowAddModal}
                    resetAddDecisionForm={resetAddDecisionForm}
                    newTitle={newTitle}
                    setNewTitle={setNewTitle}
                    newDate={newDate}
                    setNewDate={setNewDate}
                    newBody={newBody}
                    setNewBody={setNewBody}
                    handleAddDecision={handleAddDecision}
                    decisionBtnPrimaryWFull={DECISION_BTN_PRIMARY_WFULL}
                />
                <DecisionsAppealsAppealDetailModal
                    appealDetailDecision={appealDetailDecision}
                    setAppealDetailDecision={setAppealDetailDecision}
                    goToAppealsWithScroll={goToAppealsWithScroll}
                    decisionBtnPrimaryWFull={DECISION_BTN_PRIMARY_WFULL}
                />
            </div>
        </TooltipProvider>
    );
};`,
);

if (!engine.includes('useDecisionsAppealsAppealRenderers')) {
    engine = engine.replace(
        "import { DecisionsAppealsHubView } from './DecisionsAndAppealsEngine/components/DecisionsAppealsHubView';",
        `import { DecisionsAppealsHubView } from './DecisionsAndAppealsEngine/components/DecisionsAppealsHubView';
import { useDecisionsAppealsAppealRenderers } from './DecisionsAndAppealsEngine/hooks/useDecisionsAppealsAppealRenderers';`,
    );
}

// Remove duplicate decisionCardProps if regex left old ones - check for duplicate buildDecisionCardStatus callback before hook
engine = engine.replace(
    /\n    const buildDecisionCardStatus = React\.useCallback\([\s\S]*?\], \[decisions, appealPerspective\]\);\n\n    const handleEndAppealDeadline/,
    '\n    const handleEndAppealDeadline',
);

fs.writeFileSync(enginePath, engine);
console.log('Patched DecisionsAndAppealsEngine shell + appeal renderers hook');
