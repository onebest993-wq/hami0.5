import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardUnifiedDossierMetaWorkflow } from '../useExecutionDashboardUnifiedDossierMetaWorkflow';

vi.mock('../useExecutionDashboardParentDossierPersistence', () => ({
    useExecutionDashboardParentDossierPersistence: () => ({
        persistParentDossierMerge: vi.fn(),
        parentIsEvictionForExpandedHeader: false,
    }),
}));

describe('useExecutionDashboardUnifiedDossierMetaWorkflow', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('opens the dossier edit modal immediately', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardUnifiedDossierMetaWorkflow({
                executionData: {
                    id: 'ex-1',
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    claimType: 'دين',
                    classification: 'مدني',
                    docNumber: '55',
                    judgmentDate: '2026-07-10',
                } as never,
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                docNumber: '55',
                judgmentDate: '2026-07-10',
                classification: 'مدني',
                evictionPropertyNumber: '',
                evictionPropertyDistrict: '',
                evictionPropertyTypeField: '',
                evictionFullAddressField: '',
                evictionPremisesUseRaw: undefined,
                isEvictionExecutionModule: false,
                persistExecutionMerge: vi.fn(),
                parentDossierId: undefined,
                parentExecutionFile: null,
                onUpdate: undefined,
                setExecutionStorageTick: vi.fn(),
                showToast: vi.fn(),
            }),
        );

        act(() => {
            result.current.openEditDossierMeta();
        });

        expect(result.current.showEditDossierMetaModal).toBe(true);
    });

    it('persists dossier changes synchronously before closing the modal', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardUnifiedDossierMetaWorkflow({
                executionData: {
                    id: 'ex-2',
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    claimType: 'دين',
                    classification: 'مدني',
                    docNumber: '55',
                    judgmentDate: '2026-07-10',
                } as never,
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                docNumber: '55',
                judgmentDate: '2026-07-10',
                classification: 'مدني',
                evictionPropertyNumber: '',
                evictionPropertyDistrict: '',
                evictionPropertyTypeField: '',
                evictionFullAddressField: '',
                evictionPremisesUseRaw: undefined,
                isEvictionExecutionModule: false,
                persistExecutionMerge,
                parentDossierId: undefined,
                parentExecutionFile: null,
                onUpdate: undefined,
                setExecutionStorageTick: vi.fn(),
                showToast,
            }),
        );

        act(() => {
            result.current.openEditDossierMeta();
        });

        act(() => {
            result.current.setDossierMetaDraft((draft) =>
                draft ? { ...draft, directorate: 'تنفيذ الرصافة' } : draft,
            );
        });

        act(() => {
            result.current.saveDossierMetaDraft();
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({ directorate: 'تنفيذ الرصافة' }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ بيانات الإضبارة', 'success');
        expect(result.current.showEditDossierMetaModal).toBe(false);
        expect(result.current.dossierMetaDraft).toBe(null);
    });
});
