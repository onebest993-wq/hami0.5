import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** نافذة تأكيد أرشفة الإضبارة — العنوان div وليس heading */
export async function expectExecutionArchiveConfirmDialog(page: Page) {
    const dialog = page.getByTestId('execution-archive-confirm-dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.locator('#execution-archive-confirm-title')).toContainText(/تأكيد الأرشفة/i);
    return dialog;
}

export async function expectExecutionTrashConfirmHeading(page: Page) {
    await expect(
        page.getByRole('dialog', { name: /تأكيد النقل إلى سلة المهملات/i }),
    ).toBeVisible({ timeout: 8_000 });
}

export async function closeExecutionFollowupModalE2E(page: Page): Promise<void> {
    const modal = page.getByTestId('execution-followup-modal');
    if (!(await modal.isVisible().catch(() => false))) return;
    const closeButton = page.getByTestId('execution-followup-modal-close');
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true }).catch(() => undefined);
    } else {
        await page.getByRole('button', { name: /إغلاق محضر المتابعة/i }).click({ force: true }).catch(() => undefined);
    }
    if (await modal.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => undefined);
    }
    await expect(modal).toBeHidden({ timeout: 15_000 }).catch(() => undefined);
}

export async function closeExecutionDossierE2E(page: Page): Promise<void> {
    await closeExecutionFollowupModalE2E(page);
    const notesModal = page.getByTestId('execution-notes-modal');
    if (await notesModal.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => undefined);
        await expect(notesModal).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
    }
    const dossier = page.getByTestId('execution-dashboard-dossier');
    const closeButton = dossier.getByTestId('execution-dashboard-close');
    await closeButton.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true }).catch(() => undefined);
    }
    await expect(async () => {
        const count = await dossier.count();
        if (count === 0) return;

        const visible = await dossier.isVisible().catch(() => false);
        if (visible) {
            await page.keyboard.press('Escape').catch(() => undefined);
        }

        const nextCount = await dossier.count();
        if (nextCount === 0) return;

        const nextVisible = await dossier.isVisible().catch(() => false);
        expect(nextVisible).toBeFalsy();
    }).toPass({ timeout: 30_000 });
}
