import { toDatetimeLocalValue } from '@/app/services/settings/notificationSettings';

export function formatMuteUntilLabel(ms: number): string {
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(ms));
    } catch {
        return toDatetimeLocalValue(ms).replace('T', ' ');
    }
}
