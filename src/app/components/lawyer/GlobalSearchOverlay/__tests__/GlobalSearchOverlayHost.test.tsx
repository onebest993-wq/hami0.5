import React, { useLayoutEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

const { MockOverlay } = vi.hoisted(() => {
    const bridgeContent: GlobalSearchOverlayShellContentProps = {
        onKeyDownCapture: () => undefined,
        keyboardInset: 0,
        query: '',
        setQuery: () => undefined,
        showEmptyState: true,
        headerBusy: false,
        isEnrichingIndex: false,
        recentSearches: [],
        clearRecent: () => undefined,
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

    function MockOverlay({
        headless,
        onShellContent,
    }: {
        open?: boolean;
        headless?: boolean;
        onShellContent?: (content: GlobalSearchOverlayShellContentProps) => void;
    }) {
        useLayoutEffect(() => {
            if (!headless || !onShellContent) return;
            onShellContent(bridgeContent);
        }, [headless, onShellContent]);
        return null;
    }

    return { MockOverlay };
});

vi.mock('@/app/components/lawyer/GlobalSearchOverlay/index', () => ({
    GlobalSearchOverlay: MockOverlay,
}));

vi.mock('@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchFocusArm', () => ({
    useGlobalSearchFocusArm: () => true,
}));

vi.mock('@/app/runtime/globalSearchBootHydrator', () => ({
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT: 'hami:global-search-shell-hydrated',
    hydrateGlobalSearchShellForInstantOpen: () => Promise.resolve(true),
}));

import { GlobalSearchOverlayHost } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost';

describe('GlobalSearchOverlayHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرسم البحث فوراً عبر الاستيراد المتزامن (بلا انتظار lazy chunk)', () => {
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
});
