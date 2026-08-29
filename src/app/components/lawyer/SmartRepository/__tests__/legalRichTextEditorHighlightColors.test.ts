import { describe, expect, it } from 'vitest';
import {
    highlightColorsMatch,
    LEGAL_HIGHLIGHT_COLORS,
    matchHighlightColor,
    normalizeCssColor,
} from '@/app/components/lawyer/SmartRepository/legalRichTextEditorHighlightColors';

describe('legalRichTextEditorHighlightColors', () => {
    it('يطابق ألوان الشريط بعد تطبيع hex', () => {
        expect(normalizeCssColor('#E6C67355')).toBe('#e6c673');
        expect(normalizeCssColor('rgb(230, 198, 115)')).toBe('#e6c673');
        expect(normalizeCssColor('transparent')).toBeNull();
        expect(matchHighlightColor(LEGAL_HIGHLIGHT_COLORS[0])?.toLowerCase()).toBe('#e6c67355');
    });

    it('يعتبر اللون نفسه متطابقاً بصيغ مختلفة', () => {
        expect(highlightColorsMatch('#E6C67355', 'rgb(230, 198, 115)')).toBe(true);
        expect(highlightColorsMatch('#E6C67355', '#7DD3A855')).toBe(false);
    });
});
