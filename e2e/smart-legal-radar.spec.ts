/**
 * E2E — رادار المواعيد (التقويم): سيناريوهات استخدام كمحامٍ من بلاطة الرئيسية.
 */
import { test, expect } from '@playwright/test';
import { seedLawyerFiles, E2E_CIVIL_FILE_ID } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import {
    clearCalendarEvents,
    seedCalendarEvents,
    buildE2eCalendarEvent,
    buildE2eBridgedLawsuitEvent,
    readCalendarOpenToInteractiveMs,
    E2E_CALENDAR_COLD_OPEN_MS,
    E2E_CALENDAR_CACHED_OPEN_MS,
    prepareCalendarE2E,
} from './helpers/calendarFixtures';

const E2E_EVENT_TITLE = 'موعد E2E رادار';
const SEEDED_TITLE = 'موعد cache E2E';
const SEEDED_EVENT_ID = 'e2e-radar-event-1';

async function fillRadarEventTitle(page: import('@playwright/test').Page, title: string) {
    const titleInput = page.getByTestId('radar-event-title');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(title);
    await expect(page.getByTestId('radar-event-save')).toBeEnabled({ timeout: 5_000 });
}

async function saveRadarEventForm(page: import('@playwright/test').Page) {
    const saveBtn = page.getByTestId('radar-event-save');
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId('radar-event-form')).toBeHidden({ timeout: 20_000 });
}

