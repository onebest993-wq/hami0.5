import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardRealEstateSeizureModalHandlers } from '../useExecutionDashboardRealEstateSeizureModalHandlers';

describe('useExecutionDashboardRealEstateSeizureModalHandlers', () => {
    it('realEstateModalInitial resolves row by decision id', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardRealEstateSeizureModalHandlers({
                decisionsStorageExecutionId: 'exec-1',
                realEstateSeizureAssets: [
                    {
                        id: 're-1',
                        decisionRowId: 'dec-9',
                        propertyNoAndDistrict: '123 / الكرخ',
                        propertyGender: 'دار',
                        deedNotes: '',
                        status: 'seized',
                        record_locked: false,
                        awaiting_sale_price: false,
                    },
                ],
                realEstateSeizureModalDecisionId: 'dec-9',
                realEstateSeizureSnapshotRef: { current: [] },
                nextTimelineId: () => 'tl-1',
                pushTimelineEvent: vi.fn(),
                showToast: vi.fn(),
                setRealEstateSeizureAssets: vi.fn(),
                setShowRealEstateSeizureModal: vi.fn(),
            }),
        );

        expect(result.current.realEstateModalInitial?.id).toBe('re-1');
    });
});
