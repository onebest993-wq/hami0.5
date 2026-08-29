import { chromium } from 'playwright';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 2500)));
page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 1500));
});

await page.addInitScript(() => {
    try {
        localStorage.setItem('hami_e2e_boot', '1');
        localStorage.setItem('hami:last-screen', 'lawyer');
        sessionStorage.setItem('hami:settings-active-section', 'data');
        localStorage.removeItem('hami:boot-failure:last');
        const version = 'v1-2026-08-12';
        localStorage.setItem(
            'hami:legal:terms-accepted:v1',
            JSON.stringify({ version, acceptedAt: new Date().toISOString() }),
        );
        document.cookie = `hami_legal_terms_accepted=${encodeURIComponent(version)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
        /* ignore */
    }
});

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.getByTestId('lawyer-auth-enter-guest').waitFor({ state: 'visible', timeout: 20_000 });
await page.getByTestId('lawyer-auth-enter-guest').click({ force: true });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
await page.getByTestId('header-settings-trigger').click({ force: true });
await page
    .locator('[data-testid="hami-settings-shell"][data-settings-hydrated="true"]')
    .waitFor({ state: 'visible', timeout: 45_000 });
await page.getByTestId('settings-nav-data').dispatchEvent('click');
await page.waitForTimeout(3000);

const bootFail = await page.locator('#hami-boot-failure').count();
const bootText = bootFail ? await page.locator('#hami-boot-failure').innerText().catch(() => '') : '';
const dataSection = await page.locator('[data-testid="settings-section-data"]').count();
const syncToggle = await page.locator('[data-testid="settings-toggle-data-cloudSync"]').count();
const depthErr = [...pageErrors, ...consoleErrors, bootText].some((t) =>
    /Maximum update depth/i.test(String(t)),
);

console.log(
    JSON.stringify(
        {
            bootFail,
            depthErr,
            dataSection,
            syncToggle,
            pageErrors: pageErrors.slice(0, 4),
            consoleErrors: consoleErrors.slice(0, 6),
            bootText: String(bootText).slice(0, 400),
        },
        null,
        2,
    ),
);

await browser.close();
process.exit(depthErr || bootFail || dataSection < 1 || syncToggle < 1 ? 1 : 0);
