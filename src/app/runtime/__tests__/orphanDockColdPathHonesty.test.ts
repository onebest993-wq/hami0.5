import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('orphan LegalCommandCenterDock cold-path honesty', () => {
    it('الملف الميت والبوابة محذوفان؛ لا أثر على مسار الإقلاع', () => {
        expect(existsSync(join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'))).toBe(
            false,
        );
        expect(existsSync(join(root, 'src/app/bootstrap/homeDockBootGate.ts'))).toBe(false);

        const reveal = readFileSync(join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).not.toContain('homeDockBootGate');
        expect(reveal).not.toContain('waitForHomeDockBootChunk');

        const preload = readFileSync(join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).not.toContain('homeDockBootGate');
        expect(preload).not.toContain('LegalCommandCenterDock');

        const gateUi = readFileSync(join(root, 'src/app/bootstrap/LawyerDashboardGate.tsx'), 'utf8');
        expect(gateUi).not.toContain('homeDockBootGate');

        const warm = readFileSync(join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(warm).not.toContain('LegalCommandCenterDock');

        const dest = readFileSync(join(root, 'src/app/runtime/homeDestinationReveal.ts'), 'utf8');
        expect(dest).not.toContain('homeDockBootGate');

        const tw = readFileSync(join(root, 'src/styles/tailwind.css'), 'utf8');
        expect(tw).not.toContain('LegalCommandCenterDock');

        const liveHome = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(liveHome).not.toContain('LegalCommandCenterDock');
    });
});
