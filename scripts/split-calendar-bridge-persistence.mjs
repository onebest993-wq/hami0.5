/**
 * Split calendarBridgePersistence.ts → calendar/bridgePersistence/*
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/app/services');
const srcPath = path.join(root, 'calendarBridgePersistence.ts');
const outDir = path.join(root, 'calendar/bridgePersistence');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);
const slice = (start, end) => lines.slice(start - 1, end).join('\n');
const header = '';

const sharedImports = `import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadGlobalNotesRaw, saveGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    deserializeQuantumTasks,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionDB, TransactionsThreadingDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { patchCriminalCaseRecord } from '@/app/utils/criminalCasesStorage';
import { debug } from '@/app/utils/debug';
import { normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
`;

const sharedBody = `${header}
${sharedImports}

export { CALENDAR_SOURCE_PATCHED_EVENT };

${slice(20, 175)
    .replace('function notifySourcePatched', 'export function notifySourcePatched')
    .replace('function isRecord', 'export function isRecord')}

${slice(180, 507)
    .replace('async function patchThreadingTaskDeadline', 'export async function patchThreadingTaskDeadline')
    .replace('function patchLawsuitStorage', 'export function patchLawsuitStorage')
    .replace('function patchExecutionStorage', 'export function patchExecutionStorage')
    .replace('function applyLawsuitCalendarUpdate', 'export function applyLawsuitCalendarUpdate')
    .replace('function applyLawsuitCalendarRemoval', 'export function applyLawsuitCalendarRemoval')
    .replace('function applyExecutionAppointmentUpdate', 'export function applyExecutionAppointmentUpdate')
    .replace('function applyExecutionAppointmentTrash', 'export function applyExecutionAppointmentTrash')
    .replace('function patchGlobalNote', 'export function patchGlobalNote')
    .replace('function patchFieldTaskDue', 'export function patchFieldTaskDue')
    .replace('async function patchUrgentHearing', 'export async function patchUrgentHearing')
    .replace('async function patchTransactionStep', 'export async function patchTransactionStep')
    .replace('function applyCriminalCalendarUpdate', 'export function applyCriminalCalendarUpdate')
    .replace('function applyCriminalCalendarRemoval', 'export function applyCriminalCalendarRemoval')
    .replace('function stripTaskPrefix', 'export function stripTaskPrefix')
    .replace('function isNextUrgentHearingId', 'export function isNextUrgentHearingId')
    .replace('function isCriminalTrialBridgeId', 'export function isCriminalTrialBridgeId')}
`;

const propagateBody = `${header}
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';
import {
    isBridgedCalendarEvent,
    notifySourcePatched,
    stripTaskPrefix,
    isNextUrgentHearingId,
    patchLawsuitStorage,
    patchExecutionStorage,
    applyLawsuitCalendarUpdate,
    applyLawsuitCalendarRemoval,
    applyExecutionAppointmentUpdate,
    applyExecutionAppointmentTrash,
    patchGlobalNote,
    patchFieldTaskDue,
    patchUrgentHearing,
    patchTransactionStep,
    applyCriminalCalendarUpdate,
    applyCriminalCalendarRemoval,
    patchThreadingTaskDeadline,
} from './shared';
import { patchCriminalCaseRecord } from '@/app/utils/criminalCasesStorage';

${slice(509, 707)}
`;

const indexBody = `${header}
export * from './shared';
export * from './propagate';
`;

const barrelBody = `${header}
export * from './calendar/bridgePersistence';
`;

fs.mkdirSync(outDir, { recursive: true });

for (const [name, body] of Object.entries({
    'shared.ts': sharedBody,
    'propagate.ts': propagateBody,
    'index.ts': indexBody,
})) {
    fs.writeFileSync(path.join(outDir, name), `${body}\n`, 'utf8');
}

fs.writeFileSync(srcPath, `${barrelBody}\n`, 'utf8');
console.log('calendarBridgePersistence split OK');
