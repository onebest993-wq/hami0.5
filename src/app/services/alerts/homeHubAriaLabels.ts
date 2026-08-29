/** تسميات aria لصفوف الرادار والتثبيت. */
import type { CalendarRadarEvent } from '@/app/workspace/types';

export function resolveHomeHubRadarItemAriaLabel(
    event: Pick<
        CalendarRadarEvent,
        | 'title'
        | 'whenLabel'
        | 'sourceHint'
        | 'dateLabel'
        | 'timeLabel'
        | 'sourceModuleLabel'
        | 'sourcePlace'
        | 'caseNo'
    >,
): string {
    const title = String(event.title ?? '').trim() || 'موعد';
    const moduleLabel = String(event.sourceModuleLabel ?? '').trim();
    const caseNo = String(event.caseNo ?? '').trim();
    const court = String(event.sourcePlace ?? '').trim();
    const dossierRef = caseNo || court;
    const dateLabel = String(event.dateLabel ?? '').trim();
    const schedule = [dateLabel, moduleLabel, dossierRef].filter(Boolean).join(' · ');
    const parts = [title, schedule].filter(Boolean);
    return parts.join('، ');
}

export function resolveHomeHubRadarDismissAriaLabel(
    event: Pick<CalendarRadarEvent, 'title'>,
): string {
    const title = String(event.title ?? '').trim() || 'الموعد';
    return `إخفاء ${title} من البطاقة`;
}

export function resolveHomeHubPinNavigateAriaLabel(input: {
    headline: string;
    sectionLabel: string;
    clientLine?: string;
    caseLine?: string;
    relatedCount?: number;
}): string {
    const headline = input.headline.trim() || input.sectionLabel.trim() || 'عنصر مثبت';
    const details = [
        input.sectionLabel.trim(),
        String(input.clientLine ?? '').trim(),
        String(input.caseLine ?? '').trim(),
        input.relatedCount && input.relatedCount > 0 ? `${input.relatedCount} ارتباط` : '',
    ].filter(Boolean);

    return [headline, ...details.filter((detail) => detail !== headline)].join('، ');
}

export function resolveHomeHubPinUnpinAriaLabel(headline: string): string {
    const safeHeadline = headline.trim() || 'العنصر';
    return `إلغاء تثبيت ${safeHeadline}`;
}
