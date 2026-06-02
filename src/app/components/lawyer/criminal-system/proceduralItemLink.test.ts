import { describe, expect, it } from 'vitest';
import {
    buildProceduralLinkOptions,
    formatProceduralLinkDisplay,
    normalizeProceduralContextValue,
    normalizeProceduralItemLink,
    requestLinkLabel,
    resolveLiveLinkLabel,
    timelineLinkLabel,
} from './proceduralItemLink';
import type { LawyerRequest, TimelineEvent } from './criminalStore';

describe('proceduralItemLink', () => {
    it('normalizes structured links', () => {
        expect(normalizeProceduralItemLink({ kind: 'timeline', id: 't1', label: 'جلسة' })).toEqual({
            kind: 'timeline',
            id: 't1',
            label: 'جلسة',
        });
        expect(normalizeProceduralItemLink({ kind: 'bad', id: 'x', label: 'y' })).toBeUndefined();
    });

    it('migrates legacy contextRef to contextNote when no link', () => {
        expect(normalizeProceduralContextValue(undefined, 'جلسة قديمة', undefined)).toEqual({
            contextNote: 'جلسة قديمة',
        });
    });

    it('prefers link over legacy ref', () => {
        const link = { kind: 'request' as const, id: 'r1', label: 'طلب محفوظ' };
        expect(normalizeProceduralContextValue(link, 'نص قديم', 'ملاحظة')).toEqual({
            link,
            contextNote: 'ملاحظة',
        });
    });

    it('builds timeline and request pick lists', () => {
        const ev: TimelineEvent = {
            id: 'ev1',
            date: '2026-05-01',
            type: 'court_session',
            category: 'hearing',
            title: 'جلسة أولى',
            description: '',
        };
        const req: LawyerRequest = {
            id: 'lr1',
            requestDate: '2026-05-02',
            type: 'استئناف',
            lawyerNote: '',
            status: 'pending',
        };
        const { timeline, requests } = buildProceduralLinkOptions({
            timelineEvents: [ev],
            lawyerRequests: [req],
        });
        expect(timeline[0]?.id).toBe('ev1');
        expect(requests[0]?.id).toBe('lr1');
        expect(timelineLinkLabel(ev)).toContain('2026-05-01');
        expect(requestLinkLabel(req)).toContain('استئناف');
    });

    it('resolves live labels when records still exist', () => {
        const link = { kind: 'timeline' as const, id: 'ev1', label: 'قديم' };
        const ev: TimelineEvent = {
            id: 'ev1',
            date: '2026-06-01',
            type: 'court_session',
            category: 'hearing',
            title: 'جديد',
            description: '',
        };
        const live = resolveLiveLinkLabel(link, { timelineEvents: [ev] });
        expect(live).toContain('2026-06-01');
        expect(live).not.toBe('قديم');
    });

    it('falls back to stored label when record missing', () => {
        const link = { kind: 'request' as const, id: 'gone', label: 'طلب محذوف' };
        expect(resolveLiveLinkLabel(link, { lawyerRequests: [] })).toBe('طلب محذوف');
    });

    it('formats display with emoji prefix', () => {
        const line = formatProceduralLinkDisplay(
            {
                link: { kind: 'timeline', id: 't1', label: 'جلسة' },
                contextNote: 'تفصيل',
            },
            'جلسة محدّثة',
        );
        expect(line).toContain('📅');
        expect(line).toContain('جلسة محدّثة');
        expect(line).toContain('تفصيل');
    });
});
