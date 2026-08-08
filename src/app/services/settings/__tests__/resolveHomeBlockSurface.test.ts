import { describe, expect, it, vi } from 'vitest';

vi.mock('../apply', () => ({
    loadPersistedWallpaper: () => undefined,
}));

import { resolveHomeBlockInlineStyle } from '../resolveHomeBlockStyle';

describe('resolveHomeBlockInlineStyle surface color', () => {
    it('يضبط ألوان سطح صلبة ولون لوحة من cardTheme', () => {
        const style = resolveHomeBlockInlineStyle(
            { cardTheme: 'emerald' },
            '#E6C673',
            {
                defaultGlassOpacity: 0.55,
                appearance: {
                    theme: 'gold',
                    cardTheme: 'gold',
                    patternTheme: 'sky',
                    brandColor: undefined,
                    themeMode: 'dark',
                },
            },
        );
        expect(style['--hami-block-accent']).toBeTruthy();
        expect(String(style['--hami-block-surface-bg'])).toMatch(/^rgb\(/);
        expect(style['--hami-glass-base']).toBe(style['--hami-block-surface-bg']);
        expect(String(style['--hami-glass-panel-bg'])).toMatch(/^rgba?\(/);
        expect(String(style['--hami-block-accent'])).not.toBe('#E6C673');
    });

    it('يفرّق بين خفيف وواضح في --hami-glass-panel-bg', () => {
        const base = {
            appearance: {
                theme: 'gold' as const,
                cardTheme: 'gold' as const,
                patternTheme: 'gold' as const,
                brandColor: '#E6C673',
                themeMode: 'dark' as const,
            },
        };
        const light = resolveHomeBlockInlineStyle(undefined, '#E6C673', {
            ...base,
            defaultGlassOpacity: 0.1,
        });
        const clear = resolveHomeBlockInlineStyle(undefined, '#E6C673', {
            ...base,
            defaultGlassOpacity: 0.85,
        });
        expect(light['--hami-glass-panel-bg']).not.toBe(clear['--hami-glass-panel-bg']);
    });
});
