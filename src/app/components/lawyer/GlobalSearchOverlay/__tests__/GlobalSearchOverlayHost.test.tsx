import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearchOverlayHost } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost';

const MockOverlay = ({ open }: { open?: boolean }) =>
    open ? (
        <div data-testid="global-search-overlay" data-open={open ? 'true' : 'false'}>
            search-ready
        </div>
    ) : null;

const getCachedGlobalSearchOverlay = vi.fn(() => MockOverlay);
const loadGlobalSearchOverlayModule = vi.fn(() =>
    Promise.resolve({ GlobalSearchOverlay: MockOverlay }),
);

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    getCachedGlobalSearchOverlay: () => getCachedGlobalSearchOverlay(),
    loadGlobalSearchOverlayModule: () => loadGlobalSearchOverlayModule(),
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

        expect(screen.getByTestId('global-search-overlay')).toHaveTextContent('search-ready');
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

        expect(screen.getByTestId('global-search-overlay')).toHaveAttribute('data-open', 'true');

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
