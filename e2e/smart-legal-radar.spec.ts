/**
 * E2E — رادار المواعيد (التقويم): فتح من الرئيسية، إضافة موعد، التقويم الكامل، رجوع، إعادة فتح.
 */
import { test, expect } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import {
    clearCalendarEvents,
    seedCalendarEvents,
    buildE2eCalendarEvent,
    readCalendarOpenToInteractiveMs,
    E2E_CALENDAR_COLD_OPEN_MS,
    E2E_CALENDAR_CACHED_OPEN_MS,
    prepareCalendarE2E,
} from './helpers/calendarFixtures';

const E2E_EVENT_TITLE = 'موعد E2E رادار';

async function fillRadarEventTitle(page: import('@playwright/test').Page, title: string) {
    const titleInput = page.getByTestId('radar-event-title');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(title);
    await expect(page.getByTestId('radar-event-save')).toBeEnabled({ timeout: 5_000 });
}

async function saveRadarEventForm(page: import('@playwright/test').Page) {
    const saveBtn = page.getByTestId('radar-event-save');
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await expect(page.getByTestId('radar-event-form')).toBeHidden({ timeout: 10_000 });
}

async function waitForCalendarEventPersisted(page: import('@playwright/test').Page, title: string) {
    await page.waitForFunction(
        (eventTitle) => {
            const raw = localStorage.getItem('hami:calendar:events:v1');
            return typeof raw === 'string' && raw.includes(eventTitle);
        },
        title,
        { timeout: 10_000 },
    );
}

async function openCalendarFromHome(page: import('@playwright/test').Page) {
    const trigger = page
        .getByTestId('home-dock-shell-dockCalendar')
        .or(page.getByTestId('home-dock-dockCalendar'))
        .or(page.getByRole('button', { name: 'التقويم' }));
    await trigger.first().scrollIntoViewIfNeeded();
    await trigger.first().click({ timeout: 15_000 });
    const radar = page.getByTestId('smart-legal-radar');
    await expect(radar).toBeVisible({ timeout: 12_000 });
    await expect(radar.getByTestId('radar-empty-state')).toBeVisible({ timeout: 12_000 });
    return radar;
}

test.describe('رادار المواعيد — التقويم', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareCalendarE2E(page);
        await seedLawyerFiles(page);
        await clearCalendarEvents(page);
    });

    async function bootHome(page: import('@playwright/test').Page) {
        await page.goto('/');
        await bootToLawyerHome(page);
        await dismissBlockingOverlays(page);
    }

    test('يفتح من كتلة التقويم في الرئيسية ويعرض الرادار', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText('رادار المواعيد')).toBeVisible();
        await expect(radar.getByTestId('radar-month-nav')).toBeVisible();
        await expect(radar.getByTestId('radar-empty-state')).toBeVisible();
    });

    test('التقويم الكامل يُظهر الشبكة ويُغلق', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        const toggle = radar.getByTestId('radar-toggle-full-month');

        await toggle.click();
        await expect(radar.getByTestId('radar-calendar-grid')).toBeVisible();
        await expect(toggle).toContainText('إغلاق التقويم');

        await toggle.click();
        await expect(radar.getByTestId('radar-calendar-grid')).toBeHidden();
        await expect(toggle).toContainText('التقويم الكامل');
    });

    test('إضافة موعد جديد يظهر في القائمة', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible();

        await fillRadarEventTitle(page, E2E_EVENT_TITLE);
        await saveRadarEventForm(page);

        await expect(radar.getByText(E2E_EVENT_TITLE)).toBeVisible({ timeout: 10_000 });
        await expect(radar.getByTestId('radar-empty-state')).toBeHidden();
    });

    test('Escape يغلق نموذج إضافة الموعد', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('radar-event-form')).toBeHidden({ timeout: 5_000 });
    });

    test('رجوع يعيد الرئيسية وإعادة الفتح تحافظ على الموعد', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible({ timeout: 10_000 });
        await fillRadarEventTitle(page, E2E_EVENT_TITLE);
        await saveRadarEventForm(page);
        await expect(radar.getByText(E2E_EVENT_TITLE)).toBeVisible({ timeout: 10_000 });
        await waitForCalendarEventPersisted(page, E2E_EVENT_TITLE);

        await radar.getByTestId('radar-back').click();
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 10_000 });

        const radar2 = await openCalendarFromHome(page);
        await expect(radar2.getByText(E2E_EVENT_TITLE)).toBeVisible({ timeout: 10_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await bootHome(page);

        await openCalendarFromHome(page);

        const perfMs = await readCalendarOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:calendar:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_CALENDAR_COLD_OPEN_MS);
    });

    test('الفتح مع cache محلي ضمن حد زمني', async ({ page }) => {
        await seedCalendarEvents(page, [buildE2eCalendarEvent({ title: 'موعد cache E2E' })]);

        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText('موعد cache E2E')).toBeVisible({ timeout: 10_000 });

        const perfMs = await readCalendarOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع cache محلي').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_CALENDAR_CACHED_OPEN_MS);
    });

    test('زر اليوم يبقي الرادار على تاريخ اليوم', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-toggle-full-month').click();
        await expect(radar.getByTestId('radar-calendar-grid')).toBeVisible();

        const today = new Date();
        const day = today.getDate();
        if (day > 1) {
            await radar.getByTestId(`radar-day-${day - 1}`).click();
        } else {
            await radar.getByTestId('radar-day-2').click();
        }

        await radar.getByTestId('radar-today').click();
        await expect(radar.getByTestId('radar-empty-state')).toBeVisible();
    });
});
