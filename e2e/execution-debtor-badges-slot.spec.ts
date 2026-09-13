/**
 * E2E: هيكلُ انتظار شارات المدين بارتفاع الشارة الحقيقية — فلا يقفز صفُّ الإضبارة حين تحلّ الشاراتُ محلّه.
 *
 * قِيس ٢٠٢٦-٠٩-١٤ على هاتف (٣٩٠×٨٤٤): الهيكلُ الثابت كان أطولَ من الشارة، فأزاح التبديلُ ما تحت الصفّ.
 * **والمقارنةُ نسبيةٌ لا مطلقة:** الشارةُ تُبنى في الصفّ نفسه من `PARTY_BADGE_PILL_CLASS`، فيصحّ الحكمُ
 * بأيّ خطٍّ يحمله العدّاء.
 *
 * **ولماذا `serviceWorkers: 'block'`:** `dist` يشحن `sw.js`، و`page.route` لا يرى ما يخدمه عاملُ الخدمة —
 * فبدونه لا يُحجز جزءُ الشارات، وتُرسم الشاراتُ فوراً، ولا يظهر الهيكلُ ليُقاس.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    seedExecutionWithPersistedDecision,
    mirrorPersistedDecisionKeysToIndexedDb,
} from './helpers/executionStorageFixtures';
import { openExecutionArchiveFromHome, openExecutionDossierByRowText } from './helpers/executionE2EBoot';
import { PARTY_BADGE_ICON_SIZE, PARTY_BADGE_PILL_CLASS } from '../src/app/components/lawyer/execution/partyBadgeShell';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });

test.describe('Debtor badges paint slot', () => {
    test.setTimeout(120_000);

    test('the waiting skeleton is exactly as tall as a real badge pill', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'قياسُ تخطيط — chromium فقط');
        let releaseChunk: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            releaseChunk = resolve;
        });
        let chunkHeld = false;
        await page.route('**/DebtorCardRowBadgesCluster-*.js', async (route) => {
            chunkHeld = true;
            await held;
            await route.continue();
        });

        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await seedExecutionWithPersistedDecision(page);
        await page.goto('/');
        await mirrorPersistedDecisionKeysToIndexedDb(page);
        await ensureLawyerDashboard(page);
        await bootToLawyerHome(page);
        await dismissProductivityBlockers(page);
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /بلوب حيّ E2E|2026\/تنفيذ\/880/);
        await expect(page.getByTestId('execution-dashboard-portal-open')).toBeVisible({ timeout: 15_000 });

        const slot = page.getByTestId('debtor-badges-paint-slot').first();
        await expect(slot).toBeVisible({ timeout: 30_000 });
        /* ضبطُ المسبار: الهيكلُ ظهر لأنّ الجزء حُجز فعلاً، لا لسببٍ آخر */
        expect(chunkHeld).toBe(true);

        const { slotHeight, pillHeight } = await slot.evaluate(
            (el, { pillClass, iconSize }) => {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = pillClass;
                pill.innerHTML = `<svg width="${iconSize}" height="${iconSize}" class="shrink-0"></svg><span class="whitespace-nowrap">حجز منقول</span>`;
                (el.parentElement as HTMLElement).appendChild(pill);
                const measured = pill.getBoundingClientRect().height;
                pill.remove();
                return { slotHeight: el.getBoundingClientRect().height, pillHeight: measured };
            },
            { pillClass: PARTY_BADGE_PILL_CLASS, iconSize: PARTY_BADGE_ICON_SIZE },
        );
        releaseChunk();

        expect(pillHeight).toBeGreaterThan(0);
        expect(Math.abs(slotHeight - pillHeight)).toBeLessThanOrEqual(0.5);
    });
});
