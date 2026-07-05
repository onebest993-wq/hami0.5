import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { stripBootFailureLayer, prepareBootE2E, suppressWeeklyBackupReminder } from './bootFixtures';
import { dismissProductivityBlockers } from './productivityE2EFixtures';

export const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

/** ستارة جاهزة — بعد hydration + interactive */
export const FIELD_TASKS_HYDRATED_SHEET_SELECTOR =
    '[data-testid="field-tasks-sheet"][data-field-tasks-hydrated="true"]';

/** أجندة المهام جاهزة */
export const TASKS_MANAGER_HYDRATED_SELECTOR =
    '[data-testid="tasks-manager"][data-tasks-manager-hydrated="true"]';

/** زر مهام الميدان في الدوك */
export function dockTasksTrigger(page: Page) {
    return page
        .getByTestId('home-dock-shell-dockTasks')
        .or(page.getByTestId('home-dock-dockTasks'))
        .or(page.getByRole('button', { name: /مهام/i }));
}

/** يضمن dockVisible — نسخة محلية لتجنب import دائري مع homeDockFixtures */
async function seedTasksDockLayout(page: Page): Promise<void> {
    await page.addInitScript(() => {
        try {
            const key = 'lawyer_settings';
            let settings: Record<string, unknown> = {};
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    settings = JSON.parse(raw) as Record<string, unknown>;
                } catch {
                    settings = {};
                }
            }
            const homeLayout = (settings.homeLayout as Record<string, unknown> | undefined) ?? {};
            homeLayout.dockVisible = true;
            homeLayout.quickNoteVisible = false;
            const overrides =
                (homeLayout.overrides as Record<string, { visible?: boolean }> | undefined) ?? {};
            for (const id of ['dockRepository', 'dockTasks', 'dockCalendar', 'dockShell']) {
                if (overrides[id]?.visible === false) delete overrides[id]!.visible;
            }
            homeLayout.overrides = overrides;
            settings.homeLayout = homeLayout;
            if (settings.version == null) settings.version = 2;
            localStorage.setItem(key, JSON.stringify(settings));
        } catch {
            /* ignore */
        }
    });
}

/** مفتاح يوم الأسبوع العملي (سبت–جمعة) حسب تاريخ الجهاز */
export function workWeekKeyForDate(date = new Date()): string {
    const map: Record<number, string> = {
        6: 'sat',
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu',
        5: 'fri',
    };
    return map[date.getDay()] ?? 'sat';
}

type SerializedQuantumTask = {
    id: string;
    rawText: string;
    title: string;
    location: string | null;
    parsedDate: string | null;
    reminderAt: null;
    isFatalDeadline: boolean;
    linkedCaseId: null;
    status: 'pending';
    completedAt: null;
    pinnedToFieldCurtain: boolean;
    fieldCurtainPinnedAt: string | null;
    subTasks: unknown[];
    documentRequirements: unknown[];
    expenses: unknown[];
};

export function buildE2eQuantumTask(overrides: Partial<SerializedQuantumTask> = {}): SerializedQuantumTask {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return {
        id: 'e2e-field-task-1',
        rawText: 'مهمة E2E',
        title: 'مهمة E2E ميدانية',
        location: 'محكمة اختبار',
        parsedDate: today.toISOString(),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        ...overrides,
    };
}

