import fs from 'fs';

const src = fs.readFileSync('src/app/types/execution/executionFile.ts', 'utf8');
const lines = src.split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const coreFields = slice(39, 167);
const debtorFields = slice(169, 267);
const decisionsFields = slice(269, 339);
const partyDeathFields = slice(341, 401);
const ordersFields = slice(403, 518);
const guarantorFields = slice(520, 586);
const evictionFields = slice(588, 668);
const legacyFields = slice(670, 706);

function wrap(name, imports, body, { before = '', after = '' } = {}) {
  const parts = [
    '/**',
    ` * ExecutionFile domain slice: ${name}.`,
    ' */',
    imports.trim(),
  ];
  if (before.trim()) {
    parts.push('', before.trimEnd());
  }
  parts.push('', `export interface ${name} {`, body, '}');
  if (after.trim()) {
    parts.push('', after.trimEnd());
  }
  return `${parts.join('\n')}\n`;
}

fs.writeFileSync(
  'src/app/types/execution/executionFileCore.ts',
  wrap(
    'ExecutionFileCore',
    `
import type { ClaimType, Currency, Directorate, ExecutionStatus } from './core';
import type { Creditor, Debtor, PartyMultiplicityExtension } from './party';
import type { AlimonyData } from './alimony';
import type { DocumentType } from './document';
import type { TimelineEvent } from './timeline';
import type { CoerciveAction } from './coercive';
import type {
  RealEstateSeizureAsset,
  SeizedAsset,
  SeizedMovable,
  SeizedProperty,
  StandaloneExecutionMark,
  ThirdPartySeizure,
  ThirdPartySeizureAsset,
} from './seizure';
`,
    coreFields,
  ),
);

fs.writeFileSync(
  'src/app/types/execution/executionFileDebtor.ts',
  wrap(
    'ExecutionFileDebtor',
    `
import type { DossierLifecycleStatus } from './core';
import type { OtherPartyActionLogEntry, OtherPartyRequestTrackEntry } from './financial';
import type { EmployeeSummonsAssignmentState, PublicationNoticeDebtorState } from './seizure';
`,
    debtorFields,
  ),
);

fs.writeFileSync(
  'src/app/types/execution/executionFileDecisions.ts',
  wrap('ExecutionFileDecisions', '', decisionsFields),
);

fs.writeFileSync(
  'src/app/types/execution/executionFilePartyDeath.ts',
  wrap('ExecutionFilePartyDeath', '', partyDeathFields),
);

fs.writeFileSync(
  'src/app/types/execution/executionFileOrders.ts',
  wrap(
    'ExecutionFileOrders',
    `
import type { LedgerEntry } from './financial';
import type { CommercialPaperDetails, DocumentDetails, ShariaDeedDetails } from './document';
`,
    ordersFields,
  ),
);

// Guarantor: extract named nested states so history arrays do not self-ref ExecutionFile.
const guarantorFollowupBlock = guarantorFields.match(
  /guarantor_followup\?: \{[\s\S]*?\} \| null;/,
)?.[0];
const proceduralBlock = guarantorFields.match(
  /procedural_guarantee\?: \{[\s\S]*?\} \| null;/,
)?.[0];
if (!guarantorFollowupBlock || !proceduralBlock) {
  throw new Error('Failed to extract guarantor nested blocks');
}

const guarantorStateIface = guarantorFollowupBlock
  .replace('guarantor_followup?:', 'export interface GuarantorFollowupState')
  .replace(/ \| null;$/, '');
const proceduralStateIface = proceduralBlock
  .replace('procedural_guarantee?:', 'export interface ProceduralGuaranteeState')
  .replace(/ \| null;$/, '');

let gBody = guarantorFields
  .replace(
    /guarantor_followup\?: \{[\s\S]*?\} \| null;/,
    'guarantor_followup?: GuarantorFollowupState | null;',
  )
  .replace(
    /guarantor_followup_history\?: Array<\s*NonNullable<ExecutionFile\['guarantor_followup'\]> & \{ archivedAt: string \}\s*>;/,
    'guarantor_followup_history?: GuarantorFollowupHistoryEntry[];',
  )
  .replace(
    /procedural_guarantee\?: \{[\s\S]*?\} \| null;/,
    'procedural_guarantee?: ProceduralGuaranteeState | null;',
  )
  .replace(
    /procedural_guarantee_history\?: Array<\s*NonNullable<ExecutionFile\['procedural_guarantee'\]> & \{ archivedAt: string \}\s*>;/,
    'procedural_guarantee_history?: ProceduralGuaranteeHistoryEntry[];',
  );

