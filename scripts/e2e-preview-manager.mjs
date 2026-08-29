#!/usr/bin/env node
/**
 * يشغّل/يوقف vite preview لجلسة E2E — منفذ واحد لكل البوابة.
 */
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { e2eMarkersInHtml } from './e2e-build-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const E2E_PREVIEW_PORT = process.env.E2E_PREVIEW_PORT ?? '8090';
const BASE_URL = `http://127.0.0.1:${E2E_PREVIEW_PORT}`;

function probePreview() {
    return new Promise((resolve) => {
        const req = http.get(BASE_URL, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2_500, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function fetchPreviewHtml() {
    return new Promise((resolve, reject) => {
        const req = http.get(BASE_URL, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', reject);
        req.setTimeout(5_000, () => {
            req.destroy();
            reject(new Error('preview html fetch timeout'));
        });
    });
}

/**
 * يتأكد أن preview يخدم حزمة build:e2e وليس dev/قديم.
 * الفحص على HTML المخدوم لا على الطابع: خادم معاينة عالق من جلسة سابقة قد يخدم
 * حزمة إنتاج بينما الطابع على القرص يدّعي E2E — فتظهر بوابة الدخول بلا تفسير.
 */
export async function verifyPreviewE2eReady() {
    const html = await fetchPreviewHtml();
    const markers = e2eMarkersInHtml(html);
    if (!markers.bootGuard) {
        throw new Error(
            'preview missing data-hami-boot-guard-ms — run npm run build:e2e before E2E',
        );
    }
    if (!markers.demoBoot) {
        throw new Error(
            `preview at ${BASE_URL} serves a non-E2E bundle (no data-hami-demo-boot) — ` +
                'run npm run build:e2e, and free the port from any stale vite preview',
        );
    }
}

export function freePreviewPort() {
    if (process.platform === 'win32') {
        spawnSync(
            'powershell',
            [
                '-NoProfile',
                '-Command',
                `$port = ${E2E_PREVIEW_PORT}
$pids = New-Object System.Collections.Generic.HashSet[int]
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess) { [void]$pids.Add([int]$_.OwningProcess) }
}
netstat -ano | ForEach-Object {
    if ($_ -match ":$port\\s+.+LISTENING\\s+(\\d+)\\s*$") {
        [void]$pids.Add([int]$Matches[1])
    }
}
foreach ($procId in $pids) {
    if ($procId -gt 4) {
        Start-Process -FilePath 'taskkill.exe' -ArgumentList "/F","/T","/PID","$procId" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
    }
}`,
            ],
            { stdio: 'ignore' },
        );
        return;
    }
    spawnSync('sh', ['-c', `lsof -ti:${E2E_PREVIEW_PORT} | xargs kill -9 2>/dev/null || true`], {
        stdio: 'ignore',
    });
}

async function waitForPortFree(maxAttempts = 15) {
    for (let i = 0; i < maxAttempts; i += 1) {
        if (!(await probePreview())) return;
        freePreviewPort();
        await new Promise((r) => setTimeout(r, 400));
    }
    if (await probePreview()) {
        throw new Error(`preview port ${E2E_PREVIEW_PORT} still in use after force free`);
    }
}

let managedChild = null;

/** @returns {{ pid: number, reused?: boolean } | null} — null فقط عند force:false وخادم جاهز */
export async function startPreviewServer({ force = false, keepAttached = false } = {}) {
    if (force) {
        await waitForPortFree();
    } else if (await probePreview()) {
        await verifyPreviewE2eReady().catch(() => {
            throw new Error(
                `preview on ${E2E_PREVIEW_PORT} is up but not an E2E build — stop it or use force`,
            );
        });
        return null;
    }

    const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const child = spawn(
        process.execPath,
        [viteBin, 'preview', '--port', E2E_PREVIEW_PORT, '--host', '127.0.0.1', '--strictPort'],
        {
            cwd: ROOT,
            shell: false,
            stdio: 'ignore',
            detached: !keepAttached,
            windowsHide: true,
            env: { ...process.env, E2E_PREVIEW_RELAXED_SECURITY: '1' },
        },
    );
    if (keepAttached) {
        managedChild = child;
    } else {
        child.unref();
    }

    for (let i = 0; i < 90; i += 1) {
        if (await probePreview()) {
            await verifyPreviewE2eReady();
            return { pid: child.pid ?? 0 };
        }
        await new Promise((r) => setTimeout(r, 1_000));
    }
    throw new Error(`preview did not become ready at ${BASE_URL}`);
}

export async function stopPreviewServer(started) {
    if (managedChild) {
        try {
            managedChild.kill();
        } catch {
            /* ignore */
        }
        managedChild = null;
    } else if (started?.pid) {
        try {
            process.kill(started.pid);
        } catch {
            /* ignore */
        }
    }
    freePreviewPort();
}

if (process.argv[1]?.endsWith('e2e-preview-manager.mjs') && process.argv[2] === 'free') {
    freePreviewPort();
    process.exit(0);
}

if (process.argv[1]?.endsWith('e2e-preview-manager.mjs') && process.argv[2] === 'start') {
    const force = process.argv.includes('--force');
    startPreviewServer({ force })
        .then(() => {
            console.log(`preview ready: ${BASE_URL}`);
            process.exit(0);
        })
        .catch((err) => {
            console.error(err.message);
            process.exit(1);
        });
}
