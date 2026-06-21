import type { CommandCenterNote } from '@/app/components/lawyer/commandCenterTypes';

const SCHEDULE_KEYWORDS = ['موعد', 'جلسة', 'تذكير'] as const;

export function inferQuickNoteType(text: string): CommandCenterNote['type'] {
    const trimmed = text.trim();
    if (!trimmed) return 'text';
    return SCHEDULE_KEYWORDS.some((kw) => trimmed.includes(kw)) ? 'schedule' : 'text';
}

export function quickNoteTitle(type: CommandCenterNote['type']): string {
    switch (type) {
        case 'voice':
            return 'تسجيل صوتي';
        case 'schedule':
            return 'موعد سريع';
        default:
            return 'ملاحظة سريعة';
    }
}

export function createQuickNoteId(): number {
    return Date.now();
}
