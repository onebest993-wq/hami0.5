import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchiveDossierToolbar } from '../ArchiveDossierToolbar';

describe('ArchiveDossierToolbar lifecycle', () => {
    it('يظهر تبويب السلة حتى لو العدّاد صفراً', () => {
        render(
            <ArchiveDossierToolbar
                showJurisdictionTabs
                jurisdictionTab="all"
                onJurisdictionTabChange={vi.fn()}
                searchQuery=""
                onSearchQueryChange={vi.fn()}
                viewMode="grid"
                onViewModeChange={vi.fn()}
                lifecycleViewMode="active"
                onLifecycleViewModeChange={vi.fn()}
                archivedCount={0}
                trashedCount={0}
            />,
        );

        fireEvent.click(screen.getByTestId('archive-jurisdiction-filters-toggle'));
        expect(screen.getByTestId('lawsuits-trash-toggle')).toBeTruthy();
        expect(screen.getByTestId('lawsuits-view-archived')).toBeTruthy();
    });

    it('يفصل أيقونة البحث عن النص التوضيحي ولا يكرر زخرفة WebKit', () => {
        render(
            <ArchiveDossierToolbar
                showJurisdictionTabs={false}
                jurisdictionTab="all"
                onJurisdictionTabChange={vi.fn()}
                searchQuery=""
                onSearchQueryChange={vi.fn()}
                viewMode="grid"
                onViewModeChange={vi.fn()}
            />,
        );
        const input = screen.getByPlaceholderText('ابحث برقم أو اسم…');
        expect(input.className).toContain('ps-9');
        expect(input.className).toContain('[&::-webkit-search-decoration]:hidden');
        expect(input.className).not.toContain('pr-9');
    });
});
