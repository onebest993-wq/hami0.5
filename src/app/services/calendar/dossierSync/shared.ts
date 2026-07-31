/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import type { LegalTask } from '@/app/types/TaskEngine';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    deserializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    dispatchCalendarUpdatedEvent,
    normalizeDateToYmd,
} from '@/app/services/calendarBridge';
import { fieldTaskHasExplicitUserDate } from '@/app/services/calendarAuthenticity';
import type { DossierSyncStats } from './types';


export function mergeEntityListById(
    fromStorage: unknown[],
    live?: unknown[],
): Record<string, unknown>[] {
    const map = new Map<string, Record<string, unknown>>();
    for (const raw of fromStorage) {
        if (!isRecord(raw)) continue;
        const id = String(raw.id ?? '').trim();
        if (!id) continue;
        map.set(id, raw);
    }
    if (Array.isArray(live)) {
        for (const raw of live) {
            if (!isRecord(raw)) continue;
            const id = String(raw.id ?? '').trim();
            if (!id) continue;
            map.set(id, raw);
        }
    }
    return [...map.values()];
}

export function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

export function readStr(o: Record<string, unknown>, key: string): string {
    const v = o[key];
    return typeof v === 'string' ? v.trim() : '';
}

export function readEntityId(file: Record<string, unknown>): string | number | null {
    const id = file.id;
    if (id === undefined || id === null) return null;
    if (typeof id === 'string' || typeof id === 'number') return id;
    return String(id);
}

export function clientNameFromPartiesList(parties: unknown): string {
    if (!Array.isArray(parties)) return '';
    for (const p of parties) {
        if (!isRecord(p)) continue;
        if (p.isClient === true || /موكل|client/i.test(String(p.role ?? ''))) {
            const name = readStr(p, 'name');
            if (name) return name;
        }
    }
    for (const p of parties) {
        if (!isRecord(p)) continue;
        const name = readStr(p, 'name');
        if (name) return name;
    }
    return '';
}

export function criminalClientName(caseRecord: Record<string, unknown>): string {
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    for (const d of defendants) {
        if (!d || typeof d !== 'object') continue;
        const o = d as Record<string, unknown>;
        if (o.isOurClient === true || o.isClient === true) {
            const name = readStr(o, 'name') || readStr(o, 'fullName');
            if (name) return name;
        }
    }
    for (const d of defendants) {
        if (!d || typeof d !== 'object') continue;
        const name = readStr(d as Record<string, unknown>, 'name');
        if (name) return name;
    }
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    for (const c of complainants) {
        if (!c || typeof c !== 'object') continue;
        const name = readStr(c as Record<string, unknown>, 'name');
        if (name) return name;
    }
    return '';
}

export function taskDateYmd(task: LegalTask): string | null {
    if (!fieldTaskHasExplicitUserDate(task)) return null;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) {
        return normalizeDateToYmd(task.reminderAt.toISOString());
    }
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) {
        return normalizeDateToYmd(task.parsedDate.toISOString());
    }
    return null;
}

export function isFieldTaskCalendarEligible(task: LegalTask): boolean {
    return taskDateYmd(task) !== null;
}

export function criminalCaseNumber(caseRecord: Record<string, unknown>): string {
    const loc = caseRecord.location;
    if (loc && typeof loc === 'object') {
        const cn = readStr(loc as Record<string, unknown>, 'caseNumber');
        if (cn) return cn;
    }
    return readStr(caseRecord, 'courtCaseNumber') || readStr(caseRecord, 'investigationCaseNumber');
}

export function dispatchCalendarUpdated(): void {
    dispatchCalendarUpdatedEvent();
}

export function moduleLabelArSafe(module: CalendarSourceModule): string {
    switch (module) {
        case 'lawsuit': return 'دعوى مدنية';
        case 'execution': return 'تنفيذ';
        case 'urgent': return 'قضاء مستعجل';
        case 'transaction': return 'معاملة';
        case 'criminal': return 'جزائي';
        case 'threading': return 'معاملة إدارية';
        case 'task': return 'مهمة ميدان';
        case 'note': return 'ملاحظة';
        default: return 'موعد';
    }
}

export function loadFieldTasksRaw(): LegalTask[] {
    try {
        const blob = persistenceRepository.load(QUANTUM_TASKS_STORAGE_KEY);
        return deserializeQuantumTasks(blob);
    } catch {
        return [];
    }
}

export const EMPTY_STATS = (): DossierSyncStats => ({
    lawsuitAppointments: 0,
    lawsuitTasks: 0,
    lawsuitDeadlines: 0,
    executionAppointments: 0,
    executionTasks: 0,
    urgentHearings: 0,
    transactionSteps: 0,
    criminalTimeline: 0,
    criminalTrials: 0,
    threadingTasks: 0,
    globalNotes: 0,
    fieldTasks: 0,
    lawsuitLegacy: 0,
    discoveredDates: 0,
    prunedOrphans: 0,
    purgedInactive: 0,
});

