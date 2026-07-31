import type { GlobalNote as DashboardNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { GlobalNote as CloudNote } from '@/app/services/SupabaseService';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function asOptionalString(v: unknown): string | undefined {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asOptionalNullableString(v: unknown): string | null | undefined {
    if (v === null) return null;
    if (typeof v === 'string') return v;
    return undefined;
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
    const title = typeof raw.title === 'string' ? raw.title : '';
    const attachmentDocId = asOptionalString(raw.attachmentDocId);
    const roomId = asOptionalNullableString(raw.roomId);
    // بطاقة بمرفق أو عنوان فقط يجب أن تبقى بعد إعادة التحميل
    if (!body.trim() && !title.trim() && !attachmentDocId) return null;

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

    const quickTaskLines = Array.isArray(raw.quickTaskLines)
        ? raw.quickTaskLines.filter((line): line is string => typeof line === 'string')
        : undefined;

    return {
        id: typeof id === 'number' || typeof id === 'string' ? id : Date.now(),
        title: title.trim() || (attachmentDocId ? 'بطاقة مرفق' : 'ملاحظة'),
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
        attachmentDocId,
        roomId: roomId === undefined ? undefined : roomId,
        repositoryInboxHidden: raw.repositoryInboxHidden === true ? true : undefined,
        createdAtIso: asOptionalString(raw.createdAtIso) ?? (typeof raw.createdAt === 'string' ? raw.createdAt : undefined),
        quickTaskLines: quickTaskLines?.length ? quickTaskLines : undefined,
        transcript: asOptionalString(raw.transcript),
        voiceDurationSec: typeof raw.voiceDurationSec === 'number' ? raw.voiceDurationSec : undefined,
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
