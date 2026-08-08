/**
 * E2E — بطاقة التنبيهات والتثبيت في الرئيسية: تبويبات، فراغ، رادار، تثبيت.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    buildE2eHubRadarCalendarEvent,
    buildE2eHubRadarCalendarEvents,
    buildE2eWorkspacePin,
    clearCalendarEvents,
    clearHomeHubPerfMarksInPage,
    clearWorkspacePins,
    E2E_HUB_PIN_ID,
    E2E_HOME_HUB_CACHED_OPEN_MS,
    E2E_HOME_HUB_COLD_OPEN_MS,
    hydrateCalendarEventsForE2E,
    readHomeHubOpenToInteractiveMs,
    seedCalendarEvents,
    seedWorkspacePins,
} from './helpers/homeHubFixtures';

const E2E_PIN_TITLE = 'دعوى E2E مثبتة';
const E2E_RADAR_TITLE = 'موعد E2E تجريبي';

async function hubCard(page: import('@playwright/test').Page) {
    const card = page.getByTestId('home-hub-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    return card;
}

async function openAlertsUrgentFeed(card: import('@playwright/test').Locator) {
    await card.getByTestId('home-hub-tab-alerts').click();
    await expect(card.getByRole('tab', { name: /عاجل/ })).toHaveAttribute('aria-selected', 'true');
}

async function expectRadarItemVisible(
    card: import('@playwright/test').Locator,
    eventId: string,
    timeout = 25_000,
) {
    await expect(card.getByTestId(`home-hub-radar-item-${eventId}`)).toBeVisible({ timeout });
}

test.describe('بطاقة التنبيهات والتثبيت', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearWorkspacePins(page);
        await clearCalendarEvents(page);
        await seedLawyerFiles(page);
    });

    test('تعرض الحالة الفارغة مع التبويبات عند عدم وجود تنبيهات أو تثبيت', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await expect(card.getByTestId('home-hub-tab-alerts')).toBeVisible();
        await expect(card.getByTestId('home-hub-tab-secretary')).toBeVisible();
        await expect(card.getByTestId('home-hub-tab-pins')).toBeVisible();
        await expect(card.getByTestId('home-hub-fully-empty')).toBeVisible({ timeout: 20_000 });
        await expect(card.getByText('لا يوجد تنبيه أو تثبيت')).toBeVisible();
    });

    test('تُبدّل بين تبويبي التنبيهات والتثبيت', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible({ timeout: 15_000 });

        await card.getByTestId('home-hub-tab-alerts').click();
        await expect(card.getByTestId('home-hub-panel-alerts')).toBeVisible();
        await expect(card.getByTestId('home-hub-alerts-feed')).toBeVisible();
        await expect(card.getByRole('tab', { name: /عاجل/ })).toHaveAttribute('aria-selected', 'true');
        await expect(card.getByRole('tab', { name: /قادم/ })).toBeVisible();

        await card.getByTestId('home-hub-tab-pins').click();
        await expect(card.getByTestId('home-hub-panel-pins')).toBeVisible();
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible();
    });

    test('تعرض العناصر المثبتة المزروعة', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible({ timeout: 20_000 });
        await expect(card.getByTestId(`home-hub-pin-lawsuit-${E2E_HUB_PIN_ID}`)).toBeVisible({ timeout: 5_000 });
    });

    test('تعرض تبويبي عاجل/قادم دائماً مع تذييل سبارك عند توفر مصادر المسح', async ({ page }) => {
        const radarEvent = buildE2eHubRadarCalendarEvent();
        await seedCalendarEvents(page, [radarEvent]);
        await page.goto('/');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hydrateCalendarEventsForE2E(page, [radarEvent]);

        const card = await hubCard(page);
        await openAlertsUrgentFeed(card);
        await expect(card.getByTestId('home-hub-alerts-feed')).toBeVisible();
        await expect(card.getByRole('tab', { name: /قادم/ })).toBeVisible();
    });

    test('تعرض مواعيد الرادار في تبويب عاجل', async ({ page }) => {
        const radarEvent = buildE2eHubRadarCalendarEvent();
        await seedCalendarEvents(page, [radarEvent]);
        await page.goto('/');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hydrateCalendarEventsForE2E(page, [radarEvent]);

        const card = await hubCard(page);
        await openAlertsUrgentFeed(card);
        await expectRadarItemVisible(card, 'e2e-radar-event-1');
        await expect(card.getByText(E2E_RADAR_TITLE)).toBeVisible();
    });

    test('يعرض بطاقتين فقط ويفتح البقية في حاوية منفصلة', async ({ page }) => {
        const radarEvents = buildE2eHubRadarCalendarEvents(4);
        await seedCalendarEvents(page, radarEvents);
        await page.goto('/');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hydrateCalendarEventsForE2E(page, radarEvents);

        const card = await hubCard(page);
        await openAlertsUrgentFeed(card);
        await expectRadarItemVisible(card, 'e2e-radar-event-1');
        await expectRadarItemVisible(card, 'e2e-radar-event-2');
        await expect(card.getByTestId('home-hub-radar-item-e2e-radar-event-3')).not.toBeVisible();

        const more = card.getByTestId('home-hub-urgent-more-trigger');
        await expect(more).toBeVisible();
        await expect(more).toContainText('البقية (2)');
        await more.click();

        await expect(page.getByTestId('home-hub-urgent-more-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByTestId('home-hub-radar-item-e2e-radar-event-3')).toBeVisible();
        await expect(page.getByTestId('home-hub-radar-item-e2e-radar-event-4')).toBeVisible();
    });

    test('تبدأ على التثبيت عند عدم وجود تنبيهات', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true', {
            timeout: 15_000,
        });
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible({ timeout: 15_000 });
    });

    test('أسهم لوحة المفاتيح تُبدّل التبويبات', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        const alertsTab = card.getByTestId('home-hub-tab-alerts');
        await alertsTab.focus();
        await page.keyboard.press('ArrowLeft');
        await expect(card.getByTestId('home-hub-tab-secretary')).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('ArrowLeft');
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Home');
        await expect(card.getByTestId('home-hub-tab-alerts')).toHaveAttribute('aria-selected', 'true');
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hubCard(page);

        const perfMs = await readHomeHubOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:home-hub:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_HOME_HUB_COLD_OPEN_MS);
    });

    test('الفتح المتكرر للرئيسية ضمن حد زمني مع cache', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hubCard(page);

        await clearHomeHubPerfMarksInPage(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await hubCard(page);

        const perfMs = await readHomeHubOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع إعادة تحميل').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_HOME_HUB_CACHED_OPEN_MS);
    });
});
