/**
 * E2E: استمرارية بطاقات القرارات — إعادة تحميل ومغادرة الإضبارة
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    E2E_DECISION_PERSIST_CARD_ID,
    seedExecutionWithPersistedDecision,
    mirrorPersistedDecisionKeysToIndexedDb,
} from './helpers/executionStorageFixtures';
import { openExecutionArchiveFromHome, openExecutionDossierByRowText, clickNativeElement } from './helpers/executionE2EBoot';

async function openPersistedExecutionDossier(page: Page, fromHome = false) {
    if (fromHome) {
        await openExecutionArchiveFromHome(page);
    } else {
        const archiveOpen = await page
            .getByTestId('execution-archive-shell')
            .getAttribute('aria-hidden')
            .then((v) => v === 'false')
            .catch(() => false);
        if (!archiveOpen) {
            await openExecutionArchiveFromHome(page);
        }
    }
    await openExecutionDossierByRowText(page, /بلوب حيّ E2E|2026\/تنفيذ\/880/);
    await expect(page.getByTestId('execution-dashboard-portal-open')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 20_000 });
}

async function openDecisionsHubOnDossier(page: Page) {
    const decisions = page.getByTestId('execution-open-decisions');
    await expect(decisions).toBeVisible({ timeout: 20_000 });
    await clickNativeElement(decisions);
    await expect(page.getByRole('heading', { name: 'مركز القرارات والطعون' })).toBeVisible({
        timeout: 20_000,
    });
    await expect(page.getByText('جاري تحميل القرارات…')).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
    await clickNativeElement(page.getByRole('tab', { name: 'القرارات السابقة' }));
    await page.evaluate(() => window.dispatchEvent(new Event('hami-decisions-reload')));
    await expect(page.getByText('جاري تحميل القرارات…')).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
}

async function expectPersistedDecisionCard(page: Page) {
    const card = page.locator(`#hami-decision-card-${E2E_DECISION_PERSIST_CARD_ID}`);
    await expect(async () => {
        await expect(card).toBeVisible({ timeout: 8_000 });
        await expect(card.getByText('قرار E2E ثابت')).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
}

test.describe('Decisions storage persist', () => {
    test.setTimeout(120_000);

    test.describe.configure({ mode: 'serial' });

    test('seeded decision card survives page reload and dossier reopen', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'قرارات E2E — chromium فقط');
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await seedExecutionWithPersistedDecision(page);

        await page.goto('/');
        await mirrorPersistedDecisionKeysToIndexedDb(page);
        await ensureLawyerDashboard(page);
        await bootToLawyerHome(page);
        await dismissProductivityBlockers(page);
        await openPersistedExecutionDossier(page);
        await openDecisionsHubOnDossier(page);
        await expectPersistedDecisionCard(page);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await mirrorPersistedDecisionKeysToIndexedDb(page);
        await bootToLawyerHome(page);
        await dismissProductivityBlockers(page);
        await expect(async () => {
            await openPersistedExecutionDossier(page, true);
        }).toPass({ timeout: 90_000 });
        await openDecisionsHubOnDossier(page);
        await expectPersistedDecisionCard(page);
    });
});
