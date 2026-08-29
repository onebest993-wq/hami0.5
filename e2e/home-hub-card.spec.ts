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
    clearHomeHubPanelSession,
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
    await expect(card).toHaveAttribute('data-hub-boot-settling', '0', { timeout: 12_000 });
    return card;
}

async function openPinsTab(card: import('@playwright/test').Locator) {
    await card.getByTestId('home-hub-tab-pins').click();
    await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
    await expect(card.getByTestId('home-hub-panel-pins')).toBeVisible({ timeout: 15_000 });
}

async function openHubMoreOverlay(
    page: import('@playwright/test').Page,
    trigger: import('@playwright/test').Locator,
    overlayTestId: string,
    loadingTestId: string,
) {
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    await expect(page.getByTestId(overlayTestId).or(page.getByTestId(loadingTestId))).toBeVisible({
        timeout: 15_000,
    });
    await expect(page.getByTestId(overlayTestId)).toBeVisible({ timeout: 15_000 });
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
        await clearHomeHubPanelSession(page);
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
        await expect(card.getByTestId('home-hub-tab-secretary')).toHaveCount(0);
        await expect(card.getByTestId('home-hub-tab-pins')).toBeVisible();
        await expect(card.getByTestId('home-hub-fully-empty')).toBeVisible({ timeout: 20_000 });
        await expect(card.getByTestId('home-hub-fully-empty')).toHaveText('لا يوجد تنبيه أو تثبيت');
        expect((await card.getByTestId('home-hub-fully-empty').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
            44,
        );

        await card.getByTestId('home-hub-tab-pins').click();
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
        await expect(card.getByTestId('home-hub-panel-pins')).toBeVisible();
        await expect(card.getByTestId('home-hub-pins-empty')).toBeVisible();
        await expect(card.getByTestId('home-hub-pins-empty')).toHaveText('لا يوجد تنبيه أو تثبيت');
        expect((await card.getByTestId('home-hub-pins-empty').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
            44,
        );
        await expect(card.getByText('لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.')).toHaveCount(0);
    });

    test('تُبدّل بين تبويبي التنبيهات والتثبيت', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await seedCalendarEvents(page, [buildE2eHubRadarCalendarEvent()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await openPinsTab(card);
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible({ timeout: 15_000 });

        await card.getByTestId('home-hub-tab-alerts').click();
        await expect(card.getByTestId('home-hub-panel-alerts')).toBeVisible();
        await expect(card.getByTestId('home-hub-alerts-feed')).toBeVisible();
        await expect(card.getByRole('tab', { name: /عاجل/ })).toHaveAttribute('aria-selected', 'true');
        await expect(card.getByRole('tab', { name: /قادم/ })).toBeVisible();

        await openPinsTab(card);
        await expect(card.getByText(E2E_PIN_TITLE)).toBeVisible();
    });

    test('تعرض العناصر المثبتة المزروعة', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await openPinsTab(card);
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
        await openHubMoreOverlay(page, more, 'home-hub-urgent-more-overlay', 'home-hub-urgent-more-loading');
        await expect(page.getByTestId('home-hub-radar-item-e2e-radar-event-3')).toBeVisible();
        await expect(page.getByTestId('home-hub-radar-item-e2e-radar-event-4')).toBeVisible();

        await page.getByTestId('home-hub-urgent-more-overlay-close').click();
        await expect(page.getByTestId('home-hub-urgent-more-overlay')).toHaveCount(0);

        await openHubMoreOverlay(page, more, 'home-hub-urgent-more-overlay', 'home-hub-urgent-more-loading');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('home-hub-urgent-more-overlay')).toHaveCount(0);
    });

    test('تخفي موعد الرادار من البطاقة عند التجاهل', async ({ page }) => {
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
        await card.getByTestId('home-hub-radar-dismiss-e2e-radar-event-1').click();
        await expect(card.getByTestId('home-hub-radar-item-e2e-radar-event-1')).toHaveCount(0, {
            timeout: 8_000,
        });
    });

    test('تلغي تثبيتاً من تبويب التثبيت', async ({ page }) => {
        await seedWorkspacePins(page, [buildE2eWorkspacePin()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await openPinsTab(card);
        await expect(card.getByTestId(`home-hub-pin-lawsuit-${E2E_HUB_PIN_ID}`)).toBeVisible({
            timeout: 15_000,
        });
        await card.getByRole('button', { name: /إلغاء تثبيت دعوى E2E مثبتة/ }).click();
        await expect(card.getByTestId(`home-hub-pin-lawsuit-${E2E_HUB_PIN_ID}`)).toHaveCount(0, {
            timeout: 8_000,
        });
    });

    test('تبويب قادم فارغ يعرض رسالة التصفية عند وجود عاجل فقط', async ({ page }) => {
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
        await card.getByRole('tab', { name: /قادم/ }).click();
        await expect(card.getByRole('tab', { name: /قادم/ })).toHaveAttribute('aria-selected', 'true');
        await expect(card.getByText('لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.')).toBeVisible();
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

    test('تفتح ستارة التثبيت وتغلقها بمفتاح الهروب', async ({ page }) => {
        await seedWorkspacePins(page, [
            buildE2eWorkspacePin(),
            buildE2eWorkspacePin({
                id: 'e2e-extra-pin-2',
                type: 'task',
                title: 'تثبيت E2E 2',
                clientName: 'عميل',
                caseNumber: '2/2026',
                routePath: 'workspace:task:e2e-extra-pin-2',
            }),
            buildE2eWorkspacePin({
                id: 'e2e-extra-pin-3',
                type: 'task',
                title: 'تثبيت E2E 3',
                clientName: 'عميل',
                caseNumber: '3/2026',
                routePath: 'workspace:task:e2e-extra-pin-3',
            }),
            buildE2eWorkspacePin({
                id: 'e2e-extra-pin-4',
                type: 'task',
                title: 'تثبيت E2E 4',
                clientName: 'عميل',
                caseNumber: '4/2026',
                routePath: 'workspace:task:e2e-extra-pin-4',
            }),
        ]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const card = await hubCard(page);
        await openPinsTab(card);
        const more = card.getByTestId('home-hub-pins-more-trigger');
        await expect(card.getByTestId('home-hub-pins-list')).toBeVisible({ timeout: 15_000 });
        await openHubMoreOverlay(page, more, 'home-hub-pins-more-overlay', 'home-hub-pins-more-loading');
        await expect(page.getByTestId('home-hub-pins-more-overlay-close')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('home-hub-pins-more-overlay')).toHaveCount(0, { timeout: 8_000 });
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
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Home');
        await expect(card.getByTestId('home-hub-tab-alerts')).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('End');
        await expect(card.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-selected', 'true');
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
