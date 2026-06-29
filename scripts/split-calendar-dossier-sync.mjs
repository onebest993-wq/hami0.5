/**
 * One-time splitter: calendarDossierSync.ts → calendar/dossierSync/*
 * Preserves @ts-nocheck and all exports via barrel + calendarDossierSync.ts re-export.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/app/services');
const srcPath = path.join(root, 'calendarDossierSync.ts');
const outDir = path.join(root, 'calendar/dossierSync');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

const slice = (start, end) => lines.slice(start - 1, end).join('\n');

fs.mkdirSync(outDir, { recursive: true });

const headerComment = slice(1, 5);

const typesBody = `${headerComment}
export { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';

${slice(46, 83).replace('type SyncScope', 'export type SyncScope').replace('type PruneOptions', 'export type PruneOptions')}
`;

const sharedImports = `import type { LegalTask } from '@/app/types/TaskEngine';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    deserializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    dispatchCalendarUpdatedEvent,
    normalizeDateToYmd,
    partiesSummaryFromList,
} from '@/app/services/calendarBridge';
import { fieldTaskHasExplicitUserDate } from '@/app/services/calendarAuthenticity';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import type { DossierSyncStats } from './types';
`;

const sharedBody = `${headerComment}
${sharedImports}

${slice(85, 121)
    .replace('function mergeEntityListById', 'export function mergeEntityListById')
    .replace('function isRecord', 'export function isRecord')
    .replace('function readStr', 'export function readStr')
    .replace('function readEntityId', 'export function readEntityId')}

${slice(146, 200)
    .replace('function clientNameFromPartiesList', 'export function clientNameFromPartiesList')
    .replace('function criminalClientName', 'export function criminalClientName')
    .replace('function taskDateYmd', 'export function taskDateYmd')
    .replace('function isFieldTaskCalendarEligible', 'export function isFieldTaskCalendarEligible')}

${slice(404, 411)
    .replace('function criminalCaseNumber', 'export function criminalCaseNumber')}

${slice(413, 415).replace('function dispatchCalendarUpdated', 'export function dispatchCalendarUpdated')}

${slice(644, 656).replace('function moduleLabelArSafe', 'export function moduleLabelArSafe')}

${slice(273, 280).replace('function loadFieldTasksRaw', 'export function loadFieldTasksRaw')}

${slice(1165, 1182).replace('const EMPTY_STATS', 'export const EMPTY_STATS')}
`;

const exclusionsBody = `${headerComment}
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { isRecord, readEntityId } from './shared';

${slice(123, 144)}

function findLawsuitFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadLawsuitFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
}

function findExecutionFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadExecutionFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
}

export { findLawsuitFile, findExecutionFile };
`;

const incrementalImports = `import {
    CalendarBridge,
    normalizeDateToYmd,
    upsertCalendarFromModule,
} from '@/app/services/calendarBridge';
import type { DossierSyncStats } from './types';
import { isRecord, readStr } from './shared';
`;

const incrementalBody = `${headerComment}
${incrementalImports}

${slice(203, 271)}

${slice(485, 603)}
`;

const lawsuitImports = `import {
    CalendarBridge,
    normalizeDateToYmd,
    upsertCalendarFromModule,
    partiesSummaryFromList,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';
import type { DossierSyncStats } from './types';
import type { SyncScope } from './types';
import { shouldExcludeLawsuitFromCalendar } from './exclusions';
import {
    clientNameFromPartiesList,
    isRecord,
    readEntityId,
    readStr,
} from './shared';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from './incrementalSync';
`;

const lawsuitBody = `${headerComment}
${lawsuitImports}

${slice(282, 402)}

${slice(670, 717).replace('function syncOneLawsuitFile', 'export function syncOneLawsuitFile')}
`;

const executionImports = `import { normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { DossierSyncStats } from './types';
import type { SyncScope } from './types';
import { shouldExcludeExecutionFromCalendar } from './exclusions';
import { isRecord, readEntityId, readStr } from './shared';
import { syncExecutionTimelineAppointment } from './incrementalSync';
`;

const executionBody = `${headerComment}
${executionImports}

${slice(719, 757).replace('function syncOneExecutionFile', 'export function syncOneExecutionFile')}
`;

const discoveredImports = `import {
    buildStableBridgeId,
    fireAndForgetCalendarSync,
} from '@/app/services/calendarBridge';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { discoverImplicitDossierDates } from '@/app/services/calendarDateSniffer';
import type { DossierSyncStats } from './types';
import { isRecord, moduleLabelArSafe } from './shared';
`;

const discoveredBody = `${headerComment}
${discoveredImports}

${slice(609, 668).replace('function collectDiscoveredBridgeIdsForFile', 'export function collectDiscoveredBridgeIdsForFile')}
`;

// criminalSync.ts
const criminalSyncExport = `${headerComment}
import { CalendarBridge, normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendarBridge';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import type { DossierSyncStats } from './types';
import { shouldExcludeCriminalFromCalendar } from './exclusions';
import {
    criminalCaseNumber,
    criminalClientName,
    EMPTY_STATS,
    isRecord,
    readEntityId,
    readStr,
} from './shared';
import { pruneOrphanedBridgedEventsForEntity, removeAllBridgedEventsForEntity } from './prune';

${slice(967, 980)}

${slice(1047, 1110).replace('function syncOneCriminalCase', 'export function syncOneCriminalCase')}

${slice(1112, 1116).replace('function syncCriminalCases', 'export function syncCriminalCases')}
`;

const auxiliaryImports = `import {
    CalendarBridge,
    flushPendingCalendarSyncs,
    normalizeDateToYmd,
    partiesSummaryFromList,
    resolveCalendarUserId,
    upsertCalendarFromModule,
} from '@/app/services/calendarBridge';
import { TransactionDB, TransactionsThreadingDB } from '@/app/services/lawyer-cloud';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { debug } from '@/app/utils/debug';
import type { DossierSyncStats } from './types';
import { isRecord, readStr } from './shared';
`;

const auxiliaryBody = `${headerComment}
${auxiliaryImports}

${slice(836, 964)}

${slice(982, 1045)}

${slice(1118, 1161).replace('async function syncThreadingTasks', 'export async function syncThreadingTasks')}
`;

const pruneImports = `import {
    buildStableBridgeId,
    CalendarBridge,
    dispatchCalendarUpdatedEvent,
    normalizeDateToYmd,
    partiesSummaryFromList,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { debug } from '@/app/utils/debug';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { CalendarDB, TransactionDB, TransactionsThreadingDB } from '@/app/services/lawyer-cloud';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { isBridgedCalendarEvent } from '@/app/services/calendarBridgePersistence';
import {
    isEphemeralLawsuitTaskId,
    isSyntheticBridgeSourceEventId,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendarAuthenticity';
import type { PruneOptions } from './types';
import {
    shouldExcludeCriminalFromCalendar,
    shouldExcludeExecutionFromCalendar,
    shouldExcludeLawsuitFromCalendar,
} from './exclusions';
import { collectDiscoveredBridgeIdsForFile } from './discoveredDates';
import {
    dispatchCalendarUpdated,
    isFieldTaskCalendarEligible,
    isRecord,
    loadFieldTasksRaw,
    mergeEntityListById,
    readStr,
    readEntityId,
    taskDateYmd,
} from './shared';
import { findExecutionFile, findLawsuitFile } from './exclusions';
`;

const pruneBody = `${headerComment}
${pruneImports}

${slice(425, 482)}

${slice(760, 834)}

${slice(1200, 1466)}

${slice(1658, 1741)}
`;

const orchestratorImports = `import {
    dispatchCalendarUpdatedEvent,
    flushPendingCalendarSyncs,
    muteCalendarUpdates,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { TransactionsThreadingDB } from '@/app/services/lawyer-cloud';
import { debug } from '@/app/utils/debug';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { DossierSyncStats, LiveCalendarSnapshots, SyncScope } from './types';
import {
    dispatchCalendarUpdated,
    EMPTY_STATS,
    isRecord,
    readEntityId,
} from './shared';
import { shouldExcludeExecutionFromCalendar, shouldExcludeLawsuitFromCalendar } from './exclusions';
import { syncOneExecutionFile } from './executionSync';
import { syncOneLawsuitFile } from './lawsuitSync';
import { syncOneCriminalCase, syncCriminalCases } from './criminalSync';
import { syncThreadingCalendarSnapshot, syncThreadingTasks } from './auxiliarySync';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import {
    pruneOrphanedBridgeEvents,
    purgeExcludedDossierBridgedEvents,
    purgeInactiveEntityBridgedEvents,
    purgeInauthenticBridgedEvents,
    purgeNonWhitelistedBridgedEvents,
    removeAllBridgedEventsForEntity,
} from './prune';
`;

const orchestratorBody = `${headerComment}
${orchestratorImports}

let reconcileInFlight: Promise<DossierSyncStats> | null = null;

async function finishDossierCalendarSync(
    userId: string,
    scope: SyncScope = {},
    live?: LiveCalendarSnapshots,
): Promise<void> {
    await flushPendingCalendarSyncs();
    const includeTasks = scope.includeTasks ?? true;
    await pruneOrphanedBridgeEvents(userId, { includeTasks, live });
    dispatchCalendarUpdated();
}

${slice(1482, 1492)}

let livePopulateInFlight: Promise<void> | null = null;
type LivePopulateParams = {
    lawyerId: string | null | undefined;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
};
let latestLivePopulateParams: { params: LivePopulateParams; emitUpdated: boolean } | null = null;

${slice(1505, 1601)}

${slice(1604, 1642)}

${slice(1743, 1812)}

${slice(1815, 1860)}
`;

const indexBody = `${headerComment}
export * from './types';
export * from './shared';
export * from './exclusions';
export * from './incrementalSync';
export * from './lawsuitSync';
export * from './executionSync';
export * from './discoveredDates';
export * from './criminalSync';
export * from './auxiliarySync';
export * from './prune';
export * from './orchestrator';
`;

const barrelBody = `${headerComment}
/** @deprecated import from '@/app/services/calendar/dossierSync' — kept for backward compatibility */
export * from './calendar/dossierSync';
`;

const files = {
    'types.ts': typesBody,
    'shared.ts': sharedBody,
    'exclusions.ts': exclusionsBody,
    'incrementalSync.ts': incrementalBody,
    'lawsuitSync.ts': lawsuitBody,
    'executionSync.ts': executionBody,
    'discoveredDates.ts': discoveredBody,
    'criminalSync.ts': criminalSyncExport,
    'auxiliarySync.ts': auxiliaryBody,
    'prune.ts': pruneBody,
    'orchestrator.ts': orchestratorBody,
    'index.ts': indexBody,
};

for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), `// @ts-nocheck\n${body}\n`, 'utf8');
}

fs.writeFileSync(srcPath, `// @ts-nocheck\n${barrelBody}\n`, 'utf8');
console.log('Split complete:', Object.keys(files).length, 'modules + barrel');
