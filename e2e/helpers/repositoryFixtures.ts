import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { REPOSITORY_PERF_BUDGET } from '@/app/services/repository/repositoryPerfBudget';
import { gotoLawyerHomeE2E } from './bootFixtures';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { bootLawyerHomeWithVaultDocs, hydrateVaultDocsForE2E, E2E_VAULT_USER_ID } from './vaultFixtures';
import { closeNotificationsPanelForE2E } from './notificationFixtures';

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
    await page.evaluate(() => {
        document.querySelectorAll('vite-error-overlay').forEach((node) => node.remove());
        document.getElementById('hami-boot-failure')?.remove();
    });
    const repositoryOpen =
        (await page.locator('html').getAttribute('data-hami-repository-open')) === '1';
    /* قبل dismiss الإنتاجي — «إغلاق» يطابق زر المستودع ويُسقط الطبقة */
    if (repositoryOpen) return;
    await dismissProductivityBlockers(page);
    if (page.isClosed()) return;
    const panel = page.getByTestId('notification-panel');
    if (await panel.isVisible().catch(() => false)) {
        await closeNotificationsPanelForE2E(page, 4_000).catch(() => undefined);
    }
}

/** ينتظر جاهزية feed — shell أو قائمة فارغة أو محتوى */
export async function waitRepositoryFeedReady(page: Page): Promise<void> {
    const modal = visibleRepositoryModal(page);
    await expect(async () => {
        const loading = modal.getByTestId('repository-feed-loading');
        if (await loading.isVisible().catch(() => false)) {
            throw new Error('repository feed still loading');
        }
        const ready =
            (await modal.getByTestId('repository-feed-empty-all').isVisible().catch(() => false)) ||
            (await modal.getByTestId('repository-feed-panel-all').isVisible().catch(() => false)) ||
            (await modal.getByTestId('repository-unified-feed').isVisible().catch(() => false));
        expect(ready).toBeTruthy();
    }).toPass({ timeout: 25_000 });
}

function dockRepositoryButton(page: Page): Locator {
    return page
        .getByTestId('home-dock-dockRepository')
        .or(page.getByRole('button', { name: /المستودع/ }));
}

/** ينتظر جاهزية شريط الدوك قبل النقر */
async function waitHomeDockReady(page: Page): Promise<void> {
    await dismissRepositoryBlockers(page);
    await page.getByTestId('home-main-grid').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(dockRepositoryButton(page).first()).toBeVisible({ timeout: 15_000 });
}

/** يُرسل Escape — يركّز الـ feed ثم يضغط المفتاح */
export async function pressRepositoryEscape(page: Page): Promise<void> {
    const feed = visibleRepositoryModal(page).getByTestId('repository-unified-feed');
    if (await feed.isVisible().catch(() => false)) {
        await feed.click({ position: { x: 12, y: 12 }, force: true });
    }
    await page.keyboard.press('Escape');
}

/** الطبقة الظاهرة — يشمل الطلاء الفوري بلا خاصية، ويستبعد keepAlive المخفي */
export function visibleRepositoryModal(page: Page): Locator {
    return page.locator('[data-testid="smart-repository-modal"]:not([aria-hidden="true"])');
}
export async function expectRepositoryClosed(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.locator('html')).not.toHaveAttribute('data-hami-repository-open', '1');
        const modal = page.getByTestId('smart-repository-modal');
        const count = await modal.count();
        if (count === 0) return;
        for (let i = 0; i < count; i += 1) {
            await expect(modal.nth(i)).toHaveAttribute('aria-hidden', 'true');
            await expect(modal.nth(i)).not.toHaveClass(/hami-repository-overlay-layer--visible/);
        }
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
    const dockButton = dockRepositoryButton(page).first();

    await dismissRepositoryBlockers(page);
    await page.getByTestId('home-main-grid').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(dockButton).toBeVisible({ timeout: 15_000 });

    await expect(async () => {
        const openModal = visibleRepositoryModal(page);
        const feedAlreadyOpen = await openModal
            .getByTestId('repository-unified-feed')
            .isVisible()
            .catch(() => false);
        if (!feedAlreadyOpen) {
            await dockButton.evaluate((el) => (el as HTMLButtonElement).click());
        }
        await expect(openModal).toBeVisible({ timeout: 12_000 });
        await expect(openModal.getByTestId('repository-unified-feed')).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 45_000 });

    await waitRepositoryFeedReady(page);
}

/** فتح المستودع من dockRepository */
export async function openRepositoryFromDock(page: Page) {
    const modal = page.getByTestId('smart-repository-modal');

    if (
        await visibleRepositoryModal(page)
            .getByTestId('repository-unified-feed')
            .isVisible()
            .catch(() => false)
    ) {
        await waitRepositoryFeedReady(page);
        return modal;
    }

    await waitHomeDockReady(page);
    await closeRepositoryIfOpen(page);
    await tapDockRepository(page);
    return modal;
}

const REPO_CHROME_PORTAL_TESTIDS = [
    'repository-move-room-menu',
    'repository-add-menu-panel',
    'repository-room-menu',
    'repository-classification-panel',
    'repository-rooms-gallery',
    'vault-scanner-panel',
    'vault-upload-meta-overlay',
    'voice-recorder-modal',
    'repository-notepad-editor',
] as const;

