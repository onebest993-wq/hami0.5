/**
 * تدقيق حي — بلاطة «مهام» في الشبكة + الستارة + أجندة المهام.
 * يحاكي استخدام شخص حقيقي: فتح، إغلاق، إضافة، تحقق، إنهاء، أرشيف، مؤجلة، مساعدة.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
    bootTasksE2E,
    buildE2eQuantumTask,
    clearQuantumTasks,
    fillTasksFormField,
    openTasksManagerFromSheet,
    prepareTasksE2E,
    seedQuantumTasks,
    teardownTasksE2E,
    waitForFieldTasksSheetReady,
    workWeekKeyForDate,
} from './helpers/tasksFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';

const LIVE_DETAILS = 'تفاصيل مهمة تدقيق حي من البلاطة';
const LIVE_LOCATION = 'محكمة التدقيق الحي';
const LIVE_TASK_ID = 'live-audit-hub-task';
const LIVE_FATAL_ID = 'live-fatal-task';
const WEEK_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

async function hubTasksTile(page: Page) {
    return page.locator('[data-hami-block="dockTasks"]').or(page.getByTestId('home-dock-dockTasks'));
}

async function openFieldTasksFromHubTile(page: Page) {
    await dismissProductivityBlockers(page);
    const tile = (await hubTasksTile(page)).first();
    await expect(async () => {
        await dismissProductivityBlockers(page);
        await tile.scrollIntoViewIfNeeded();
        await expect(tile).toBeVisible({ timeout: 12_000 });
        await tile.click({ timeout: 12_000, force: true });
        await expect(page.getByTestId('field-tasks-sheet')).toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 35_000 });
    return waitForFieldTasksSheetReady(page, 50_000);
}

async function touchSize(locator: Locator) {
    const box = await locator.boundingBox();
    return { w: box?.width ?? 0, h: box?.height ?? 0 };
}

async function openWeekAddForm(manager: Locator) {
    await expect(manager.locator('[data-testid^="tasks-week-day-"]').first()).toBeVisible({
        timeout: 12_000,
    });
    const dayKey = workWeekKeyForDate();
    const todayAdd = manager.getByTestId(`tasks-week-add-${dayKey}`);
    let addBtn = todayAdd;
    if (!(await todayAdd.isVisible().catch(() => false))) {
        const futureAdds = manager.locator('[data-testid^="tasks-week-add-"]');
        addBtn = (await futureAdds.count()) > 0 ? futureAdds.last() : todayAdd;
    }
    await expect(addBtn).toBeVisible({ timeout: 12_000 });
    const details = manager.getByTestId('tasks-week-form-details');
    if (!(await details.isVisible().catch(() => false))) {
        await addBtn.click({ force: true, noWaitAfter: true });
    }
    await expect(details).toBeVisible({ timeout: 8_000 });
    return addBtn;
}

test.describe('تدقيق حي — بلاطة مهام وكل الأقسام', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareTasksE2E(page);
        await clearQuantumTasks(page);
        test.setTimeout(180_000);
    });

    test.afterEach(async ({ page }) => {
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.keyboard.press('Escape').catch(() => undefined);
        await teardownTasksE2E(page);
    });

    test('البلاطة تفتح الستارة الفارغة وتُغلق من X وEscape', async ({ page }) => {
        await bootTasksE2E(page);

        const tile = (await hubTasksTile(page)).first();
        await expect(tile).toBeVisible({ timeout: 20_000 });
        const tileBox = await touchSize(tile);
        expect(tileBox.h, 'ارتفاع بلاطة المهام').toBeGreaterThanOrEqual(44);

        const sheet = await openFieldTasksFromHubTile(page);
        await expect(sheet.getByText('مهام اليوم الميدانية')).toBeVisible();
        await expect(sheet.getByTestId('field-tasks-empty')).toBeVisible();
        await expect(sheet.getByText(/لا مهام ميدانية/)).toBeVisible();
        await expect(sheet.getByTestId('field-tasks-manage-all')).toBeVisible();
        await expect(sheet.getByRole('button', { name: 'إدارة جميع المهام' })).toBeVisible();

        const closeBtn = sheet.getByTestId('field-tasks-close');
        const closeBox = await touchSize(closeBtn);
        expect(closeBox.w).toBeGreaterThanOrEqual(44);
        expect(closeBox.h).toBeGreaterThanOrEqual(44);
        await closeBtn.click();
        await expect(page.getByTestId('field-tasks-sheet')).toBeHidden({ timeout: 8_000 });

        await openFieldTasksFromHubTile(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('field-tasks-sheet')).toBeHidden({ timeout: 8_000 });
    });

    test('النقر المتكرر على البلاطة لا يفتح أكثر من ستارة', async ({ page }) => {
        await bootTasksE2E(page);
        const tile = (await hubTasksTile(page)).first();
        await expect(tile).toBeVisible({ timeout: 20_000 });
        await tile.click({ force: true });
        await tile.click({ force: true });
        await tile.click({ force: true });
        await waitForFieldTasksSheetReady(page, 35_000);
        await expect(page.getByTestId('field-tasks-sheet')).toHaveCount(1);
    });

    test('الأجندة: أيام الأسبوع، تحقق الإضافة، إلغاء، حفظ', async ({ page }) => {
        await bootTasksE2E(page);
        const sheet = await openFieldTasksFromHubTile(page);
        const manager = await openTasksManagerFromSheet(page, sheet);

        await expect(manager.getByRole('heading', { name: 'أجندة المهام' })).toBeVisible();
        await expect(manager).toHaveAttribute('data-tasks-manager-hydrated', 'true', { timeout: 15_000 });
        await expect(manager.getByTestId('tasks-manager-help-inbox')).toBeVisible();
        await expect(manager.getByTestId('tasks-manager-completed-toggle')).toBeVisible();
        await expect(manager.getByTestId('tasks-distant-section')).toBeVisible();

        for (const key of WEEK_KEYS) {
            await expect(manager.getByTestId(`tasks-week-day-${key}`)).toBeVisible();
        }

        await openWeekAddForm(manager);
        const saveBtn = manager.getByTestId('tasks-week-save');
        await expect(saveBtn).toBeDisabled();

        await fillTasksFormField(manager, 'tasks-week-form-details', LIVE_DETAILS);
        await expect(saveBtn).toBeDisabled();
        await manager.getByTestId('tasks-week-cancel').click();
        await expect(manager.getByTestId('tasks-week-add-form')).toBeHidden();

        await openWeekAddForm(manager);
        await expect(manager.getByTestId('tasks-week-form-details')).toBeEditable();
        await expect(manager.getByTestId('tasks-week-form-location')).toBeEditable();
        await fillTasksFormField(manager, 'tasks-week-form-details', LIVE_DETAILS);
        await fillTasksFormField(manager, 'tasks-week-form-location', LIVE_LOCATION);
        await expect(manager.getByTestId('tasks-week-save')).toBeEnabled();
        await manager.getByTestId('tasks-week-save').click();
        await expect(manager.getByText(LIVE_DETAILS)).toBeVisible({ timeout: 15_000 });
        await expect(manager.getByText(LIVE_LOCATION)).toBeVisible();
    });

    test('بطاقة المهمة: طلبات، تفريع، خيارات، إنهاء — وطلب المساعدة من القائمة', async ({ page }) => {
        await seedQuantumTasks(page, [
            buildE2eQuantumTask({
                id: LIVE_TASK_ID,
                rawText: LIVE_DETAILS,
                title: LIVE_DETAILS,
                location: LIVE_LOCATION,
            }),
        ]);
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromHubTile(page);
        await expect(sheet.getByTestId(`field-tasks-curtain-card-${LIVE_TASK_ID}`)).toBeVisible({
            timeout: 15_000,
        });
        await expect(sheet.getByTestId(`field-tasks-complete-${LIVE_TASK_ID}`)).toBeVisible();

        const manager = await openTasksManagerFromSheet(page, sheet);
        const card = manager.locator(`[data-testid="tasks-task-card-${LIVE_TASK_ID}"]`);
        await expect(card).toBeVisible({ timeout: 15_000 });

        await manager.getByTestId(`tasks-task-requirements-toggle-${LIVE_TASK_ID}`).click();
        const reqPanel = manager.getByTestId(`tasks-task-requirements-panel-${LIVE_TASK_ID}`);
        await expect(reqPanel).toBeVisible();
        await expect(reqPanel.getByTestId('tasks-doc-add-input')).toBeVisible();

        await manager.getByTestId(`tasks-task-branch-toggle-${LIVE_TASK_ID}`).click();

        await expect(card.getByRole('button', { name: /مساعدة/ })).toHaveCount(0);

        await manager.getByTestId(`tasks-task-options-${LIVE_TASK_ID}`).click();
        const menu = page.getByTestId(`tasks-task-options-menu-${LIVE_TASK_ID}`);
        await expect(menu).toBeVisible({ timeout: 8_000 });
        await expect(menu.getByRole('menuitem', { name: 'ترحيل' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'تعديل المهمة' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'حذف' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'طلب مساعدة' })).toBeVisible();

        await menu.getByRole('menuitem', { name: 'طلب مساعدة' }).click();
        await expect(page.getByText('طلب مساعدة في المهمة')).toBeVisible({ timeout: 8_000 });
        await page.getByRole('button', { name: 'إلغاء' }).click();

        await manager.getByTestId(`tasks-task-options-${LIVE_TASK_ID}`).click();
        await expect(page.getByTestId(`tasks-task-options-menu-${LIVE_TASK_ID}`)).toBeVisible({
            timeout: 8_000,
        });
        await page
            .getByTestId(`tasks-task-options-menu-${LIVE_TASK_ID}`)
            .getByRole('menuitem', { name: 'تعديل المهمة' })
            .click();
        await expect(page.getByText('تعديل المهمة')).toBeVisible({ timeout: 8_000 });
        await page.getByRole('button', { name: 'إلغاء' }).click();

        await manager.getByTestId(`tasks-task-options-${LIVE_TASK_ID}`).click();
        await page
            .getByTestId(`tasks-task-options-menu-${LIVE_TASK_ID}`)
            .getByRole('menuitem', { name: 'حذف' })
            .click();
        await expect(page.getByTestId('tasks-delete-confirm')).toBeVisible({ timeout: 8_000 });
        await page.getByRole('button', { name: 'إلغاء' }).click();

        await manager.getByTestId(`tasks-task-complete-${LIVE_TASK_ID}`).click();
        await expect(manager.getByTestId(`tasks-task-complete-${LIVE_TASK_ID}`)).toBeHidden({
            timeout: 10_000,
        });
        await expect(card.getByText(/تم الإنهاء/)).toBeVisible({ timeout: 8_000 });
    });

    test('إنهاء مهمة حتمية يطلب تأكيداً', async ({ page }) => {
        await seedQuantumTasks(page, [
            buildE2eQuantumTask({
                id: LIVE_FATAL_ID,
                rawText: 'مهلة حتمية للتدقيق',
                title: 'مهلة حتمية للتدقيق',
                location: 'محكمة',
                isFatalDeadline: true,
            }),
        ]);
        await bootTasksE2E(page);
        const sheet = await openFieldTasksFromHubTile(page);
        const manager = await openTasksManagerFromSheet(page, sheet);

        await expect(manager.getByTestId('tasks-fatal-section')).toBeVisible({ timeout: 12_000 });
        await manager.getByTestId(`tasks-task-complete-${LIVE_FATAL_ID}`).click();
        await expect(page.getByRole('heading', { name: 'موعد حتمي' })).toBeVisible({ timeout: 8_000 });
        await page.getByRole('button', { name: 'تأكيد الإكمال' }).click();
        await expect(manager.getByText(/تم الإنهاء/)).toBeVisible({ timeout: 10_000 });
    });

    test('المؤجلة والأرشيف وصندوق المساعدة وEscape', async ({ page }) => {
        await bootTasksE2E(page);
        const sheet = await openFieldTasksFromHubTile(page);
        const manager = await openTasksManagerFromSheet(page, sheet);

        const snoozeToggle = manager.getByTestId('tasks-snooze-toggle');
        await snoozeToggle.scrollIntoViewIfNeeded();
        await snoozeToggle.click();
        await expect(manager.getByTestId('tasks-snooze-form')).toBeVisible();
        await expect(manager.getByTestId('tasks-snooze-save')).toBeDisabled();
        await manager.getByPlaceholder(/عنوان/).fill('مهمة مؤجلة للتدقيق');
        const snoozeDue = new Date();
        snoozeDue.setDate(snoozeDue.getDate() + 10);
        const snoozeYmd = `${snoozeDue.getFullYear()}-${String(snoozeDue.getMonth() + 1).padStart(2, '0')}-${String(snoozeDue.getDate()).padStart(2, '0')}`;
        await manager.getByTestId('tasks-snooze-due-date').fill(snoozeYmd);
        await expect(manager.getByTestId('tasks-snooze-save')).toBeEnabled();
        await manager.getByTestId('tasks-snooze-save').click();
        await expect(manager.getByTestId('tasks-snoozed-list')).toBeVisible({ timeout: 10_000 });
        await expect(manager.getByText('مهمة مؤجلة للتدقيق')).toBeVisible({ timeout: 10_000 });

        await manager.getByTestId('tasks-manager-completed-toggle').click();
        await expect(manager.getByRole('heading', { name: 'المهام المنتهية' })).toBeVisible();
        await expect(manager.getByText(/لا توجد مهام في الأرشيف/)).toBeVisible();
        await manager.getByRole('button', { name: 'رجوع' }).click();
        await expect(manager.getByTestId('tasks-distant-section')).toBeVisible();

        await manager.getByTestId('tasks-manager-help-inbox').click();
        await expect(page.getByText('صندوق طلبات المساعدة')).toBeVisible({ timeout: 8_000 });
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('tasks-manager')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 8_000 });
    });

    test('المهمة تظهر في الستارة بعد الحفظ وإعادة الفتح', async ({ page }) => {
        await bootTasksE2E(page);
        const sheet = await openFieldTasksFromHubTile(page);
        const manager = await openTasksManagerFromSheet(page, sheet);
        await openWeekAddForm(manager);
        await fillTasksFormField(manager, 'tasks-week-form-details', LIVE_DETAILS);
        await fillTasksFormField(manager, 'tasks-week-form-location', LIVE_LOCATION);
        await manager.getByTestId('tasks-week-save').click();
        await expect(manager.getByText(LIVE_DETAILS)).toBeVisible({ timeout: 15_000 });

        await manager.getByTestId('tasks-manager-close').click();
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 8_000 });

        const sheet2 = await openFieldTasksFromHubTile(page);
        await expect(sheet2.getByText(LIVE_DETAILS)).toBeVisible({ timeout: 15_000 });
    });
});

test.describe('تدقيق حي — موبايل 390×844', () => {
    test.describe.configure({ timeout: 180_000 });
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
        await prepareTasksE2E(page);
        await clearQuantumTasks(page);
        test.setTimeout(180_000);
    });

    test.afterEach(async ({ page }) => {
        await teardownTasksE2E(page);
    });

    test('أهداف اللمس 44px على البلاطة والستارة ورأس الأجندة', async ({ page }) => {
        await bootTasksE2E(page);
        const tile = (await hubTasksTile(page)).first();
        await expect(tile).toBeVisible({ timeout: 20_000 });
        expect((await touchSize(tile)).h).toBeGreaterThanOrEqual(44);

        const sheet = await openFieldTasksFromHubTile(page);
        expect((await touchSize(sheet.getByTestId('field-tasks-manage-all'))).h).toBeGreaterThanOrEqual(44);

        const manager = await openTasksManagerFromSheet(page, sheet);
        expect((await touchSize(manager.getByTestId('tasks-manager-help-inbox'))).h).toBeGreaterThanOrEqual(44);
        expect((await touchSize(manager.getByTestId('tasks-manager-completed-toggle'))).h).toBeGreaterThanOrEqual(44);
        const closeBox = await touchSize(manager.getByTestId('tasks-manager-close'));
        expect(closeBox.w).toBeGreaterThanOrEqual(44);
        expect(closeBox.h).toBeGreaterThanOrEqual(44);
    });
});
