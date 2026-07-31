#!/usr/bin/env node
/**
 * يشغّل/يوقف vite preview لجلسة E2E — منفذ واحد لكل البوابة.
 */
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

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

export function freePreviewPort() {
    if (process.platform === 'win32') {
        spawnSync(
            'powershell',
            [
                '-NoProfile',
                '-Command',
                `Get-NetTCPConnection -LocalPort ${E2E_PREVIEW_PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
            ],
            { stdio: 'ignore' },
        );
        return;
    }
    spawnSync('sh', ['-c', `lsof -ti:${E2E_PREVIEW_PORT} | xargs kill -9 2>/dev/null || true`], {
        stdio: 'ignore',
    });
}

/** @returns {{ pid: number } | null} */
export async function startPreviewServer({ force = false } = {}) {
    if (force) freePreviewPort();
    if (await probePreview()) return null;

    const child = spawn('npm', ['run', 'preview', '--', '--port', E2E_PREVIEW_PORT, '--host', '127.0.0.1', '--strictPort'], {
        shell: true,
        stdio: 'ignore',
        detached: true,
        env: { ...process.env },
    });
    child.unref();

    for (let i = 0; i < 90; i++) {
        if (await probePreview()) return { pid: child.pid };
        await new Promise((r) => setTimeout(r, 1_000));
    }
    throw new Error(`preview did not become ready at ${BASE_URL}`);
}

export async function stopPreviewServer(started) {
    if (started?.pid) {
        try {
            process.kill(started.pid);
        } catch {
            /* ignore */
        }
    }
    freePreviewPort();
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
