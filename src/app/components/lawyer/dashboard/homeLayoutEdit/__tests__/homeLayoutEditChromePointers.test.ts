import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('HomeLayoutEditChrome pointer model', () => {
    const chrome = readFileSync(
        resolve(__dirname, '../HomeLayoutEditChrome.tsx'),
        'utf8',
    );
    const patternOverlay = readFileSync(
        resolve(__dirname, '../../HomeBlockPatternOverlay.tsx'),
        'utf8',
    );

    it('خلفية المخصّص لا تسرق pointer events عن مقابض السحب', () => {
        expect(chrome).toContain('home-layout-customizer-backdrop');
        expect(chrome).toContain('pointer-events-none');
        expect(chrome).not.toMatch(
            /home-layout-customizer-backdrop[\s\S]{0,200}onClick=\{closeCustomizer\}/,
        );
    });

    it('زخرفة البطاقة لا تُلغى بسبب wallpaper أو lite', () => {
        expect(patternOverlay).not.toContain('hasPersistedWallpaper');
        expect(patternOverlay).not.toContain("dataset.hamiLite === '1'");
    });
});
