import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppearanceChapterHeader } from '@/app/components/lawyer/HamiSettings/appearance/AppearanceChapterHeader';
import { useAppearanceChapter } from '@/app/components/lawyer/HamiSettings/appearance/useAppearanceChapter';
import { APPEARANCE_CHAPTER_DEFAULT } from '@/app/components/lawyer/HamiSettings/appearance/appearanceChapters';

function ChapterHarness() {
    const { openId, toggle } = useAppearanceChapter();
    return (
        <AppearanceChapterHeader
            id="wallpaper"
            open={openId === 'wallpaper'}
            onToggle={toggle}
        />
    );
}

describe('appearance chapters', () => {
    it('يفتح فصلاً واحداً ويُغلقه باللمسة التالية', () => {
        render(<ChapterHarness />);
        const btn = screen.getByTestId('appearance-chapter-wallpaper');
        expect(btn).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'false');
    });

    it('الفصل الافتراضي هو الواجهة', () => {
        function ThemeProbe() {
            const { openId } = useAppearanceChapter();
            return <span data-testid="open-id">{openId}</span>;
        }
        render(<ThemeProbe />);
        expect(screen.getByTestId('open-id').textContent).toBe(APPEARANCE_CHAPTER_DEFAULT);
    });
});
