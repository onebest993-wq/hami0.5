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
    E2E_TX_ID,
    E2E_TX_TITLE,
    openE2eTransactionDetails,
    openTransactionsFromHome,
    dismissTransactionsBlockers,
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
        await sheet.getByLabel('عنوان المعاملة').fill(E2E_TX_TITLE);
        await sheet.getByLabel('اسم الموكل').fill(E2E_TX_CLIENT);
        await sheet.getByLabel('الجهة المختصة').fill(E2E_TX_DEPARTMENT);
        await expect(sheet.getByTestId('transactions-add-submit')).toBeEnabled({ timeout: 10_000 });
    });

    test('فتح التفاصيل من البطاقة والرجوع للقائمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);

        await page.getByTestId('transactions-details-screen').getByTestId('transactions-back').click({ force: true });
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible({ timeout: 8_000 });
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible();
    });

    test('Escape من التفاصيل يعود للقائمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('transactions-details-screen')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible();
    });

    test('التفاصيل تعرض التبويبات ومشاركة الإجراءات معطّلة بلا مهام', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await expect(page.getByTestId('transactions-tab-path')).toBeVisible();
        await expect(page.getByTestId('transactions-tab-docs')).toBeVisible();
        await expect(page.getByTestId('transactions-share-procedure')).toBeDisabled();

        await page.getByTestId('transactions-tab-docs').click({ force: true });
        await expect(page.getByText('لا توجد مرفقات بعد.')).toBeVisible();
    });

    test('إعادة الفتح تعيد تهيئة الجلسة', async ({ page }: { page: Page }) => {
        await openTransactionsFromHome(page);
        await page.keyboard.press('Escape');
        await waitForTransactionsHubClosed(page);

        await openTransactionsFromHome(page);
        await expect(page.getByTestId('transactions-list-screen')).toBeVisible();
    });

    test('البحث يعثر على المعاملة ويُفرغ النتائج عند لا تطابق', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        const search = page.getByTestId('transactions-search');
        await search.fill(E2E_TX_CLIENT);
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible();
        await expect(page.getByTestId('transactions-results-summary')).toBeVisible();

        await search.fill('لا توجد معاملة بهذا الاسم xyz');
        await expect(page.getByTestId('transactions-list-empty')).toBeVisible();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toHaveCount(0);
    });

    test('فلاتر الحالة والأرشيف والمحذوفات', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible();

        await page.getByTestId('transactions-filter-Completed').click();
        await expect(page.getByTestId('transactions-list-empty')).toBeVisible();

        await page.getByTestId('transactions-filter-Paused').click();
        await expect(page.getByTestId('transactions-list-empty')).toBeVisible();

        await page.getByTestId('transactions-filter-Active').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible();

        await page.getByTestId('transactions-filter-all').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible();
    });

    test('أرشفة المعاملة واستعادتها من الأرشيف', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await page.getByTestId(`transactions-archive-${E2E_TX_ID}`).click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toHaveCount(0);

        await page.getByTestId('transactions-filter-archived').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible({ timeout: 8_000 });

        await page.getByTestId(`transactions-restore-archive-${E2E_TX_ID}`).click();
        await page.getByTestId('transactions-filter-all').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible({ timeout: 8_000 });
    });

    test('حذف المعاملة مع التأكيد ثم الاستعادة من المحذوفات', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await page.getByTestId(`transactions-delete-${E2E_TX_ID}`).click();
        await expect(page.getByTestId('smart-dialog-confirm')).toBeVisible({ timeout: 8_000 });
        await page.getByTestId('smart-dialog-confirm').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toHaveCount(0);

        await page.getByTestId('transactions-filter-deleted').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible({ timeout: 8_000 });

        await page.getByTestId(`transactions-restore-trash-${E2E_TX_ID}`).click();
        await page.getByTestId('transactions-filter-all').click();
        await expect(page.getByTestId(`transactions-card-${E2E_TX_ID}`)).toBeVisible({ timeout: 8_000 });
    });

    test('إضافة مهمة من شاشة التفاصيل ثم تفعيل مشاركة الإجراءات', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);

        await page.getByRole('button', { name: 'إضافة مهمة' }).click();
        const taskSheet = page.getByTestId('transactions-add-task-sheet');
        await expect(taskSheet).toBeVisible({ timeout: 8_000 });
        await page.getByLabel('عنوان المهمة').fill('تقديم العريضة');
        await taskSheet.getByRole('button', { name: 'حفظ المهمة' }).click();
        await expect(taskSheet).toBeHidden({ timeout: 8_000 });
        await expect(page.getByText('تقديم العريضة')).toBeVisible();
        await expect(page.getByTestId('transactions-share-procedure')).toBeEnabled();
    });

    test('إنهاء المعاملة يحوّلها للقراءة فقط ثم إعادة الفتح', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);

        await page.getByRole('button', { name: `إنهاء المعاملة ${E2E_TX_TITLE}` }).click();
        const completeDialog = page.getByRole('dialog', { name: 'إنهاء المعاملة' });
        await expect(completeDialog).toBeVisible({ timeout: 8_000 });
        await completeDialog.getByRole('button', { name: 'تأكيد الإنهاء' }).click();
        await expectOverlayClosed(completeDialog);
        await expect(page.getByText('معاملة مكتملة — للقراءة فقط')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: 'إضافة مهمة' })).toHaveCount(0);

        const reopen = page.getByRole('button', { name: /إعادة فتح/ });
        await expect(reopen).toBeVisible({ timeout: 8_000 });
        await reopen.click({ force: true });
        await expect(page.getByRole('button', { name: `إنهاء المعاملة ${E2E_TX_TITLE}` })).toBeVisible({
            timeout: 8_000,
        });
        await expect(page.getByRole('button', { name: 'إضافة مهمة' })).toBeVisible();
    });

    test('إنشاء معاملة جديدة من الورقة تظهر في القائمة', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.getByTestId('transactions-add-fab').click({ force: true });
        const sheet = page.getByTestId('transactions-add-sheet');
        await expect(sheet).toBeVisible({ timeout: 10_000 });
        const title = `معاملة استخدام ${Date.now()}`;
        await sheet.getByLabel('عنوان المعاملة').fill(title);
        await sheet.getByLabel('اسم الموكل').fill('موكل الاستخدام');
        await sheet.getByLabel('الجهة المختصة').fill('دائرة التسجيل');
        await sheet.getByTestId('transactions-add-submit').click();
        await expectTransactionsAddSheetClosed(page);
        await expect(page.getByText(title).first()).toBeVisible({ timeout: 12_000 });
    });

    test('زر الإرسال يبقى معطّلاً حتى تكتمل حقول الإضافة', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.getByTestId('transactions-add-fab').click({ force: true });
        const sheet = page.getByTestId('transactions-add-sheet');
        await expect(sheet).toBeVisible({ timeout: 10_000 });
        await expect(sheet.getByTestId('transactions-add-submit')).toBeDisabled();
        await sheet.getByLabel('عنوان المعاملة').fill('عنوان فقط');
        await expect(sheet.getByTestId('transactions-add-submit')).toBeDisabled();
        await page.keyboard.press('Escape');
        await expectTransactionsAddSheetClosed(page);
    });

    test('رجوع القائمة يغلق مركز المعاملات', async ({ page }) => {
        await openTransactionsFromHome(page);
        await page.getByTestId('transactions-list-screen').getByTestId('transactions-back').click({ force: true });
        await waitForTransactionsHubClosed(page);
    });

    test('Escape يغلق ورقة إضافة المهمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await page.getByRole('button', { name: 'إضافة مهمة' }).click();
        const taskSheet = page.getByTestId('transactions-add-task-sheet');
        await expect(taskSheet).toBeVisible({ timeout: 8_000 });
        await page.keyboard.press('Escape');
        await expect(taskSheet).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('transactions-details-screen')).toBeVisible();
    });

    test('تبويب المرفقات: إضافة مستمسك ثم ظهوره في القائمة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await page.getByTestId('transactions-tab-docs').click({ force: true });
        await page.getByRole('button', { name: /إضافة مرفق/ }).click();
        const docSheet = page.getByTestId('transactions-add-document-sheet');
        await expect(docSheet).toBeVisible({ timeout: 8_000 });
        await page.getByLabel(/اسم\/وصف المستمسك/).fill('هوية الموكل');
        await page.getByRole('button', { name: 'للدائرة' }).click();
        await docSheet.getByRole('button', { name: 'إضافة' }).click();
        await expect(docSheet).toBeHidden({ timeout: 8_000 });
        await expect(page.getByText('هوية الموكل')).toBeVisible();
        await expect(page.getByText('للدائرة')).toBeVisible();
    });

    test('تحديث الموكل يفتح نصاً جاهزاً للنسخ', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await page.getByRole('button', { name: 'مشاركة تحديث الموكل' }).click();
        await expect(page.getByRole('dialog', { name: 'تحديث الموكل' })).toBeVisible({ timeout: 8_000 });
        await expect(page.getByText(E2E_TX_TITLE).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'نسخ النص' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expectOverlayClosed(page.getByRole('dialog', { name: 'تحديث الموكل' }));
    });

    test('مسار المهام: إكمال المهمة مع رقم الصادر ثم ظهورها منجزة', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await addTaskFromDetails(page, 'توكيل رسمي');
        await dismissTransactionsBlockers(page);

        await expect(async () => {
            await page.getByText('توكيل رسمي').click({ force: true });
            await expect(page.getByTestId('task-thread-complete-dialog')).toBeVisible({ timeout: 1_200 });
        }).toPass({ timeout: 12_000 });
        const completeTask = page.getByTestId('task-thread-complete-dialog');
        await page.locator('#task-thread-official-ref').fill('و/88');
        await completeTask.getByRole('button', { name: 'إكمال' }).click({ force: true });
        await expectOverlayClosed(completeTask);
        await expect(page.getByText('منجز').first()).toBeVisible();
        await expect(page.getByText('الصادر/الوارد: و/88')).toBeVisible();
    });

    test('مشاركة الإجراءات تفتح الحوار بلا اسم الموكل', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await addTaskFromDetails(page, 'تقديم العريضة');

        await page.getByTestId('transactions-share-procedure').click();
        const share = page.getByTestId('share-procedure-dialog');
        await expect(share).toBeVisible({ timeout: 8_000 });
        await expect(page.getByRole('heading', { name: 'مشاركة الإجراءات للمنتدى' })).toBeVisible();
        await expect(share.getByText(E2E_TX_CLIENT)).toHaveCount(0);
        await share.getByRole('button', { name: 'إلغاء' }).click({ force: true });
        await expectOverlayClosed(share);
    });

    test('متفرع يضيف مهمة فرعية ظاهرة في المسار', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await addTaskFromDetails(page, 'تقديم العريضة');

        await page.getByRole('button', { name: 'متفرع' }).click();
        const taskSheet = page.getByTestId('transactions-add-task-sheet');
        await expect(taskSheet).toBeVisible({ timeout: 8_000 });
        await expect(taskSheet.getByText(/تتفرع من/)).toBeVisible();
        await page.getByLabel('عنوان المهمة').fill('متابعة التبليغ');
        await taskSheet.getByRole('button', { name: 'حفظ المهمة' }).click();
        await expectOverlayClosed(taskSheet);
        await expect(page.getByText('تقديم العريضة')).toBeVisible();
        await expect(page.getByText('متابعة التبليغ')).toBeVisible();
    });

    test('تعديل المهمة من القائمة يحدّث العنوان', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await addTaskFromDetails(page, 'توكيل أولي');
        await chooseVisibleMenuItem(page, 'خيارات المهمة', 'تعديل');
        const edit = page.getByTestId('task-thread-edit-dialog');
        await expect(edit).toBeVisible({ timeout: 8_000 });
        await page.locator('#task-thread-edit-title').fill('توكيل محدّث');
        await edit.getByRole('button', { name: 'حفظ' }).click();
        await expectOverlayClosed(edit);
        await expect(page.getByText('توكيل محدّث')).toBeVisible();
        await expect(page.getByText('توكيل أولي')).toHaveCount(0);
    });

    test('حذف المهمة من القائمة يزيلها من المسار', async ({ page }) => {
        await ensureE2eTransactionInHub(page);
        await openE2eTransactionDetails(page);
        await addTaskFromDetails(page, 'مهمة للحذف');
        await chooseVisibleMenuItem(page, 'خيارات المهمة', 'حذف');
        const del = page.getByTestId('task-thread-delete-dialog');
        await expect(del).toBeVisible({ timeout: 8_000 });
        await del.getByRole('button', { name: 'حذف' }).click();
        await expectOverlayClosed(del);
        await expect(page.getByText('مهمة للحذف')).toHaveCount(0);
    });
});

