import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearchInstantSheetChrome } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantSheetChrome';
import { peekGlobalSearchDraftQuery, resetGlobalSearchDraftQueryForTests } from '@/app/runtime/globalSearchDraftQuery';
import { buildGlobalSearchInstantSheetInnerHtml } from '@/app/runtime/globalSearchInstantSheetHtml';

describe('GlobalSearchInstantSheetChrome', () => {
    it('يكتب المسودة من الحقل', () => {
        resetGlobalSearchDraftQueryForTests();
        const onClose = () => undefined;
        render(<GlobalSearchInstantSheetChrome onClose={onClose} />);
        fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'دعوى' } });
        expect(peekGlobalSearchDraftQuery()).toBe('دعوى');
        expect(screen.getByTestId('global-search-idle-hint')).toBeTruthy();
    });
});

describe('buildGlobalSearchInstantSheetInnerHtml', () => {
    it('يتضمن رأس البحث والحقل لا مقبض وحده', () => {
        const html = buildGlobalSearchInstantSheetInnerHtml();
        expect(html).toContain('data-testid="global-search-paint-input"');
        expect(html).toContain('البحث الشامل');
        expect(html).toContain('hami-gs-header');
        expect(html).toContain('global-search-idle-hint');
    });
});
