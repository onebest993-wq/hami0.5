/**
 * E2E — المستودع الذكي الموحّد: فتح، shell، perf، إغلاق.
 */
import { test, expect } from '@playwright/test';
import { gotoLawyerHomeE2E } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { buildE2eVaultDoc, clearVaultStorage, seedVaultDocs, hydrateVaultDocsForE2E, bootLawyerHomeWithVaultDocs } from './helpers/vaultFixtures';
import {
    openRepositoryFromDock,
    closeRepositoryIfOpen,
    readRepositoryOpenToInteractiveMs,
    openRepositoryVoiceRecorder,
    expectRepositoryClosed,
    pressRepositoryEscape,
    E2E_REPOSITORY_COLD_OPEN_MS,
    E2E_REPOSITORY_CACHED_OPEN_MS,
} from './helpers/repositoryFixtures';
import { installVoiceRecorderMocks, grantMicrophonePermission } from './helpers/voiceRecorderFixtures';

test.describe('المستودع الذكي الموحّد', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearVaultStorage(page);
    });

    test('يفتح من الرئيسية ويعرض shell فوراً', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await expect(modal.getByText('المستودع الذكي')).toBeVisible();
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible();
        await modal.getByTestId('repository-classification-toggle').click();
        await expect(modal.getByTestId('repository-filter-all')).toBeVisible();
    });

    test('يغلق بـ Escape ويعاد فتحه', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await pressRepositoryEscape(page);
        await expectRepositoryClosed(page);

        await closeRepositoryIfOpen(page);
        await openRepositoryFromDock(page);
        await expect(page.getByTestId('smart-repository-modal')).toHaveAttribute('aria-hidden', 'false');
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await openRepositoryFromDock(page);

        const perfMs = await readRepositoryOpenToInteractiveMs(page, 30_000);
        expect(perfMs, 'يجب تسجيل hami:repository:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_REPOSITORY_COLD_OPEN_MS);
    });

    test('الفتح مع cache وثائق ضمن حد زمني', async ({ page }) => {
        const doc = buildE2eVaultDoc();
        await bootLawyerHomeWithVaultDocs(page, [doc]);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });

        const perfMs = await readRepositoryOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع cache وثائق').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_REPOSITORY_CACHED_OPEN_MS);
    });

    test('Escape يغلق المسجّل الصوتي ويبقي المستودع مفتوحاً', async ({ page }) => {
        await installVoiceRecorderMocks(page);
        await grantMicrophonePermission(page);
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const { modal, recorder } = await openRepositoryVoiceRecorder(page);
        await recorder.click({ force: true });
        await page.keyboard.press('Escape');
        await expect(recorder).toBeHidden({ timeout: 8_000 });
        await expect(modal).toHaveAttribute('aria-hidden', 'false');
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible();
    });
});
