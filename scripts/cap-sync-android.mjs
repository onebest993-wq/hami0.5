#!/usr/bin/env node
/**
 * مزامنة Android مع حزمة ويب صالحة للتجربة على الجهاز.
 * يحقن VITE_SUPABASE_* + VITE_SHELL_AUTH_OPEN + VITE_ENABLE_CLOUD_SYNC من info.ts/افتراضيات الجهاز.
 *
 * Usage: node scripts/cap-sync-android.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nativeViteBuildEnv } from './e2e-build-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, env = process.env) {
    const result = spawnSync(cmd, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
        env,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function mergeBuildEnv() {
    const injected = nativeViteBuildEnv();
    const merged = { ...process.env };
    for (const [key, value] of Object.entries(injected)) {
        const current = String(merged[key] ?? '').trim();
        if (!current) {
            merged[key] = value;
        }
    }
    if (!String(merged.VITE_BUILD_NATIVE ?? '').trim()) {
        merged.VITE_BUILD_NATIVE = 'true';
    }
    if (!String(merged.VITE_ENABLE_CLOUD_SYNC ?? '').trim()) {
        merged.VITE_ENABLE_CLOUD_SYNC = 'true';
    }
    if (!String(merged.VITE_ENABLE_SENTRY ?? '').trim()) {
        merged.VITE_ENABLE_SENTRY = 'false';
    }
    if (!String(merged.VITE_PDF_MINIMAL_ASSETS ?? '').trim()) {
        merged.VITE_PDF_MINIMAL_ASSETS = 'true';
    }
    return merged;
}

console.log('[cap-sync-android] prepare + build (Supabase env) + cap sync android …\n');

run('node', ['scripts/ensure-capacitor-cli-tar-compat.mjs']);
run('node', ['scripts/patch-android-proguard-compat.mjs']);
run('node', ['scripts/optimize-forum-emblem.mjs']);

const buildEnv = mergeBuildEnv();
if (!buildEnv.VITE_SUPABASE_URL || !buildEnv.VITE_SUPABASE_ANON_KEY) {
    console.error('[cap-sync-android] BLOCKED — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing after merge');
    process.exit(1);
}

console.log(
    `[cap-sync-android] build env: VITE_SUPABASE_URL=${String(buildEnv.VITE_SUPABASE_URL).slice(0, 32)}… shellOpen=${buildEnv.VITE_SHELL_AUTH_OPEN ?? 'true'} cloudSync=${buildEnv.VITE_ENABLE_CLOUD_SYNC ?? '0'} sentry=${buildEnv.VITE_ENABLE_SENTRY ?? '0'} pdfMinimal=${buildEnv.VITE_PDF_MINIMAL_ASSETS ?? '0'}\n`,
);

run('npm', ['run', 'build'], buildEnv);
run('node', ['scripts/assert-native-capacitor-dist.mjs']);

const distIndex = path.join(ROOT, 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
    console.error('[cap-sync-android] dist/index.html missing after build');
    process.exit(1);
}

const distHtml = fs.readFileSync(distIndex, 'utf8');
if (!distHtml.includes('data-hami-boot-guard-ms=')) {
    console.error('[cap-sync-android] BLOCKED — dist/index.html missing data-hami-boot-guard-ms (hamiBootScriptOrder plugin)');
    process.exit(1);
}
if (buildEnv.VITE_SHELL_AUTH_OPEN === 'true' && !distHtml.includes('data-hami-demo-boot="1"')) {
    console.error('[cap-sync-android] BLOCKED — trial build missing data-hami-demo-boot on dist/index.html');
    process.exit(1);
}

run('npx', ['cap', 'sync', 'android']);

if (fs.existsSync(path.join(ROOT, 'android', 'app', 'build.gradle'))) {
    run('node', ['scripts/apply-android-native-ready.mjs']);
}

run('node', ['scripts/patch-android-proguard-compat.mjs']);
run('node', ['scripts/patch-android-gradle-hygiene.mjs']);

console.log('\n[cap-sync-android] OK — Run from Android Studio or: npm run cap:install:android\n');
