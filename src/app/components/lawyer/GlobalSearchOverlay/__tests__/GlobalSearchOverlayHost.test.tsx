import React, { useLayoutEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearchOverlayHost } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost';
import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

const bridgeContent: GlobalSearchOverlayShellContentProps = {
    onKeyDownCapture: () => undefined,
    keyboardInset: 0,
    resultsMaxHeight: 'min(calc(92dvh - 220px), 680px)',
    query: '',
    setQuery: () => undefined,
    showEmptyState: true,
    headerBusy: false,
    isEnrichingIndex: false,
    recentSearches: [],
    clearRecent: () => undefined,
    isSearching: false,
    isLoadingIndex: false,
    results: null,
    flatResults: [],
    pick: () => undefined,
    pinLookup: {
        files: [],
        executionFiles: [],
        notes: [],
        tasks: [],
        urgentCases: [],
        criminalCases: [],
        threadingTransactions: [],
    },
    scanIndexForPreview: [],
    activeIndex: -1,
    setActiveIndex: () => undefined,
};

const MockOverlay = ({
    headless,
    onShellContent,
}: {
    open?: boolean;
    headless?: boolean;
    onShellContent?: (content: GlobalSearchOverlayShellContentProps) => void;
}) => {
    useLayoutEffect(() => {
        if (!headless || !onShellContent) return;
        onShellContent(bridgeContent);
    }, [headless, onShellContent]);
    return null;
};

const getCachedGlobalSearchOverlay = vi.fn(() => MockOverlay);
const loadGlobalSearchOverlayModule = vi.fn(() =>
    Promise.resolve({ GlobalSearchOverlay: MockOverlay }),
);

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    getCachedGlobalSearchOverlay: () => getCachedGlobalSearchOverlay(),
    loadGlobalSearchOverlayModule: () => loadGlobalSearchOverlayModule(),
    isGlobalSearchOverlayModuleResolved: () => false,
}));

vi.mock('@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchFocusArm', () => ({
    useGlobalSearchFocusArm: () => true,
}));

vi.mock('@/app/runtime/globalSearchBootHydrator', () => ({
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT: 'hami:global-search-shell-hydrated',
    hydrateGlobalSearchShellForInstantOpen: () => Promise.resolve(true),
}));

describe('GlobalSearchOverlayHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCachedGlobalSearchOverlay.mockReturnValue(MockOverlay);
        loadGlobalSearchOverlayModule.mockResolvedValue({ GlobalSearchOverlay: MockOverlay });
    });

    it('يرسم البحث فوراً عبر الكاش (بلا انتظار lazy chunk)', () => {
        render(
            <GlobalSearchOverlayHost
                open
                onClose={() => undefined}
                onNavigate={() => undefined}
                files={[]}
                executionFiles={[]}
                globalNotes={[]}
                notifications={[]}
                criminalCases={[]}
                userId="user-1"
            />,
        );

        expect(screen.getByTestId('global-search-overlay')).toBeInTheDocument();
        expect(screen.getByText('البحث الشامل')).toBeInTheDocument();
    });

    it('عند الإغلاق بلا keepAlive لا يبقي DOM', () => {
        const { rerender, container } = render(
            <GlobalSearchOverlayHost
                open
                onClose={() => undefined}
                onNavigate={() => undefined}
                files={[]}
                executionFiles={[]}
                globalNotes={[]}
                notifications={[]}
                criminalCases={[]}
                userId="user-1"
            />,
        );

        expect(screen.getByTestId('global-search-overlay')).toBeInTheDocument();

        rerender(
            <GlobalSearchOverlayHost
                open={false}
                onClose={() => undefined}
                onNavigate={() => undefined}
                files={[]}
                executionFiles={[]}
                globalNotes={[]}
                notifications={[]}
                criminalCases={[]}
                userId="user-1"
            />,
        );

        expect(screen.queryByTestId('global-search-overlay')).toBeNull();
        expect(container).toBeEmptyDOMElement();
    });

    it('عند فشل تحميل chunk يعرض إعادة محاولة وإغلاق', async () => {
        getCachedGlobalSearchOverlay.mockReturnValue(null);
        loadGlobalSearchOverlayModule.mockRejectedValue(new Error('chunk fail'));

        render(
            <GlobalSearchOverlayHost
                open
                onClose={() => undefined}
                onNavigate={() => undefined}
                files={[]}
                executionFiles={[]}
                globalNotes={[]}
                notifications={[]}
                criminalCases={[]}
                userId="user-1"
            />,
        );

        expect(await screen.findByTestId('global-search-load-error')).toBeInTheDocument();
        expect(screen.getByTestId('global-search-load-retry')).toBeInTheDocument();
        expect(screen.getByTestId('global-search-load-close')).toBeInTheDocument();
    });
});
