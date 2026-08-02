import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { REPOSITORY_PERF_BUDGET } from '@/app/services/repository/repositoryPerfBudget';
import { applyE2eBootHomeLayoutAtRuntime, bootToLawyerHome } from './bootFixtures';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { hydrateVaultDocsForE2E, seedVaultDocs } from './vaultFixtures';

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
    await page.getByTestId('home-bottom-chrome').waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByTestId('home-dock-shell-zone').waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByTestId('home-dock-shell-dockRepository').waitFor({ state: 'visible', timeout: 15_000 });
}

/** يُرسل Escape — يركّز الـ feed ثم يضغط المفتاح (capture على window) */
export async function pressRepositoryEscape(page: Page): Promise<void> {
    const feed = page.getByTestId('repository-unified-feed');
    if (await feed.isVisible().catch(() => false)) {
        await feed.click({ position: { x: 12, y: 12 }, force: true });
    }
    await page.keyboard.press('Escape');
}

/** يتحقق أن المستودع مُغلق (keepAlive يبقي العقدة لكن aria-hidden=true) */
export async function expectRepositoryClosed(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.locator('html')).not.toHaveAttribute('data-hami-repository-open', '1');
        const modal = page.getByTestId('smart-repository-modal');
        if ((await modal.count()) === 0) return;
        await expect(modal).toHaveAttribute('aria-hidden', 'true');
        await expect(modal).not.toHaveClass(/hami-repository-overlay-layer--visible/);
    }).toPass({ timeout: 8_000 });
}

/** يغلق المستودع إن كان مفتوحاً — للاختبارات التي تحتاج فتحاً نظيفاً */
export async function closeRepositoryIfOpen(page: Page): Promise<void> {
    const modal = page.getByTestId('smart-repository-modal');
    const open =
        (await page.locator('html').getAttribute('data-hami-repository-open')) === '1' ||
        ((await modal.isVisible().catch(() => false)) &&
            (await modal.getAttribute('aria-hidden')) !== 'true');
    if (!open) return;
    await pressRepositoryEscape(page);
    try {
        await expectRepositoryClosed(page);
        return;
    } catch {
        await page.getByTestId('smart-repository-close').click({ force: true });
        await expectRepositoryClosed(page);
    }
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

async function expectRepositoryMediaPanel(modal: Locator) {
    const mediaSurface = modal
        .getByTestId('repository-feed-empty-media')
        .or(modal.getByTestId('repository-feed-panel-media'));
    await mediaSurface.first().waitFor({ state: 'visible', timeout: 25_000 });
}

/** يستعيد جلسة فتح المستودع على تبويب الوسائط — عبر init script قبل التنقل */
export async function seedRepositoryVaultSessionRestore(page: Page): Promise<void> {
    await page.addInitScript(() => {
        try {
            sessionStorage.setItem('hami:lawyer-repository-open', '1');
            sessionStorage.setItem('hami:lawyer-repository-tab', 'vault');
        } catch {
            /* denied على about:blank أو cross-origin */
        }
    });
}

/** يفتح مسجّل الصوت من قائمة «+ إضافة» */
export async function openRepositoryVoiceRecorder(page: Page) {
    const modal = await openRepositoryFromDock(page);
    await modal.getByTestId('repository-add-menu-trigger').click({ force: true });
    await expect(modal.getByTestId('repository-add-menu-panel')).toBeVisible({ timeout: 5_000 });
    await modal.getByTestId('repository-voice-record').click({ force: true });
    const recorder = page.getByTestId('voice-recorder-modal');
    await expect(recorder).toBeVisible({ timeout: 12_000 });
    return { modal, recorder };
}

/** يفتح المستودع على تبويب الوسائط (initialFilter=media) */
export async function openVaultMediaFromDock(
    page: Page,
    vaultDocs?: Parameters<typeof hydrateVaultDocsForE2E>[1],
) {
    await closeRepositoryIfOpen(page);
    if (vaultDocs?.length) {
        await seedVaultDocs(page, vaultDocs);
    }
    await seedRepositoryVaultSessionRestore(page);
    await page.goto(`/?_hami_repo_vault=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    if (vaultDocs?.length) {
        await hydrateVaultDocsForE2E(page, vaultDocs);
    }
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);

    let modal = page.getByTestId('smart-repository-modal');
    const visible = await modal.isVisible().catch(() => false);
    if (!visible) {
        modal = await openRepositoryFromDock(page);
        const vaultDock = page
            .getByTestId('home-dock-shell-dockVault')
            .or(page.getByTestId('home-dock-dockVault'));
        if (await vaultDock.first().isVisible().catch(() => false)) {
            await vaultDock.first().click({ force: true });
            await expect(modal).toBeVisible({ timeout: 15_000 });
        }
    } else {
        await expect(modal).toBeVisible({ timeout: 30_000 });
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible({ timeout: 25_000 });
    }

    await expectRepositoryMediaPanel(modal);
    await waitRepositoryFeedReady(page);
    return modal;
}
