import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { clickNativeElement } from './executionE2EBoot';
import { openFieldTasksFromDock } from './tasksFixtures';
import {
    prepareBootE2E,
    stripBootFailureLayer,
    suppressWeeklyBackupReminder,
    waitForLawyerDashboardReady,
} from './bootFixtures';
import { seedLawyerFiles } from './civilLawsuitFixtures';
import { dismissProductivityBlockers } from './productivityE2EFixtures';

/** يضمن أيقونات الدوك في الشبكة الرئيسية — حتى بدون lawyer_settings محفوظ */
export async function seedHomeDockLayout(page: Page): Promise<void> {
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
            homeLayout.dockVisible = false;
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

/** إعداد جلسة E2E للشريط السفلي — بلا reload إضافي */
export async function prepareHomeDockE2E(page: Page): Promise<void> {
    await prepareBootE2E(page);
    await suppressWeeklyBackupReminder(page);
    await seedLawyerFiles(page);
    await seedHomeDockLayout(page);
}

/**
 * إقلاع سريع — ينتظر بلاطات الدوك في الشبكة الرئيسية.
 */
export async function bootToHomeDock(page: Page): Promise<void> {
    await waitForLawyerDashboardReady(page);
    await stripBootFailureLayer(page);

    await expect(async () => {
        await stripBootFailureLayer(page);
        await dismissProductivityBlockers(page);
        await expect(page.getByTestId('home-main-grid')).toBeVisible({ timeout: 4_000 });
        await expect(dockTasksTrigger(page).first()).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 45_000 });

    await expect(page.getByTestId('hami-static-boot')).toHaveCount(0, { timeout: 4_000 }).catch(() => undefined);
    await expect(page.getByTestId('lawyer-boot-shell')).toBeHidden({ timeout: 4_000 }).catch(() => undefined);
}

/** إقلاع مباشر للرئيسية مع انتظار بلاطات الدوك */
export async function bootHomeDockChrome(page: Page): Promise<Locator> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await bootToHomeDock(page);
    await dismissProductivityBlockers(page);
    return page.getByTestId('home-main-grid');
}

export function dockRepositoryTrigger(page: Page): Locator {
    return page
        .getByTestId('home-dock-shell-dockRepository')
        .or(page.getByTestId('home-dock-dockRepository'))
        .filter({ visible: true });
}

export function dockTasksTrigger(page: Page): Locator {
    return page
        .getByTestId('home-dock-shell-dockTasks')
        .or(page.getByTestId('home-dock-dockTasks'))
        .or(page.getByRole('button', { name: /مهام/i }))
        .filter({ visible: true });
}

export function dockCalendarTrigger(page: Page): Locator {
    return page
        .getByTestId('home-dock-shell-dockCalendar')
        .or(page.getByTestId('home-dock-dockCalendar'))
        .filter({ visible: true });
}

async function tapDockTrigger(trigger: Locator): Promise<void> {
    await expect(async () => {
        const visible = trigger.first();
        await expect(visible).toBeVisible({ timeout: 4_000 });
        await visible.scrollIntoViewIfNeeded();
        await clickNativeElement(visible);
    }).toPass({ timeout: 15_000 });
}

export async function clickDockRepository(page: Page): Promise<void> {
    await tapDockTrigger(dockRepositoryTrigger(page).first());
}

export async function clickDockTasks(page: Page): Promise<void> {
    await openFieldTasksFromDock(page);
}

export async function clickDockCalendar(page: Page): Promise<void> {
    await tapDockTrigger(dockCalendarTrigger(page).first());
}

/**
 * الرادار والهيكل يظهران معاً بعد التحميل — `.or()` بدون `.first()` يخالف strict mode.
 */
export async function expectScheduleSurfaceVisible(page: Page, timeout = 20_000): Promise<void> {
    const loading = page.getByTestId('schedule-tab-loading');
    const radar = page.getByTestId('smart-legal-radar');
    const shell = page.getByTestId('lawyer-schedule-tab-shell');
    await expect(loading.or(radar).or(shell).first()).toBeVisible({ timeout });
    await expect(radar.or(shell).first()).toBeVisible({ timeout });
}

export async function expectDockWidgetsVisible(grid: Locator): Promise<void> {
    const page = grid.page();
    for (const id of ['dockRepository', 'dockTasks'] as const) {
        await expect(async () => {
            const trigger =
                id === 'dockRepository'
                    ? dockRepositoryTrigger(page).first()
                    : dockTasksTrigger(page).first();
            await expect(trigger).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 15_000 });
    }
    await expect(page.getByTestId('home-hub-card')).toBeVisible({ timeout: 15_000 });
}
