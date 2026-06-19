/**
 * Post-split fixes: paths, merge creditor modules, wire cross-imports.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(
    __dirname,
    '../src/app/components/lawyer/DecisionsAndAppealsEngine/utils/appeal-engine',
);

function fixPaths(text) {
    return text
        .replace(/from '\.\.\/types'/g, "from '../../types'")
        .replace(/from '\.\.\/decisionCardGlassShell'/g, "from '../../decisionCardGlassShell'")
        .replace(/from '\.\.\/appealUiLabels'/g, "from '../../appealUiLabels'");
}

function stripHeader(text) {
    const m = text.match(/\nexport /);
    if (!m || m.index === undefined) return text;
    return text.slice(m.index + 1);
}

// Merge creditor modules
const enforcement = fixPaths(fs.readFileSync(path.join(dir, 'creditorAppealEnforcement.ts'), 'utf8'));
const gate = fixPaths(fs.readFileSync(path.join(dir, 'creditorAppealGate.ts'), 'utf8'));
const enforcementBody = stripHeader(enforcement);
const gateBody = stripHeader(gate)
    .replace(/^export type ExecutorRequestFollowupBlock[^\n]+\n\n/, '')
    .replace(/^export type CreditorRequestAppealGate[\s\S]*?\};\n\n/, '');

const creditorPolicyHeader = `import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorLedgerEnforcementState } from './manualExecutorLedger';
import {
    appealPipelineRowForCard,
    effectiveExecutorOutcomeForCreditorHubPill,
} from './decisionHubPipeline';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
    resolveEffectiveAwaitingCassationParty,
    isDebtorAppealEligibleApprovedHub,
} from './appealProceedings';
import { resolveAppealBaseBranch } from './appealWorkflowActors';
import type {
    CreditorRequestAppealGate,
    CreditorDecisionEnforcementState,
    DecisionHubStatusPillTone,
    ExecutorRequestFollowupBlock,
} from './appealTypes';

`;

const policyBody = enforcementBody
    .replace(/^export type CreditorRequestAppealGate[\s\S]*?\};\n\n/, '')
    .replace(/^export type CreditorDecisionEnforcementState[\s\S]*?\};\n\n/, '')
    .replace(/DecisionHubStatusPillTone/g, 'DecisionHubStatusPillTone');

fs.writeFileSync(
    path.join(dir, 'creditorAppealPolicy.ts'),
    creditorPolicyHeader + 'export ' + policyBody + '\n' + gateBody,
);
fs.unlinkSync(path.join(dir, 'creditorAppealEnforcement.ts'));
fs.unlinkSync(path.join(dir, 'creditorAppealGate.ts'));

// Trim manualExecutorLedger duplicates — re-export identity helpers
let ledger = fixPaths(fs.readFileSync(path.join(dir, 'manualExecutorLedger.ts'), 'utf8'));
ledger = ledger.replace(
    /export function isManualExecutorLedgerDecision[\s\S]*?return d\.manualExecutorLedgerEntry === true;\n}\n\n/,
    "export { isManualExecutorLedgerDecision, resolveExecutorDecisionStatusFlag, resolveManualExecutorWorkflowPhase, isAppealDeadlinePerpetuallyEnforced } from './manualExecutorIdentity';\n\n",
);
ledger = ledger.replace(
    /export type ExecutorDecisionStatusFlag = 1 \| 2 \| 3;\n\nexport function resolveExecutorDecisionStatusFlag[\s\S]*?return 1;\n}\n\n/,
    '',
);
ledger = ledger.replace(
    /export type ManualExecutorWorkflowPhase[\s\S]*?return 'cassation_pending';\n}\n\n/,
    '',
);
ledger = ledger.replace(
    /export function isAppealDeadlinePerpetuallyEnforced[\s\S]*?return d\.appealDeadlinePerpetuallyEnforced === true;\n}\n\n/,
    '',
);
if (!ledger.includes("from './appealDates'")) {
    ledger = ledger.replace(
        /(from '\.\.\/appealRequestOrigin';\n)/,
        "$1import { appealWindowsForDecision } from './appealDates';\nimport type { CreditorDecisionEnforcementState } from './appealTypes';\nimport { resolveManualExecutorWorkflowPhase } from './manualExecutorIdentity';\n",
    );
}
fs.writeFileSync(path.join(dir, 'manualExecutorLedger.ts'), ledger);

// appealDates — identity only
let dates = fixPaths(fs.readFileSync(path.join(dir, 'appealDates.ts'), 'utf8'));
if (!dates.includes("manualExecutorIdentity")) {
    dates = dates.replace(
        /(from '\.\.\/appealRequestOrigin';\n)/,
        "$1import {\n    isManualExecutorLedgerDecision,\n    resolveExecutorDecisionStatusFlag,\n    resolveManualExecutorWorkflowPhase,\n} from './manualExecutorIdentity';\n",
    );
}
fs.writeFileSync(path.join(dir, 'appealDates.ts'), dates);

// appealProceedings cross-imports
let proceedings = fixPaths(fs.readFileSync(path.join(dir, 'appealProceedings.ts'), 'utf8'));
if (!proceedings.includes("from './manualExecutorLedger'")) {
    proceedings = proceedings.replace(
        /(from '\.\.\/appealRequestOrigin';\n)/,
        `$1import {
    isManualExecutorAppealRow,
    manualExecutorAwaitingCassationParty,
    resolveManualExecutorGrievanceFiler,
} from './manualExecutorLedger';
import {
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
} from './appealWorkflowActors';
`,
    );
}
fs.writeFileSync(path.join(dir, 'appealProceedings.ts'), proceedings);

// appealWorkflowActors
let actors = fixPaths(fs.readFileSync(path.join(dir, 'appealWorkflowActors.ts'), 'utf8'));
if (!actors.includes("from './manualExecutorIdentity'")) {
    actors = actors.replace(
        /(from '\.\.\/appealRequestOrigin';\n)/,
        "$1import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';\n",
    );
}
fs.writeFileSync(path.join(dir, 'appealWorkflowActors.ts'), actors);

// decisionHubPipeline
let hub = fixPaths(fs.readFileSync(path.join(dir, 'decisionHubPipeline.tsx'), 'utf8'));
hub = hub.replace(
    /^import \{ createElement, type ReactNode \} from 'react';\nimport \{ stripEmojisFromText \}[\s\S]*?from '\.\.\/appealRequestOrigin';\n\n/,
    `import { createElement } from 'react';
import type { Decision } from '../../types';
import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { isCreditorPartyRequest } from '../appealRequestOrigin';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';
import { isAppealDeadlinePerpetuallyEnforced } from './manualExecutorIdentity';
import type { DecisionHubStatusPillTone } from './appealTypes';

`,
);
if (!hub.includes('resolveGrievanceFilerActor')) {
    hub = hub.replace(
        /(from '\.\/appealTypes';\n\n)/,
        `$1export type { DecisionHubStatusPillTone } from './appealTypes';

`,
    );
}
// Remove duplicate DecisionHubStatusPillTone export type if we re-export
hub = hub.replace(
    /export type DecisionHubStatusPillTone = 'red'[\s\S]*?'neutral';\n\n/,
    '',
);
fs.writeFileSync(path.join(dir, 'decisionHubPipeline.tsx'), hub);

// appealsHubCatalog
let catalog = fixPaths(fs.readFileSync(path.join(dir, 'appealsHubCatalog.ts'), 'utf8'));
catalog = catalog.replace(
    /} from '\.\.\/appealRequestOrigin';import \{ executionDecisionAppealPipelineActive[\s\S]*?from '\.\.\/appealRequestOrigin';\n/,
    "} from '../appealRequestOrigin';\n",
);
catalog = `import { executionDecisionAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorWorkflowPhase } from './manualExecutorIdentity';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
} from './appealWorkflowActors';
import { resolveEffectiveAwaitingCassationParty } from './appealProceedings';

` + stripHeader(catalog);
fs.writeFileSync(path.join(dir, 'appealsHubCatalog.ts'), catalog);

// decisionCardFormatting — minimal imports
fs.writeFileSync(
    path.join(dir, 'decisionCardFormatting.ts'),
    `import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';

export const DECISION_GLASS_CARD =
    'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-lg';

export function getStatusBorderClass(_status: string, _outcome: string | undefined, _origin: string | undefined): string {
    return '';
}

export function formatDateNumeric(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function cleanTitle(title: string): string {
    return stripEmojisFromText(title).trim();
}
`,
);

// index
fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `/** Appeal engine — domain modules */
export * from './appealTypes';
export * from './manualExecutorIdentity';
export * from './appealProceedings';
export * from './manualExecutorLedger';
export * from './decisionCardFormatting';
export * from './appealDates';
export * from './appealWorkflowActors';
export * from './decisionHubPipeline';
export * from './creditorAppealPolicy';
export * from './appealsHubCatalog';
`,
);

console.log('Appeal-engine modules fixed');
