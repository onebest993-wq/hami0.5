#!/usr/bin/env node
/**
 * AGP 9 + built-in Kotlin: يزيل kotlin-android من ملحقات Capacitor
 * (filesystem / geolocation) حتى لا يعود ClassCastException ولا تحذيرات Variants.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
    'node_modules/@capacitor/filesystem/android/build.gradle',
    'node_modules/@capacitor/geolocation/android/build.gradle',
];

function patchPluginBuildGradle(abs) {
    if (!fs.existsSync(abs)) return false;
    let src = fs.readFileSync(abs, 'utf8');
    const before = src;

    src = src.replace(/\r\n/g, '\n');
    src = src.replace(/^apply plugin:\s*['"]kotlin-android['"]\s*\n/m, '');
    src = src.replace(/^apply plugin:\s*['"]org\.jetbrains\.kotlin\.android['"]\s*\n/m, '');
    src = src.replace(
        /^\s*classpath\s+"org\.jetbrains\.kotlin:kotlin-gradle-plugin:\$kotlin_version"\s*\n/m,
        '',
    );
    src = src.replace(
        /^\s*classpath\s+'org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^']+'\s*\n/m,
        '',
    );

    if (src === before) return false;
    fs.writeFileSync(abs, src.endsWith('\n') ? src : `${src}\n`, 'utf8');
    return true;
}

let changed = 0;
for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (patchPluginBuildGradle(abs)) {
        console.log(`[patch-capacitor-agp9-kotlin] ${rel}`);
        changed += 1;
    }
}

if (changed === 0) {
    console.log('[patch-capacitor-agp9-kotlin] OK — plugins already AGP9-ready');
} else {
    console.log(`[patch-capacitor-agp9-kotlin] OK — ${changed} plugin build.gradle patched`);
}
