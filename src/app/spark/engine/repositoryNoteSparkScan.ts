import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SparkNudge } from '@/app/spark/types';
import { extractDateHintsFromVaultText } from '@/app/spark/engine/vaultAttachmentSparkScan';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseNoteDateYmd(value: string | undefined): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const ts = Date.parse(raw.includes('T') ? raw : `${raw}T09:00:00`);
    return Number.isFinite(ts) ? ts : null;
}

function noteReminderDue(note: GlobalNote): { daysLeft: number; label: string } | null {
    const reminderTs =
        parseNoteDateYmd(note.reminder_at) ?? parseNoteDateYmd(note.apptDate) ?? parseNoteDateYmd(note.date);
    if (reminderTs == null) return null;
    const daysLeft = Math.ceil((reminderTs - Date.now()) / DAY_MS);
    if (daysLeft < -1 || daysLeft > 3) return null;
    const label = String(note.title ?? '').trim() || 'ملاحظة';
    return { daysLeft, label };
}

export function scanNotesForSpark(notes: GlobalNote[]): SparkNudge | null {
    let bestReminder: { note: GlobalNote; daysLeft: number; label: string } | null = null;

    for (const note of notes) {
        if (note.repositoryInboxHidden) continue;
        const due = noteReminderDue(note);
        if (!due) continue;
        if (!bestReminder || due.daysLeft < bestReminder.daysLeft) {
            bestReminder = { note, ...due };
        }
    }

    if (bestReminder) {
        const { note, daysLeft, label } = bestReminder;
        return {
            id: `repository:note-reminder:${note.id}`,
            kind: 'repository.note_reminder_near',
            surface: 'repository',
            priority: 6,
            message:
                daysLeft < 0
                    ? `تذكير الملاحظة «${label}» متأخر — هل تود مراجعتها؟`
                    : daysLeft === 0
                      ? `تذكير الملاحظة «${label}» اليوم — هل تود فتحها؟`
                      : `تذكير الملاحظة «${label}» خلال ${daysLeft} يوم — هل يهمك الأمر؟`,
            presence: {
                present: [label],
                missing: ['متابعة التذكير'],
            },
            source: 'repositoryNoteSparkScan.reminder',
            dossierKey: 'repository:session',
            targetFileId: String(note.id),
            action: { label: 'فتح الملاحظة', actionId: 'open_repository_note' },
        };
    }

    for (const note of notes) {
        if (note.repositoryInboxHidden) continue;
        const body = `${note.title ?? ''}\n${note.body ?? ''}\n${note.transcript ?? ''}`.trim();
        const dateHints = extractDateHintsFromVaultText(body);
        if (dateHints.length === 0) continue;
        const label = String(note.title ?? '').trim() || 'ملاحظة';
        return {
            id: `repository:note-date:${note.id}`,
            kind: 'repository.note_date_hint',
            surface: 'repository',
            priority: 8,
            message: `الملاحظة «${label}» تذكر تواريخ (${dateHints.slice(0, 2).join(' · ')}) — هل تود مطابقتها مع إضبارة أو السجل؟`,
            presence: {
                present: dateHints.slice(0, 3),
                missing: ['ربط أو تسجيل'],
            },
            source: 'repositoryNoteSparkScan.dateHints',
            dossierKey: 'repository:session',
            targetFileId: String(note.id),
            action: { label: 'فتح الملاحظة', actionId: 'open_repository_note' },
        };
    }

    return null;
}
