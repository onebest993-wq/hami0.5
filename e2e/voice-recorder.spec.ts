/**
 * E2E — المسجل الذكي: فتح من المستودع، تسجيل وهمي، Escape، إغلاق، إعادة فتح.
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import { openNotepadShellFromHome } from './helpers/notepadFixtures';
import { grantMicrophonePermission, installVoiceRecorderMocks } from './helpers/voiceRecorderFixtures';

async function openVoiceRecorderFromRepository(page: Page) {
    const modal = await openNotepadShellFromHome(page);
    await modal.getByTestId('repository-voice-record').click({ force: true });
    const recorder = page.getByTestId('voice-recorder-modal');
    await expect(recorder).toBeVisible({ timeout: 12_000 });
    return recorder;
}

test.describe('المسجل الذكي', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await installVoiceRecorderMocks(page);
        await grantMicrophonePermission(page);
    });

    test('يفتح من المستودع ويعرض الحالة الابتدائية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const modal = await openVoiceRecorderFromRepository(page);
        await expect(modal.getByRole('heading', { name: 'المسجل الذكي' })).toBeVisible();
        await expect(modal.getByTestId('voice-recorder-idle-hint')).toBeVisible();
        await expect(modal.getByTestId('voice-recorder-start')).toHaveText('ابدأ التسجيل');
    });

    test('Escape يغلق المسجل في الحالة الابتدائية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await openVoiceRecorderFromRepository(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('voice-recorder-modal')).toBeHidden({ timeout: 5_000 });
    });

    test('زر الإغلاق يغلق المسجل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const modal = await openVoiceRecorderFromRepository(page);
        await modal.getByTestId('voice-recorder-close').click();
        await expect(page.getByTestId('voice-recorder-modal')).toBeHidden({ timeout: 5_000 });
    });

    test('إعادة الفتح تعيد الحالة الابتدائية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const modal = await openVoiceRecorderFromRepository(page);
        await modal.getByTestId('voice-recorder-close').click();
        await expect(page.getByTestId('voice-recorder-modal')).toBeHidden({ timeout: 5_000 });

        const modal2 = await openVoiceRecorderFromRepository(page);
        await expect(modal2.getByTestId('voice-recorder-idle-hint')).toBeVisible();
        await expect(modal2.getByTestId('voice-recorder-start')).toBeVisible();
    });

    test('يبدأ التسجيل ويعرض المؤقت ثم يوقف', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const modal = await openVoiceRecorderFromRepository(page);
        await modal.getByTestId('voice-recorder-start').click();
        await expect(modal.getByTestId('voice-recorder-timer')).toBeVisible({ timeout: 5_000 });
        await expect(modal.getByTestId('voice-recorder-stop')).toBeVisible();

        await page.waitForTimeout(1_200);
        await modal.getByTestId('voice-recorder-stop').click();

        await expect
            .poll(async () => {
                const modalVisible = await page.getByTestId('voice-recorder-modal').isVisible();
                const resultVisible = await page.getByTestId('voice-recorder-result').isVisible().catch(() => false);
                return !modalVisible || resultVisible;
            }, { timeout: 10_000 })
            .toBe(true);
    });

    test('Escape أثناء التسجيل يوقف دون إغلاق فوري', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const modal = await openVoiceRecorderFromRepository(page);
        await modal.getByTestId('voice-recorder-start').click();
        await expect(modal.getByTestId('voice-recorder-timer')).toBeVisible({ timeout: 5_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('voice-recorder-modal')).toBeVisible({ timeout: 5_000 });
        await expect
            .poll(async () => modal.getByTestId('voice-recorder-idle-hint').isVisible(), { timeout: 12_000 })
            .toBe(true);
    });
});
