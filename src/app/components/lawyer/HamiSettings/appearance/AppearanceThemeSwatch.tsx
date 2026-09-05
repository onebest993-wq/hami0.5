import React, { useEffect, useRef, useState } from 'react';
import { SettingsCheckIcon } from '../settingsStemIconsLazy';
import type { ThemeKey } from '@/app/types/common';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings';
import { resolveThemeSwatchStyle } from './themeSwatchStyle';

export function AppearanceThemeSwatch({
    themeKey,
    active,
    onSelect,
    size = 'md',
}: {
    themeKey: ThemeKey;
    active: boolean;
    onSelect: (key: ThemeKey) => void;
    size?: 'md' | 'sm';
}) {
    const token = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    const sizeClass = size === 'sm' ? 'hami-setting-theme-swatch--sm' : '';
    const [pendingKey, setPendingKey] = useState<ThemeKey | null>(null);
    const pointerCommitRef = useRef(false);
    const shownActive = pendingKey === themeKey || active;

    useEffect(() => {
        if (pendingKey !== null && active) {
            setPendingKey(null);
        }
    }, [active, pendingKey]);

    return (
        <button
            type="button"
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                pointerCommitRef.current = true;
                setPendingKey(themeKey);
                onSelect(themeKey);
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (pointerCommitRef.current) {
                    pointerCommitRef.current = false;
                    return;
                }
                setPendingKey(themeKey);
                onSelect(themeKey);
            }}
            title={token.name}
            aria-label={token.name}
            aria-pressed={shownActive}
            data-active={shownActive ? 'true' : 'false'}
            data-testid={`appearance-theme-swatch-${themeKey}`}
            className={`hami-setting-theme-swatch ${sizeClass} relative w-full rounded-xl overflow-hidden touch-manipulation ${
                shownActive
                    ? 'ring-2 ring-[#E6C673]/80 ring-offset-1 ring-offset-[#0B1021] border border-[#E6C673]/70'
                    : 'border border-white/[0.12]'
            }`}
            style={resolveThemeSwatchStyle(themeKey)}
        >
            {shownActive ? (
                <span
                    className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
                    aria-hidden
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E6C673] text-[#0B1021]">
                        <SettingsCheckIcon size={12} strokeWidth={3} />
                    </span>
                </span>
            ) : null}
        </button>
    );
}
