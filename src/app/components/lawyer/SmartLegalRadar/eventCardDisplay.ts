import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { TYPE_STYLES } from './radarEventTypeStyles';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';

const LEGAL_DEADLINE_MODULES = new Set<CalendarSourceModule>([
    'lawsuit',
    'execution',
    'criminal',
    'urgent',
]);

function looksLikeCaseNumber(value: string): boolean {
    const v = value.trim();
    if (!v || v.length < 2) return false;
    if (/^مهمة\s*ميدان$/i.test(v)) return false;
    return /\d/.test(v);
}

function normalizeLabel(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function labelsEqual(a: string, b: string): boolean {
    return normalizeLabel(a) === normalizeLabel(b);
}

export function resolveKindLabel(event: UnifiedEvent): string {
    const title = String(event.title ?? '');
    const mod = event.bridge?.sourceModule;
    const base = TYPE_STYLES[event.type] || TYPE_STYLES.custom;

    if (mod === 'task') {
        if (/تبليغ/i.test(title)) return 'تبليغ';
        if (/كشف|معاينة/i.test(title)) return 'معاينة';
        return 'مهمة ميدان';
    }

    const urgentish =
        mod === 'urgent' || /مهلة\s*مستعجل|مستعجل\w*\s*مهلة|قضاء\s*مستعجل/i.test(title);
    if (
        urgentish &&
        (event.type === 'deadline' || /مهلة|موعد\s*نهائي|انتهاء|مستعجل/i.test(title))
    ) {
        return 'مهلة مستعجلة';
    }

    if (/مرافع/i.test(title)) return 'موعد مرافعة';
    if (/مهلة|طعن|تمييز|استئناف|اعتراض|انتهاء/i.test(title)) return 'مهلة';
    if (event.type === 'deadline') return 'مهلة';
    if (event.type === 'hearing') return 'جلسة';
    if (event.type === 'execution') return 'تنفيذ';
    if (event.type === 'consultation') return 'استشارة';
    return base.label;
}

export function stripKindNoiseFromTitle(title: string): string {
    return title
        .replace(/جلسة\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهلة\s*مستعجل[ةه]?\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/موعد\s*نهائي\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهلة\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/موعد\s*مرافع[ةه]?\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/مهمة\s*ميدان\s*[—\-·:：]?\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isUselessMark(value: string, kind: string, source?: string | null): boolean {
    if (!value.trim()) return true;
    if (labelsEqual(value, kind)) return true;
    if (source && labelsEqual(value, source)) return true;
    if (/^(مهمة\s*)?ميدان$/i.test(value.trim())) return true;
    return false;
}

export function resolveDistinctiveMark(
    event: UnifiedEvent,
    meta: { court?: string; freeNotes?: string },
    kind: string,
    source: string,
): string | null {
    const caseNo = event.caseNo?.trim();
    if (caseNo && looksLikeCaseNumber(caseNo) && !isUselessMark(caseNo, kind, source)) {
        return caseNo;
    }

    const title = String(event.title ?? '');
    const refInTitle = title.match(/\d{1,4}\s*[\\/]\s*\d{2,4}|\b\d{3,}\b/);
    if (refInTitle) {
        const ref = refInTitle[0].replace(/\s+/g, '');
        if (!isUselessMark(ref, kind, source)) return ref;
    }

    const court = meta.court?.trim();
    if (court && !isUselessMark(court, kind, source)) return court;

    const cleaned = stripKindNoiseFromTitle(title);
    if (cleaned && !isUselessMark(cleaned, kind, source)) {
        return cleaned.length > 36 ? `${cleaned.slice(0, 34)}…` : cleaned;
    }

    const note = meta.freeNotes?.trim().split(/\n+/)[0]?.trim();
    if (note && looksLikeCaseNumber(note) && !isUselessMark(note, kind, source)) {
        return note.slice(0, 36);
    }

    return null;
}

export function shouldShowLegalCountdown(event: UnifiedEvent): boolean {
    const mod = event.bridge?.sourceModule;
    const title = String(event.title ?? '');
    if (mod && LEGAL_DEADLINE_MODULES.has(mod)) {
        return (
            event.type === 'deadline' ||
            /مهلة|طعن|تمييز|استئناف|اعتراض|انتهاء|مستعجل/i.test(title)
        );
    }
    if (event.isBridged) return false;
    return event.type === 'deadline' || /مهلة|طعن|تمييز|استئناف|اعتراض/i.test(title);
}

export function resolveDisplayTitle(event: UnifiedEvent, kindLabel: string): string {
    const raw = String(event.title ?? '').trim();
    const stripped = stripKindNoiseFromTitle(raw);
    if (stripped) return stripped;
    if (raw) return raw;
    return kindLabel;
}

export function formatEventTimeRange(time?: string | null, endTime?: string | null): string | null {
    const start = String(time ?? '').trim();
    if (!start) return null;
    const end = String(endTime ?? '').trim();
    if (end && end !== start) return `${start}–${end}`;
    return start;
}
