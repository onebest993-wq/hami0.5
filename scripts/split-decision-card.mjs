/**
 * Split DecisionCard.tsx → decisionCardTypes + hook + sub-panels
 * Run: node scripts/split-decision-card.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cardPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/components/DecisionCard.tsx',
);
const componentsDir = path.dirname(cardPath);

const lines = fs.readFileSync(cardPath, 'utf8').split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

// --- types ---
fs.writeFileSync(
    path.join(componentsDir, 'decisionCardTypes.ts'),
    `import type React from 'react';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';
import type { Decision } from '../types';
import type {
    AppealDeadlineWindows,
    DecisionsAppealsAppealSlot,
    cassationButtonTitles,
} from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';

export type DecisionCardProps = {
${slice(59, 106).replace(/^type DecisionCardProps = \{\n?/, '').replace(/\};$/, '')}
};
`,
);

// --- derived state hook ---
const derivedBody = slice(137, 543);
fs.writeFileSync(
    path.join(componentsDir, 'useDecisionCardDerivedState.ts'),
    `import { useState, useCallback } from 'react';
import { inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import {
    countActiveDebtorsInFile,
    resolveDebtorDisplayNameForKey,
} from '@/app/utils/coerciveDebtorScope';
import { isSeizureDecisionFollowupComplete } from '../seizureFollowupComplete';
import {
    cleanTitle,
    formatDateNumeric,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
    appealWindowsForDecision,
    cassationButtonTitles,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    buildAppealProceedingsForDecision,
    resolveCreditorRequestAppealGate,
    isCreditorRequestFlowContinues,
    isExecutorRequestAppealCycleSuperseded,
    resolveCreditorDecisionEnforcementState,
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    isCreditorPartyRequest,
    resolveDebtorAgentRequestFateLine,
    shouldHideDebtorAgentFateLine,
    resolveEffectiveAwaitingCassationParty,
    decisionCardSurfaceClasses,
    isExecutorDecisionAppealFinal,
    canArchiveExecutorDecisionCard,
    isExecutorSideAwaitingAppealEntry,
    resolveExecutorDecisionStatusFlag,
} from '../utils';
import type { Decision } from '../types';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';
import type { AppealUiPerspective } from '../appealUiLabels';
import type { DecisionCardProps } from './decisionCardTypes';

type UseDecisionCardDerivedStateArgs = Pick<
    DecisionCardProps,
    | 'decision'
    | 'decisions'
    | 'decisionsHubTab'
    | 'dispatcherHub'
    | 'executionId'
    | 'requestNeedsExecutorOutcome'
    | 'buildDecisionCardStatus'
    | 'appealPerspective'
>;

export function useDecisionCardDerivedState({
    decision,
    decisions,
    decisionsHubTab,
    dispatcherHub,
    executionId,
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
    appealPerspective = 'creditor_agent',
}: UseDecisionCardDerivedStateArgs) {
${derivedBody}
    const [seizureCompletionBusy, setSeizureCompletionBusy] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const runSeizureCompletion = useCallback(() => {
${slice(402, 481).replace(/^    const runSeizureCompletion = useCallback\(\(\) => \{\n?/, '').replace(/\}, \[decision.*\]\);/, `    }, [decision, executionId, seizureCompletionBusy, seizureSubtype]);`)}

    return {
        titleClean,
        debtorsCount,
        debtorName,
        hubBodyText,
        isManualLedgerCard,
        showExecutorPendingFooter,
        windows,
        appealWindowClosed,
        appealBusyOnCopy,
        canManageAppealHere,
        hasActiveAppeal,
        cassTips,
        statusPillEl,
        pipelineRow,
        showRegisteredAppealPathLine,
        requestAppealGate,
        requestFlowContinues,
        appealCycleSealed,
        legacyAppealActionsVisible,
        awaitingCreditorCassationEntry,
        dateStr,
        heirsParty,
        canOpenHeirsEntry,
        seizureCompletionReady,
        seizureCompletionLabel,
        seizureCompletionBusy,
        runSeizureCompletion,
        evictionScheduleReady,
        evictionGraceReady,
        evictionPoliceReady,
        trustDisburseShortcutReady,
        guarantorShortcutReady,
        settled,
        appealLegallyFinal,
        enforcementState,
        isCassated,
        manualExecutorStatusFlag,
        cardClassName,
        hideDebtorFateLine,
        canArchive,
        executorAppealEntryOpen,
        showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked,
        selectedAction,
        setSelectedAction,
        showReasoning,
        setShowReasoning,
        showDetails,
        setShowDetails,
        deleteConfirmId,
        setDeleteConfirmId,
    };
}
`,
);

// --- Followup shortcuts panel ---
fs.writeFileSync(
    path.join(componentsDir, 'DecisionCardFollowupShortcuts.tsx'),
    `import React from 'react';
import type { Decision } from '../types';

export type DecisionCardFollowupShortcutsProps = {
    decision: Decision;
    executionId: string | undefined;
    btnPrimaryWFull: string;
    canOpenHeirsEntry: boolean;
    heirsParty: 'creditor' | 'debtor' | null;
    seizureCompletionReady: boolean;
    seizureCompletionBusy: boolean;
    seizureCompletionLabel: string;
    runSeizureCompletion: () => void;
    guarantorShortcutReady: boolean;
    trustDisburseShortcutReady: boolean;
    evictionScheduleReady: boolean;
    evictionGraceReady: boolean;
    evictionPoliceReady: boolean;
    personalStatusCourtCoerciveBlocked: boolean;
};

export function DecisionCardFollowupShortcuts({
    decision,
    executionId,
    btnPrimaryWFull,
    canOpenHeirsEntry,
    heirsParty,
    seizureCompletionReady,
    seizureCompletionBusy,
    seizureCompletionLabel,
    runSeizureCompletion,
    guarantorShortcutReady,
    trustDisburseShortcutReady,
    evictionScheduleReady,
    evictionGraceReady,
    evictionPoliceReady,
    personalStatusCourtCoerciveBlocked,
}: DecisionCardFollowupShortcutsProps) {
${slice(710, 791)}
}
`,
);

// --- Executor panel ---
fs.writeFileSync(
    path.join(componentsDir, 'DecisionCardExecutorPanel.tsx'),
    `import React from 'react';
import type { Decision } from '../types';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';

export type DecisionCardExecutorPanelProps = {
    decision: Decision;
    dispatcherHub?: DecisionsDispatcherHubProps;
    isCassated: boolean;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (id: string, resolution: 'approved' | 'rejected') => void;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    btnPrimaryFlex: string;
    btnSecondaryFlex: string;
    selectedAction: 'approved' | 'rejected' | null;
    setSelectedAction: (v: 'approved' | 'rejected' | null) => void;
    showReasoning: boolean;
    setShowReasoning: (v: boolean) => void;
};

export function DecisionCardExecutorPanel({
    decision,
    dispatcherHub,
    isCassated,
    hubNoteById,
    setHubNoteById,
    handleExecutorResolveById,
    requestNeedsExecutorOutcome,
    btnPrimaryFlex,
    btnSecondaryFlex,
    selectedAction,
    setSelectedAction,
    showReasoning,
    setShowReasoning,
}: DecisionCardExecutorPanelProps) {
${slice(831, 956)}
}
`,
);

// --- Delete confirm ---
fs.writeFileSync(
    path.join(componentsDir, 'DecisionCardDeleteConfirm.tsx'),
    `import React from 'react';

export type DecisionCardDeleteConfirmProps = {
    deleteConfirmId: string | null;
    decisionId: string;
    setDeleteConfirmId: (id: string | null) => void;
    onDeleteDecision: (id: string) => void;
};

export function DecisionCardDeleteConfirm({
    deleteConfirmId,
    decisionId,
    setDeleteConfirmId,
    onDeleteDecision,
}: DecisionCardDeleteConfirmProps) {
${slice(1007, 1031)}
}
`,
);

// --- Rewrite DecisionCard.tsx ---
const newCard = `import React from 'react';
import { motion } from 'motion/react';
import {
    ArchiveDecisionButton,
    DECISION_NOTICE_GLASS,
    DECISION_META_CHIP,
} from '../decisionCardPresentation';
import GlowingDot from './GlowingDot';
import { AppealOriginBadge } from './AppealOriginBadge';
import type { Decision } from '../types';
import {
    DECISION_GLASS_CARD,
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    resolveDebtorAgentRequestFateLine,
    resolveExecutorDecisionStatusFlag,
} from '../utils';
import { AppealProceedingsSummary } from './AppealProceedingsSummary';
import { ManualExecutorSmartCardPanel } from './ManualExecutorSmartCardPanel';
import type { DecisionCardProps } from './decisionCardTypes';
import { useDecisionCardDerivedState } from './useDecisionCardDerivedState';
import { DecisionCardFollowupShortcuts } from './DecisionCardFollowupShortcuts';
import { DecisionCardExecutorPanel } from './DecisionCardExecutorPanel';
import { DecisionCardDeleteConfirm } from './DecisionCardDeleteConfirm';

function DecisionCard(props: DecisionCardProps) {
    const {
        decision,
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
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
        btnPrimaryWFull,
        btnPrimaryFlex,
        btnSecondaryFlex,
        onDeleteDecision,
        onArchiveDecision,
        onOpenArchiveTab,
        renderAppealDeadlineLapseActions,
        appealPerspective,
    } = props;

    const derived = useDecisionCardDerivedState({
        decision,
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        appealPerspective,
    });

    const {
        titleClean,
        debtorsCount,
        debtorName,
        hubBodyText,
        isManualLedgerCard,
        showExecutorPendingFooter,
        windows,
        appealWindowClosed,
        appealBusyOnCopy,
        canManageAppealHere,
        hasActiveAppeal,
        cassTips,
        statusPillEl,
        pipelineRow,
        showRegisteredAppealPathLine,
        requestAppealGate,
        requestFlowContinues,
        appealCycleSealed,
        legacyAppealActionsVisible,
        awaitingCreditorCassationEntry,
        dateStr,
        heirsParty,
        canOpenHeirsEntry,
        seizureCompletionReady,
        seizureCompletionLabel,
        seizureCompletionBusy,
        runSeizureCompletion,
        evictionScheduleReady,
        evictionGraceReady,
        evictionPoliceReady,
        trustDisburseShortcutReady,
        guarantorShortcutReady,
        settled,
        appealLegallyFinal,
        enforcementState,
        isCassated,
        manualExecutorStatusFlag,
        cardClassName,
        hideDebtorFateLine,
        canArchive,
        executorAppealEntryOpen,
        showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked,
        selectedAction,
        setSelectedAction,
        showReasoning,
        setShowReasoning,
        showDetails,
        setShowDetails,
        deleteConfirmId,
        setDeleteConfirmId,
    } = derived;

${slice(545, 709)}

                {settled &&
                requestFlowContinues &&
                showCreditorFollowupActions &&
                (canOpenHeirsEntry ||
                    seizureCompletionReady ||
                    guarantorShortcutReady ||
                    trustDisburseShortcutReady ||
                    evictionScheduleReady ||
                    evictionGraceReady ||
                    evictionPoliceReady) ? (
                    <DecisionCardFollowupShortcuts
                        decision={decision}
                        executionId={executionId}
                        btnPrimaryWFull={btnPrimaryWFull}
                        canOpenHeirsEntry={canOpenHeirsEntry}
                        heirsParty={heirsParty}
                        seizureCompletionReady={seizureCompletionReady}
                        seizureCompletionBusy={seizureCompletionBusy}
                        seizureCompletionLabel={seizureCompletionLabel}
                        runSeizureCompletion={runSeizureCompletion}
                        guarantorShortcutReady={guarantorShortcutReady}
                        trustDisburseShortcutReady={trustDisburseShortcutReady}
                        evictionScheduleReady={evictionScheduleReady}
                        evictionGraceReady={evictionGraceReady}
                        evictionPoliceReady={evictionPoliceReady}
                        personalStatusCourtCoerciveBlocked={personalStatusCourtCoerciveBlocked}
                    />
                ) : null}

${slice(794, 830)}

                <DecisionCardExecutorPanel
                    decision={decision}
                    dispatcherHub={dispatcherHub}
                    isCassated={isCassated}
                    hubNoteById={hubNoteById}
                    setHubNoteById={setHubNoteById}
                    handleExecutorResolveById={handleExecutorResolveById}
                    requestNeedsExecutorOutcome={requestNeedsExecutorOutcome}
                    btnPrimaryFlex={btnPrimaryFlex}
                    btnSecondaryFlex={btnSecondaryFlex}
                    selectedAction={selectedAction}
                    setSelectedAction={setSelectedAction}
                    showReasoning={showReasoning}
                    setShowReasoning={setShowReasoning}
                />

${slice(958, 1006)}

            <DecisionCardDeleteConfirm
                deleteConfirmId={deleteConfirmId}
                decisionId={decision.id}
                setDeleteConfirmId={setDeleteConfirmId}
                onDeleteDecision={onDeleteDecision}
            />
        </motion.div>
    );
}

export default React.memo(DecisionCard);
export type { DecisionCardProps } from './decisionCardTypes';
`;

fs.writeFileSync(cardPath, newCard);

// Fix DecisionCard import in engine - was from parent
const enginePath = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine.tsx');
let engine = fs.readFileSync(enginePath, 'utf8');
engine = engine.replace(
    /from '\.\/DecisionsAndAppealsEngine';/g,
    "from '../engine/decisionsEngineTypes';",
);
fs.writeFileSync(enginePath, engine);

console.log('Split DecisionCard → types + hook + 3 sub-panels');
