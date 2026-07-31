import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionArchiveToolbar } from '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar';

const baseProps = {
    lifecycleMode: 'active' as const,
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    filterType: 'all' as const,
    onFilterTypeChange: vi.fn(),
    perspectiveFilter: 'all' as const,
    onPerspectiveFilterChange: vi.fn(),
    dossierStatusFilter: 'all' as const,
    onDossierStatusFilterChange: vi.fn(),
};

describe('ExecutionArchiveToolbar', () => {
    it('يدمج زر التصنيف داخل البحث ويفتح اللوحة منه', () => {
        render(
            <ExecutionArchiveToolbar
                {...baseProps}
                jurisdictionCounts={{ all: 1, civil: 1, sharia: 0 }}
            />,
        );

        const panel = screen.getByTestId('execution-archive-filters-panel');
        expect(panel).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('execution-archive-filters-toggle')).toBeInTheDocument();

        const toggle = screen.getByTestId('execution-archive-filters-toggle');
        expect(toggle.closest('[data-testid="execution-archive-search-deck"]')).toBeTruthy();
        // زر التصنيف داخل صف البحث (نفس الحاوية مع حقل البحث)
        expect(screen.getByTestId('execution-archive-search').parentElement).toContainElement(toggle);
        fireEvent.click(toggle);

        expect(panel).toHaveAttribute('aria-hidden', 'false');
        expect(screen.getByTestId('execution-archive-filter-civil')).toBeInTheDocument();
        expect(screen.getByTestId('execution-archive-lifecycle-chips')).toBeInTheDocument();
    });

    it('يضع شرائح الحالة داخل لوحة التصنيف ويُزامِن الاختيار', () => {
        const onDossierStatusFilterChange = vi.fn();
        render(
            <ExecutionArchiveToolbar
                {...baseProps}
                onDossierStatusFilterChange={onDossierStatusFilterChange}
            />,
        );

        expect(screen.getByPlaceholderText('ابحث برقم الإضبارة أو العنوان...')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('execution-archive-filters-toggle'));

        expect(screen.getByTestId('execution-archive-lifecycle-chips')).toBeInTheDocument();
        expect(screen.queryByTestId('execution-archive-chip-archived')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('execution-archive-chip-suspended'));
        expect(onDossierStatusFilterChange).toHaveBeenCalledWith('suspended');

        fireEvent.click(screen.getByTestId('execution-archive-chip-paused'));
        expect(onDossierStatusFilterChange).toHaveBeenCalledWith('paused');

        fireEvent.click(screen.getByTestId('execution-archive-chip-finished'));
        expect(onDossierStatusFilterChange).toHaveBeenCalledWith('finished');
    });

    it('يعرض ملخص الفلاتر المفعّلة عند إغلاق اللوحة', () => {
        render(
            <ExecutionArchiveToolbar
                {...baseProps}
                filterType="civil"
                perspectiveFilter="creditor_agent"
                dossierStatusFilter="suspended"
            />,
        );

        const summary = screen.getByTestId('execution-archive-active-filters-summary');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveTextContent('مستأخرة');
        expect(summary).toHaveTextContent('مدني');
        expect(summary).toHaveTextContent('وكيل دائن');
    });
});
