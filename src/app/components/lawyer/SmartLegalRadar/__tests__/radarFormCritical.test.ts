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

    it('يُستورد من critical-shell', () => {
        expect(criticalShell).toMatch(/radarFormCritical\.css/);
    });

    it('سطح صلب بلا اعتماد على متغيرات .hami-radar-page', () => {
        expect(css).toContain('.hami-radar-form-panel');
        expect(css).toContain('background-color: #f8f6f2');
        expect(css).not.toContain('var(--radar-accent-pearl)');
        expect(css).not.toContain('var(--radar-border-accent)');
    });

    it('حقول الإدخال بخلفية بيضاء صلبة', () => {
        expect(css).toContain('.hami-radar-form-input');
        expect(css).toContain('background-color: #ffffff');
    });
});
