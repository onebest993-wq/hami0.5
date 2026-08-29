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
    openRepositoryAddMenu,
    expectRepositoryClosed,
    pressRepositoryEscape,
    clickRepositoryChrome,
    visibleRepositoryModal,
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
        await expect(modal.getByRole('heading', { name: 'المستودع' })).toBeVisible();
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible();
        await clickRepositoryChrome(modal.getByTestId('repository-classification-toggle'));
        await expect(page.getByTestId('repository-classification-panel')).toBeVisible();
        await expect(page.getByTestId('repository-filter-all')).toBeVisible();
    });

    test('يغلق بـ Escape ويعاد فتحه', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await pressRepositoryEscape(page);
        await expectRepositoryClosed(page);

        await closeRepositoryIfOpen(page);
        await openRepositoryFromDock(page);
        await expect(visibleRepositoryModal(page)).toBeVisible();
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

    test('Escape يغلق قائمة الإضافة ويبقي المستودع', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await openRepositoryAddMenu(page, modal);
        await expect(page.getByTestId('repository-add-menu-panel')).toBeVisible({ timeout: 5_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('repository-add-menu-panel')).toBeHidden({ timeout: 5_000 });
        await expect(modal).toHaveAttribute('aria-hidden', 'false');
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible();
    });

    test('Escape يغلق لوحة التصنيف ويبقي المستودع', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await clickRepositoryChrome(modal.getByTestId('repository-classification-toggle'));
        await expect(page.getByTestId('repository-classification-panel')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('repository-classification-panel')).toBeHidden({ timeout: 5_000 });
        await expect(modal).toHaveAttribute('aria-hidden', 'false');
    });

    test('ينشئ غرفة من الشريط ويختارها', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await clickRepositoryChrome(modal.getByTestId('repository-room-filter-trigger'));
        await expect(page.getByTestId('repository-room-menu')).toBeVisible({ timeout: 5_000 });
        await clickRepositoryChrome(page.getByTestId('repository-room-create'));
        await expect(page.getByTestId('repository-room-new-title')).toBeVisible();
        await page.getByTestId('repository-room-new-title').fill('موكل سارة');
        await clickRepositoryChrome(page.getByTestId('repository-room-new-save'));

        await expect(modal.getByTestId('repository-room-filter-trigger')).toContainText('موكل سارة', {
            timeout: 8_000,
        });
    });

    test('ينقل وثيقة من العام إلى غرفة يُنشئها المحامي', async ({ page }) => {
        test.setTimeout(120_000);
        const doc = buildE2eVaultDoc();
        await bootLawyerHomeWithVaultDocs(page, [doc]);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });

        await clickRepositoryChrome(modal.getByTestId('repository-room-filter-trigger'));
        await expect(page.getByTestId('repository-room-menu')).toBeVisible({ timeout: 5_000 });
        await clickRepositoryChrome(page.getByTestId('repository-room-create'));
        await page.getByTestId('repository-room-new-title').fill('موكل أحمد');
        await clickRepositoryChrome(page.getByTestId('repository-room-new-save'));
        await expect(modal.getByTestId('repository-room-filter-trigger')).toContainText('موكل أحمد', {
            timeout: 8_000,
        });

        await clickRepositoryChrome(modal.getByTestId('repository-room-filter-trigger'));
        await expect(page.getByTestId('repository-room-menu')).toBeVisible({ timeout: 5_000 });
        await clickRepositoryChrome(page.getByTestId('repository-room-filter-main'));
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 8_000,
        });

        await clickRepositoryChrome(page.getByTestId('repository-move-to-room'));
        await expect(page.getByTestId('repository-move-room-menu')).toBeVisible({ timeout: 5_000 });
        await clickRepositoryChrome(
            page.getByTestId('repository-move-room-menu').getByRole('button', { name: 'موكل أحمد' }),
        );
        await expect(page.getByTestId('repository-move-room-menu')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('repository-move-room-backdrop')).toBeHidden({ timeout: 5_000 });
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeHidden({
            timeout: 8_000,
        });
        await clickRepositoryChrome(modal.getByTestId('repository-room-filter-trigger'));
        await expect(page.getByTestId('repository-room-menu')).toBeVisible({ timeout: 5_000 });
        await clickRepositoryChrome(
            page.getByTestId('repository-room-menu').getByRole('option', { name: 'موكل أحمد' }),
        );
        await expect(modal).toBeVisible({ timeout: 8_000 });
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 8_000,
        });
    });
});
