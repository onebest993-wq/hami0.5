/**
 * Split calendarBridge.ts → calendar/bridge/*
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/app/services');
const srcPath = path.join(root, 'calendarBridge.ts');
const outDir = path.join(root, 'calendar/bridge');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);
const slice = (start, end) => lines.slice(start - 1, end).join('\n');
const header = slice(1, 5);

const coreBody = `${header}
import { toBaghdadYmd } from '@/app/utils/baghdadTime';
import type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';

${slice(20, 143)}

${slice(184, 200)}
`;

const syncEngineImports = `import { CalendarDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { debug } from '@/app/utils/debug';
import type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
import {
    buildStableBridgeId,
    normalizeDateToYmd,
    resolveCalendarUserId,
    moduleLabelAr,
    buildNotesBlock,
    notifyCalendarUpdated,
} from './core';
`;

const syncEngineBody = `${header}
${syncEngineImports}

function stableBridgeId(sourceModule: string, sourceEntityId: string, sourceEventId: string): string {
    return buildStableBridgeId(sourceModule, sourceEntityId, sourceEventId);
}

${slice(224, 363)}

${slice(150, 182)}
`;

// Export moduleLabelAr, buildNotesBlock, notifyCalendarUpdated from core - need to export private functions from slice 87-128
const coreBodyFixed = coreBody
    .replace('function moduleLabelAr', 'export function moduleLabelAr')
    .replace('function buildNotesBlock', 'export function buildNotesBlock')
    .replace('function notifyCalendarUpdated()', 'export function notifyCalendarUpdated()');

const legacyBody = `${header}
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import {
    normalizeDateToYmd,
    partiesSummaryFromList,
} from './core';
import { fireAndForgetCalendarSync } from './syncEngine';
import { removeCalendarBySource, upsertCalendarFromModule } from './syncEngine';
import {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
} from '@/app/services/calendar/bridgePersistence/propagate';

${slice(366, 723)}
`;

const indexBody = `${header}
export { CALENDAR_UPDATED_EVENT, CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
export type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
export * from './core';
export * from './syncEngine';
export { CalendarBridge } from './legacyCalendarBridge';
export {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
    isBridgedCalendarEvent,
} from '@/app/services/calendar/bridgePersistence';
export type { CalendarSourcePatchDetail } from '@/app/services/calendar/bridgePersistence';
`;

const barrelBody = `${header}
export * from './calendar/bridge';
`;

fs.mkdirSync(outDir, { recursive: true });

for (const [name, body] of Object.entries({
    'core.ts': coreBodyFixed,
    'syncEngine.ts': syncEngineBody,
    'legacyCalendarBridge.ts': legacyBody,
    'index.ts': indexBody,
})) {
    fs.writeFileSync(path.join(outDir, name), `${body}\n`, 'utf8');
}

fs.writeFileSync(srcPath, `${barrelBody}\n`, 'utf8');
console.log('calendarBridge split OK');
