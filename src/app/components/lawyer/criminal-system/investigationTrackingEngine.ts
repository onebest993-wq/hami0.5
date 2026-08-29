import type { InvestigationLog } from './criminalCaseModel';

const LETTER_SLA_WARNING_DAYS = 15;

type InvestigationRecordKind = 'letter' | 'evidence';

export function inferInvestigationRecordKind(
    category: InvestigationLog['category'],
): InvestigationRecordKind {
    if (category === 'official_letter' || category === 'forensic_report') return 'letter';
    return 'evidence';
}

function isLetterInvestigationLog(log: Pick<InvestigationLog, 'category'>): boolean {
    return inferInvestigationRecordKind(log.category) === 'letter';
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

function sortInvestigationLogsNewestFirst(logs: InvestigationLog[]): InvestigationLog[] {
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
