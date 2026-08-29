/**
 * تحقّق وظيفي من الأسطح التي حُوِّلت إلى تحميل كسول.
 *
 * التقسيم قد يُسرّع الإقلاع ويكسر الفتح. هذا الفحص يفتح كل سطحٍ فعلياً بمتصفّح حقيقي
 * ويقيس زمن ظهوره — إقلاعٌ سريع بإعداداتٍ لا تُفتح ليس مكسباً.
 *
 *   node .audit/probe-lazy-surfaces-open.mjs [--throttle]
 */
import { chromium, devices } from 'playwright';

const URL = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ?? 'http://127.0.0.1:4173/';
const THROTTLE = process.argv.includes('--throttle');

const SURFACES = [
    { name: 'الإعدادات', trigger: 'header-settings-trigger', ready: 'hami-settings-shell', close: 'Escape' },
    { name: 'البحث الشامل', trigger: 'header-search-trigger', ready: 'global-search-overlay', close: 'Escape' },
    { name: 'المنتدى', trigger: 'home-dock-forum', ready: 'forum-app-bar', close: 'Escape' },
    { name: 'المستودع', trigger: 'home-dock-dockRepository', ready: 'repository-unified-feed', close: 'Escape' },
    { name: 'مهام الميدان', trigger: 'home-dock-dockTasks', ready: 'field-tasks-sheet', close: 'Escape' },
    { name: 'المعاملات', trigger: 'hub-archive-transaction', ready: 'transactions-hub', close: 'Escape' },
    { name: 'الملفّ الشخصي', trigger: 'header-profile-trigger', ready: 'lawyer-dashboard-profile-surface', close: 'Escape' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();

if (THROTTLE) {
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.round((0.75 * 1024 * 1024) / 8),
        connectionType: 'cellular4g',
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(String(err?.message ?? err)));
page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
});

await page.addInitScript(() => {
    try {
        sessionStorage.setItem('hami:last-screen', 'lawyer');
        sessionStorage.setItem('hami:lawyer-dashboard-tab', 'home');
        localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
        localStorage.setItem(
            'lawyer_settings',
            JSON.stringify({
                version: 2,
                security: { biometricLock: false, autoLockMinutes: 0 },
                homeLayout: { dockVisible: true, quickNoteVisible: false },
            }),
        );
    } catch {
        /* ignore */
    }
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 120_000 });
console.log('اللوحة جاهزة. أفتح الأسطح واحداً واحداً:\n');

/* تسخين المداخل يبدأ بعد content-ready — نمنحه فرصته كما يحدث للمستخدم */
const SETTLE_MS = Number(process.argv.find((a) => a.startsWith('--settle='))?.split('=')[1] ?? 3_000);
await page.waitForTimeout(SETTLE_MS);

let failures = 0;
for (const s of SURFACES) {
    const trigger = page.getByTestId(s.trigger).first();
    const visible = await trigger.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!visible) {
        console.log(`  ⚠  ${s.name.padEnd(14)} — لا زرّ (${s.trigger}) على هذه الشاشة`);
        continue;
    }

    const t0 = Date.now();
    await trigger.click({ force: true, timeout: 10_000 }).catch(() => undefined);
    const ok = await page
        .getByTestId(s.ready)
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
    const ms = Date.now() - t0;

    if (ok) {
        console.log(`  ✓  ${s.name.padEnd(14)} فُتح في ${String(ms).padStart(5)} م.ث`);
    } else {
        failures += 1;
        console.log(`  ✘  ${s.name.padEnd(14)} لم يظهر (${s.ready}) خلال ٢٠ ثانية`);
    }

    await page.keyboard.press(s.close).catch(() => undefined);
    await page.waitForTimeout(700);
}

console.log(`\nأسطح فشلت: ${failures}`);
if (consoleErrors.length) {
    console.log(`\nأخطاء وقت التشغيل (${consoleErrors.length}):`);
    for (const e of [...new Set(consoleErrors)].slice(0, 8)) console.log(`  - ${e}`);
} else {
    console.log('لا أخطاء وقت تشغيل.');
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