async function setRadarEventTime(page: import('@playwright/test').Page, time: string) {
    await page.getByTestId('radar-event-time').evaluate((el, value) => {
        const input = el as HTMLInputElement;
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        descriptor?.set?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, time);
}

async function waitForCalendarEventPersisted(page: import('@playwright/test').Page, title: string) {
    await page.waitForFunction(
        (eventTitle) => {
            const w = window as Window & {
                __hamiE2eSecureStore?: { getItemSync?: (key: string) => string | null };
            };
            const raw =
                w.__hamiE2eSecureStore?.getItemSync?.('hami:calendar:events:v1') ??
                localStorage.getItem('hami:calendar:events:v1');
            return typeof raw === 'string' && raw.includes(eventTitle);
        },
        title,
        { timeout: 10_000 },
    );
}

async function expectToastText(page: import('@playwright/test').Page, text: string) {
    await expect(page.getByTestId('smart-toast-item').filter({ hasText: text })).toBeVisible({
        timeout: 8_000,
    });
}

/** يفتح التقويم من بلاطة الرئيسية — يعيد المحاولة إن أُعيد تركيب البلاطة أثناء الإقلاع */
async function openCalendarFromHome(page: import('@playwright/test').Page) {
    const radar = page.getByTestId('smart-legal-radar');
    const loading = page.getByTestId('schedule-tab-loading');

    await expect(async () => {
        if (await radar.isVisible().catch(() => false)) return;
        if (await loading.isVisible().catch(() => false)) return;
        const tile = page.locator('[data-testid="home-dock-dockCalendar"]:visible');
        await expect(tile).toBeVisible({ timeout: 15_000 });
        await tile.click({ force: true, timeout: 12_000 });
        await expect(loading.or(radar)).toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 28_000 });

    await expect(radar).toBeVisible({ timeout: 15_000 });
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

    test('يفتح من عنوان التقويم في الرئيسية ويعرض راداراً فارغاً', async ({ page }) => {
        await bootHome(page);

        const tile = page.getByTestId('home-dock-dockCalendar');
        await expect(tile).toBeVisible({ timeout: 15_000 });
        await expect(tile.locator('p.hami-hub-title')).toHaveText('التقويم');
        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText('رادار المواعيد')).toBeVisible();
        await expect(radar.getByTestId('radar-month-nav')).toBeVisible();
        await expect(radar.getByTestId('radar-empty-state')).toBeVisible();
        await expect(radar.getByTestId('radar-add-event')).toBeVisible();
    });

    test('التقويم الكامل يُظهر الشبكة ويُغلق', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        const toggle = radar.getByTestId('radar-toggle-full-month');

        await expect(toggle).toHaveAttribute('aria-label', 'التقويم الكامل');
        await toggle.click();
        await expect(radar.getByTestId('radar-calendar-grid')).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(toggle).toHaveAttribute('aria-label', 'إغلاق التقويم');
        await expect(toggle).toHaveText('إغلاق');

        await toggle.click();
        await expect(radar.getByTestId('radar-calendar-grid')).toBeHidden();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toHaveText('الشهر');
    });

    test('محامٍ يضيف موعداً بعنوان ووقت وموقع فيظهر في اليوم', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible();
        await expect(page.getByTestId('radar-event-save')).toBeDisabled();

        await fillRadarEventTitle(page, E2E_EVENT_TITLE);
        await setRadarEventTime(page, '10:00');
        await page.getByTestId('radar-event-location').fill('محكمة البداءة');
        await page.getByTestId('radar-event-notes').fill('إحضار الوكالة');
        await expect(page.getByTestId('radar-event-reminder-toggle')).toBeEnabled();

        await saveRadarEventForm(page);

        await expect(radar.getByText(E2E_EVENT_TITLE)).toBeVisible({ timeout: 10_000 });
        await expect(radar.getByTestId('radar-empty-state')).toBeHidden();
        await expect(radar.getByTestId('radar-day-briefing')).toBeVisible();
        await waitForCalendarEventPersisted(page, E2E_EVENT_TITLE);
    });

    test('Escape يغلق نموذج إضافة الموعد', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('radar-event-form')).toBeHidden({ timeout: 5_000 });
        await expect(radar).toBeVisible();
    });

    test('نقر خلفية النموذج يلغي الإضافة دون حفظ', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await radar.getByTestId('radar-add-event').click();
        await fillRadarEventTitle(page, 'موعد لن يُحفظ');
        await page.getByTestId('radar-event-form-overlay').click({ position: { x: 8, y: 8 } });
        await expect(page.getByTestId('radar-event-form')).toBeHidden({ timeout: 5_000 });
        await expect(radar.getByText('موعد لن يُحفظ')).toHaveCount(0);
        await expect(radar.getByTestId('radar-empty-state')).toBeVisible();
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

    test('Escape من الرادار يعيد الرئيسية', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await page.keyboard.press('Escape');
        await expect(radar).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 10_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await bootHome(page);

        await openCalendarFromHome(page);
        await page.waitForFunction(() => {
            const open = performance.getEntriesByName('hami:calendar:open-request', 'mark')[0];
            const interactive = performance.getEntriesByName('hami:calendar:interactive', 'mark')[0];
            return Boolean(open && interactive);
        }, undefined, { timeout: 8_000 });

        const perfMs = await readCalendarOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:calendar:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_CALENDAR_COLD_OPEN_MS);
    });

    test('الفتح مع cache محلي ضمن حد زمني', async ({ page }) => {
        await seedCalendarEvents(page, [buildE2eCalendarEvent({ title: SEEDED_TITLE })]);

        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        await expect(radar.getByTestId('radar-empty-state')).toBeHidden();
        await page.waitForFunction(() => {
            const open = performance.getEntriesByName('hami:calendar:open-request', 'mark')[0];
            const interactive = performance.getEntriesByName('hami:calendar:interactive', 'mark')[0];
            return Boolean(open && interactive);
        }, undefined, { timeout: 8_000 });

        const perfMs = await readCalendarOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع cache محلي').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_CALENDAR_CACHED_OPEN_MS);
    });

    test('زر اليوم يعيد التركيز إلى تاريخ اليوم', async ({ page }) => {
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
        await expect(radar.getByTestId('radar-today')).toHaveCount(0);
    });

    test('التنقّل بين الأشهر ثم العودة للشهر الحالي', async ({ page }) => {
        await bootHome(page);

        const radar = await openCalendarFromHome(page);
        const monthLabel = radar.getByTestId('radar-month-label');
        const before = (await monthLabel.textContent())?.trim() ?? '';
        expect(before.length).toBeGreaterThan(0);

        await radar.getByTestId('radar-next-month').click();
        await expect(monthLabel).not.toHaveText(before);
        await radar.getByTestId('radar-prev-month').click();
        await expect(monthLabel).toHaveText(before);
    });

    test('محامٍ يعدّل عنوان موعد محفوظ', async ({ page }) => {
        const original = 'موعد للتعديل E2E';
        const updated = 'موعد بعد التعديل E2E';
        await seedCalendarEvents(page, [
            buildE2eCalendarEvent({ id: SEEDED_EVENT_ID, title: original }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText(original)).toBeVisible({ timeout: 10_000 });

        await radar.getByRole('button', { name: `تعديل الموعد ${original}` }).click();
        await expect(page.getByTestId('radar-event-form')).toBeVisible();
        await fillRadarEventTitle(page, updated);
        await saveRadarEventForm(page);

        await expect(radar.getByText(updated)).toBeVisible({ timeout: 10_000 });
        await expect(radar.getByText(original)).toHaveCount(0);
    });

    test('محامٍ يحذف موعداً من البطاقة فيعود اليوم فارغاً', async ({ page }) => {
        const title = 'موعد للحذف E2E';
        await seedCalendarEvents(page, [
            buildE2eCalendarEvent({ id: SEEDED_EVENT_ID, title }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText(title)).toBeVisible({ timeout: 10_000 });

        const deleteBtn = radar.getByTestId(`radar-event-card-delete-cal_${SEEDED_EVENT_ID}`);
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.evaluate((el) => (el as HTMLButtonElement).click());
        await expect(radar.getByTestId('radar-empty-state')).toBeVisible({ timeout: 10_000 });
        await expect(radar.getByTestId(`radar-event-card-cal_${SEEDED_EVENT_ID}`)).toHaveCount(0);
    });

    test('موعدان بموقعين مختلفين يظهران تنبيه تعارض', async ({ page }) => {
        await seedCalendarEvents(page, [
            buildE2eCalendarEvent({
                id: 'e2e-loc-karkh',
                title: 'موعد كرخ E2E',
                location: 'كرخ',
                time: '09:00',
            }),
            buildE2eCalendarEvent({
                id: 'e2e-loc-rusafa',
                title: 'موعد رصافة E2E',
                location: 'رصافة',
                time: '11:00',
            }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText('موعد كرخ E2E')).toBeVisible({ timeout: 10_000 });
        await expect(radar.getByText('موعد رصافة E2E')).toBeVisible();
        await expect(radar.getByTestId('schedule-conflict-alert')).toBeVisible();
        await expect(radar.getByTestId('schedule-conflict-alert')).toContainText('تعارض مواقع');
    });

    test('فتح مصدر دعوى مفقودة يعرض تنبيهاً دون مغادرة الرادار', async ({ page }) => {
        const title = 'جلسة — إضبارة مفقودة E2E';
        await seedCalendarEvents(page, [
            buildE2eBridgedLawsuitEvent('missing-file-999', { title }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await expect(radar.getByText('مرافعة مدنية E2E').or(radar.getByText(title))).toBeVisible({
            timeout: 10_000,
        });

        await radar.getByRole('button', { name: `فتح المصدر الأصلي للموعد ${title}` }).click();
        await expectToastText(page, 'الإضبارة غير متاحة');
        await expect(radar).toBeVisible();
    });

    test('حذف موعد مربوط بإضبارة يُرفض بتنبيه', async ({ page }) => {
        const title = 'جلسة — لا تُحذف من الرادار';
        await seedCalendarEvents(page, [
            buildE2eBridgedLawsuitEvent(String(E2E_CIVIL_FILE_ID), { title }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await radar.getByRole('button', { name: `حذف الموعد ${title}` }).click();
        await expectToastText(page, 'هذا الموعد مربوط بإضبارة');
        await expect(radar.getByTestId('radar-event-title-cal_e2e-bridged-lawsuit-1')).toBeVisible();
    });

    test('فتح المصدر لموعد دعوى موجود يخرج من التقويم إلى الإضبارة', async ({ page }) => {
        const title = 'جلسة — مرافعة مدنية E2E';
        await seedCalendarEvents(page, [
            buildE2eBridgedLawsuitEvent(String(E2E_CIVIL_FILE_ID), { title }),
        ]);

        await bootHome(page);
        const radar = await openCalendarFromHome(page);
        await radar.getByRole('button', { name: `فتح المصدر الأصلي للموعد ${title}` }).click();

        await expect(radar).toBeHidden({ timeout: 15_000 });
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 45_000 });
    });
});
