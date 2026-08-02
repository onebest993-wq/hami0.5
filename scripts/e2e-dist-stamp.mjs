#!/usr/bin/env node
/**
 * تتبّع ما إذا كان dist الحالي مبنيّاً لبوابات E2E (وليس إنتاجاً).
 * يمنع تشغيل E2E على حزمة production بعد build:vercel بالخطأ.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const E2E_DIST_STAMP_PATH = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');
export const E2E_DIST_INDEX_PATH = path.join(ROOT, 'dist', 'index.html');

/** @returns {number | null} */
export function readDistIndexMtimeMs() {
    try {
        return fs.statSync(E2E_DIST_INDEX_PATH).mtimeMs;
    } catch {
        return null;
    }
}

export function invalidateE2eDistStamp() {
    try {
        fs.unlinkSync(E2E_DIST_STAMP_PATH);
    } catch {
        /* absent */
    }
}

/** @param {{ viteE2e: boolean; shellAuthOpen: boolean }} flags */
export function writeE2eDistStamp(flags) {
    const distMtimeMs = readDistIndexMtimeMs();
    fs.mkdirSync(path.dirname(E2E_DIST_STAMP_PATH), { recursive: true });
    fs.writeFileSync(
        E2E_DIST_STAMP_PATH,
        JSON.stringify({
            builtAt: new Date().toISOString(),
            viteE2e: flags.viteE2e,
            shellAuthOpen: flags.shellAuthOpen,
            distMtimeMs,
        }),
        'utf8',
    );
}

export function distNeedsE2eBuild() {
    if (!fs.existsSync(E2E_DIST_INDEX_PATH)) return true;
    if (process.env.E2E_FORCE_REBUILD === '1') return true;
    if (!fs.existsSync(E2E_DIST_STAMP_PATH)) return true;

    try {
        const stamp = JSON.parse(fs.readFileSync(E2E_DIST_STAMP_PATH, 'utf8'));
        if (stamp.shellAuthOpen !== true || stamp.viteE2e !== true) return true;
        const mtime = readDistIndexMtimeMs();
        if (mtime == null || stamp.distMtimeMs !== mtime) return true;
    } catch {
        return true;
    }
    return false;
}