/** عزل حالة المهام — init script قبل تحميل الصفحة */
export async function installTasksE2EIsolation(page: Page): Promise<void> {
    await page.addInitScript((key: string) => {
        try {
            localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    }, QUANTUM_TASKS_STORAGE_KEY);
}

/** يجهّز جلسة E2E لمهام الميدان — boot + dock + عزل التخزين */
export async function prepareTasksE2E(page: Page): Promise<void> {
    await prepareBootE2E(page);
    await suppressWeeklyBackupReminder(page);
    await installTasksE2EIsolation(page);
    await seedTasksDockLayout(page);
}

export async function clearQuantumTasks(page: Page) {
    await installTasksE2EIsolation(page);
}

export async function seedQuantumTasks(page: Page, tasks: SerializedQuantumTask[] = []) {
    await page.addInitScript(
        ({ key, payload }) => {
            localStorage.setItem(key, JSON.stringify({ tasks: payload }));
        },
        { key: QUANTUM_TASKS_STORAGE_KEY, payload: tasks },
    );
}

/** ينتظر اكتمال boot التفاعلي قبل فتح مهام الميدان */
async function awaitDashboardInteractive(page: Page): Promise<void> {
    await page.evaluate(async () => {
        const bootDone = performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark').length > 0;
        if (bootDone) return;
        await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 8_000);
            const done = () => {
                window.clearTimeout(timeout);
                window.removeEventListener('hami:dashboard-interactive', done);
                resolve();
            };
            window.addEventListener('hami:dashboard-interactive', done, { once: true });
        });
    });
}

/** ينتظر prefetch ستارة الميدان بعد الإقلاع */
async function awaitFieldTasksShellPrefetch(page: Page): Promise<void> {
    await page.evaluate((eventName) => {
        return new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 15_000);
            const done = () => {
                window.clearTimeout(timeout);
                window.removeEventListener(eventName, done);
                resolve();
            };
            window.addEventListener(eventName, done, { once: true });
            window.dispatchEvent(new Event('hami:dashboard-interactive'));
        });
    }, 'hami:field-tasks-shell-hydrated');
}

/** ينتظر الدوك بعد الإقلاع — بدون import دائري */
async function bootToHomeDockForTasks(page: Page): Promise<void> {
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 60_000 });
    await stripBootFailureLayer(page);

    await expect(async () => {
        await stripBootFailureLayer(page);
        await dismissProductivityBlockers(page);
        await expect(page.getByTestId('home-bottom-chrome')).toBeVisible({ timeout: 4_000 });
        await expect(page.getByTestId('home-dock-shell-zone')).toBeVisible({ timeout: 4_000 });
        await expect(dockTasksTrigger(page).first()).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 45_000 });

    await expect(page.getByTestId('home-dock-shell')).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByTestId('hami-static-boot')).toHaveCount(0, { timeout: 4_000 }).catch(() => undefined);
    await expect(page.getByTestId('lawyer-boot-shell')).toBeHidden({ timeout: 4_000 }).catch(() => undefined);
}

/** ينتظر استقرار اللوحة والدوك قبل فتح مهام الميدان */
export async function awaitDashboardStableForFieldTasks(page: Page): Promise<void> {
    if (page.isClosed()) return;

    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 60_000 });
    await stripBootFailureLayer(page);
    await awaitDashboardInteractive(page);
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);

    const trigger = dockTasksTrigger(page).first();

    await expect(async () => {
        if (page.isClosed()) return;
        await stripBootFailureLayer(page);
        await dismissProductivityBlockers(page);
        await expect(trigger).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 45_000 });

    await expect(page.getByTestId('home-dock-shell')).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
    await expect(page.getByTestId('home-bottom-chrome')).toBeVisible({ timeout: 10_000 }).catch(() => undefined);
}

/** إقلاع مباشر للرئيسية مع انتظار الدوك — مسار E2E الموحّد */
export async function bootTasksE2E(page: Page): Promise<void> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await bootToHomeDockForTasks(page);
    await dismissProductivityBlockers(page);
    await awaitDashboardStableForFieldTasks(page);
    await awaitFieldTasksShellPrefetch(page);
}

export async function resetTasksE2ETransientState(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate(() => {
            try {
                window.dispatchEvent(new CustomEvent('hami:dismiss-transient-overlays', { detail: {} }));
            } catch {
                /* ignore */
            }
        })
        .catch(() => undefined);
}

export async function resetTasksE2EPageState(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate((key: string) => {
            try {
                localStorage.removeItem(key);
            } catch {
                /* ignore */
            }
        }, QUANTUM_TASKS_STORAGE_KEY)
        .catch(() => undefined);
    await resetTasksE2ETransientState(page);
}

