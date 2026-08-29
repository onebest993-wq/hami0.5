import React from 'react';
import type { ThemeKey } from '@/app/types/common';
import { AppearanceThemeSwatch } from './AppearanceThemeSwatch';

export function AppearanceThemeSwatchGrid({
    keys,
    activeKey,
    onSelect,
}: {
    keys: ThemeKey[];
    activeKey: string;
    onSelect: (key: ThemeKey) => void;
}) {
    return (
        <div className="hami-appearance-theme-grid hami-appearance-theme-grid--compact">
            {keys.map((key) => (
                <AppearanceThemeSwatch
                    key={key}
                    themeKey={key}
                    active={activeKey === key}
                    onSelect={onSelect}
                    size="sm"
                />
            ))}
        </div>
    );
}
