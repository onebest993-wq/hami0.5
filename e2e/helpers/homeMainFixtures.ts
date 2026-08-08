import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { prepareProductivityE2E, dismissProductivityBlockers } from './productivityE2EFixtures';

export async function dismissHomeBlockers(page: Page): Promise<void> {
    await dismissProductivityBlockers(page);
}

/** يجهّز جلسة E2E للواجهة الرئيسية */
export async function prepareHomeMainE2E(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
}

export async function expectHomeMainShell(page: Page) {
    await dismissHomeBlockers(page);
    await expect(page.getByTestId('lawyer-home-tab')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('home-main-zone')).toBeVisible();
    await expect(page.getByTestId('home-main-grid')).toBeVisible();
    await expect(page.getByTestId('home-hub-card')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('home-dock-dockRepository')).toBeVisible();
}
