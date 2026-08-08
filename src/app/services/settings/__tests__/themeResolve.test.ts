import { describe, expect, it } from 'vitest';
import { mergeBlockScopedAppearance } from '../themeResolve';
import type { AppearanceSettings } from '../types';

const baseAppearance = {
    theme: 'gold',
    cardTheme: 'gold',
    patternTheme: 'sky',
    brandColor: undefined,
} as Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme' | 'brandColor'>;

describe('mergeBlockScopedAppearance', () => {
    it('لا يربط لون النقش بلون بطاقة القسم عند غياب patternTheme على القسم', () => {
        const merged = mergeBlockScopedAppearance(baseAppearance as AppearanceSettings, {
            cardTheme: 'emerald',
        });
        expect(merged.cardTheme).toBe('emerald');
        expect(merged.patternTheme).toBe('sky');
    });

    it('يحترم patternTheme المخصص للقسم عند تعيينه', () => {
        const merged = mergeBlockScopedAppearance(baseAppearance as AppearanceSettings, {
            cardTheme: 'emerald',
            patternTheme: 'crimson',
        });
        expect(merged.cardTheme).toBe('emerald');
        expect(merged.patternTheme).toBe('crimson');
    });
});
