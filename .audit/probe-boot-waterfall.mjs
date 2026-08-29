/**
 * تشريح مسار الإقلاع: كل طلب شبكة حتى جاهزية اللوحة، مرتَّباً زمنياً،
 * مع عمق الشلّال (كم موجة تسلسلية) وأثقل الملفّات.
 *
 *   node .audit/probe-boot-waterfall.mjs [--throttle] [--url=...]
 */
import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const URL = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ?? 'http://127.0.0.1:4173/';
const THROTTLE = process.argv.includes('--throttle');

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

const reqs = [];
const t0 = Date.now();
page.on('response', (res) => {
    const u = res.url();
    if (!/\.(js|css)(\?|$)/.test(u)) return;
    reqs.push({ url: u.split('/').pop(), at: Date.now() - t0, status: res.status() });
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 120_000 });
const readyAt = Date.now() - t0;

/* أحجام حقيقية من dist */
const sizeOf = (name) => {
    const p = `dist/assets/${name}`;
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
};

const js = reqs.filter((r) => r.url.endsWith('.js'));
const css = reqs.filter((r) => r.url.endsWith('.css'));
const totalBytes = reqs.reduce((s, r) => s + sizeOf(r.url), 0);

console.log(`جاهزية اللوحة عند: ${readyAt} ms`);
console.log(`طلبات حتى الجاهزية: ${reqs.length}  (JS ${js.length} / CSS ${css.length})`);
console.log(`بايتات محمَّلة: ${(totalBytes / 1024).toFixed(0)} kB خام`);

/* موجات الشلّال: فجوة >120ms تعني جولة ذهاب-إياب جديدة */
const waves = [];
let wave = [];
let prev = -1;
for (const r of reqs.sort((a, b) => a.at - b.at)) {
    if (prev >= 0 && r.at - prev > 120) {
        waves.push(wave);
        wave = [];
    }
    wave.push(r);
    prev = r.at;
}
if (wave.length) waves.push(wave);

console.log(`\nموجات تسلسلية: ${waves.length}`);
for (const [i, w] of waves.entries()) {
    const bytes = w.reduce((s, r) => s + sizeOf(r.url), 0);
    console.log(
        `  موجة ${String(i + 1).padStart(2)}: ${String(w[0].at).padStart(6)}ms  ${String(w.length).padStart(3)} ملفّاً  ${(
            bytes / 1024
        )
            .toFixed(0)
            .padStart(5)} kB`,
    );
}

console.log('\n--- أثقل ١٥ ملفّاً على مسار الإقلاع ---');
const ranked = reqs.map((r) => ({ ...r, size: sizeOf(r.url) })).sort((a, b) => b.size - a.size);
for (const r of ranked.slice(0, 15)) {
    console.log(`  ${(r.size / 1024).toFixed(1).padStart(8)} kB  @${String(r.at).padStart(6)}ms  ${r.url}`);
}

console.log('\n--- آخر ١٢ ملفّاً وصلت (ذيل الشلّال) ---');
for (const r of reqs.slice(-12)) {
    console.log(`  @${String(r.at).padStart(6)}ms  ${(sizeOf(r.url) / 1024).toFixed(1).padStart(7)} kB  ${r.url}`);
}

await browser.close();
