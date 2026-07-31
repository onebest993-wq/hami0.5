import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type ArchiveJurisdictionTab = 'all' | 'civil' | 'personal' | 'criminal';

const CRIMINAL_BRIDGE_ACTIVATE_EVENT = 'hami:criminal-dashboard-bridge-activate';

/** يفتح لوحة فلاتر الاختصاص داخل مساحة الدعاوى (مخفية افتراضياً). */
export async function openArchiveJurisdictionFilters(page: Page): Promise<void> {
    const workspace = page.getByTestId('lawsuits-workspace');
    const toggle = workspace.getByTestId('archive-jurisdiction-filters-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 20_000 });
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
        await toggle.evaluate((el) => (el as HTMLButtonElement).click());
    }
    await expect(workspace.getByRole('tablist', { name: 'فلترة اختصاص الدعوى' })).toBeVisible({
        timeout: 12_000,
    });
}

/** يُغلق لوحة الفلاتر إن كانت مفتوحة — تتداخل مع بطاقات الإضابير. */
export async function closeArchiveJurisdictionFilters(page: Page): Promise<void> {
    const workspace = page.getByTestId('lawsuits-workspace');
    const toggle = workspace.getByTestId('archive-jurisdiction-filters-toggle');
    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
        await toggle.evaluate((el) => (el as HTMLButtonElement).click());
        await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 8_000 });
    }
}

/** يختار تبويب اختصاص داخل أرشيف الدعاوى (مدني / أحوال / جزائي / الكل). */
export async function selectArchiveJurisdictionTab(page: Page, tab: ArchiveJurisdictionTab): Promise<void> {
    if (tab === 'criminal') {
        await page.evaluate((eventName) => {
            window.dispatchEvent(new Event(eventName));
        }, CRIMINAL_BRIDGE_ACTIVATE_EVENT);
    }
    await openArchiveJurisdictionFilters(page);
    const workspace = page.getByTestId('lawsuits-workspace');
    const testId = tab === 'criminal' ? 'archive-tab-criminal' : `archive-jurisdiction-${tab}`;
    const tabBtn = workspace.getByTestId(testId);
    await expect(tabBtn).toBeVisible({ timeout: 15_000 });
    await tabBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await closeArchiveJurisdictionFilters(page);
}
