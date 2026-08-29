import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { clickNativeElement, openExecutionArchiveFromHome } from './executionE2EBoot';

/** نافذة تأكيد أرشفة الإضبارة — العنوان div وليس heading */
export async function expectExecutionArchiveConfirmDialog(page: Page) {
    const dialog = page.getByTestId('execution-archive-confirm-dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.locator('#execution-archive-confirm-title')).toContainText(/تأكيد الأرشفة/i);
    return dialog;
}

export async function expectExecutionTrashConfirmHeading(page: Page) {
    const dialog = page.getByTestId('execution-trash-confirm-dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.locator('#execution-trash-confirm-title')).toContainText(
        /تأكيد النقل إلى سلة المهملات/i,
    );
    return dialog;
}

async function clickOpenArchiveCardAction(
    page: Page,
    actionTestId: 'execution-smart-card-archive' | 'execution-smart-card-trash',
): Promise<void> {
    const shell = page.getByTestId('execution-archive-shell');
    if ((await shell.getAttribute('data-open')) !== 'true') {
        await openExecutionArchiveFromHome(page);
    }
    const btn = shell.getByTestId(actionTestId).first();
    await expect(btn).toBeVisible({ timeout: 8_000 });
    await clickNativeElement(btn);
}

export async function openExecutionArchiveConfirmFromCard(page: Page) {
    await expect(async () => {
        await clickOpenArchiveCardAction(page, 'execution-smart-card-archive');
        await expectExecutionArchiveConfirmDialog(page);
    }).toPass({ timeout: 20_000 });
    return page.getByTestId('execution-archive-confirm-dialog');
}

export async function openExecutionTrashConfirmFromCard(page: Page) {
    await expect(async () => {
        await clickOpenArchiveCardAction(page, 'execution-smart-card-trash');
        await expectExecutionTrashConfirmHeading(page);
    }).toPass({ timeout: 20_000 });
    return page.getByTestId('execution-trash-confirm-dialog');
}

export async function closeExecutionFollowupModalE2E(page: Page): Promise<void> {
    const modal = page.getByTestId('execution-followup-modal');
    if (!(await modal.isVisible().catch(() => false))) return;
    const closeButton = page.getByTestId('execution-followup-modal-close');
    if (await closeButton.isVisible().catch(() => false)) {
        await clickNativeElement(closeButton);
    } else {
        const labeled = page.getByRole('button', { name: /إغلاق محضر المتابعة/i });
        if (await labeled.isVisible().catch(() => false)) {
            await clickNativeElement(labeled);
        }
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

    const portal = page.getByTestId('execution-dashboard-portal-open');
    await expect(async () => {
        if ((await portal.count()) === 0) return;
        const closeButtons = page.getByTestId('execution-dashboard-close');
        const n = await closeButtons.count();
        let clicked = false;
        for (let i = n - 1; i >= 0; i--) {
            const btn = closeButtons.nth(i);
            if (await btn.isVisible().catch(() => false)) {
                await clickNativeElement(btn);
                clicked = true;
                break;
            }
        }
        if (!clicked) {
            const leaveHome = page.getByRole('button', { name: 'المغادرة إلى الواجهة الرئيسية' }).last();
            if (await leaveHome.isVisible().catch(() => false)) {
                await clickNativeElement(leaveHome);
            }
        }
        expect(await portal.count()).toBe(0);
    }).toPass({ timeout: 25_000 });

    await expect(page.getByTestId('execution-followup-memo')).toHaveCount(0);
}
