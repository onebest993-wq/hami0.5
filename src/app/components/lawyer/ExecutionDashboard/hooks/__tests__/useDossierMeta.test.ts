import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDossierMeta } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDossierMeta';

describe('useDossierMeta', () => {
    it('keeps the returned workflow stable when inputs do not change', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const props = {
            executionData: { id: 'ex-1', directorate: 'الرصافة' },
            directorate: 'الرصافة',
            fileNumber: '12',
            fileYear: '2026',
            docNumber: '44',
            judgmentDate: '2026-07-09',
            classification: 'مالي',
            evictionPropertyNumber: '',
            evictionPropertyDistrict: '',
            evictionPropertyTypeField: '',
            evictionFullAddressField: '',
            evictionPremisesUseRaw: undefined,
            isEvictionExecutionModule: false,
            persistExecutionMerge,
            showToast,
        } as const;

        const { result, rerender } = renderHook(() =>
            useDossierMeta(
                props.executionData as never,
                props.directorate,
                props.fileNumber,
                props.fileYear,
                props.docNumber,
                props.judgmentDate,
                props.classification,
                props.evictionPropertyNumber,
                props.evictionPropertyDistrict,
                props.evictionPropertyTypeField,
                props.evictionFullAddressField,
                props.evictionPremisesUseRaw,
                props.isEvictionExecutionModule,
                props.persistExecutionMerge,
                props.showToast,
            ),
        );

        const first = result.current;
        rerender();

        expect(result.current).toBe(first);
    });
});