/** ينتظر ستارة الميدان مع marker hydration */
export async function waitForFieldTasksSheetReady(page: Page, timeout = 50_000) {
    const sheet = page.getByTestId('field-tasks-sheet');
    await expect(async () => {
        await expect(page.getByTestId('field-tasks-sheet-loading'))
            .toBeHidden({ timeout: 8_000 })
            .catch(() => undefined);
        await expect(sheet).toBeVisible({ timeout: 8_000 });
        await expect(sheet).toHaveAttribute('data-field-tasks-hydrated', 'true', { timeout: 8_000 });
    }).toPass({ timeout });
    return sheet;
}

export async function waitForTasksManagerReady(page: Page, timeout = 50_000) {
    const manager = page.getByTestId('tasks-manager');
    await expect(async () => {
        await expect(manager).toBeVisible({ timeout: 8_000 });
        await expect(manager).toHaveAttribute('data-tasks-manager-hydrated', 'true', { timeout: 8_000 });
    }).toPass({ timeout });
    return manager;
}

/** يملأ حقل نموذج المهام — pressSequentially أكثر استقراراً مع React controlled inputs */
export async function fillTasksFormField(manager: Locator, testId: string, value: string) {
    await expect(async () => {
        const field = manager.getByTestId(testId);
        await expect(field).toBeVisible();
        await expect(field).toBeEditable();
        await field.click();
        await field.fill('');
        await field.pressSequentially(value, { delay: 12 });
        await expect(field).toHaveValue(value);
    }).toPass({ timeout: 30_000 });
}

export async function openFieldTasksFromDock(page: Page) {
    await awaitDashboardStableForFieldTasks(page);
    await resetTasksE2ETransientState(page);

    const clickDockTasks = async () => {
        const trigger = dockTasksTrigger(page).first();
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ timeout: 12_000, force: true });
    };

    await expect(async () => {
        await clickDockTasks();
        await expect(page.getByTestId('field-tasks-sheet').or(page.getByTestId('field-tasks-sheet-loading')))
            .toBeVisible({ timeout: 6_000 });
    }).toPass({ timeout: 25_000 });

    try {
        return await waitForFieldTasksSheetReady(page, 50_000);
    } catch {
        await closeTasksManagerIfOpen(page);
        await closeFieldTasksSheetIfOpen(page);
        await awaitDashboardStableForFieldTasks(page);
        await clickDockTasks();
        return waitForFieldTasksSheetReady(page, 50_000);
    }
}

export async function openTasksManagerFromSheet(page: Page, sheet: Locator) {
    await expect(sheet).toHaveAttribute('data-field-tasks-hydrated', 'true', { timeout: 10_000 });
    await sheet.getByTestId('field-tasks-manage-all').click();
    await expect(page.getByTestId('field-tasks-sheet')).toBeHidden({ timeout: 8_000 });
    return waitForTasksManagerReady(page);
}

export async function closeTasksManagerIfOpen(page: Page): Promise<void> {
    if (page.isClosed()) return;
    const manager = page.getByTestId('tasks-manager');
    if (!(await manager.isVisible().catch(() => false))) return;

    const closeBtn = page.getByTestId('tasks-manager-close');
    if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => undefined);
    } else {
        await page.keyboard.press('Escape').catch(() => undefined);
    }
    await expect(manager).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
}

export async function closeFieldTasksSheetIfOpen(page: Page): Promise<void> {
    if (page.isClosed()) return;
    const sheet = page.getByTestId('field-tasks-sheet');
    if (!(await sheet.isVisible().catch(() => false))) return;
    await page.keyboard.press('Escape').catch(() => undefined);
    await expect(sheet).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
}

export async function teardownTasksE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await closeTasksManagerIfOpen(page);
    await closeFieldTasksSheetIfOpen(page);
    await resetTasksE2EPageState(page);
    await stripBootFailureLayer(page);
    await awaitDashboardStableForFieldTasks(page).catch(() => undefined);
}
