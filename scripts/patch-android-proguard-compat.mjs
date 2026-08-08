/**
 * AGP 8.4+ يرفض getDefaultProguardFile('proguard-android.txt').
 * عدة plugins Capacitor/Biometric ما زالت تستخدمه — نستبدله بـ optimize قبل Gradle sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = [
    path.join(ROOT, 'node_modules'),
    path.join(ROOT, 'android'),
];

const DEPRECATED = "getDefaultProguardFile('proguard-android.txt')";
const REPLACEMENT = "getDefaultProguardFile('proguard-android-optimize.txt')";

function walkBuildGradleFiles(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '.bin' || entry.name.startsWith('.')) continue;
            walkBuildGradleFiles(abs, out);
        } else if (entry.name === 'build.gradle') {
            out.push(abs);
        }
    }
    return out;
}

let patched = 0;
let already = 0;

for (const scanRoot of SCAN_ROOTS) {
    for (const file of walkBuildGradleFiles(scanRoot)) {
        const rel = path.relative(ROOT, file);
        if (
            scanRoot.endsWith('node_modules') &&
            !rel.includes(`${path.sep}android${path.sep}`) &&
            !rel.endsWith(`${path.sep}android${path.sep}build.gradle`) &&
            !rel.includes(`${path.sep}capacitor${path.sep}`)
        ) {
            continue;
        }

        const src = fs.readFileSync(file, 'utf8');
        if (!src.includes(DEPRECATED)) {
            if (src.includes(REPLACEMENT)) already += 1;
            continue;
        }

        const next = src.replaceAll(DEPRECATED, REPLACEMENT);
        fs.writeFileSync(file, next, 'utf8');
        patched += 1;
        console.log(`[patch-android-proguard] ${rel}`);
    }
}

if (patched === 0) {
    console.log(`[patch-android-proguard] OK — ${already} file(s) already compatible`);
} else {
    console.log(`[patch-android-proguard] patched ${patched} file(s)`);
}