const guarantorBefore = `
${guarantorStateIface}

export type GuarantorFollowupHistoryEntry = GuarantorFollowupState & { archivedAt: string };

${proceduralStateIface}

export type ProceduralGuaranteeHistoryEntry = ProceduralGuaranteeState & { archivedAt: string };
`.trim();

const guarantorAfter = `
/** موافقة منفذ على الكفيل مع بيانات لم تُثبَّت بعد — حتى يُضغط «حفظ» صراحةً */
export function guarantorFollowupAwaitingDetailsSave(
    gf: GuarantorFollowupState | null | undefined
): boolean {
    if (!gf?.executor_approved) return false;
    return gf.details_saved !== true;
}

/** إظهار شارة الكفيل لدى الدائن الأول بعد موافقة المنفذ (قبل أو بعد تثبيت البيانات) */
export function guarantorFollowupCreditorNotationActive(
    gf: GuarantorFollowupState | null | undefined
): boolean {
    return gf?.executor_approved === true;
}
`.trim();

fs.writeFileSync(
  'src/app/types/execution/executionFileGuarantor.ts',
  wrap('ExecutionFileGuarantor', '', gBody, { before: guarantorBefore, after: guarantorAfter }),
);

fs.writeFileSync(
  'src/app/types/execution/executionFileEviction.ts',
  wrap(
    'ExecutionFileEviction',
    `
import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';
`,
    evictionFields,
    {
      after: `
/** وصفية تبليغ لاحق في تخلية — كاسب */
export interface EvictionSubsequentSummonsMeta {
    forCollection: boolean;
    branch: 'ordinary' | 'coercive' | null;
}
`,
    },
  ),
);

fs.writeFileSync(
  'src/app/types/execution/executionFileLegacyDisplay.ts',
  wrap(
    'ExecutionFileLegacyDisplay',
    `
import type { GhuramaDistributionLog } from './financial';
`,
    legacyFields,
  ),
);

const barrel = `/**
 * ExecutionFile dossier model — composed from domain slices; public helpers re-exported.
 */
export type { GuarantorFollowupHistoryEntry, GuarantorFollowupState, ProceduralGuaranteeHistoryEntry, ProceduralGuaranteeState } from './executionFileGuarantor';
export {
    guarantorFollowupAwaitingDetailsSave,
    guarantorFollowupCreditorNotationActive,
} from './executionFileGuarantor';
export type { EvictionSubsequentSummonsMeta } from './executionFileEviction';
export type { ExecutionFileCore } from './executionFileCore';
export type { ExecutionFileDebtor } from './executionFileDebtor';
export type { ExecutionFileDecisions } from './executionFileDecisions';
export type { ExecutionFilePartyDeath } from './executionFilePartyDeath';
export type { ExecutionFileOrders } from './executionFileOrders';
export type { ExecutionFileGuarantor } from './executionFileGuarantor';
export type { ExecutionFileEviction } from './executionFileEviction';
export type { ExecutionFileLegacyDisplay } from './executionFileLegacyDisplay';

import type { ExecutionFileCore } from './executionFileCore';
import type { ExecutionFileDebtor } from './executionFileDebtor';
import type { ExecutionFileDecisions } from './executionFileDecisions';
import type { ExecutionFilePartyDeath } from './executionFilePartyDeath';
import type { ExecutionFileOrders } from './executionFileOrders';
import type { ExecutionFileGuarantor } from './executionFileGuarantor';
import type { ExecutionFileEviction } from './executionFileEviction';
import type { ExecutionFileLegacyDisplay } from './executionFileLegacyDisplay';

export interface ExecutionFile
    extends ExecutionFileCore,
        ExecutionFileDebtor,
        ExecutionFileDecisions,
        ExecutionFilePartyDeath,
        ExecutionFileOrders,
        ExecutionFileGuarantor,
        ExecutionFileEviction,
        ExecutionFileLegacyDisplay {}
`;

fs.writeFileSync('src/app/types/execution/executionFile.ts', barrel);

const files = [
  'executionFile.ts',
  'executionFileCore.ts',
  'executionFileDebtor.ts',
  'executionFileDecisions.ts',
  'executionFilePartyDeath.ts',
  'executionFileOrders.ts',
  'executionFileGuarantor.ts',
  'executionFileEviction.ts',
  'executionFileLegacyDisplay.ts',
];
for (const f of files) {
  const n = fs.readFileSync(`src/app/types/execution/${f}`, 'utf8').split(/\r?\n/).length;
  console.log(`${f}: ${n}`);
}

