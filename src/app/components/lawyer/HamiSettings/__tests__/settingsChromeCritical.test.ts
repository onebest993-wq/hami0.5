import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settingsChrome critical layout', () => {
    const css = readFileSync(
        resolve(__dirname, '../settingsChrome.css'),
        'utf8',
    );

    it('يتضمن عرض البطاقات والإطار قبل deferred-app', () => {
        expect(css).toContain('.hami-settings-section-frame');
        expect(css).toContain('max-width: 36rem');
        expect(css).toContain('.hami-setting-glass');
        expect(css).toContain('transition: none');
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] [role='radiogroup']");
        expect(css).toContain('.hami-appearance-theme-grid');
        expect(css).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
        expect(css).toContain('.hami-appearance-pattern-grid');
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] .hami-appearance-theme-grid");
        expect(css).toContain("[data-testid='appearance-block-customize-sheet'] .hami-appearance-pattern-grid");
    });
});
