/**
 * E2E — مركز المعاملات: فتح من الرئيسية، قائمة، FAB، Escape، رجوع.
 */
import { test, expect, type Page } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
    ensureE2eTransactionInHub,
    ensureTransactionsDashboard,
    E2E_TX_CLIENT,
    E2E_TX_DEPARTMENT,
    E2E_TX_TITLE,
    openTransactionsFromHome,
    expectTransactionsAddSheetClosed,
    prepareTransactionsE2E,
    waitForTransactionsHubClosed,
} from './helpers/transactionsFixtures';

test.describe('مركز المعاملات', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await prepareTransactionsE2E(page);
        await seedLawyerFiles(page);
        await ensureTransactionsDashboard(page);
    });

    test('يفتح من الرئيسية ويعرض قائمة المعاملات', async ({ page }) => {
        await openTransactionsFromHome(page);
        await expect(page.getByTestId('transactions-search')).toBeVisible();
        await expect(page.getByTestId('transactions-add-fab')).toBeVisible();
        await expect(page.getByTestId('transactions-list-empty')).toBeVisible();
    });

    test('يفتح ورقة الإضافة ويغلقها بـ Escape', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.getByTestId('transactions-add-fab').click({ force: true });
        await expect(page.getByTestId('transactions-add-sheet')).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Escape');
        await expectTransactionsAddSheetClosed(page);
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible();
    });

    test('Escape من القائمة يغلق مركز المعاملات', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.keyboard.press('Escape');
        await waitForTransactionsHubClosed(page);
    });

    test('ورقة الإضافة: تعبئة الحقول وتفعيل زر الإرسال', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.getByTestId('transactions-add-fab').click({ force: true });
        const sheet = page.getByTestId('transactions-add-sheet');
        await expect(sheet).toBeVisible({ timeout: 10_000 });
        await sheet.getByPlaceholder('مثال: نقل ملكية').fill(E2E_TX_TITLE);
        await sheet.getByPlaceholder('اسم الموكل الكامل').fill(E2E_TX_CLIENT);
        await sheet.getByPlaceholder('مثال: دائرة الضريبة').fill(E2E_TX_DEPARTMENT);
        await expect(sheet.getByTestId('transactions-add-submit')).toBeEnabled({ timeout: 10_000 });
    });

    test('إضافة معاملة وفتح التفاصيل والرجوع للقائمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);

        await page.getByText(E2E_TX_TITLE).click({ force: true });
        await expect(page.getByTestId('transactions-details-screen')).toBeVisible({ timeout: 10_000 });

        await page.getByTestId('transactions-back').click({ force: true });
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible({ timeout: 8_000 });
        await expect(page.getByText(E2E_TX_TITLE)).toBeVisible();
    });

    test('Escape من التفاصيل يعود للقائمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await page.getByText(E2E_TX_TITLE).click({ force: true });
        await expect(page.getByTestId('transactions-details-screen')).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('transactions-details-screen')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible();
    });

    test('إعادة الفتح تعيد تهيئة الجلسة', async ({ page }: { page: Page }) => {
        await openTransactionsFromHome(page);
        await page.keyboard.press('Escape');
        await waitForTransactionsHubClosed(page);

        await openTransactionsFromHome(page);
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible();
    });
});
