import { describe, expect, it } from 'vitest';
import { computeObjectionDeadlineFromNotifiedDate } from '../criminalDateUtils';
import { applyTimelineEventInsertion } from '../criminalTimelineEventInsertEngine';
import type { CriminalCase, TimelineEvent } from '../criminalCaseModel';
import { makeInitialDraft } from '../criminalCaseDraftFactory';

function minimalCase(over: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'case-1',
        createdAt: new Date().toISOString(),
        legalArticleHistory: [],
        ...makeInitialDraft(),
        ...over,
    } as CriminalCase;
}

describe('criminalDateUtils', () => {
    it('computeObjectionDeadlineFromNotifiedDate applies misdemeanor window', () => {
        expect(computeObjectionDeadlineFromNotifiedDate('2024-01-01', 'جنحة')).toBe('2024-04-02');
    });
});

describe('criminalTimelineEventInsertEngine', () => {
    it('rejects court_session events missing summons fields', () => {
        const target = minimalCase();
        const event: TimelineEvent = {
            id: 'ev-1',
            date: '2024-01-01',
            type: 'court_session',
            category: 'جلسة',
            title: 'جلسة',
            description: '—',
        };
        expect(applyTimelineEventInsertion(target, event)).toEqual({ ok: false, reason: 'invalid_event' });
    });

    it('appends a simple investigation timeline event', () => {
        const target = minimalCase({ timelineEvents: [] });
        const event: TimelineEvent = {
            id: 'ev-2',
            date: '2024-02-01',
            type: 'investigation',
            category: 'إجراء تحقيقي',
            title: 'تدوين',
            description: '—',
        };
        const result = applyTimelineEventInsertion(target, event);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.nextCase.timelineEvents).toHaveLength(1);
            expect(result.nextCase.timelineEvents?.[0]?.id).toBe('ev-2');
        }
    });
});
