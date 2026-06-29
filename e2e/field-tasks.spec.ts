/**
 * E2E — مهام اليوم الميدانية: ستارة الميدان + أجندة المهام.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { clearQuantumTasks, workWeekKeyForDate } from './helpers/tasksFixtures';

const E2E_TASK_DETAILS = 'تفاصيل مهمة E2E للاختبار';
const E2E_TASK_LOCATION = 'محكمة E2E';

async function openFieldTasksFromHome(page: Page) {
    const trigger = page
        .getByTestId('home-dock-shell-dockTasks')
        .or(page.getByTestId('home-dock-dockTasks'))
        .or(page.getByRole('button', { name: 'مهام' }));
    await trigger.first().scrollIntoViewIfNeeded();
    await trigger.first().click({ timeout: 15_000, force: true });
    const sheet = page.getByTestId('field-tasks-sheet');
    await expect(sheet).toBeVisible({ timeout: 12_000 });
    return sheet;
}

async function openTasksManagerFromSheet(page: Page) {
    await page.getByTestId('field-tasks-manage-all').click();
    await expect(page.getByTestId('field-tasks-sheet')).toBeHidden({ timeout: 8_000 });
    const manager = page.getByTestId('tasks-manager');
    await expect(manager).toBeVisible({ timeout: 12_000 });
    return manager;
}

async function openAddTaskForm(manager: Locator) {
    const dayKey = workWeekKeyForDate();
    const todayAdd = manager.getByTestId(`tasks-week-add-${dayKey}`);
    if (await todayAdd.isVisible().catch(() => false)) {
        await todayAdd.click();
    } else {
        const addBtn = manager.locator('[data-testid^="tasks-week-add-"]').last();
        await expect(addBtn).toBeVisible({ timeout: 10_000 });
        await addBtn.click();
    }
    await expect(manager.getByTestId('tasks-week-form-details')).toBeVisible({ timeout: 8_000 });
}

async function fillAndSaveTask(page: Page, manager: Locator) {
    await openAddTaskForm(manager);
    await manager.getByTestId('tasks-week-form-details').fill(E2E_TASK_DETAILS);
    await manager.getByTestId('tasks-week-form-location').fill(E2E_TASK_LOCATION);
    await manager.getByTestId('tasks-week-save').click();
    await expect(manager.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 10_000 });
}

test.describe('مهام اليوم الميدانية', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearQuantumTasks(page);
        await seedLawyerFiles(page);
    });

    test('تفتح ستارة الميدان من الرئيسية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const sheet = await openFieldTasksFromHome(page);
        await expect(sheet.getByText('مهام اليوم الميدانية')).toBeVisible();
        await expect(sheet.getByTestId('field-tasks-manage-all')).toBeVisible();
    });

    test('الانتقال إلى أجندة المهام وعرض المواعيد الحتمية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openFieldTasksFromHome(page);
        const manager = await openTasksManagerFromSheet(page);
        await expect(manager.getByRole('heading', { name: 'أجندة المهام' })).toBeVisible();
        await expect(manager.getByTestId('tasks-fatal-section')).toBeVisible();
        await expect(manager.getByTestId('tasks-fatal-empty')).toBeVisible();
    });

    test('إضافة مهمة أسبوعية وحفظها', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openFieldTasksFromHome(page);
        const manager = await openTasksManagerFromSheet(page);
        await fillAndSaveTask(page, manager);
        await expect(manager.getByText(E2E_TASK_LOCATION)).toBeVisible();
    });

    test('Escape يغلق أجندة المهام', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openFieldTasksFromHome(page);
        await openTasksManagerFromSheet(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 5_000 });
    });

    test('إعادة الفتح تحافظ على المهمة وتظهر في الستارة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openFieldTasksFromHome(page);
        const manager = await openTasksManagerFromSheet(page);
        await fillAndSaveTask(page, manager);

        await manager.getByTestId('tasks-manager-close').click();
        await expect(page.getByTestId('tasks-manager')).toBeHidden({ timeout: 5_000 });

        const sheet2 = await openFieldTasksFromHome(page);
        await expect(sheet2.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 10_000 });

        const manager2 = await openTasksManagerFromSheet(page);
        await expect(manager2.getByText(E2E_TASK_DETAILS)).toBeVisible({ timeout: 10_000 });
    });

    test('إنهاء المهمة من الأجندة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openFieldTasksFromHome(page);
        const manager = await openTasksManagerFromSheet(page);
        await fillAndSaveTask(page, manager);

        const card = manager.locator('[data-testid^="tasks-task-card-"]').filter({ hasText: E2E_TASK_DETAILS });
        const taskId = await card.getAttribute('data-testid');
        const id = taskId?.replace('tasks-task-card-', '') ?? '';
        await manager.getByTestId(`tasks-task-complete-${id}`).click();

        await expect(manager.getByTestId(`tasks-task-complete-${id}`)).toBeHidden({ timeout: 10_000 });
        await expect(card.getByText('تم الإنهاء')).toBeVisible({ timeout: 8_000 });
    });
});
