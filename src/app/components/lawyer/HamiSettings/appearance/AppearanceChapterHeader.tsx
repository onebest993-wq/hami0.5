import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { SETTING_FOCUS_RING } from '../settings-ui/tokens';
import {
    APPEARANCE_CHAPTERS,
    type AppearanceChapterId,
} from './appearanceChapters';

export function AppearanceChapterHeader({
    id,
    open,
    onToggle,
}: {
    id: AppearanceChapterId;
    open: boolean;
    onToggle: (id: AppearanceChapterId) => void;
}) {
    const meta = APPEARANCE_CHAPTERS.find((item) => item.id === id);
    if (!meta) return null;

    return (
        <button
            type="button"
            id={`appearance-chapter-${id}-trigger`}
            data-testid={meta.testId}
            aria-expanded={open}
            aria-controls={`appearance-chapter-${id}-panel`}
            aria-label={`${meta.label}، ${meta.hint}`}
            onPointerDown={() => {
                if (id === 'wallpaper') {
                    void import('./AppearanceWallpaperCard');
                    void import('./WallpaperEditorPanel');
                }
            }}
            onClick={() => onToggle(id)}
            className={`hami-appearance-chapter-trigger flex w-full items-center gap-2 min-h-[48px] px-3.5 py-2.5 text-right touch-manipulation ${SETTING_FOCUS_RING}`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <span className="min-w-0 flex-1 text-[13px] font-medium text-white/95">{meta.label}</span>
            <ChevronDown
                size={16}
                className={`hami-appearance-chapter-chevron shrink-0 text-white/35 ${open ? 'is-open' : ''}`}
                aria-hidden
            />
        </button>
    );
}
