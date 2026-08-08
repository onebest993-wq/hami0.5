#!/usr/bin/env node
/**
 * يُولّد WebP لشعار المنتدى — يُشغَّل قبل build أو ضمن cap-sync عند الحاجة.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngPath = path.join(
    root,
    'src/app/components/lawyer/dashboard/commandHub/assets/forum-meridian-emblem.png',
);
const webpPath = pngPath.replace(/\.png$/i, '.webp');

async function main() {
    if (!fs.existsSync(pngPath)) {
        console.error('[optimize-forum-emblem] missing PNG:', pngPath);
        process.exit(1);
    }

    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.warn('[optimize-forum-emblem] sharp not installed — skip (npm i -D sharp)');
        process.exit(0);
    }

    const before = fs.statSync(pngPath).size;
    await sharp(pngPath).webp({ quality: 82, effort: 6 }).toFile(webpPath);
    const after = fs.statSync(webpPath).size;
    const saved = Math.max(0, before - after);
    console.log(
        `[optimize-forum-emblem] OK — ${path.basename(webpPath)} ${(after / 1024).toFixed(1)} KB (saved ${(saved / 1024).toFixed(1)} KB vs PNG)`,
    );
}

main().catch((err) => {
    console.error('[optimize-forum-emblem]', err);
    process.exit(1);
});
