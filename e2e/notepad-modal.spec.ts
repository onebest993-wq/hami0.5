/**
 * E2E — المفكرة عبر المستودع الذكي: فتح، إضافة بطاقة، Escape، إغلاق، إعادة فتح.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    clearLawyerNotes,
    closeNotepadShell,
    fillRepositoryNoteComposer,
    openNotepadShellFromHome,
    openRepositoryNoteCreate,
} from './helpers/notepadFixtures';

const E2E_NOTE_TITLE = 'ملاحظة E2E مفكرة';
const E2E_NOTE_BODY = 'نص تجريبي للاختبار الآلي';

test.describe('المفكرة القانونية', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearLawyerNotes(page);
        await seedLawyerFiles(page);
    });

    test('تفتح من الرئيسية وتعرض القائمة الفارغة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openNotepadShellFromHome(page);
        await expect(modal.getByText('المستودع الذكي')).toBeVisible();
        await expect(modal.getByTestId('repository-feed-empty-all')).toBeVisible();
        await expect(modal.getByTestId('repository-add-menu-trigger')).toBeVisible();
    });

    test('إضافة ملاحظة جديدة تظهر في القائمة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openNotepadShellFromHome(page);
        await openRepositoryNoteCreate(modal);
        await expect(modal.getByTestId('repository-notepad-editor')).toBeVisible();
        await fillRepositoryNoteComposer(modal, page, E2E_NOTE_TITLE, E2E_NOTE_BODY);
        await modal.getByTestId('repository-note-save').click();

        await expect(modal.getByText(E2E_NOTE_TITLE)).toBeVisible({ timeout: 10_000 });
        await expect(modal.getByText(E2E_NOTE_BODY)).toBeVisible();
        await expect(modal.getByTestId('repository-feed-empty-all')).toBeHidden();
    });

    test('Escape من نموذج الإنشاء يعود للقائمة ثم يغلق المستودع', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openNotepadShellFromHome(page);
        await openRepositoryNoteCreate(modal);
        await expect(modal.getByTestId('repository-notepad-editor')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(modal.getByTestId('repository-notepad-editor')).toBeHidden({ timeout: 5_000 });
        await expect(modal.getByTestId('repository-add-menu-trigger')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('smart-repository-modal')).toBeHidden({ timeout: 8_000 });
    });

    test('إغلاق وإعادة الفتح تحافظ على الملاحظة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openNotepadShellFromHome(page);
        await openRepositoryNoteCreate(modal);
        await fillRepositoryNoteComposer(modal, page, E2E_NOTE_TITLE, E2E_NOTE_BODY);
        await modal.getByTestId('repository-note-save').click();
        await expect(modal.getByText(E2E_NOTE_TITLE)).toBeVisible({ timeout: 10_000 });

        await closeNotepadShell(page);

        const modal2 = await openNotepadShellFromHome(page);
        await expect(modal2.getByText(E2E_NOTE_TITLE)).toBeVisible({ timeout: 10_000 });
        await expect(modal2.getByText(E2E_NOTE_BODY)).toBeVisible();
    });
});
