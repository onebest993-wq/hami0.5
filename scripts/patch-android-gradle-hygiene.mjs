/**
 * AGP 9.x: يزيل أعلام gradle.properties المهملة، يفعّل excludeLibraryComponentsFromConstraints،
 * ويزيل flatDir الفارغ (تحذير Gradle) من app و cordova-plugins.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');
const GRADLE_TEMPLATE = path.join(ROOT, 'scripts/native-ready/android/gradle.properties');

const CLEAN_GRADLE_PROPS = `# Project-wide Gradle settings.

org.gradle.jvmargs=-Xmx2048m

android.useAndroidX=true
android.uniquePackageNames=false
android.dependency.useConstraints=true
android.dependency.excludeLibraryComponentsFromConstraints=true
android.r8.strictFullModeForKeepRules=false
`;

function patchGradleProperties() {
    if (!fs.existsSync(GRADLE_PROPS)) return false;

    const template = fs.existsSync(GRADLE_TEMPLATE)
        ? fs.readFileSync(GRADLE_TEMPLATE, 'utf8').trimEnd()
        : CLEAN_GRADLE_PROPS.trimEnd();
    const next = `${template}\n`;

    const src = fs.readFileSync(GRADLE_PROPS, 'utf8');
    if (src === next) return false;
    fs.writeFileSync(GRADLE_PROPS, next, 'utf8');
    console.log('[patch-android-gradle-hygiene] gradle.properties');
    return true;
}

function stripFlatDirBlock(src) {
    return src.replace(/\n\s*flatDir\s*\{[^}]*\}/g, '');
}

function patchBuildGradle(relPath) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return false;

    let src = fs.readFileSync(abs, 'utf8');
    let next = stripFlatDirBlock(src);

    next = next.replace(/\nrepositories \{\s*\}\s*/g, '\n');

    if (next === src) return false;
    fs.writeFileSync(abs, next, 'utf8');
    console.log(`[patch-android-gradle-hygiene] ${relPath}`);
    return true;
}

let changed = 0;
if (patchGradleProperties()) changed += 1;
if (patchBuildGradle('android/app/build.gradle')) changed += 1;
if (patchBuildGradle('android/capacitor-cordova-android-plugins/build.gradle')) changed += 1;

if (changed === 0) {
    console.log('[patch-android-gradle-hygiene] OK — already compatible');
} else {
    console.log(`[patch-android-gradle-hygiene] OK — ${changed} file(s) patched`);
}
