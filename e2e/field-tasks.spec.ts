/**
 * E2E — مهام اليوم الميدانية: ستارة الميدان + أجندة المهام.
 */
import { test, expect, type Locator } from '@playwright/test';
import {
    bootTasksE2E,
    buildE2eQuantumTask,
    clearQuantumTasks,
    fillTasksFormField,
    openFieldTasksFromDock,
    openTasksManagerFromSheet,
    prepareTasksE2E,
    seedQuantumTasks,
    teardownTasksE2E,
    workWeekKeyForDate,
} from './helpers/tasksFixtures';

const E2E_TASK_DETAILS = 'تفاصيل مهمة E2E للاختبار';
const E2E_TASK_LOCATION = 'محكمة E2E';

async function openAddTaskForm(manager: Locator) {
    const dayKey = workWeekKeyForDate();
    const todayAdd = manager.getByTestId(`tasks-week-add-${dayKey}`);
    let addBtn = todayAdd;
    if (!(await todayAdd.isVisible().catch(() => false))) {
        const futureAdds = manager.locator('[data-testid^="tasks-week-add-"]');
        const count = await futureAdds.count();
        addBtn = count > 0 ? futureAdds.last() : todayAdd;
    }
    await expect(addBtn).toBeVisible({ timeout: 12_000 });

    const detailsField = manager.getByTestId('tasks-week-form-details');
    if (!(await detailsField.isVisible().catch(() => false))) {
        await addBtn.click({ force: true, noWaitAfter: true });
    }
    await expect(detailsField).toBeVisible({ timeout: 8_000 });
    await expect(detailsField).toBeEditable();
}

async function fillAndSaveTask(manager: Locator) {
    await expect(manager).toHaveAttribute('data-tasks-manager-hydrated', 'true', { timeout: 15_000 });
    await openAddTaskForm(manager);
    await fillTasksFormField(manager, 'tasks-week-form-details', E2E_TASK_DETAILS);
    await fillTasksFormField(manager, 'tasks-week-form-location', E2E_TASK_LOCATION);
    await manager.getByTestId('tasks-week-save').click();
    await expect(manager.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 15_000 });
}

test.describe('مهام اليوم الميدانية', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareTasksE2E(page);
        await clearQuantumTasks(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownTasksE2E(page);
    });

    test('تفتح ستارة الميدان من الرئيسية', async ({ page }) => {
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        await expect(sheet.getByText('مهام اليوم الميدانية')).toBeVisible();
        await expect(sheet.getByTestId('field-tasks-manage-all')).toBeVisible();
    });

    test('الانتقال إلى أجندة المهام وعرض المواعيد الحتمية', async ({ page }) => {
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        const manager = await openTasksManagerFromSheet(page, sheet);
        await expect(manager.getByRole('heading', { name: 'أجندة المهام' })).toBeVisible();
        await expect(manager).toHaveAttribute('data-tasks-manager-hydrated', 'true', { timeout: 15_000 });
        await expect(manager.locator('[data-testid^="tasks-week-day-"]').first()).toBeVisible({
            timeout: 12_000,
        });
    });

    test('إضافة مهمة أسبوعية وحفظها', async ({ page }) => {
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        const manager = await openTasksManagerFromSheet(page, sheet);
        await fillAndSaveTask(manager);
        await expect(manager.getByText(E2E_TASK_LOCATION)).toBeVisible();
    });

    test('Escape يغلق أجندة المهام', async ({ page }) => {
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        await openTasksManagerFromSheet(page, sheet);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 8_000 });
    });

    test('إعادة الفتح تحافظ على المهمة وتظهر في الستارة', async ({ page }) => {
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        const manager = await openTasksManagerFromSheet(page, sheet);
        await fillAndSaveTask(manager);

        await manager.getByTestId('tasks-manager-close').click();
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 8_000 });

        const sheet2 = await openFieldTasksFromDock(page);
        await expect(sheet2.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 15_000 });

        const manager2 = await openTasksManagerFromSheet(page, sheet2);
        await expect(manager2.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 10_000 });
    });

    test('فتح متطلبات المهمة من البطاقة', async ({ page }) => {
        const taskId = 'e2e-requirements-task';
        await seedQuantumTasks(page, [
            buildE2eQuantumTask({
                id: taskId,
                rawText: E2E_TASK_DETAILS,
                title: E2E_TASK_DETAILS,
                location: E2E_TASK_LOCATION,
            }),
        ]);
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        const manager = await openTasksManagerFromSheet(page, sheet);

        const toggle = manager.getByTestId(`tasks-task-requirements-toggle-${taskId}`);
        await expect(toggle).toBeVisible({ timeout: 15_000 });
        await toggle.click();

        const panel = manager.getByTestId(`tasks-task-requirements-panel-${taskId}`);
        await expect(panel).toBeVisible({ timeout: 8_000 });
        await expect(panel.getByTestId('tasks-doc-add-input')).toBeVisible();
    });

    test('إنهاء المهمة من الأجندة', async ({ page }) => {
        const taskId = 'e2e-complete-task';
        await seedQuantumTasks(page, [
            buildE2eQuantumTask({
                id: taskId,
                rawText: E2E_TASK_DETAILS,
                title: E2E_TASK_DETAILS,
                location: E2E_TASK_LOCATION,
            }),
        ]);
        await bootTasksE2E(page);

        const sheet = await openFieldTasksFromDock(page);
        const manager = await openTasksManagerFromSheet(page, sheet);

        const card = manager.locator(`[data-testid="tasks-task-card-${taskId}"]`);
        await expect(card).toBeVisible({ timeout: 15_000 });
        await manager.getByTestId(`tasks-task-complete-${taskId}`).click();

        await expect(manager.getByTestId(`tasks-task-complete-${taskId}`)).toBeHidden({ timeout: 10_000 });
        await expect(card.getByText('تم الإنهاء')).toBeVisible({ timeout: 8_000 });
    });
});
