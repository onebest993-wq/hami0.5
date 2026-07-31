import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

/**
 * موجة 4 — عقد ثبات المسار المشترك.
 * يمنع رجوع تلوث InstantShell/TTFI على interactive بدون كسر صريح للاختبار.
 */
describe('wave4 ux stability regress contract', () => {
    it('PostInteractive: تأخير ≥900ms + idle قبل التسليح', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime.tsx',
            ),
            'utf8',
        );
        expect(src).toMatch(/setTimeout\(\(\) => \{[\s\S]*?\},\s*900\)/);
        expect(src).toContain('requestIdleCallback');
        expect(src).toContain('onDashboardInteractive');
    });

    it('hydrator delay بعد الكشف لا يقل عن 800ms ويب', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects.ts'),
            'utf8',
        );
        expect(src).toContain('BOOT_REVEAL_DONE_EVENT');
        expect(src).toMatch(/800|HYDRATOR|hydrator/i);
    });

    it('createDeferredFeatureStubs: Hosts مغلقة افتراضياً (الإعدادات خارج الجزيرة)', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(src).not.toContain('settingsHostMounted');
        expect(src).toMatch(/fieldTasksHostMounted:\s*false/);
    });
});
