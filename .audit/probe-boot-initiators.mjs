/**
 * مَن يطلب المقاطع الثقيلة أثناء الإقلاع؟
 * يلتقط `initiator` من CDP لكل طلب JS ويطبع سلسلة الاستدعاء.
 *
 *   node .audit/probe-boot-initiators.mjs [--match execution] [--throttle]
 */
import { chromium, devices } from 'playwright';

const URL = 'http://127.0.0.1:4173/';
const MATCH = process.argv.find((a) => a.startsWith('--match='))?.split('=')[1] ?? 'execution-handler';
const THROTTLE = process.argv.includes('--throttle');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const session = await context.newCDPSession(page);
await session.send('Network.enable');

if (THROTTLE) {
    await session.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.round((0.75 * 1024 * 1024) / 8),
        connectionType: 'cellular4g',
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

const hits = [];
session.on('Network.requestWillBeSent', (e) => {
    const url = e.request?.url ?? '';
    const name = url.split('/').pop() ?? '';
    if (!name.includes(MATCH)) return;
    hits.push({ name, initiator: e.initiator });
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

console.log(`طلبات مطابقة لـ "${MATCH}": ${hits.length}\n`);
for (const hit of hits.slice(0, 6)) {
    console.log(`--- ${hit.name}`);
    console.log(`    type: ${hit.initiator?.type}`);
    if (hit.initiator?.url) console.log(`    url:  ${hit.initiator.url}`);
    const frames = hit.initiator?.stack?.callFrames ?? [];
    for (const f of frames.slice(0, 6)) {
        const file = (f.url ?? '').split('/').pop();
        console.log(`      at ${f.functionName || '(anonymous)'}  ${file}:${f.lineNumber}`);
    }
    console.log('');
}

await browser.close();
