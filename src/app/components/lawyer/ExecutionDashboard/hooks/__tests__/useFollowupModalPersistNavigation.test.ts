import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowupModalPersistNavigation } from '@/app/components/lawyer/ExecutionDashboard/hooks/useFollowupModalPersistNavigation';

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch', () => ({
    prefetchExecutionFollowupOverlay: vi.fn(),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionFollowupTabPrefetch', () => ({
    prefetchExecutionFollowupTab: vi.fn(),
}));

function createRefs() {
    return {
        followupModalBodyScrollRef: { current: null as HTMLDivElement | null },
        followupModalSectionTabsRef: { current: null as HTMLDivElement | null },
        followupModalOpenGenerationRef: { current: 0 },
        seizureMatrixRef: { current: { hideSeizureTab: false } },
        openSeizureRequestsTabRef: { current: vi.fn() },
    };
}

describe('useFollowupModalPersistNavigation', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('opens modal and restores saved tab from sessionStorage', () => {
        sessionStorage.setItem(
            'hami-followup-modal:dossier-1',
            JSON.stringify({ tab: 'correspondences', scroll: 120 }),
        );

        const setShowUnifiedExecutionModal = vi.fn();
        const setUnifiedModalTab = vi.fn();
        const refs = createRefs();

        const { result } = renderHook(() =>
            useFollowupModalPersistNavigation({
                showUnifiedExecutionModal: false,
                unifiedModalTab: 'coercive',
                setUnifiedModalTab,
                followupSectionTabOrder: ['coercive', 'correspondences'],
                dossierFileKey: 'dossier-1',
                setShowUnifiedExecutionModal,
                ...refs,
            }),
        );

        act(() => {
            result.current.openFollowupModalPersisted();
        });

        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(true);
        expect(setUnifiedModalTab).toHaveBeenCalledWith('correspondences');
    });

    it('persists viewport on close', () => {
        const body = document.createElement('div');
        Object.defineProperty(body, 'scrollTop', { value: 88, writable: true });

        const setShowUnifiedExecutionModal = vi.fn();
        const refs = createRefs();
        refs.followupModalBodyScrollRef.current = body;

        const { result } = renderHook(() =>
            useFollowupModalPersistNavigation({
                showUnifiedExecutionModal: true,
                unifiedModalTab: 'admin',
                setUnifiedModalTab: vi.fn(),
                followupSectionTabOrder: ['admin', 'correspondences'],
                dossierFileKey: 'dossier-2',
                setShowUnifiedExecutionModal,
                ...refs,
            }),
        );

        act(() => {
            result.current.closeFollowupModalPersisted();
        });

        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(false);
        const saved = JSON.parse(sessionStorage.getItem('hami-followup-modal:dossier-2') ?? '{}');
        expect(saved.tab).toBe('admin');
        expect(saved.scroll).toBe(88);
    });
});
