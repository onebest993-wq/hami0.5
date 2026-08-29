import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalTask } from '@/app/types/TaskEngine';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import { fieldTaskDueYmd } from '@/app/services/fieldTaskAlerts';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function notesAlertsFingerprint(notes: unknown[]): string {
    return notes
        .filter(isRecord)
        .map((n) => {
            const id = String(n.id ?? '');
            const appt = typeof n.apptDate === 'string' ? n.apptDate : '';
            const rem = typeof n.reminder_at === 'string' ? n.reminder_at : '';
            return `${id}:${appt}:${rem}:${n.isPinned ? '1' : '0'}`;
        })
        .sort()
        .join('|');
}

function fieldTasksAlertsFingerprint(tasks: LegalTask[]): string {
    return tasks
        .map((t) => `${t.id}:${t.status}:${t.pinnedToFieldCurtain ? '1' : '0'}:${fieldTaskDueYmd(t) ?? ''}`)
        .sort()
        .join('|');
}

/** بصمة مصادر تنبيهات البطاقة — التواريخ والحالة لا تُختزل إلى عدد المعرّفات */
export function buildAlertsDataSignature(params: {
    files: FileData[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes: unknown[];
    fieldTasks?: LegalTask[];
}): string {
    return [
        buildCalendarDossierFingerprint(
            params.files,
            params.executionFiles,
            params.notes,
            params.fieldTasks ?? [],
            params.criminalCases ?? [],
        ),
        notesAlertsFingerprint(params.notes),
        fieldTasksAlertsFingerprint(params.fieldTasks ?? []),
    ].join('##');
}
