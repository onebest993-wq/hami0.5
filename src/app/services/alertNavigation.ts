import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SecretaryAlert, SecretaryAlertTarget } from '@/app/services/SecretaryOrchestrator';
import type { LegalTask } from '@/app/types/TaskEngine';

export type AlertNavigationAction =
    | { kind: 'tab'; tab: 'schedule' | 'community' | 'home' }
    | { kind: 'notepad'; noteId?: string }
    | { kind: 'client_requests' }
    | { kind: 'transactions'; entityId?: string }
    | { kind: 'threading_tx'; entityId: string }
    | { kind: 'urgent_dashboard'; entityId?: string }
    | { kind: 'open_lawsuit'; entityId: string }
    | { kind: 'open_execution'; entityId: string }
    | { kind: 'open_criminal'; entityId: string }
    | { kind: 'open_field_tasks' }
    | { kind: 'noop' };

export type AlertNavigationContext = {
    lawsuitFiles?: FileData[];
    fieldTasks?: LegalTask[];
};

function resolveFromCalendarSource(alert: SecretaryAlert): AlertNavigationAction | null {
    const cs = alert.calendarSource;
    if (!cs?.dossierModule || !cs.dossierId) return null;
    switch (cs.dossierModule) {
        case 'lawsuit':
            return { kind: 'open_lawsuit', entityId: cs.dossierId };
        case 'execution':
            return { kind: 'open_execution', entityId: cs.dossierId };
        case 'criminal':
            return { kind: 'open_criminal', entityId: cs.dossierId };
        case 'urgent':
            return { kind: 'urgent_dashboard', entityId: cs.dossierId };
        case 'threading':
            return { kind: 'threading_tx', entityId: cs.dossierId };
        case 'transaction':
            return { kind: 'transactions', entityId: cs.dossierId };
        default:
            return null;
    }
}

function resolveFieldTaskNavigation(
    alert: SecretaryAlert,
    ctx?: AlertNavigationContext,
): AlertNavigationAction | null {
    const cs = alert.calendarSource;
    if (cs?.module !== 'task' && cs?.module !== 'field_day_task') return null;

    const taskId = cs?.entityId ?? alert.entityId;
    if (ctx?.fieldTasks && taskId) {
        const task = ctx.fieldTasks.find((t) => String(t.id) === String(taskId));
        const linked = task?.linkedCaseId?.trim();
        if (linked) return { kind: 'open_lawsuit', entityId: linked };
    }

    const linkedFromCalendar = cs?.dossierId;
    if (linkedFromCalendar) return { kind: 'open_lawsuit', entityId: linkedFromCalendar };

    return { kind: 'open_field_tasks' };
}

function resolveNoteNavigation(alert: SecretaryAlert): AlertNavigationAction | null {
    if (alert.calendarSource?.module !== 'note' && alert.target !== 'notepad') return null;
    const noteId = alert.calendarSource?.entityId ?? alert.entityId;
    const dossier = resolveFromCalendarSource(alert);
    if (dossier && dossier.kind === 'open_lawsuit') return dossier;
    return { kind: 'notepad', noteId: noteId ? String(noteId) : undefined };
}

export function resolveAlertNavigation(
    alert: SecretaryAlert,
    ctx?: AlertNavigationContext,
): AlertNavigationAction {
    if (alert.type === 'REQUEST' && alert.request) {
        return { kind: 'client_requests' };
    }

    const fromCalendar = resolveFromCalendarSource(alert);
    if (fromCalendar) return fromCalendar;

    const fieldNav = resolveFieldTaskNavigation(alert, ctx);
    if (fieldNav) return fieldNav;

    const noteNav = resolveNoteNavigation(alert);
    if (noteNav) return noteNav;

    switch (alert.target as SecretaryAlertTarget) {
        case 'schedule':
            return { kind: 'tab', tab: 'schedule' };
        case 'notepad':
            return {
                kind: 'notepad',
                noteId: alert.entityId ? String(alert.entityId) : undefined,
            };
        case 'client_requests':
            return { kind: 'client_requests' };
        case 'transactions':
            return alert.entityId
                ? { kind: 'transactions', entityId: String(alert.entityId) }
                : { kind: 'transactions' };
        case 'threading':
            return alert.entityId
                ? { kind: 'threading_tx', entityId: String(alert.entityId) }
                : { kind: 'transactions' };
        case 'community':
            return { kind: 'tab', tab: 'community' };
        case 'urgent':
            return alert.entityId
                ? { kind: 'urgent_dashboard', entityId: String(alert.entityId) }
                : { kind: 'urgent_dashboard' };
        case 'lawsuit':
            return alert.entityId ? { kind: 'open_lawsuit', entityId: String(alert.entityId) } : { kind: 'noop' };
        case 'execution':
            return alert.entityId
                ? { kind: 'open_execution', entityId: String(alert.entityId) }
                : { kind: 'noop' };
        case 'criminal':
            return alert.entityId ? { kind: 'open_criminal', entityId: String(alert.entityId) } : { kind: 'noop' };
        default:
            return { kind: 'noop' };
    }
}
