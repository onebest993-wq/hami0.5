/**
 * تحقق حي: تطوير محلي بلا بوابة، بجلسة محامٍ معتمد، ثم مخزن الدعاوى.
 */
import { chromium } from '@playwright/test';

const ORIGIN = process.env.HAMI_DEV_ORIGIN || 'http://127.0.0.1:8080';
const DEV_UNLOCK_LAWYER_ID = 'hami-dev-unlock-lawyer-1';

const pageErrors = [];
const consoleErrors = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
    locale: 'ar-IQ',
    timezoneId: 'Asia/Baghdad',
    viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const result = {
    origin: ORIGIN,
    ok: false,
    mockUserId: null,
    dashboardReady: false,
    lawsuitsWorkspace: false,
    lawsuitsAddNew: false,
    authGate: false,
    pageErrors,
    consoleErrors: [],
};

try {
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const dashboard = page.getByTestId('lawyer-dashboard-ready').first();
    await dashboard.waitFor({ state: 'visible', timeout: 45_000 });
    result.dashboardReady = await dashboard.isVisible();
    result.authGate =
        (await page.getByTestId('lawyer-auth-choice').isVisible().catch(() => false)) ||
        (await page.getByTestId('lawyer-sign-in-gate').isVisible().catch(() => false));

    result.mockUserId = await page.evaluate(() => {
        try {
            const raw = localStorage.getItem('hami:dev-mock-user');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return typeof parsed?.id === 'string' ? parsed.id : null;
        } catch {
            return null;
        }
    });

    const lawsuitHub = page.getByTestId('hub-archive-lawsuit');
    await lawsuitHub.waitFor({ state: 'visible', timeout: 15_000 });
    await lawsuitHub.click();
    const workspace = page.locator('[data-testid="lawsuits-workspace"][data-open="true"]');
    await workspace.waitFor({ state: 'visible', timeout: 25_000 });
    result.lawsuitsWorkspace = await workspace.isVisible();
    const addNew = workspace.getByTestId('lawsuits-add-new');
    await addNew.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    result.lawsuitsAddNew = await addNew.isVisible().catch(() => false);

    result.consoleErrors = consoleErrors.filter(
        (t) =>
            !/ResizeObserver loop/i.test(t) &&
            !/Failed to load resource.*favicon/i.test(t) &&
            !/Download the React DevTools/i.test(t),
    );
    result.ok =
        result.dashboardReady &&
        !result.authGate &&
        result.mockUserId === DEV_UNLOCK_LAWYER_ID &&
        result.lawsuitsWorkspace &&
        result.lawsuitsAddNew &&
        result.pageErrors.length === 0;
} finally {
    await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
