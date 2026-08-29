import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LawyerDashboardProfileTab snap contract', () => {
    const src = readFileSync(
        resolve(__dirname, '../LawyerDashboardProfileTab.tsx'),
        'utf8',
    );

    it('غلاف التمرير يملأ إطار العرض حتى لا يظهر سطح #020408 تحت الصفحة', () => {
        expect(src).toContain('min-h-[100dvh]');
        expect(src).toContain('lawyer-profile-tab-shell');
    });

    it('لا يستورد useOpaqueFeatureSurface — يصارع data-hami-profile-open ويُسود الخروج', () => {
        expect(src).not.toMatch(/import\s*\{[^}]*useOpaqueFeatureSurface/);
        expect(src).not.toMatch(/useOpaqueFeatureSurface\s*\(/);
    });
});
