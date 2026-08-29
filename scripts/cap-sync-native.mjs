#!/usr/bin/env node
/**
 * مزامنة Capacitor مع بناء ويب أصلي (VITE_BUILD_NATIVE=true).
 * Usage: node scripts/cap-sync-native.mjs [android|ios]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nativeViteBuildEnv } from './e2e-build-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = String(process.argv[2] ?? '').trim().toLowerCase();

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
    // وجود DSN يعني أن الإبلاغ مقصود — لا يُطفأ قسراً على الأصلي (انظر cap-sync-android.mjs)
    if (!String(merged.VITE_SENTRY_DSN ?? '').trim() && !String(merged.VITE_ENABLE_SENTRY ?? '').trim()) {
        merged.VITE_ENABLE_SENTRY = 'false';
    }
    if (!String(merged.VITE_PDF_MINIMAL_ASSETS ?? '').trim()) {
        merged.VITE_PDF_MINIMAL_ASSETS = 'true';
    }
    return merged;
}

console.log('[cap-sync-native] prepare + native web build + cap sync …\n');

run('npm', ['run', 'cap:prepare']);

const buildEnv = mergeBuildEnv();
if (!buildEnv.VITE_SUPABASE_URL || !buildEnv.VITE_SUPABASE_ANON_KEY) {
    console.error('[cap-sync-native] BLOCKED — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing');
    process.exit(1);
}

console.log(`[cap-sync-native] VITE_BUILD_NATIVE=${buildEnv.VITE_BUILD_NATIVE}\n`);

run('npm', ['run', 'build'], buildEnv);
run('node', ['scripts/assert-native-capacitor-dist.mjs']);
run('node', ['scripts/guard-dist-no-hq-runtime.mjs']);

const distIndex = path.join(ROOT, 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
    console.error('[cap-sync-native] dist/index.html missing after build');
    process.exit(1);
}

if (target === 'ios') {
    run('npx', ['cap', 'sync', 'ios']);
    if (fs.existsSync(path.join(ROOT, 'ios', 'App', 'App', 'Info.plist'))) {
        run('node', ['scripts/apply-ios-native-ready.mjs']);
    }
} else if (target === 'android') {
    run('npx', ['cap', 'sync', 'android']);
    if (fs.existsSync(path.join(ROOT, 'android', 'app', 'build.gradle'))) {
        run('node', ['scripts/apply-android-native-ready.mjs']);
    }
    run('node', ['scripts/patch-android-proguard-compat.mjs']);
    run('node', ['scripts/patch-android-gradle-hygiene.mjs']);
    run('node', ['scripts/patch-android-app-version.mjs']);
} else {
    run('npx', ['cap', 'sync']);
    if (fs.existsSync(path.join(ROOT, 'ios', 'App', 'App', 'Info.plist'))) {
        run('node', ['scripts/apply-ios-native-ready.mjs']);
    }
}

console.log('\n[cap-sync-native] OK — reinstall the app on device (npm run cap:install:android)\n');
