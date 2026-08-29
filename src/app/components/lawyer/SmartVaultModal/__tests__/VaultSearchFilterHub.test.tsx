import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VaultSearchFilterHub } from '@/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub';

const baseProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    onSearchKeyDown: vi.fn(),
    searchInputRef: { current: null },
    activeFilter: 'الكل',
    onFilterChange: vi.fn(),
    customCategories: [],
    onAddCategory: vi.fn(),
    onRemoveCategory: vi.fn(),
    docs: [],
};

describe('VaultSearchFilterHub', () => {
    it('يُظهر زر التصنيف بجانب البحث ولوحة عمودية بانتقال انسيابي', async () => {
        render(<VaultSearchFilterHub {...baseProps} />);

        expect(screen.getByTestId('repository-search-deck')).toBeInTheDocument();
        const toggle = screen.getByTestId('repository-classification-toggle');
        expect(toggle).toBeInTheDocument();
        expect(screen.queryByTestId('repository-classification-panel')).not.toBeInTheDocument();

        fireEvent.click(toggle);
        const panel = await waitFor(() => screen.getByTestId('repository-classification-panel'));
        expect(panel).toBeInTheDocument();
        await waitFor(() => {
            expect(panel.className).toContain('hami-repository-filter-popover--visible');
        });
        expect(screen.getByTestId('repository-filter-deck')).toBeInTheDocument();
        expect(screen.getByTestId('repository-filter-all')).toBeInTheDocument();
        expect(screen.getByText('نوع المحتوى')).toBeInTheDocument();
    });

    it('يُخفي التصنيف من البحث عند externalClassification', () => {
        render(<VaultSearchFilterHub {...baseProps} externalClassification />);

        expect(screen.getByTestId('repository-search-deck')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-classification-toggle')).not.toBeInTheDocument();
        expect(screen.queryByTestId('repository-classification-panel')).not.toBeInTheDocument();
    });
});
