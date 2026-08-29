import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUrgentCasesFilter } from '../useUrgentCasesFilter';
import type { UrgentCase } from '../../../Component_Urgent_Card';

function baseCase(overrides: Partial<UrgentCase> = {}): UrgentCase {
    return {
        id: 'u1',
        applicantName: 'أحمد علي',
        actionType: 'استصدار أمر',
        court: 'بداءة الكرخ',
        requestNumber: '٢٠٢٥/١٠',
        status: 'safe',
        phase: 'active',
        ...overrides,
    } as UrgentCase;
}

describe('useUrgentCasesFilter search', () => {
    it('matches Arabic alef fold and Indic digits', () => {
        const cases = [baseCase(), baseCase({ id: 'u2', applicantName: 'سارة', requestNumber: '99' })];
        const { result: byName } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'active', searchQuery: 'احمد' }),
        );
        expect(byName.current.sortedAndFilteredCases).toHaveLength(1);

        const { result: byNum } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'active', searchQuery: '2025/10' }),
        );
        expect(byNum.current.sortedAndFilteredCases).toHaveLength(1);
        expect(byNum.current.sortedAndFilteredCases[0]?.id).toBe('u1');
    });

    it('finalized cases live in archive scope, not active', () => {
        const cases = [
            baseCase({ id: 'live', status: 'safe' }),
            baseCase({ id: 'done', status: 'completed', phase: 'completed' }),
            baseCase({ id: 'archived', status: 'safe', archived: true }),
            baseCase({ id: 'bin', status: 'safe', deleted: true }),
        ];
        const { result: active } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'active', searchQuery: '' }),
        );
        expect(active.current.sortedAndFilteredCases.map((c) => c.id)).toEqual(['live']);
        expect(active.current.criticalCases).toEqual([]);
        expect(active.current.pendingCases.map((c) => c.id)).toEqual(['live']);

        const { result: archive } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'archive', searchQuery: '' }),
        );
        expect(archive.current.archivedCases.map((c) => c.id)).toEqual(['done', 'archived']);

        const { result: trash } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'trash', searchQuery: '' }),
        );
        expect(trash.current.trashedCases.map((c) => c.id)).toEqual(['bin']);
    });

    it('empty query returns active pool', () => {
        const cases = [baseCase({ id: 'a' }), baseCase({ id: 'b', deleted: true })];
        const { result } = renderHook(() =>
            useUrgentCasesFilter({ cases, scope: 'active', searchQuery: '  ' }),
        );
        expect(result.current.sortedAndFilteredCases.map((c) => c.id)).toEqual(['a']);
    });
});
