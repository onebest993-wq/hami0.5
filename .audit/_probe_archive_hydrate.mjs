import { chromium } from '@playwright/test';

const origin = process.env.HAMI_DEV_ORIGIN || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'ar-IQ', viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
const overlay = (await page.locator('body').innerText()).includes('plugin:vite:esbuild');

await page.getByTestId('hub-archive-lawsuit').click();
const workspace = page.locator('[data-testid="lawsuits-workspace"][data-open="true"]');
await workspace.waitFor({ state: 'visible', timeout: 25_000 });

async function snap(label) {
    return {
        label,
        loading: await workspace.getByTestId('lawsuit-archive-loading').isVisible().catch(() => false),
        empty: await workspace.getByTestId('lawsuit-archive-empty').isVisible().catch(() => false),
        grid: await workspace.getByTestId('lawsuit-archive-grid').isVisible().catch(() => false),
        slots: await workspace.getByTestId('lawsuit-archive-card-paint-slot').count(),
        hydratingAttr: await workspace.locator('[data-files-hydrating="1"]').count(),
        decrypt: await workspace.getByText('الإضابير محمية بالتشفير').isVisible().catch(() => false),
        noFiles: await workspace.getByText('لا توجد ملفات').isVisible().catch(() => false),
        quiet: await workspace.getByTestId('lawsuit-vault-quiet-status').isVisible().catch(() => false),
        bodyText: (await workspace.locator('[data-testid="lawsuits-civil-archive-instant-shell"]').innerText().catch(() => '')).slice(0, 180),
    };
}

const t0 = await snap('open');
await page.waitForTimeout(2_500);
const t1 = await snap('2.5s');
await page.screenshot({ path: '.audit/_probe_archive_hydrate.png', fullPage: false });
const tabCivil = await workspace.getByTestId('lawsuits-tab-civil').getAttribute('aria-selected');
const tabUrgent = await workspace.getByTestId('lawsuits-tab-urgent').getAttribute('aria-selected');
const shellCount = await workspace.locator('[data-testid="lawsuits-civil-archive-instant-shell"]').count();
await page.waitForTimeout(4_500);
const t2 = await snap('7s');

console.log(JSON.stringify({ overlay, pageErrors, tabCivil, tabUrgent, shellCount, t0, t1, t2 }, null, 2));
await browser.close();
