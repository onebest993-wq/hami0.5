/**
 * E2E — رفع صورة/PDF من منتقي الملفات، مرفق المسودة 44px، ومسح بكاميرا محاكاة.
 */
import { test, expect, type Page } from '@playwright/test';
import { gotoLawyerHomeE2E } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { clearVaultStorage } from './helpers/vaultFixtures';
import { clearLawyerNotes, openRepositoryNoteCreate } from './helpers/notepadFixtures';
import {
    clickRepositoryChrome,
    openRepositoryFromDock,
    openRepositoryScanner,
} from './helpers/repositoryFixtures';
import {
    E2E_REPO_COMPOSE_ATTACH_FILE,
    E2E_REPO_IMAGE_FILE,
    E2E_REPO_PDF_FILE,
    applyScannerCameraMockOnPage,
    assignRepositoryOsPickerFile,
    completeScannerCaptureAndSave,
    expectRepositoryScanTitleVisible,
    grantCameraPermission,
    installScannerCameraMock,
} from './helpers/repositoryMediaFixtures';

async function uploadThroughOsPicker(
    page: Page,
    inputTestId: 'repository-upload-image-input' | 'repository-upload-pdf-input',
    file: { name: string; mimeType: string; buffer: Buffer },
    title: string,
) {
    const modal = await openRepositoryFromDock(page);
    await expect(modal).toBeVisible({ timeout: 15_000 });
    const overlay = await assignRepositoryOsPickerFile(modal, inputTestId, file);
    await overlay.getByTestId('vault-upload-title').fill(title);
    await clickRepositoryChrome(overlay.getByTestId('vault-upload-confirm'));
    await expect(overlay).toBeHidden({ timeout: 20_000 });
    await expect(modal.getByText(title)).toBeVisible({ timeout: 15_000 });
    return modal;
}

test.describe('مستودع — رفع ومسح ومرفق المسودة', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearVaultStorage(page);
        await clearLawyerNotes(page);
    });

    test('يرفع صورة من منتقي الملفات ويحفظها في الخلاصة', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);
        const title = `صورة هوية E2E ${Date.now()}`;
        await uploadThroughOsPicker(page, 'repository-upload-image-input', E2E_REPO_IMAGE_FILE, title);
    });

    test('يرفع PDF من منتقي الملفات ويحفظه في الخلاصة', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);
        const title = `عقد بيع E2E ${Date.now()}`;
        await uploadThroughOsPicker(page, 'repository-upload-pdf-input', E2E_REPO_PDF_FILE, title);
    });

    test('مرفق المسودة: اختيار ملف ثم إزالة بهدف لمس ≥ 44px', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await openRepositoryNoteCreate(modal);
        await expect(modal.getByTestId('repository-notepad-editor')).toBeVisible();

        await page.getByTestId('repository-compose-attach-input').setInputFiles(E2E_REPO_COMPOSE_ATTACH_FILE);
        const chip = modal.getByTestId('repository-compose-attach-chip');
        await expect(chip).toBeVisible({ timeout: 8_000 });
        await expect(chip).toContainText('مرفق-مسودة.png');

        const remove = modal.getByTestId('repository-compose-attach-remove');
        const box = await remove.boundingBox();
        expect(box, 'زر إزالة المرفق يجب أن يظهر').toBeTruthy();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);

        await clickRepositoryChrome(remove);
        await expect(chip).toBeHidden({ timeout: 5_000 });
    });

    test('الماسح: فتح الكاميرا المحاكاة ثم التقاط وحفظ', async ({ page }) => {
        await installScannerCameraMock(page);
        await gotoLawyerHomeE2E(page);
        await grantCameraPermission(page);
        await applyScannerCameraMockOnPage(page);
        const cameraFlagReady = await page.evaluate(
            () => sessionStorage.getItem('hami:e2e-camera') === '1',
        );
        expect(cameraFlagReady, 'يجب رفع علم محاكاة الكاميرا قبل فتح الماسح').toBe(true);
        await dismissProductivityBlockers(page);

        const { modal, scanner } = await openRepositoryScanner(page);
        await applyScannerCameraMockOnPage(page);
        await expect(scanner).toHaveAttribute('data-scanner-signed', '1');
        await expect(scanner.getByTestId('vault-scanner-open-camera')).toBeVisible();
        await clickRepositoryChrome(scanner.getByTestId('vault-scanner-open-camera'));
        await expect(scanner).toHaveAttribute('data-scan-phase', 'camera', { timeout: 12_000 });
        await expect(scanner.getByTestId('vault-scanner-video')).toBeVisible();

        const title = `مسح E2E ${Date.now()}`;
        await completeScannerCaptureAndSave(scanner, title);

        await clickRepositoryChrome(scanner.getByTestId('vault-scanner-close'));
        await expect(scanner).toBeHidden({ timeout: 8_000 });
        await expectRepositoryScanTitleVisible(modal, title);
    });

    test('الماسح: مسار getUserMedia (كاميرا Chromium الوهمية — ليست هاتفاً)', async ({
        page,
        browserName,
    }) => {
        test.skip(browserName === 'webkit', 'WebKit لا يوفّر كاميرا Chromium الوهمية');

        await gotoLawyerHomeE2E(page);
        await grantCameraPermission(page);
        await dismissProductivityBlockers(page);

        const { modal, scanner } = await openRepositoryScanner(page);
        await expect(scanner).toHaveAttribute('data-scanner-signed', '1');
        await clickRepositoryChrome(scanner.getByTestId('vault-scanner-open-camera'));
        await expect(scanner).toHaveAttribute('data-scan-phase', 'camera', { timeout: 12_000 });
        await expect(scanner.getByTestId('vault-scanner-video')).toBeVisible();
        await expect
            .poll(
                async () =>
                    page.evaluate(() => {
                        const video = document.querySelector(
                            '[data-testid="vault-scanner-video"]',
                        ) as HTMLVideoElement | null;
                        return video?.videoWidth ?? 0;
                    }),
                { timeout: 8_000 },
            )
            .toBeGreaterThan(0);

        const title = `مسح getUserMedia ${Date.now()}`;
        await completeScannerCaptureAndSave(scanner, title);

        await clickRepositoryChrome(scanner.getByTestId('vault-scanner-close'));
        await expect(scanner).toBeHidden({ timeout: 8_000 });
        await expectRepositoryScanTitleVisible(modal, title);
    });
});
