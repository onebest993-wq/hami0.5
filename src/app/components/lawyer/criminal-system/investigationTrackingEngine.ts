import type { InvestigationLog } from './criminalStore';

export const LETTER_SLA_WARNING_DAYS = 15;

export type ExhibitLifecycleStatus = 'seized_at_station' | 'sent_to_lab' | 'lab_result_received';

export type InvestigationRecordKind = 'letter' | 'evidence';

export const LETTER_TRACKING_CATEGORIES = ['official_letter', 'forensic_report'] as const;
export const EVIDENCE_TRACKING_CATEGORIES = ['exhibit_seizure', 'site_inspection'] as const;

export type LetterTrackingCategory = (typeof LETTER_TRACKING_CATEGORIES)[number];
export type EvidenceTrackingCategory = (typeof EVIDENCE_TRACKING_CATEGORIES)[number];

export function inferInvestigationRecordKind(
    category: InvestigationLog['category'],
): InvestigationRecordKind {
    if (category === 'official_letter' || category === 'forensic_report') return 'letter';
    return 'evidence';
}

export function isLetterInvestigationLog(log: Pick<InvestigationLog, 'category'>): boolean {
    return inferInvestigationRecordKind(log.category) === 'letter';
}

export function isEvidenceInvestigationLog(log: Pick<InvestigationLog, 'category'>): boolean {
    return inferInvestigationRecordKind(log.category) === 'evidence';
}

export function resolveLinkedPartyId(log: InvestigationLog): string {
    const direct = String(log.linkedPartyId ?? '').trim();
    if (direct) return direct;
    const ids = Array.isArray(log.defendantIds) ? log.defendantIds : [];
    return String(ids[0] ?? '').trim();
}

export function daysSinceIsoDate(isoDate: string, today = new Date()): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? '').trim());
    if (!m) return null;
    const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = today;
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = todayUtc - start;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function letterWaitingDaysLabel(log: InvestigationLog): string | null {
    if (log.status !== 'awaiting_response') return null;
    const days = daysSinceIsoDate(log.date);
    if (days === null) return null;
    return `⏳ مضى ${days} يوم`;
}

export function isLetterSlaOverdue(log: InvestigationLog): boolean {
    if (log.status !== 'awaiting_response') return false;
    const days = daysSinceIsoDate(log.date);
    return days !== null && days > LETTER_SLA_WARNING_DAYS;
}

export function trackingCategoryLabel(category: InvestigationLog['category']): string {
    if (category === 'official_letter') return 'مفاتحة جهة رسمية';
    if (category === 'forensic_report') return 'طب عدلي';
    if (category === 'site_inspection') return 'كشف دلالة';
    if (category === 'exhibit_seizure') return 'ضبط مبرز';
    return 'أخرى';
}

export const EXHIBIT_LIFECYCLE_OPTIONS: ReadonlyArray<{ value: ExhibitLifecycleStatus; label: string }> = [
    { value: 'seized_at_station', label: '🔒 محرز في مركز الشرطة' },
    { value: 'sent_to_lab', label: '🔬 مُرسل للفحص الجنائي' },
    { value: 'lab_result_received', label: '📄 وردت نتيجة الفحص' },
] as const;

export function exhibitLifecycleLabel(status: ExhibitLifecycleStatus | '' | undefined): string {
    const hit = EXHIBIT_LIFECYCLE_OPTIONS.find((o) => o.value === status);
    return hit?.label ?? '—';
}

export function normalizeExhibitLifecycle(raw: unknown): ExhibitLifecycleStatus | '' {
    const v = String(raw ?? '').trim();
    if (v === 'seized_at_station' || v === 'sent_to_lab' || v === 'lab_result_received') return v;
    return '';
}

export function defaultExhibitLifecycle(): ExhibitLifecycleStatus {
    return 'seized_at_station';
}

export function sortInvestigationLogsNewestFirst(logs: InvestigationLog[]): InvestigationLog[] {
    return [...logs].sort((a, b) => {
        const dateA = String(a.date ?? '').trim();
        const dateB = String(b.date ?? '').trim();
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String(b.id).localeCompare(String(a.id));
    });
}

export function splitInvestigationLogs(logs: InvestigationLog[]): {
    letters: InvestigationLog[];
    evidence: InvestigationLog[];
} {
    const letters: InvestigationLog[] = [];
    const evidence: InvestigationLog[] = [];
    for (const log of logs) {
        if (isLetterInvestigationLog(log)) letters.push(log);
        else evidence.push(log);
    }
    return {
        letters: sortInvestigationLogsNewestFirst(letters),
        evidence: sortInvestigationLogsNewestFirst(evidence),
    };
}

export function buildRequestFromReportLabel(logTitle: string): string {
    const t = String(logTitle ?? '').trim() || 'التقرير';
    return `طلب استناداً إلى ${t}`;
}
