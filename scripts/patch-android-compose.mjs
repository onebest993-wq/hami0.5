#!/usr/bin/env node
/**
 * يضيف Compose + Kotlin المدمج (AGP 9) إلى مشروع Android — idempotent.
 * يُستدعى من cap:apply:android و cap:sync:android.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_BUILD = path.join(ROOT, 'android', 'app', 'build.gradle');
const VARIABLES = path.join(ROOT, 'android', 'variables.gradle');
const SETTINGS = path.join(ROOT, 'android', 'settings.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

const PLUGIN_MGMT = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    plugins {
        id 'com.android.application' version '9.3.1'
        id 'org.jetbrains.kotlin.plugin.compose' version '2.3.0'
    }
}

`;

const COMPOSE_DEPS = `
    implementation platform('androidx.compose:compose-bom:2025.01.01')
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.material3:material3'
    implementation 'androidx.compose.ui:ui-tooling-preview'
    implementation 'androidx.activity:activity-compose:1.11.0'
    implementation 'androidx.compose.animation:animation'
    implementation 'androidx.compose.foundation:foundation'
    implementation "androidx.core:core-ktx:$androidxCoreVersion"
`;

function ensureGradleProp(src, key, value) {
    const line = `${key}=${value}`;
    if (src.includes(`${key}=`)) {
        return src.replace(new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm'), line);
    }
    return `${src.trimEnd()}\n${line}\n`;
}

function stripLegacyOptOuts(src) {
    let next = src;
    for (const key of ['android.newDsl', 'android.builtInKotlin', 'android.builtinKotlin']) {
        next = next.replace(new RegExp(`^${key.replace(/\./g, '\\.')}=.*\\n?`, 'gm'), '');
    }
    return next.replace(/\n{3,}/g, '\n\n');
}

function patchSettingsGradle() {
    if (!fs.existsSync(SETTINGS)) return false;
    let src = fs.readFileSync(SETTINGS, 'utf8');
    let changed = false;

    if (!src.includes('pluginManagement')) {
        src = PLUGIN_MGMT + src;
        changed = true;
    } else if (!src.includes('org.jetbrains.kotlin.plugin.compose')) {
        if (src.includes("id 'com.android.application' version '9.3.1'")) {
            src = src.replace(
                /plugins \{\s*\n\s*id 'com\.android\.application' version '9\.3\.1'\s*\n(?:\s*id 'org\.jetbrains\.kotlin\.android' version '[^']+'\s*\n)?(?:\s*id 'org\.jetbrains\.kotlin\.plugin\.compose' version '[^']+'\s*\n)?\s*\}/,
                `plugins {
        id 'com.android.application' version '9.3.1'
        id 'org.jetbrains.kotlin.plugin.compose' version '2.3.0'
    }`,
            );
            changed = true;
        }
    }

    if (src.includes("id 'org.jetbrains.kotlin.android'")) {
        src = src.replace(/\s*id 'org\.jetbrains\.kotlin\.android' version '[^']+'\s*\n/g, '\n');
        changed = true;
    }

    if (!changed) return false;
    fs.writeFileSync(SETTINGS, src, 'utf8');
    console.log('[patch-android-compose] android/settings.gradle');
    return true;
}

function patchGradleProperties() {
    if (!fs.existsSync(GRADLE_PROPS)) return false;
    let src = fs.readFileSync(GRADLE_PROPS, 'utf8');
    let next = stripLegacyOptOuts(src);

    if (!next.includes('kotlin.compiler.execution.strategy')) {
        next += `\n# يتجنّب فشل Kotlin compile daemon على ويندوز\nkotlin.compiler.execution.strategy=in-process\nkotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8\n`;
    }

    next = ensureGradleProp(next, 'android.dependency.useConstraints', 'false');

    if (next.includes('android.dependency.excludeLibraryComponentsFromConstraints')) {
        next = next.replace(/^android\.dependency\.excludeLibraryComponentsFromConstraints=.*\n?/m, '');
    }

    if (next === src) return false;
    fs.writeFileSync(GRADLE_PROPS, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    console.log('[patch-android-compose] android/gradle.properties');
    return true;
}

function patchVariables() {
    if (!fs.existsSync(VARIABLES)) return false;
    let src = fs.readFileSync(VARIABLES, 'utf8');
    if (src.includes('kotlinVersion')) return false;
    const next = src.replace(
        'ext {',
        `ext {
    kotlinVersion = '2.3.0'
    composeBomVersion = '2025.01.01'`,
    );
    fs.writeFileSync(VARIABLES, next, 'utf8');
    console.log('[patch-android-compose] variables.gradle');
    return true;
}

function patchAppResValues() {
    if (!fs.existsSync(APP_BUILD)) return false;
    let src = fs.readFileSync(APP_BUILD, 'utf8');
    if (!src.includes('compose true') || src.includes('resValues true')) return false;
    const next = src.replace(
        /buildFeatures \{\s*\n\s*compose true\s*\n\s*\}/,
        'buildFeatures {\n        compose = true\n        resValues = true\n    }',
    );
    if (next === src) return false;
    fs.writeFileSync(APP_BUILD, next, 'utf8');
    console.log('[patch-android-compose] android/app/build.gradle (resValues)');
    return true;
}

function migrateAppToBuiltinKotlin(src) {
    let next = src;

    if (next.includes("apply plugin: 'com.android.application'")) {
        next = next.replace(
            "apply plugin: 'com.android.application'\n",
            `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.plugin.compose'
}

`,
        );
    }

    next = next.replace(/\s*id 'org\.jetbrains\.kotlin\.android'\s*\n/g, '\n');

    if (!next.includes("id 'org.jetbrains.kotlin.plugin.compose'")) {
        next = next.replace(
            /plugins \{\s*\n\s*id 'com\.android\.application'\s*\n/,
            `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.plugin.compose'
`,
        );
    }

    next = next.replace(/\n\s*kotlinOptions \{\s*\n\s*jvmTarget = '21'\s*\n\s*\}\s*/g, '\n');

    if (!next.includes('jvmToolchain(21)') && !next.includes('compileOptions {')) {
        /* fall through — buildFeatures path below */
    }

    if (!next.includes('compileOptions {') && next.includes('buildFeatures {')) {
        next = next.replace(
            /buildFeatures \{[\s\S]*?\n    \}/,
            (block) =>
                `${block}\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_21\n        targetCompatibility = JavaVersion.VERSION_21\n    }`,
        );
    }

    if (!next.includes('jvmToolchain(21)')) {
        if (next.includes('\ndependencies {')) {
            next = next.replace(
                '\ndependencies {',
                `\nkotlin {\n    jvmToolchain(21)\n}\n\ndependencies {`,
            );
        } else {
            next += `\nkotlin {\n    jvmToolchain(21)\n}\n`;
        }
    }

    return next;
}

