import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';

export const DECISION_GLASS_CARD =
    'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-lg';

export function getStatusBorderClass(_status: string, _outcome: string | undefined, _origin: string | undefined): string {
    return '';
}

export function formatDateNumeric(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function cleanTitle(title: string): string {
    return stripEmojisFromText(title).trim();
}
