import React, { Suspense, lazy, useEffect } from 'react';
import { SettingCard } from '../settings-ui/index';
import { AppearanceChapterHeader } from './AppearanceChapterHeader';
import { APPEARANCE_CHAPTERS, type AppearanceChapterId } from './appearanceChapters';
import { AppearanceThemeAndSurfaceCard } from './AppearanceThemeAndSurfaceCard';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

const AppearanceWallpaperCard = lazy(() =>
    import('./AppearanceWallpaperCard').then((m) => ({ default: m.AppearanceWallpaperCard })),
);

function AppearanceChapterBody({
    id,
    vm,
}: {
    id: AppearanceChapterId;
    vm: AppearanceSectionViewModel;
}) {
    switch (id) {
        case 'theme':
            return <AppearanceThemeAndSurfaceCard vm={vm} />;
        case 'wallpaper':
            return (
                <Suspense fallback={null}>
                    <AppearanceWallpaperCard vm={vm} />
                </Suspense>
            );
    }
}

export function AppearanceChapterList({
    vm,
    openId,
    onToggle,
}: {
    vm: AppearanceSectionViewModel;
    openId: AppearanceChapterId | null;
    onToggle: (id: AppearanceChapterId) => void;
}) {
    useEffect(() => {
        if (openId !== 'wallpaper') return;
        void import('./AppearanceWallpaperCard');
        void import('./WallpaperEditorPanel');
    }, [openId]);

    return (
        <SettingCard className="hami-appearance-chapter-list">
            {APPEARANCE_CHAPTERS.map((chapter) => {
                const open = openId === chapter.id;
                return (
                    <div
                        key={chapter.id}
                        className={`hami-appearance-chapter ${open ? 'is-open' : ''}`}
                    >
                        <AppearanceChapterHeader id={chapter.id} open={open} onToggle={onToggle} />
                        {open ? (
                            <div
                                id={`appearance-chapter-${chapter.id}-panel`}
                                role="region"
                                aria-labelledby={`appearance-chapter-${chapter.id}-trigger`}
                                className="hami-appearance-chapter-panel"
                            >
                                <AppearanceChapterBody id={chapter.id} vm={vm} />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </SettingCard>
    );
}