function patchAppBuildGradle() {
    if (!fs.existsSync(APP_BUILD)) return false;
    let src = fs.readFileSync(APP_BUILD, 'utf8');
    let next = migrateAppToBuiltinKotlin(src);

    const hasCompose =
        /\bcompose\s*=\s*true\b/.test(next) || /\bcompose\s+true\b/.test(next);
    if (!hasCompose) {
        const buildTypesIdx = next.indexOf('    buildTypes {');
        if (buildTypesIdx !== -1) {
            const androidCloseIdx = next.indexOf('\n}', buildTypesIdx);
            if (androidCloseIdx !== -1) {
                next =
                    next.slice(0, androidCloseIdx) +
                    '\n    buildFeatures {\n        compose = true\n        resValues = true\n    }\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_21\n        targetCompatibility = JavaVersion.VERSION_21\n    }' +
                    next.slice(androidCloseIdx);
            }
        }
    }

    /* إزالة تكرار buildFeatures/compileOptions الناتج عن تشغيل سابق خاطئ */
    next = next.replace(
        /(\n    buildFeatures \{\s*\n\s*compose = true\s*\n\s*resValues = true\s*\n    \}\s*\n    compileOptions \{\s*\n\s*sourceCompatibility = JavaVersion\.VERSION_21\s*\n\s*targetCompatibility = JavaVersion\.VERSION_21\s*\n    \}){2,}/g,
        '\n    buildFeatures {\n        compose = true\n        resValues = true\n    }\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_21\n        targetCompatibility = JavaVersion.VERSION_21\n    }',
    );

    const depNeedle = "    implementation project(':capacitor-cordova-android-plugins')";
    if (next.includes(depNeedle) && !next.includes('compose-bom')) {
        next = next.replace(depNeedle, `${depNeedle}\n${COMPOSE_DEPS}`);
    }

    if (next === src) return false;
    fs.writeFileSync(APP_BUILD, next, 'utf8');
    console.log('[patch-android-compose] android/app/build.gradle');
    return true;
}

let changed = 0;
if (patchSettingsGradle()) changed += 1;
if (patchGradleProperties()) changed += 1;
if (patchVariables()) changed += 1;
if (patchAppBuildGradle()) changed += 1;
if (patchAppResValues()) changed += 1;

if (changed === 0) {
    console.log('[patch-android-compose] OK — already patched');
} else {
    console.log(`[patch-android-compose] OK — ${changed} file(s) patched`);
}
