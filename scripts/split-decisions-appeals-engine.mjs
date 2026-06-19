/**
 * Split DecisionsAndAppealsEngine.tsx → engine/* + components/*
 * Run: node scripts/split-decisions-appeals-engine.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enginePath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine.tsx',
);
const engineDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/engine');
const componentsDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/components');

const lines = fs.readFileSync(enginePath, 'utf8').split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

fs.mkdirSync(engineDir, { recursive: true });
fs.mkdirSync(componentsDir, { recursive: true });

// --- types (lines 140-204) ---
fs.writeFileSync(
    path.join(engineDir, 'decisionsEngineTypes.ts'),
    `import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';

export function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
${slice(141, 150).replace(/^function normalizeBaseDossierIdFromDecisionsKey.*\n/, '')}
}

export function dispatchHeirSubstitutionOutcomeIfAny(
    executionId: string | undefined,
    d: { requestKind?: string; executorOutcome?: string }
) {
${slice(158, 164).replace(/^function dispatchHeirSubstitutionOutcomeIfAny.*\n/, '')}
}

/** تكامل مركز القرارات مع محضر المتابعة وملف التنفيذ (useDecisionDispatcher) */
export interface DecisionsDispatcherHubProps {
${slice(168, 178).replace(/^export interface DecisionsDispatcherHubProps \{\n?/, '').replace(/\}$/, '')}
}

export interface DecisionsAndAppealsEngineProps {
${slice(182, 203).replace(/^interface DecisionsAndAppealsEngineProps \{\n?/, '').replace(/\}$/, '')}
}
`,
);

// --- normalize row (lines 277-575, body of map callback) ---
const normalizeBody = slice(277, 575)
    .replace(/^            /gm, '')
    .replace(/^        \}\);?\s*$/m, '');

fs.writeFileSync(
    path.join(engineDir, 'normalizeLoadedDecisionRow.ts'),
    `import type { Decision } from '../types';
import {
    EXECUTOR_QUEUE_REQUEST_KINDS,
    appealWindowsForDecision,
    deriveDecisionHubStatus,
    isCassationAffirmResult,
    resolveCassationFilerActor,
} from '../utils';

/** يُطبَّق على كل صف قرار عند التحميل من التخزين */
export function normalizeLoadedDecisionRow(d: Decision): Decision {
    const row = { ...d } as Decision;
${normalizeBody.split('\n').map((l) => (l ? `    ${l}` : l)).join('\n')}
    return row;
}
`,
);

// --- Hub view (lines 2384-2630) ---
const hubViewBody = slice(2385, 2630);
fs.writeFileSync(
    path.join(componentsDir, 'DecisionsAppealsHubView.tsx'),
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

export function DecisionsAppealsHubView({
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
}: DecisionsAppealsHubViewProps) {
${hubViewBody}
}
`,
);

// --- Add decision modal (lines 2632-2731) ---
const addModalBody = slice(2633, 2731);
fs.writeFileSync(
    path.join(componentsDir, 'DecisionsAppealsAddDecisionModal.tsx'),
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

export function DecisionsAppealsAddDecisionModal(props: DecisionsAppealsAddDecisionModalProps) {
    const {
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
    } = props;

    if (typeof document === 'undefined') return null;

${addModalBody.replace(/DECISION_BTN_PRIMARY_WFULL/g, 'decisionBtnPrimaryWFull')}
}
`,
);

// --- Appeal detail modal (lines 2732-2813) ---
const detailModalBody = slice(2733, 2813);
fs.writeFileSync(
    path.join(componentsDir, 'DecisionsAppealsAppealDetailModal.tsx'),
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

export function DecisionsAppealsAppealDetailModal(props: DecisionsAppealsAppealDetailModalProps) {
    const {
        appealDetailDecision,
        setAppealDetailDecision,
        goToAppealsWithScroll,
        decisionBtnPrimaryWFull,
    } = props;

    if (typeof document === 'undefined') return null;

${detailModalBody.replace(/DECISION_BTN_PRIMARY_WFULL/g, 'decisionBtnPrimaryWFull')}
}
`,
);

// --- Patch main engine file ---
let main = fs.readFileSync(enginePath, 'utf8');

// Remove extracted helpers and types from top
main = main.replace(
    /function normalizeBaseDossierIdFromDecisionsKey[\s\S]*?^}\n\n\n\n\n\/\*\* شارة مصدر[\s\S]*?^}\n\n/m,
    '',
);
main = main.replace(
    /\/\*\* تكامل مركز القرارات[\s\S]*?^}\n\ninterface DecisionsAndAppealsEngineProps[\s\S]*?^}\n\n\n/m,
    '',
);

// Add imports after existing DecisionsAndAppealsEngine imports block
const typeImport = `import {
    normalizeBaseDossierIdFromDecisionsKey,
    dispatchHeirSubstitutionOutcomeIfAny,
    type DecisionsDispatcherHubProps,
    type DecisionsAndAppealsEngineProps,
} from './DecisionsAndAppealsEngine/engine/decisionsEngineTypes';
import { normalizeLoadedDecisionRow } from './DecisionsAndAppealsEngine/engine/normalizeLoadedDecisionRow';
import { DecisionsAppealsHubView } from './DecisionsAndAppealsEngine/components/DecisionsAppealsHubView';
import { DecisionsAppealsAddDecisionModal } from './DecisionsAndAppealsEngine/components/DecisionsAppealsAddDecisionModal';
import { DecisionsAppealsAppealDetailModal } from './DecisionsAndAppealsEngine/components/DecisionsAppealsAppealDetailModal';
export type { DecisionsDispatcherHubProps } from './DecisionsAndAppealsEngine/engine/decisionsEngineTypes';
`;

main = main.replace(
    "import {\n    appealCassationEntryLabels,",
    `${typeImport}\nimport {\n    appealCassationEntryLabels,`,
);

// Replace normalize map body
main = main.replace(
    /let normalized = raw\.map\(\(d\) => \{[\s\S]*?return row;\n        \}\);/,
    'let normalized = raw.map((d) => normalizeLoadedDecisionRow(d as Decision));',
);

// Replace return hub section
main = main.replace(
    /    return \(\n        <TooltipProvider delayDuration=\{DECISIONS_APPEALS_TOOLTIP_DELAY_MS\}>\n        <div className="flex min-h-0 flex-1 flex-col gap-3">[\s\S]*?            <\/div>\n            \n            \{typeof document !== 'undefined' &&\n                createPortal\([\s\S]*?document\.body\n                \)\}\n            \{typeof document !== 'undefined' &&\n                createPortal\([\s\S]*?document\.body\n                \)\}\n        <\/div>/,
    `    return (
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
        </div>`,
);

fs.writeFileSync(enginePath, main);
console.log('Split DecisionsAndAppealsEngine → engine/ + hub view + modals');