/** نقر يتجاوز طبقة خطأ Vite دون المرور بـ pointer intercept */
export async function clickRepositoryChrome(locator: Locator): Promise<void> {
    const page = locator.page();
    if (page.isClosed()) return;
    await locator.waitFor({ state: 'visible', timeout: 15_000 });
    const repositoryOpen =
        (await page.locator('html').getAttribute('data-hami-repository-open')) === '1';
    const insideChromePortal = await locator
        .evaluate(
            (el, ids) => ids.some((id) => !!el.closest(`[data-testid="${id}"]`)),
            [...REPO_CHROME_PORTAL_TESTIDS],
            { timeout: 5_000 },
        )
        .catch(() => false);
    if (!repositoryOpen && !insideChromePortal) {
        await dismissRepositoryBlockers(page);
        if (page.isClosed()) return;
        await locator.waitFor({ state: 'visible', timeout: 15_000 });
    }
    const handle = await locator.elementHandle({ timeout: 4_000 }).catch(() => null);
    if (handle) {
        try {
            await Promise.race([
                handle.evaluate((el) => {
                    (el as HTMLElement).click();
                }),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('repository chrome evaluate timeout')), 4_000);
                }),
            ]);
            return;
        } catch {
            /* نقر إجباري إن انفصل العنصر أو عُلّق evaluate */
        } finally {
            await handle.dispose().catch(() => undefined);
        }
    }
    if (page.isClosed()) throw new Error('page closed before repository chrome click');
    await locator.click({ force: true, timeout: 8_000 });
}

/** يفتح قائمة «+ إضافة» دون تبديل الإغلاق إن كانت ظاهرة */
export async function openRepositoryAddMenu(page: Page, modal?: Locator): Promise<Locator> {
    const root = modal ?? visibleRepositoryModal(page);
    const trigger = root.getByTestId('repository-add-menu-trigger');
    const panel = page.getByTestId('repository-add-menu-panel');
    if (!(await panel.isVisible().catch(() => false))) {
        await clickRepositoryChrome(trigger);
    }
    await expect(panel).toBeVisible({ timeout: 8_000 });
    return panel;
}

/** ملء input متحكّم به من React دون انتظار استقرار حركة Framer (fill يعلّق) */
export async function fillControlledTextInput(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 8_000 });
    await locator.evaluate((el, next) => {
        const input = el as HTMLInputElement;
        const proto =
            input instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        desc?.set?.call(input, next);
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, value);
    await expect(locator).toHaveValue(value, { timeout: 5_000 });
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
    await openRepositoryAddMenu(page, modal);
    await clickRepositoryChrome(page.getByTestId('repository-voice-record'));
    const recorder = page.getByTestId('voice-recorder-modal');
    await expect(recorder).toBeVisible({ timeout: 12_000 });
    return { modal, recorder };
}

/** يفتح ماسح المستندات من قائمة «+ إضافة» */
export async function openRepositoryScanner(page: Page) {
    const modal = await openRepositoryFromDock(page);
    await openRepositoryAddMenu(page, modal);
    await clickRepositoryChrome(page.getByTestId('repository-open-scanner'));
    const scanner = page.getByTestId('vault-scanner-panel');
    await expect(scanner).toBeVisible({ timeout: 15_000 });
    return { modal, scanner };
}

/**
 * يفتح المستودع من البلاطة — مسار يومي.
 * استعادة sessionStorage بعد reload معطّلة عمداً في المنتج.
 */
export async function openVaultMediaFromDock(
    page: Page,
    vaultDocs?: Parameters<typeof hydrateVaultDocsForE2E>[1],
) {
    if (vaultDocs?.length) {
        await bootLawyerHomeWithVaultDocs(page, vaultDocs);
        await dismissProductivityBlockers(page);
    } else {
        const homeVisible = await page.getByTestId('home-main-grid').isVisible().catch(() => false);
        if (!homeVisible) {
            await gotoLawyerHomeE2E(page);
        }
        await dismissProductivityBlockers(page);
    }
    return openRepositoryFromDock(page);
}

export const REPOSITORY_ROOMS_STORAGE_PREFIX = 'hami:repository:rooms:v1';

export type E2eRepositoryRoom = {
    id: string;
    title: string;
    createdAt: string;
    clientLabel?: string | null;
};

export function buildE2eRepositoryRoom(
    overrides: Partial<E2eRepositoryRoom> = {},
): E2eRepositoryRoom {
    return {
        id: 'e2e-room-1',
        title: 'موكل أحمد',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

/** يزرع غرفاً في localStorage قبل الإقلاع — نفس مفتاح المنتج */
export async function seedRepositoryRooms(
    page: Page,
    rooms: E2eRepositoryRoom[] = [buildE2eRepositoryRoom()],
    userId = E2E_VAULT_USER_ID,
): Promise<void> {
    await page.addInitScript(
        ({ key, payload }) => {
            try {
                localStorage.setItem(key, JSON.stringify(payload));
            } catch {
                /* ignore */
            }
        },
        { key: `${REPOSITORY_ROOMS_STORAGE_PREFIX}:${userId}`, payload: rooms },
    );
}
