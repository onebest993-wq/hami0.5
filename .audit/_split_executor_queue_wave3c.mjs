import fs from 'fs';
import path from 'path';

const root = 'src/app/utils';
const readFile = path.join(root, 'executorSeizureDecisionQueueRead.ts');
const appendFile = path.join(root, 'executorSeizureDecisionQueueAppend.ts');
const lines = fs.readFileSync(readFile, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const governingSeizure = slice(110, 137);
const inactive = slice(386, 423);
const pcThroughOutcome = [
  slice(425, 586),
  slice(633, 676),
  slice(704, 734),
].join('\n\n');
const governingEviction = [
  slice(800, 956),
  slice(986, 993),
  slice(1062, 1148),
].join('\n\n');

const governingBody = [
  governingSeizure,
  inactive,
  pcThroughOutcome,
  governingEviction,
].join('\n\n');

const governingHeader = `// @ts-nocheck
/**
 * Governing decision selectors for the executor seizure decision queue.
 */

import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    isCassationAffirmResult,
    isExecutorRequestAppealCycleSupersededFromRecord,
    isExecutorRequestFollowupBlockedFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
    EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES,
    buildSeizureSubtypeMatcher,
    evictionProcedureRowsMatch,
    isEvictionProcedureHubRow,
    isExecutorHubRowSuperseded,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
`;

fs.writeFileSync(
  path.join(root, 'executorSeizureDecisionQueueReadGoverning.ts'),
  governingHeader + '\n' + governingBody + '\n'
);

const resolveBody = [
  slice(47, 90),
  slice(139, 205),
  slice(223, 384),
  slice(678, 702),
  slice(958, 984),
  slice(995, 1060),
].join('\n\n');

const resolveHeader = `// @ts-nocheck
/**
 * Resolve / heir / eviction-gate helpers for the executor seizure decision queue.
 */

import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import { parseCreditorPartyDeathPayload } from '@/app/utils/creditorPartyDeathPersistence';
import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsUnionAcrossCandidateIds,
} from '@/app/utils/executionDecisionsNamespace';
import { resolveExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type CreditorHeirSubstitutionRequestStatus,
    type DebtorHeirSubstitutionRequestStatus,
    type PersonalCoerciveSubtype,
    isDebtorHeirSubstitutionDecisionRow,
    isEvictionProcedureRowPending,
    latestExecutorDecisionRow,
    readActiveExecutorDecisionsForMutate,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    getGoverningEvictionProcedureRowForNewRequest,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getNewestEvictionProcedureRowForBranch,
    getNewestEvictionProcedureRowForMatch,
    isEvictionProcedureRowActive,
    isExecutorHubRowInactiveForGoverning,
    isPersonalCoerciveSubtypeRowPending,
} from '@/app/utils/executorSeizureDecisionQueueReadGoverning';
`;

fs.writeFileSync(
  path.join(root, 'executorSeizureDecisionQueueReadResolve.ts'),
  resolveHeader + '\n' + resolveBody + '\n'
);

const readRemaining = [
  slice(92, 108),
  slice(737, 798),
].join('\n\n');

const readBarrel = `// @ts-nocheck
/**
 * Read / query helpers for the executor seizure decision queue.
 * Thin barrel — governing and resolve peels live in sibling modules.
 */

import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type SeizureRequestSubtype,
    type UnifiedCollectionDecisionState,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

export {
    getGoverningSeizureDecisionBySubtypeFromDecisions,
    getGoverningSeizureDecisionBySubtype,
    isExecutorHubRowInactiveForGoverning,
    getPersonalCoerciveSubtypeAppealRowFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    getNewestPersonalCoerciveSubtypeRow,
    isPersonalCoerciveSubtypeRowPending,
    getGoverningDossierPresentationRow,
    getDossierPresentationOutcome,
    getGoverningPersonalCoerciveSubtypeRow,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    hasActivePersonalCoerciveSubtypeCard,
    getPersonalCoerciveSubtypeOutcome,
    getNewestEvictionProcedureRowForMatch,
    listSeizureHubRows,
    listGuarantorHubRows,
    listEvictionProcedureHubRowsForBranch,
    listEvictionProcedureHubRowsForMatch,
    getNewestEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    getGoverningEncroachmentProcedureRowForMatch,
    getGoverningEvictionProcedureRowForNewRequest,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueueReadGoverning';

export {
    getExecutorDecisionRowById,
    resolveExecutorDecisionRowContext,
    findLatestHeirSubstitutionDecisionNeedingEntry,
    hasPendingCreditorDeathOnlyReport,
    hasPendingCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    findApprovedFieldVisitNeedingSchedule,
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    resolvePersonalCoerciveDecisionsNav,
    hasBlockingEvictionProcedureDuplicate,
    evictionBranchGateInput,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
} from '@/app/utils/executorSeizureDecisionQueueReadResolve';

${readRemaining}
`;

fs.writeFileSync(readFile, readBarrel);

const aLines = fs.readFileSync(appendFile, 'utf8').split(/\r?\n/);
const aSlice = (a, b) => aLines.slice(a - 1, b).join('\n');

const specialBody = aSlice(54, 178);
const coreBody = aSlice(180, aLines.length);

const specialHeader = `// @ts-nocheck
/**
 * Special-followup append helpers for the executor seizure decision queue.
 */

import { COMMUNICATION_JOURNAL_TITLE_KEYWORD } from '@/app/utils/executionDomainIsolation';
import {
    assertDomainGate,
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    newExecutorDecisionId,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
`;

fs.writeFileSync(
  path.join(root, 'executorSeizureDecisionQueueAppendSpecial.ts'),
  specialHeader + '\n' + specialBody + '\n'
);

const coreHeader = `// @ts-nocheck
/**
 * Core append helpers for the executor seizure decision queue
 * (seizure, detention, coercive, guarantor, eviction, etc.).
 */

import { type EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    stringifyCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
} from '@/app/utils/creditorPartyDeathPersistence';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isExecutorRowEffectivelyApproved } from '@/app/utils/executorDecisionRowApproval';
import {
    type EvictionRequestKind,
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
    type SeizureRequestTarget,
    assertDomainGate,
    buildPersonalCoerciveSubtypeMatcher,
    creditorPartyDeathDecisionTitle,
    dispatchDecisionsReload,
    evictionProcedureRowsMatch,
    executorDecisionRowHubDefaults,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowPending,
    isExecutiveDossierPresentationSubtype,
    isExecutorHubRowSuperseded,
    isGuarantorRequestDecisionRow,
    newExecutorDecisionId,
    parseSeizedMovableIdFromPayloadJson,
    parseSeizedPropertyIdFromPayloadJson,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    readSeizureRequestTarget,
    stringifyDebtorPartyDeathPayload,
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import {
    evictionBranchGateInput,
    getDebtorHeirSubstitutionRequestStatus,
    getGoverningEvictionProcedureRowForNewRequest,
    getGoverningPersonalCoerciveSubtypeRow,
    hasPendingCreditorPartyDeathRequest,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isExecutorHubRowInactiveForGoverning,
    isPersonalCoerciveSubtypeRowPending,
} from '@/app/utils/executorSeizureDecisionQueueRead';
`;

fs.writeFileSync(
  path.join(root, 'executorSeizureDecisionQueueAppendCore.ts'),
  coreHeader + '\n' + coreBody + '\n'
);

const appendBarrel = `// @ts-nocheck
/**
 * Append helpers for the executor seizure decision queue.
 * Thin barrel — special and core peels live in sibling modules.
 */

export {
    appendSpecialFollowupRequest,
    appendCommunicationJournalRequest,
} from '@/app/utils/executorSeizureDecisionQueueAppendSpecial';

export {
    appendGuarantorFollowupRequest,
    appendTrustDisburseRequest,
    appendThirdPartyFundsReceivedDecision,
    appendPersonalCoerciveExecutorRequest,
    appendExecutiveDetentionJudgeDecision,
    appendPendingExecutorSeizureDecision,
    appendCreditorPartyDeathRequest,
    appendDebtorHeirSubstitutionRequest,
    appendPersonalCoerciveByExecutorOrder,
    appendEvictionExecutorRequest,
} from '@/app/utils/executorSeizureDecisionQueueAppendCore';
`;

fs.writeFileSync(appendFile, appendBarrel);

console.log('Wrote peels successfully');
for (const f of [
  'executorSeizureDecisionQueueRead.ts',
  'executorSeizureDecisionQueueReadGoverning.ts',
  'executorSeizureDecisionQueueReadResolve.ts',
  'executorSeizureDecisionQueueAppend.ts',
  'executorSeizureDecisionQueueAppendSpecial.ts',
  'executorSeizureDecisionQueueAppendCore.ts',
]) {
  const p = path.join(root, f);
  const n = fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
  console.log(n, f);
}
