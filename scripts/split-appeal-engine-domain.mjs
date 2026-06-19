/**
 * Split appealProceedings.ts + creditorAppealPolicy.ts into focused modules.
 * Run: node scripts/split-appeal-engine-domain.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.join(
    __dirname,
    '..',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/utils/appeal-engine',
);

function read(name) {
    return fs.readFileSync(path.join(engineDir, name), 'utf8').split(/\r?\n/);
}

function write(name, content) {
    fs.writeFileSync(path.join(engineDir, name), `${content.trimEnd()}\n`);
}

function slice(lines, start, end) {
    return lines.slice(start - 1, end).join('\n');
}

const proc = read('appealProceedings.ts');
const cred = read('creditorAppealPolicy.ts');
const credImports = slice(cred, 1, 47);

write(
    'appealProceedingsTypes.ts',
    `import type { ExecutionDecisionAppealPhase } from '@/app/types/execution';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';

${slice(proc, 43, 80)}
`,
);

write(
    'appealProceedingsManual.ts',
    `import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { appealGrievanceFilingClockPatch } from './appealDates';
import {
    resolveGrievanceFilerActor,
    resolveCassationAppellantLabel,
} from './appealWorkflowActors';
import {
    manualExecutorAwaitingCassationParty,
} from './manualExecutorLedger';
import type { AppealProceedingRow, ManualAppealAppellantActor } from './appealProceedingsTypes';
import {
    formatManualAppealAppellantsLabel,
    hasManualExecutorAppealAppellants,
} from './appealProceedingsTypes';
import { resolveAppealActorLabel } from './appealProceedingsActors';

${slice(proc, 99, 406)}
`,
);

write(
    'appealProceedingsActors.ts',
    `import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import { resolveRequestProponent } from '../appealRequestOrigin';
import {
    isManualExecutorAppealRow,
    manualExecutorAwaitingCassationParty,
    resolveManualExecutorGrievanceResult,
} from './manualExecutorLedger';
import {
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
    cassationEntryPartyAfterGrievanceGrant,
} from './appealWorkflowActors';

${slice(proc, 407, 519)}
`,
);

write(
    'appealProceedingsCatalog.ts',
    `import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import {
    inferAppealMethodsUsed,
    resolveCassationAppellantLabel,
    resolveGrievanceFilerActor,
} from './appealWorkflowActors';
import type { AppealProceedingRow } from './appealProceedingsTypes';
import { hasManualExecutorAppealAppellants } from './appealProceedingsTypes';
import { buildManualExecutorAppealProceedings } from './appealProceedingsManual';
import {
    isCassationAffirmResult,
    resolveAppealActorLabel,
    resolveEffectiveAwaitingCassationParty,
    appellantLabelFromLogMessage,
} from './appealProceedingsActors';

${slice(proc, 521, 786)}
`,
);

write(
    'appealProceedings.ts',
    `/** Barrel — appeal proceedings modules */
export * from './appealProceedingsTypes';
export * from './appealProceedingsManual';
export * from './appealProceedingsActors';
export * from './appealProceedingsCatalog';
`,
);

write(
    'creditorAppealDebtorAgentUi.ts',
    `${credImports}

${slice(cred, 94, 193)}
`,
);

write(
    'creditorAppealEnforcement.ts',
    `${credImports}
import {
    resolveAppealResultActorForClient,
    debtorAgentAppealStatusInHeaderPill,
} from './creditorAppealDebtorAgentUi';
import {
    resolveEffectiveAppealActor,
    resolveEffectiveAwaitingCassationParty,
} from './appealProceedings';

${slice(cred, 195, 567)}
`,
);

write(
    'creditorAppealExecutorFollowup.ts',
    `${credImports}

${slice(cred, 568, 712)}
`,
);

write(
    'creditorAppealGate.ts',
    `${credImports}

${slice(cred, 57, 82)}

${slice(cred, 714, 818)}

${slice(cred, 49, 55)}
`,
);

write(
    'creditorAppealWaiveCassation.ts',
    `${credImports}

${slice(cred, 819, 927)}
`,
);

write(
    'creditorAppealPolicy.ts',
    `/** Barrel — creditor appeal policy modules */
export * from './creditorAppealDebtorAgentUi';
export * from './creditorAppealEnforcement';
export * from './creditorAppealExecutorFollowup';
export * from './creditorAppealGate';
export * from './creditorAppealWaiveCassation';
`,
);

// Export appellantLabelFromLogMessage for catalog
let actors = fs.readFileSync(path.join(engineDir, 'appealProceedingsActors.ts'), 'utf8');
actors = actors.replace('function appellantLabelFromLogMessage', 'export function appellantLabelFromLogMessage');
fs.writeFileSync(path.join(engineDir, 'appealProceedingsActors.ts'), actors);

console.log('Split appealProceedings + creditorAppealPolicy into appeal-engine modules');
