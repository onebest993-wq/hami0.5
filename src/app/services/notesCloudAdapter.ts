import type { GlobalNote as DashboardNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { GlobalNote as CloudNote } from '@/app/services/SupabaseService';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/** تحويل ملاحظة سحابية/مخزنة محلياً بصيغة content إلى صيغة اللوحة body */
export function cloudNoteToDashboard(raw: unknown): DashboardNote | null {
    if (!isRecord(raw)) return null;
    const body =
        typeof raw.body === 'string'
            ? raw.body
            : typeof raw.content === 'string'
              ? raw.content
              : '';
    if (!body.trim() && !raw.title) return null;

    const id = raw.id ?? Date.now();
    const date =
        typeof raw.date === 'string'
            ? raw.date
            : typeof raw.createdAt === 'string'
              ? raw.createdAt
              : new Date().toISOString();

    const apptRaw =
        typeof raw.apptDate === 'string'
            ? raw.apptDate
            : typeof raw.reminder_at === 'string'
              ? raw.reminder_at
              : undefined;
    const apptMatch = apptRaw?.match(/^(\d{4}-\d{2}-\d{2})/);
    const apptDate = apptMatch ? apptMatch[1] : undefined;

    return {
        id: typeof id === 'number' || typeof id === 'string' ? id : Date.now(),
        title: typeof raw.title === 'string' ? raw.title : 'ملاحظة',
        body,
        isPinned: Boolean(raw.isPinned),
        color: typeof raw.color === 'string' ? raw.color : undefined,
        date,
        apptDate,
        reminder_at: apptDate,
        category:
            raw.category === 'دعاوى' || raw.category === 'تنفيذ' || raw.category === 'عام'
                ? raw.category
                : undefined,
        tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
        type: typeof raw.type === 'string' ? raw.type : undefined,
        linkedFileId: typeof raw.linkedFileId === 'number' ? raw.linkedFileId : undefined,
    };
}

export function normalizeNotesList(raw: unknown): DashboardNote[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(cloudNoteToDashboard).filter((n): n is DashboardNote => n !== null);
}

export function dashboardNoteToCloudPayload(
    note: DashboardNote,
): Omit<CloudNote, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        title: note.title || 'ملاحظة',
        content: note.body || '',
        category: note.category ?? 'عام',
        tags: note.tags ?? [],
    };
}
