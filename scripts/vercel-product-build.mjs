/**
 * Vercel يقرأ vercel.json من الأرشيف ويتجاهل vercel-hq.json على آلة البناء.
 * مشروع المقر يضبط HAMI_HQ_ALLOW_THIS_DEPLOYMENT=true فيُبنى dist-hq ثم يُنسخ إلى dist.
 * مشروع المحامي لا يضبط العلم فيبقى بناء المحامي على dist.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {NodeJS.ProcessEnv} [env] */
export function isHeadquartersVercelBuild(env = process.env) {
    return env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT === 'true';
}

/** @param {string} script */
function runNpm(script) {
    const result = spawnSync('npm', ['run', script], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
        env: process.env,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

function publishHqToVercelDist() {
    const dist = path.join(ROOT, 'dist');
    const distHq = path.join(ROOT, 'dist-hq');
    if (!fs.existsSync(distHq)) {
        console.error('[vercel-product-build] dist-hq missing after HQ build');
        process.exit(1);
    }
    fs.rmSync(dist, { recursive: true, force: true });
    fs.cpSync(distHq, dist, { recursive: true });
    console.log('[vercel-product-build] copied dist-hq → dist for Vercel outputDirectory');
}

function main() {
    if (isHeadquartersVercelBuild()) {
        console.log('[vercel-product-build] HQ — npm run build:hq:vercel');
        runNpm('build:hq:vercel');
        publishHqToVercelDist();
        return;
    }
    console.log('[vercel-product-build] lawyer — npm run build:vercel');
    runNpm('build:vercel');
}

const invokedDirectly =
    Boolean(process.argv[1]) &&
    path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (invokedDirectly) main();
