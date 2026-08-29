import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('radarFormCritical.css', () => {
    const css = readFileSync(
        resolve(__dirname, '../radarFormCritical.css'),
        'utf8',
    );
    const criticalShell = readFileSync(
        resolve(__dirname, '../../../../../styles/critical-shell.css'),
        'utf8',
    );

    it('يُستورد من SmartLegalRadar لا من critical-shell', () => {
        expect(criticalShell).not.toMatch(/radarFormCritical\.css/);
        const radar = readFileSync(resolve(__dirname, '../../SmartLegalRadar.tsx'), 'utf8');
        expect(radar).toMatch(/radarFormCritical\.css/);
    });

    it('سطح كحلي صلب بلا اعتماد على متغيرات .hami-radar-page', () => {
        expect(css).toContain('.hami-radar-form-panel');
        expect(css).toMatch(/\.hami-radar-form-panel\s*\{[^}]*background-color:\s*#0a0f1c/s);
        expect(css).not.toContain('var(--radar-accent-pearl)');
        expect(css).not.toContain('var(--radar-border-accent)');
    });

    it('حقول الإدخال داكنة و16px بلا blur', () => {
        expect(css).toContain('.hami-radar-form-input');
        expect(css).toContain('background-color: #141a28');
        expect(css).toContain('color-scheme: dark');
        expect(css).toContain('font-size: 16px');
        expect(css).toContain('.hami-radar-form-overlay');
        expect(css).toContain('.hami-radar-form-fields');
        expect(css).toContain('.hami-radar-form-actions');
        expect(css).not.toContain('backdrop-blur');
    });
});
