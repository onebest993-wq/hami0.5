/**
 * إقلاع موحّد لاختبارات E2E — التنفيذ (يتبع executionDashboard.spec.ts)
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './civilLawsuitFixtures';
import { bootToLawyerHome, collectFatalBootPageErrors } from './bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { seedExecutionStorageForFile } from './executionStorageFixtures';

export type ExecutionE2EBootOptions = {
    executionFile: Record<string, unknown>;
    collectPageErrors?: boolean;
};

/** يُجهّز الجلسة ويعيد أخطاء الصفحة الحرجة إن طُلب جمعها */
export async function bootExecutionLawyerShell(
    page: Page,
    options: ExecutionE2EBootOptions,
): Promise<string[]> {
    const pageErrors: string[] = [];
    if (options.collectPageErrors !== false) {
        page.on('pageerror', (err) => pageErrors.push(err.message));
    }

    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedExecutionStorageForFile(page, options.executionFile);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 60_000 });
    await ensureLawyerDashboard(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);

    return collectFatalBootPageErrors(pageErrors);
}

export async function openExecutionArchiveFromHome(page: Page): Promise<void> {
    await page.getByTestId('hub-archive-execution').scrollIntoViewIfNeeded();
    await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
    await expect(page.getByTestId('execution-archive-shell')).toBeVisible({ timeout: 25_000 });
}

export async function openExecutionDossierByRowText(page: Page, rowPattern: RegExp): Promise<void> {
    const row = page.getByText(rowPattern).first();
    await expect(row).toBeVisible({ timeout: 25_000 });
    await row.click();
    await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('execution-followup-memo')).toBeVisible({ timeout: 25_000 });
}

export async function openExecutionFollowupModal(page: Page): Promise<void> {
    await page.getByTestId('execution-followup-memo').click({ timeout: 15_000 });
    await expect(page.getByTestId('execution-followup-modal')).toBeVisible({ timeout: 20_000 });
}

export async function clickExecutionFollowupTab(
    page: Page,
    tabLabel: RegExp,
    tabId?: string,
): Promise<void> {
    const modal = page.getByTestId('execution-followup-modal');
    const tab = tabId
        ? modal.locator(`[data-followup-tab="${tabId}"]`)
        : modal.getByRole('tab', { name: tabLabel }).first();
    await tab.scrollIntoViewIfNeeded();
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await tab.click();
}

export async function saveExecutionNoteE2E(page: Page, noteText: string): Promise<void> {
    await page.getByRole('button', { name: /ملاحظات|المذكرات/i }).first().click({ timeout: 15_000 });
    const notesModal = page.getByTestId('execution-notes-modal');
    await expect(notesModal).toBeVisible({ timeout: 15_000 });

    const composePane = page.getByTestId('execution-notes-pane-compose');
    await composePane.click();

    const composer = page.getByTestId('execution-notes-modal-composer');
    await expect(composer).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('dossier-note-title').fill(noteText);
    const editor = composer.getByTestId('dossier-note-editor').locator('[contenteditable]').first();
    await editor.click();
    const bodyText = `${noteText} — تفاصيل`;
    await editor.evaluate((el, text) => {
        el.innerHTML = `<p>${text}</p>`;
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, bodyText);
    await expect(page.getByTestId('dossier-note-save')).toBeEnabled({ timeout: 5_000 });
    await page.getByTestId('dossier-note-save').click();
    await expect(page.getByText(new RegExp(`إضافة ملاحظة.*${noteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeVisible({
        timeout: 15_000,
    });
}
