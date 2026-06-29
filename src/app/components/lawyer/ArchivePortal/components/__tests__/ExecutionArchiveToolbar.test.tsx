import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionArchiveToolbar } from '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar';

describe('ExecutionArchiveToolbar', () => {
    it('يخفي التصنيفات افتراضياً ويفتحها بزر السهم', () => {
        render(
            <ExecutionArchiveToolbar
                lifecycleMode="active"
                searchQuery=""
                onSearchQueryChange={vi.fn()}
                filterType="all"
                onFilterTypeChange={vi.fn()}
                perspectiveFilter="all"
                onPerspectiveFilterChange={vi.fn()}
                jurisdictionCounts={{ all: 1, civil: 1, sharia: 0 }}
            />,
        );

        const panel = screen.getByTestId('execution-archive-filters-panel');
        expect(panel).toHaveAttribute('aria-hidden', 'true');

        fireEvent.click(screen.getByTestId('execution-archive-filters-toggle'));
        expect(panel).toHaveAttribute('aria-hidden', 'false');
        expect(screen.getByTestId('execution-archive-filter-civil')).toBeInTheDocument();
    });

    it('يعرض ملخص الفلاتر النشطة عند الإغلاق', () => {
        render(
            <ExecutionArchiveToolbar
                lifecycleMode="active"
                searchQuery=""
                onSearchQueryChange={vi.fn()}
                filterType="civil"
                onFilterTypeChange={vi.fn()}
                perspectiveFilter="creditor_agent"
                onPerspectiveFilterChange={vi.fn()}
            />,
        );

        const summary = screen.getByTestId('execution-archive-active-filters-summary');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveTextContent('مدني');
        expect(summary).toHaveTextContent('وكيل دائن');
    });
});
