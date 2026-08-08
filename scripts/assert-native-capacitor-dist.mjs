#!/usr/bin/env node
/**
 * يتحقق أن dist يضمّن جسر Capacitor الأصلي (وليس shims الويب).
 * Usage: node scripts/assert-native-capacitor-dist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');

function readJsBundle() {
    if (!fs.existsSync(ASSETS)) {
        throw new Error('dist/assets missing — run build first');
    }
    return fs
        .readdirSync(ASSETS)
        .filter((name) => name.endsWith('.js'))
        .map((name) => fs.readFileSync(path.join(ASSETS, name), 'utf8'))
        .join('\n');
}

function assertNativeCapacitorDist(bundle) {
    const errors = [];

    if (bundle.includes('capacitorWebShims/biometricStub')) {
        errors.push('biometric web stub detected in dist — set VITE_BUILD_NATIVE=true');
    }
    if (!bundle.includes('BiometricAuthNative')) {
        errors.push('BiometricAuthNative missing from dist — native biometric plugin not bundled');
    }
    if (!bundle.includes('registerPlugin')) {
        errors.push('Capacitor registerPlugin missing from dist');
    }

    return errors;
}

try {
    const bundle = readJsBundle();
    const errors = assertNativeCapacitorDist(bundle);
    if (errors.length) {
        console.error('[assert-native-capacitor-dist] BLOCKED');
        for (const err of errors) console.error(`  - ${err}`);
        process.exit(1);
    }
    console.log('[assert-native-capacitor-dist] OK — native Capacitor plugins in dist');
} catch (err) {
    console.error(`[assert-native-capacitor-dist] ${err instanceof Error ? err.message : err}`);
    process.exit(1);
}
