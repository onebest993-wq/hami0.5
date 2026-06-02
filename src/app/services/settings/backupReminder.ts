import { SmartToast } from '@/app/components/ui/SmartToast';

const LAST_REMINDER_KEY = 'hami:weekly-backup-reminder-at';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Show at most one reminder per 7 days when enabled. */
export function maybeShowWeeklyBackupReminder(enabled: boolean): void {
    if (!enabled) return;
    try {
        const raw = localStorage.getItem(LAST_REMINDER_KEY);
        const last = raw ? Number(raw) : 0;
        if (last && Date.now() - last < WEEK_MS) return;

        SmartToast.info('تذكير أسبوعي: صدّر إعداداتك واحتفظ بنسخة من بيانات المكتب.', 9000);
        localStorage.setItem(LAST_REMINDER_KEY, String(Date.now()));
    } catch {
        /* storage blocked */
    }
}
