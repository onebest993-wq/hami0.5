import { describe, expect, it } from 'vitest';
import type { InvestigationLog } from './criminalStore';
import {
    buildRequestFromReportLabel,
    daysSinceIsoDate,
    inferInvestigationRecordKind,
    isLetterSlaOverdue,
    letterWaitingDaysLabel,
    splitInvestigationLogs,
} from './investigationTrackingEngine';

const base = (partial: Partial<InvestigationLog>): InvestigationLog => ({
    id: '1',
    date: '2026-05-01',
    category: 'official_letter',
    title: 'كتاب',
    details: '',
    status: 'awaiting_response',
    ...partial,
});

describe('investigationTrackingEngine', () => {
    it('splits letters and evidence vault categories', () => {
        const logs = [
            base({ id: 'a', category: 'forensic_report' }),
            base({ id: 'b', category: 'exhibit_seizure' }),
            base({ id: 'c', category: 'site_inspection' }),
        ];
        const { letters, evidence } = splitInvestigationLogs(logs);
        expect(letters).toHaveLength(1);
        expect(evidence).toHaveLength(2);
        expect(inferInvestigationRecordKind('official_letter')).toBe('letter');
        expect(inferInvestigationRecordKind('exhibit_seizure')).toBe('evidence');
    });

    it('flags letter SLA after 15 days', () => {
        const log = base({ date: '2026-04-01', status: 'awaiting_response' });
        expect(isLetterSlaOverdue(log)).toBe(true);
        expect(letterWaitingDaysLabel(log)).toMatch(/مضى/);
    });

    it('does not count completed letters as overdue', () => {
        const log = base({ date: '2026-01-01', status: 'response_received' });
        expect(isLetterSlaOverdue(log)).toBe(false);
        expect(letterWaitingDaysLabel(log)).toBeNull();
    });

    it('computes days since iso date', () => {
        expect(daysSinceIsoDate('2026-05-10', new Date('2026-05-20T12:00:00'))).toBe(10);
    });

    it('builds domino request label from report title', () => {
        expect(buildRequestFromReportLabel('تقرير الطب العدلي')).toContain('تقرير الطب العدلي');
    });
});