async function expectOverlayClosed(locator: ReturnType<Page['getByRole']> | ReturnType<Page['getByTestId']>) {
    await expect(async () => {
        if ((await locator.count()) === 0) return;
        const state = await locator.getAttribute('data-state');
        if (state) {
            expect(state).toBe('closed');
            return;
        }
        await expect(locator).toBeHidden();
    }).toPass({ timeout: 15_000 });
}

async function addTaskFromDetails(page: Page, title: string) {
    await dismissTransactionsBlockers(page);
    await page.getByRole('button', { name: 'إضافة مهمة' }).click({ force: true });
    const taskSheet = page.getByTestId('transactions-add-task-sheet');
    await expect(taskSheet).toBeVisible({ timeout: 8_000 });
    await page.getByLabel('عنوان المهمة').fill(title);
    await taskSheet.getByRole('button', { name: 'حفظ المهمة' }).click({ force: true });
    await expectOverlayClosed(taskSheet);
    await expect(page.getByText(title)).toBeVisible();
}

async function chooseVisibleMenuItem(page: Page, menuButtonName: string, itemName: string) {
    await dismissTransactionsBlockers(page);
    const trigger = page.getByRole('button', { name: menuButtonName }).first();
    await expect(trigger).toBeVisible({ timeout: 8_000 });
    await trigger.click();
    const item = page.getByRole('menuitem', { name: itemName });
    await expect(item).toBeVisible({ timeout: 8_000 });
    await item.press('Enter');
}
