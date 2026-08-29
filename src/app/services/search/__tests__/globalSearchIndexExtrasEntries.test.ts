import { describe, expect, it } from 'vitest';
import { calendarToEntry, threadingTxToEntry } from '@/app/services/search/globalSearchIndexExtrasEntries';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';

describe('globalSearchIndexExtrasEntries', () => {
    it('موعد مرتبط بملف يفتح التقويم لا الإضبارة', () => {
        const event: CalendarEvent = {
            id: 'ev-1',
            userId: 'u1',
            title: 'جلسة استماع',
            date: '2026-08-22',
            time: '10:00',
            type: 'hearing',
            caseId: 'file-9',
            caseNo: '2026/1',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
        };
        const lifecycle = new Map<string, SearchLifecycle>([['file-9', 'active']]);
        const entry = calendarToEntry(event, lifecycle);

        expect(entry.navigate).toEqual({ type: 'calendar', eventId: 'ev-1', date: '2026-08-22' });
        expect(entry.subtitle).toContain('2026/1');
        expect(entry._searchStr).toContain('file-9');
        expect(entry.lifecycle).toBe('active');
    });

    it('معاملة المركز تبقى تصنيفاً threading بوجهة المعاملات', () => {
        const tx: Transaction = {
            id: 'tx-1',
            title: 'تجديد هوية',
            clientName: 'علي',
            targetDepartment: 'الأحوال',
            status: TransactionStatus.Active,
            agreedFees: 0,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
        };
        const entry = threadingTxToEntry(tx);
        expect(entry.category).toBe('threading');
        expect(entry.navigate).toEqual({ type: 'transactions', transactionId: 'tx-1' });
        expect(entry.subtitle).toContain('معاملة إدارية');
    });
});
