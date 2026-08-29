import React, { useEffect, useRef, useState } from 'react';
import { Check } from '@/app/components/ui/icons/Check';
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
                    ? 'ring-[3px] ring-[#E6C673] ring-offset-2 ring-offset-[#0B1021] border-2 border-[#E6C673]/80 shadow-[0_0_0_1px_rgba(230,198,115,0.35)]'
                    : 'border border-white/[0.12] hover:brightness-110 active:scale-[0.98]'
            }`}
            style={resolveThemeSwatchStyle(themeKey)}
        >
            {shownActive ? (
                <span
                    className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
                    aria-hidden
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E6C673] text-[#0B1021] shadow-lg">
                        <Check size={14} strokeWidth={3} />
                    </span>
                </span>
            ) : null}
        </button>
    );
}
