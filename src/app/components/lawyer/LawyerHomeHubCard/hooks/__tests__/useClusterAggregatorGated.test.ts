import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClusterAggregatorGated } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useClusterAggregatorGated';

const baseInput = {
    pinnedItems: [
        {
            id: 'p1',
            type: 'lawsuit' as const,
            title: 'قضية تجريبية',
            caseNumber: '123/2024',
        },
    ],
    lawsuitFiles: [],
    executionFiles: [],
    criminalCases: [],
    urgentCases: [],
    threadingTransactions: [],
    notes: [],
    fieldTasks: [],
};

describe('useClusterAggregatorGated', () => {
    it('يرجع مصفوفة فارغة عند التعطيل', () => {
        const { result } = renderHook(() => useClusterAggregatorGated(false, baseInput));
        expect(result.current).toEqual([]);
    });

    it('يُرجع views عند التفعيل مع دبابيس', () => {
        const { result } = renderHook(() => useClusterAggregatorGated(true, baseInput));
        expect(result.current.length).toBe(1);
        expect(result.current[0]?.pin.id).toBe('p1');
    });
});
