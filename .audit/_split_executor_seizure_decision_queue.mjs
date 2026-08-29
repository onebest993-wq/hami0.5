/**
 * Split executorSeizureDecisionQueue.ts into Windows-safe sibling modules.
 * Preserves exact function bodies from the source file.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/utils');
const srcPath = path.join(root, 'executorSeizureDecisionQueue.ts');
const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

/** 1-based inclusive */
function body(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

fs.writeFileSync(srcPath + '.bak', raw, 'utf8');

const typesHeader = `// @ts-nocheck
/**
 * Types, hub defaults, pure row predicates, and shared mutate/IO primitives
 * for the executor seizure decision queue.
 */

import {
    dispatchDomainIsolationBlocked,
    gateExecutorRequestPersist,
    resolveExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import {
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
    flushExecutorDecisionsStorageImmediate,
} from '@/app/utils/executionDecisionsNamespace';
import { type CreditorPartyDeathStoredAction } from '@/app/utils/creditorPartyDeathPersistence';
import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorDecisionRowApproval';

`;

// Build Types from selected original ranges, converting private helpers to export where siblings need them.
const typesParts = [
  // DECISIONS_RELOAD through persistExecutorDecisionsArray (59-110) — export helpers
  body(59, 110)
    .replace(/^function newExecutorDecisionId/m, 'export function newExecutorDecisionId')
    .replace(/^function parseStoredDecisionsArray/m, 'export function parseStoredDecisionsArray')
    .replace(/^function readActiveExecutorDecisionsForMutate/m, 'export function readActiveExecutorDecisionsForMutate')
    .replace(/^function persistExecutorDecisionsArray/m, 'export function persistExecutorDecisionsArray'),
  // hub defaults + subtype types + readSeizureRequestTarget (112-172)
  body(112, 172),
  // assertDomainGate (290-309) — export
  body(290, 309).replace(/^function assertDomainGate/m, 'export function assertDomainGate'),
  // EvictionRequestKind (879-883)
  body(879, 883),
  // ExecutorDispatcherRoute + isGuarantor + infer (1030-1072)
  body(1030, 1072),
  // creditorPartyDeathDecisionTitle (1074-1087) — export
  body(1074, 1087).replace(/^function creditorPartyDeathDecisionTitle/m, 'export function creditorPartyDeathDecisionTitle'),
  // CreditorHeirSubstitutionRequestStatus (1115-1120)
  body(1115, 1120),
  // latestExecutorDecisionRow (1122-1129) — export
  body(1122, 1129).replace(/^function latestExecutorDecisionRow/m, 'export function latestExecutorDecisionRow'),
  // DebtorHeirSubstitution types + parse/stringify + isDebtor (1195-1233)
  body(1195, 1233)
    .replace(/^function parseDebtorPartyDeathPayload/m, 'export function parseDebtorPartyDeathPayload')
    .replace(/^function stringifyDebtorPartyDeathPayload/m, 'export function stringifyDebtorPartyDeathPayload'),
  // isExecutorHubRowSuperseded (1489-1492)
  body(1489, 1492),
  // buildPersonalCoerciveSubtypeMatcher + supersede helpers (1533-1592)
  body(1533, 1592)
    .replace(/^function buildPersonalCoerciveSubtypeMatcher/m, 'export function buildPersonalCoerciveSubtypeMatcher')
    .replace(/^function supersedeRejectedFinalExecutorHubRows/m, 'export function supersedeRejectedFinalExecutorHubRows')
    .replace(/^function supersedePriorExecutorHubRows/m, 'export function supersedePriorExecutorHubRows'),
  // UnifiedCollectionDecisionState type only (2060-2061)
  body(2060, 2061),
  // normalize eviction + match helpers (2076-2133)
  body(2076, 2133),
  // buildSeizureSubtypeMatcher (236-241) — export (needed by read+patch)
  body(236, 241).replace(/^function buildSeizureSubtypeMatcher/m, 'export function buildSeizureSubtypeMatcher'),
  // parse seized ids (766-786)
  body(766, 786)
    .replace(/^function parseSeizedMovableIdFromPayloadJson/m, 'export function parseSeizedMovableIdFromPayloadJson')
    .replace(/^function parseSeizedPropertyIdFromPayloadJson/m, 'export function parseSeizedPropertyIdFromPayloadJson'),
];

const typesPath = path.join(root, 'executorSeizureDecisionQueueTypes.ts');
fs.writeFileSync(typesPath, typesHeader + typesParts.join('\n\n') + '\n', 'utf8');

const readHeader = `// @ts-nocheck
/**
 * Read / query / governing helpers for the executor seizure decision queue.
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
import {
    isCassationAffirmResult,
    isExecutorRequestAppealCycleSupersededFromRecord,
    isExecutorRequestFollowupBlockedFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
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
    type SeizureRequestSubtype,
    type UnifiedCollectionDecisionState,
    EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES,
    buildSeizureSubtypeMatcher,
    evictionProcedureRowsMatch,
    isDebtorHeirSubstitutionDecisionRow,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowPending,
    isExecutorHubRowSuperseded,
    isGuarantorRequestDecisionRow,
    latestExecutorDecisionRow,
    readActiveExecutorDecisionsForMutate,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

`;

const readParts = [
  // getExecutorDecisionRowById + resolveContext + getLatestSeizure (173-234)
  body(173, 234),
  // getGoverning seizure (243-270) — buildSeizureSubtypeMatcher now imported
  body(243, 270),
  // findLatestHeir (988-1028)
  body(988, 1028),
  // hasPending creditor + getCreditorHeir status (1089-1154)
  body(1089, 1154),
  // getDebtorHeirSubstitutionRequestStatus (1272-1287)
  body(1272, 1287),
  // findApproved* (1365-1484)
  body(1365, 1484),
  // isExecutorHubRowInactiveForGoverning (1494-1531)
  body(1494, 1531),
  // personal coercive private helpers + getters through resolvePersonalCoerciveDecisionsNav (1594-1871)
  // NOTE: excludes buildPersonalCoerciveSubtypeMatcher (1533-1553) and supersede (1555-1592) — in Types
  // and excludes closePersonalCoercive (1873+) and appendPersonalCoerciveByExecutorOrder
  body(1594, 1871),
  // getPersonalCoerciveSubtypeOutcome (1952-1982)
  body(1952, 1982),
  // getGuarantorRequestOutcome through getLatestUnifiedCollection (2009-2074)
  body(2009, 2074),
  // eviction sort/list/governing through isEvictionProcedureRowWorkflowComplete (2111-2488)
  // But 2076-2133 is in Types (normalize/match/isHub/isPending). Start from evictionProcedureRowSortKey.
  // Original: 2111-2488 includes evictionProcedureRowSortKey through workflow complete.
  // Types already has 2076-2133 which includes through isEvictionProcedureRowPending.
  // So read needs 2111-2488 BUT 2111-2133 overlaps Types. Take 2135-2488 for getNewest... and rest,
  // PLUS private sort helpers 2111-2122 and hubDecision sort 2148-2158.
  body(2111, 2488),
];

const readPath = path.join(root, 'executorSeizureDecisionQueueRead.ts');
fs.writeFileSync(readPath, readHeader + readParts.join('\n\n') + '\n', 'utf8');

const appendHeader = `// @ts-nocheck
/**
 * Append helpers for the executor seizure decision queue.
 */

import { type EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    stringifyCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
} from '@/app/utils/creditorPartyDeathPersistence';
import { COMMUNICATION_JOURNAL_TITLE_KEYWORD } from '@/app/utils/executionDomainIsolation';
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
    isDebtorHeirSubstitutionDecisionRow,
    isEvictionProcedureHubRow,
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
    isEvictionProcedureRowPending,
    isExecutorHubRowInactiveForGoverning,
    isPersonalCoerciveSubtypeRowPending,
} from '@/app/utils/executorSeizureDecisionQueueRead';

`;

const appendParts = [
  body(311, 764), // appendSpecial through appendExecutiveDetentionJudge
  body(788, 877), // appendPendingExecutorSeizureDecision
  body(1157, 1270), // appendCreditor + appendDebtor (includes getDebtor status? No - appendDebtor is 1236-1270, getDebtor is 1272+)
  body(1893, 1950), // appendPersonalCoerciveByExecutorOrder
  body(2491, 2627), // appendEvictionExecutorRequest
];

const appendPath = path.join(root, 'executorSeizureDecisionQueueAppend.ts');
fs.writeFileSync(appendPath, appendHeader + appendParts.join('\n\n') + '\n', 'utf8');

const patchHeader = `// @ts-nocheck
/**
 * Patch / close-cycle / merge helpers for the executor seizure decision queue.
 */

import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsUnionForExecution,
    resolveDecisionRowNamespaceSlug,
    executionDecisionsNamespaceStorageKey,
    flushExecutorDecisionsStorageImmediate,
} from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
    buildPersonalCoerciveSubtypeMatcher,
    buildSeizureSubtypeMatcher,
    dispatchDecisionsReload,
    evictionProcedureRowsMatch,
    isEvictionProcedureHubRow,
    isExecutiveDossierPresentationSubtype,
    isExecutorHubRowSuperseded,
    isGuarantorRequestDecisionRow,
    parseStoredDecisionsArray,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import { resolveExecutorDecisionRowContext } from '@/app/utils/executorSeizureDecisionQueueRead';

`;

const patchParts = [
  // closeSeizureSubtypeDecisionCycle (272-288)
  body(272, 288),
  // patch* (885-986)
  body(885, 986),
  // mergeExecutorDecisionsInto (1289-1363)
  body(1289, 1363),
  // archiveExecutiveDetentionCycleDecisions (1756-1800)
  body(1756, 1800),
  // closePersonalCoerciveSubtypeDecisionCycle (1873-1890)
  body(1873, 1890),
  // supersedeGuarantorRequestDecisionsForExecution (1984-2007)
  body(1984, 2007),
  // supersedeEncroachmentRejectedHubRowsBeforeNewRequest (2318-2333)
  body(2318, 2333),
  // computeGuarantorApprovalMergePatch (2629-2679)
  body(2629, 2679),
];

const patchPath = path.join(root, 'executorSeizureDecisionQueuePatch.ts');
fs.writeFileSync(patchPath, patchHeader + patchParts.join('\n\n') + '\n', 'utf8');

const barrel = `// @ts-nocheck
/**
 * عند تقديم طلب حجز (راتب / عقار / مال منقول) يُسجَّل مسودة قرار قيد البت
 * في تخزين «القرارات والطعون» ليُكمِل المحامي بقرار منفذ العدل لاحقاً.
 *
 * Thin barrel — implementation lives in sibling modules (Windows-safe; no folder clash).
 */

export {
    isExecutorRowAppealOverturned,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
export { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';

export {
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES,
    isExecutiveDossierPresentationSubtype,
    readSeizureRequestTarget,
    isGuarantorRequestDecisionRow,
    inferExecutorDispatcherRoute,
    isDebtorHeirSubstitutionDecisionRow,
    isExecutorHubRowSuperseded,
    normalizeEvictionProcedureTitle,
    evictionProcedureRowsMatch,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowPending,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
export type {
    PersonalCoerciveSubtype,
    SeizureRequestSubtype,
    SeizureRequestTarget,
    EvictionRequestKind,
    ExecutorDispatcherRoute,
    CreditorHeirSubstitutionRequestStatus,
    DebtorHeirSubstitutionRequestStatus,
    UnifiedCollectionDecisionState,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

export {
    getExecutorDecisionRowById,
    resolveExecutorDecisionRowContext,
    getLatestSeizureDecisionBySubtype,
    getGoverningSeizureDecisionBySubtypeFromDecisions,
    getGoverningSeizureDecisionBySubtype,
    findLatestHeirSubstitutionDecisionNeedingEntry,
    hasPendingCreditorDeathOnlyReport,
    hasPendingCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    findApprovedFieldVisitNeedingSchedule,
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
    isExecutorHubRowInactiveForGoverning,
    getPersonalCoerciveSubtypeAppealRowFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    getNewestPersonalCoerciveSubtypeRow,
    getGoverningDossierPresentationRow,
    getDossierPresentationOutcome,
    getGoverningPersonalCoerciveSubtypeRow,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    hasActivePersonalCoerciveSubtypeCard,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    resolvePersonalCoerciveDecisionsNav,
    getPersonalCoerciveSubtypeOutcome,
    getGuarantorRequestOutcome,
    hasApprovedLawyerFeePayout,
    hasApprovedUnifiedCollection,
    getLatestUnifiedCollectionDecisionState,
    getNewestEvictionProcedureRowForMatch,
    listSeizureHubRows,
    listGuarantorHubRows,
    listEvictionProcedureHubRowsForBranch,
    listEvictionProcedureHubRowsForMatch,
    getNewestEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    hasBlockingEvictionProcedureDuplicate,
    getGoverningEncroachmentProcedureRowForMatch,
    isEvictionBranchBlockingNewRequest,
    getGoverningEvictionProcedureRowForNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueueRead';

export {
    appendSpecialFollowupRequest,
    appendCommunicationJournalRequest,
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
} from '@/app/utils/executorSeizureDecisionQueueAppend';

export {
    closeSeizureSubtypeDecisionCycle,
    patchExecutorDecisionRow,
    patchExecutorDecisionRowReliable,
    patchExecutorDecisionRowEverywhere,
    mergeExecutorDecisionsInto,
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    supersedeGuarantorRequestDecisionsForExecution,
    supersedeEncroachmentRejectedHubRowsBeforeNewRequest,
    computeGuarantorApprovalMergePatch,
} from '@/app/utils/executorSeizureDecisionQueuePatch';
`;

fs.writeFileSync(srcPath, barrel, 'utf8');

function loc(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
}
console.log(JSON.stringify({
  original: lines.length,
  types: loc(typesPath),
  read: loc(readPath),
  append: loc(appendPath),
  patch: loc(patchPath),
  barrel: loc(srcPath),
}, null, 2));
