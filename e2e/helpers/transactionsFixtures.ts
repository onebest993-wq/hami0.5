import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { seedLawyerFiles } from './civilLawsuitFixtures';
import { prepareProductivityE2E, dismissProductivityBlockers } from './productivityE2EFixtures';

/** يزيل طبقات تحجب النقرات أثناء اختبارات المعاملات */
export async function dismissTransactionsBlockers(page: Page): Promise<void> {
    await dismissProductivityBlockers(page);
    const failure = page.getByTestId('transactions-error-fallback');
    if (await failure.isVisible().catch(() => false)) {
        await page.getByTestId('transactions-error-close').click({ force: true });
    }
}

/** يجهّز جلسة E2E لمركز المعاملات */
export async function prepareTransactionsE2E(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
    await page.route('**/api/kv-proxy**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, value: null }),
        });
    });
}

async function scrollHomeGridToTransactionTile(page: Page) {
    const grid = page.getByTestId('home-main-grid');
    if (await grid.isVisible().catch(() => false)) {
        await grid.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });
    }
    const trigger = page.getByTestId('hub-archive-transaction');
    await trigger.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
}

async function gotoDashboard(page: Page) {
    try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    } catch {
        await page.waitForTimeout(1_500);
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
}

async function tapHubArchiveTransaction(page: Page) {
    const trigger = page.getByTestId('hub-archive-transaction');
    const hub = page.getByTestId('transactions-hub');
    const loading = page.getByTestId('transactions-hub-loading');

    await scrollHomeGridToTransactionTile(page);
    await dismissTransactionsBlockers(page);
    await expect(trigger).toBeVisible({ timeout: 15_000 });

    if (await hub.isVisible().catch(() => false)) return;

    await expect(async () => {
        try {
            await trigger.tap({ timeout: 8_000 });
        } catch {
            await trigger.click({ force: true, timeout: 8_000 });
        }

        const opened =
            (await hub.isVisible().catch(() => false)) ||
            (await loading.isVisible().catch(() => false));
        if (!opened) {
            await trigger.evaluate((el) => {
                (el as HTMLButtonElement).click();
            });
        }

        await expect(loading.or(hub)).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 30_000 });

    if (await loading.isVisible().catch(() => false)) {
        await expect(loading).toBeHidden({ timeout: 35_000 });
    }
    await expect(hub).toBeVisible({ timeout: 15_000 });
}

/** يفتح الرئيسية ويضمن جاهزية بطاقة المعاملات */
export async function ensureTransactionsDashboard(page: Page): Promise<void> {
    await expect(async () => {
        await gotoDashboard(page);
        await dismissTransactionsBlockers(page);
        await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
        await scrollHomeGridToTransactionTile(page);
        await expect(page.getByTestId('hub-archive-transaction')).toBeAttached();
    }).toPass({ timeout: 90_000 });
}

async function waitForTransactionsListReady(page: Page) {
    const list = page.getByTestId('transactions-list-screen');
    const loading = page.getByTestId('transactions-hub-loading');
    await expect(async () => {
        if (await list.isVisible()) return;
        if (await loading.isVisible().catch(() => false)) {
            await expect(loading).toBeHidden({ timeout: 12_000 });
        }
        await expect(list).toBeVisible();
    }).toPass({ timeout: 45_000 });
}

export async function openTransactionsFromHome(page: Page) {
    await dismissTransactionsBlockers(page);
    const hub = page.getByTestId('transactions-hub');

    if (await hub.isVisible().catch(() => false)) {
        await waitForTransactionsListReady(page);
        return hub;
    }

    await tapHubArchiveTransaction(page);
    await dismissTransactionsBlockers(page);
    await waitForTransactionsListReady(page);
    return hub;
}

export const E2E_TX_TITLE = 'معاملة E2E تجريبية';
export const E2E_TX_CLIENT = 'موكل E2E';
export const E2E_TX_DEPARTMENT = 'دائرة E2E';

export const E2E_TX_ID = 'e2e-tx-1';

function buildE2eThreadingSeedPayload(now: string) {
    return {
        userId: 'dev-user-uuid-1',
        state: {
            schemaVersion: 1,
            userId: 'dev-user-uuid-1',
            updatedAt: now,
            transactions: [
                {
                    id: E2E_TX_ID,
                    title: E2E_TX_TITLE,
                    clientName: E2E_TX_CLIENT,
                    targetDepartment: E2E_TX_DEPARTMENT,
                    status: 'Active',
                    agreedFees: 0,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            tasks: [],
            financeRecords: [],
            documents: [],
        },
    };
}

export async function installE2eTransactionSeedInit(page: Page): Promise<void> {
    const payload = buildE2eThreadingSeedPayload(new Date().toISOString());
    await page.addInitScript((data) => {
        localStorage.setItem(
            `hami:transactionsThreading:v1:${data.userId}`,
            JSON.stringify(data.state),
        );
    }, payload);
}

/** يبذر معاملة E2E عبر إعادة تحميل الصفحة لقراءة المستودع من الصفر */
export async function ensureE2eTransactionInHub(page: Page): Promise<void> {
    await installE2eTransactionSeedInit(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await seedLawyerFiles(page);
    await ensureTransactionsDashboard(page);
    await openTransactionsFromHome(page);
    await expect(page.getByText(E2E_TX_TITLE)).toBeVisible({ timeout: 20_000 });
}

export async function expectTransactionsAddSheetClosed(page: Page) {
    const sheet = page.getByTestId('transactions-add-sheet');
    if ((await sheet.count()) === 0) return;
    await expect(sheet).toHaveAttribute('data-state', 'closed', {
        timeout: 8_000,
    });
}

/** ينتظر إغلاق مركز المعاملات واستقرار الرئيسية قبل إعادة الفتح (Safari/mobile). */
export async function waitForTransactionsHubClosed(page: Page) {
    await expect(async () => {
        await expect(page.getByTestId('transactions-hub')).toBeHidden();
        await scrollHomeGridToTransactionTile(page);
        await expect(page.getByTestId('hub-archive-transaction')).toBeAttached();
    }).toPass({ timeout: 30_000 });
    await dismissTransactionsBlockers(page);
}
