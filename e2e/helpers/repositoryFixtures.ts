import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { REPOSITORY_PERF_BUDGET } from '@/app/services/repository/repositoryPerfBudget';
import { dismissProductivityBlockers } from './productivityE2EFixtures';

/** ms من open-request → interactive — للـ E2E (polling حتى تسجيل المرحلتين) */
export async function readRepositoryOpenToInteractiveMs(
    page: Page,
    timeoutMs = 20_000,
): Promise<number | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ms = await page.evaluate(() => {
            const open = performance.getEntriesByName('hami:repository:open-request', 'mark')[0];
            const interactive = performance.getEntriesByName('hami:repository:interactive', 'mark')[0];
            if (!open || !interactive) return null;
            return Math.round(interactive.startTime - open.startTime);
        });
        if (ms != null) return ms;
        await page.waitForTimeout(250);
    }
    return null;
}

export const E2E_REPOSITORY_COLD_OPEN_MS =
    REPOSITORY_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_REPOSITORY_CACHED_OPEN_MS =
    REPOSITORY_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

/** يزيل طبقات تحجب النقرات أثناء اختبارات المستودع */
export async function dismissRepositoryBlockers(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProductivityBlockers(page);
    if (page.isClosed()) return;
    await page.evaluate(() => {
        document.querySelector('vite-error-overlay')?.remove();
        document.getElementById('hami-boot-failure')?.remove();
    });
}

/** ينتظر جاهزية feed — shell أو قائمة فارغة أو محتوى */
export async function waitRepositoryFeedReady(page: Page): Promise<void> {
    await expect(async () => {
        const loading = page.getByTestId('repository-feed-loading');
        if (await loading.isVisible().catch(() => false)) {
            await expect(loading).toBeHidden({ timeout: 15_000 });
            return;
        }
        const ready =
            (await page.getByTestId('repository-feed-empty-all').isVisible().catch(() => false)) ||
            (await page.getByTestId('repository-feed-panel-all').isVisible().catch(() => false)) ||
            (await page.getByTestId('repository-unified-feed').isVisible().catch(() => false));
        expect(ready).toBeTruthy();
    }).toPass({ timeout: 25_000 });
}

/** ينتظر جاهزية شريط الدوك قبل النقر */
async function waitHomeDockReady(page: Page): Promise<void> {
    await dismissRepositoryBlockers(page);
    await page.getByTestId('home-dock-chrome').waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByTestId('home-dock-shell-dockRepository').waitFor({ state: 'visible', timeout: 15_000 });
}

/** يغلق المستودع إن كان مفتوحاً — للاختبارات التي تحتاج فتحاً نظيفاً */
export async function closeRepositoryIfOpen(page: Page): Promise<void> {
    const modal = page.getByTestId('smart-repository-modal');
    if (!(await modal.isVisible().catch(() => false))) return;
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 8_000 });
}

async function tapDockRepository(page: Page): Promise<void> {
    const dockButton = page.getByTestId('home-dock-shell-dockRepository');
    const modal = page.getByTestId('smart-repository-modal');
    const feed = page.getByTestId('repository-unified-feed');

    await dismissRepositoryBlockers(page);
    await expect(dockButton).toBeVisible({ timeout: 15_000 });

    await dockButton.hover();
    await page.waitForTimeout(350);

    await expect(async () => {
        try {
            await dockButton.tap({ timeout: 8_000 });
        } catch {
            await dockButton.click({ force: true, timeout: 8_000 });
        }

        const opened =
            (await modal.isVisible().catch(() => false)) ||
            (await feed.isVisible().catch(() => false));
        if (!opened) {
            await dockButton.evaluate((el) => {
                (el as HTMLButtonElement).click();
            });
        }

        await expect(modal).toBeVisible({ timeout: 25_000 });
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible({ timeout: 25_000 });
    }).toPass({ timeout: 45_000 });

    await waitRepositoryFeedReady(page);
}

/** فتح المستودع من dockRepository */
export async function openRepositoryFromDock(page: Page) {
    const modal = page.getByTestId('smart-repository-modal');

    if (await modal.isVisible().catch(() => false)) {
        await waitRepositoryFeedReady(page);
        return modal;
    }

    await waitHomeDockReady(page);
    await closeRepositoryIfOpen(page);
    await tapDockRepository(page);
    return page.getByTestId('smart-repository-modal');
}

async function expectRepositoryMediaFilter(modal: Locator) {
    await modal.getByTestId('repository-filter-media').waitFor({ state: 'visible', timeout: 8_000 });
}

async function tapRepositoryMediaFilter(modal: Locator, page: Page): Promise<void> {
    const mediaFilter = modal.getByTestId('repository-filter-media');
    await mediaFilter.waitFor({ state: 'visible', timeout: 8_000 });
    const pressed = await mediaFilter.getAttribute('aria-selected');
    if (pressed === 'true') return;

    await expect(async () => {
        try {
            await mediaFilter.tap({ timeout: 8_000 });
        } catch {
            await mediaFilter.click({ force: true, timeout: 8_000 });
        }

        const selected = await mediaFilter.getAttribute('aria-selected');
        if (selected !== 'true') {
            await mediaFilter.evaluate((el) => {
                (el as HTMLButtonElement).click();
            });
        }

        await expect(mediaFilter).toHaveAttribute('aria-selected', 'true', { timeout: 8_000 });
    }).toPass({ timeout: 20_000 });
}

/** فتح تبويب الوسائط — dockVault مخفية افتراضياً؛ نفتح المستودع ثم نُصفّي الوسائط */
export async function openVaultMediaFromDock(page: Page) {
    const modal = await openRepositoryFromDock(page);
    await tapRepositoryMediaFilter(modal, page);
    await expectRepositoryMediaFilter(modal);
    await waitRepositoryFeedReady(page);
    return modal;
}
