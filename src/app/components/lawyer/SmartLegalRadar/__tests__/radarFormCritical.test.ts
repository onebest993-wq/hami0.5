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

    it('يُستورد من EventForm لا من critical-shell ولا من جذع الرادار', () => {
        expect(criticalShell).not.toMatch(/radarFormCritical\.css/);
        const form = readFileSync(resolve(__dirname, '../EventForm.tsx'), 'utf8');
        const radar = readFileSync(resolve(__dirname, '../../SmartLegalRadar.tsx'), 'utf8');
        expect(form).toMatch(/radarFormCritical\.css/);
        expect(radar).not.toMatch(/radarFormCritical\.css/);
        expect(radar).toContain('React.lazy');
        expect(radar).toContain('form.showForm');
        expect(radar).toContain('prefetchRadarEventForm');
        expect(radar).toContain('loadRadarEventFormModule');
        expect(radar).not.toMatch(/import\(['"]\.\/SmartLegalRadar\/EventForm['"]\)/);
        expect(radar).toContain('RadarEventFormInstantCover');
        const cover = readFileSync(
            resolve(
                __dirname,
                '../../dashboard/schedule/RadarEventFormInstantCover.tsx',
            ),
            'utf8',
        );
        expect(cover).toContain('radar-event-form-pending');
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
