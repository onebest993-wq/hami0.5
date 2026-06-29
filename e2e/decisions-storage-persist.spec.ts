/**
 * E2E: استمرارية بطاقات القرارات — إعادة تحميل ومغادرة الإضبارة
 */
import { test, expect } from '@playwright/test';
import { prepareBootE2E, bootToLawyerHome } from './helpers/bootFixtures';
import {
    E2E_DECISION_PERSIST_CARD_ID,
    seedExecutionWithPersistedDecision,
    mirrorPersistedDecisionKeysToIndexedDb,
} from './helpers/executionStorageFixtures';

async function openPersistedExecutionDossier(page: import('@playwright/test').Page) {
    const archiveOpen = await page
        .getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })
        .isVisible()
        .catch(() => false);
    if (!archiveOpen) {
        await page.evaluate(() => {
            const hub = document.querySelector('[data-testid="hub-archive-execution"]') as HTMLElement | null;
            hub?.click();
        });
        await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
            timeout: 25_000,
        });
    }
    await page.getByText(/بلوب حيّ E2E|2026\/تنفيذ\/880/).first().click({ timeout: 20_000 });
    await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 20_000 });
}


async function openDecisionsHubOnDossier(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'القرارات والطعون' }).click({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'مركز القرارات والطعون' })).toBeVisible({
        timeout: 20_000,
    });
    await expect(page.getByText('جاري تحميل القرارات…')).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
    await page.getByRole('tab', { name: 'القرارات السابقة' }).click({ timeout: 15_000 });
    await page.evaluate(() => window.dispatchEvent(new Event('hami-decisions-reload')));
    await expect(page.getByText('جاري تحميل القرارات…')).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
}

async function expectPersistedDecisionCard(page: import('@playwright/test').Page) {
    const card = page.locator(`#hami-decision-card-${E2E_DECISION_PERSIST_CARD_ID}`);
    await expect(card).toBeVisible({ timeout: 25_000 });
    await expect(card.getByText('قرار E2E ثابت')).toBeVisible({ timeout: 10_000 });
}

test.describe('Decisions storage persist', () => {
    test.setTimeout(120_000);

    test.describe.configure({ mode: 'serial' });

    test('seeded decision card survives page reload and dossier reopen', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'قرارات E2E — chromium فقط');
        await prepareBootE2E(page);
        await seedExecutionWithPersistedDecision(page);

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await mirrorPersistedDecisionKeysToIndexedDb(page);

        const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
        if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await devBypass.click();
        }

        await bootToLawyerHome(page);
        await openPersistedExecutionDossier(page);
        await openDecisionsHubOnDossier(page);
        await expectPersistedDecisionCard(page);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await mirrorPersistedDecisionKeysToIndexedDb(page);
        if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await devBypass.click();
        }
        await bootToLawyerHome(page);
        await openPersistedExecutionDossier(page);
        await openDecisionsHubOnDossier(page);
        await expectPersistedDecisionCard(page);
    });
});
