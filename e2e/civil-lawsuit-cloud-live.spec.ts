/**
 * E2E سحابة حية — يُشغَّل فقط عند توفير بيئة staging:
 *
 *   E2E_LAWSUIT_CLOUD_LIVE=1
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (أو جلسة BFF حقيقية)
 *
 * Usage: npm run test:e2e:civil-lawsuits:cloud:live
 */
import { test, expect } from '@playwright/test';
import { prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { ensureE2eLawyerAuthSession } from './helpers/cloudLawsuitE2EFixtures';

const liveEnabled =
    process.env.E2E_LAWSUIT_CLOUD_LIVE === '1' || process.env.E2E_LAWSUIT_CLOUD_LIVE === 'true';

const hasSupabaseEnv = Boolean(
    String(process.env.VITE_SUPABASE_URL || '').includes('supabase.co') &&
        String(process.env.VITE_SUPABASE_ANON_KEY || '').length > 20,
);

test.describe('Civil lawsuit cloud live (staging)', () => {
    test.skip(
        !liveEnabled || !hasSupabaseEnv,
        'Set E2E_LAWSUIT_CLOUD_LIVE=1 and VITE_SUPABASE_* for staging round-trip',
    );

    test.describe.configure({ timeout: 180_000 });

    test('canRunCloudSync accepts staging session', async ({ page }) => {
        await prepareProductivityE2E(page);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await ensureE2eLawyerAuthSession(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/app/services/cloudSyncEngine.ts');
            const can = await mod.canRunCloudSync({ allowWhenRealtimeActive: true });
            return { can };
        });

        expect(result.can).toBe(true);
    });
});
