/**
 * AGP 9.3.1: يزيل flatDir، يوحّد إصدار AGP، ويضمن gradle.properties بلا أعلام توافق مهملة.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_AGP = '9.3.1';
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');
const GRADLE_TEMPLATE = path.join(ROOT, 'scripts/native-ready/android/gradle.properties');
const ROOT_BUILD_GRADLE = path.join(ROOT, 'android', 'build.gradle');
const ROOT_BUILD_TEMPLATE = path.join(ROOT, 'scripts/native-ready/android/build.gradle');
const SETTINGS_GRADLE = path.join(ROOT, 'android', 'settings.gradle');
const SETTINGS_TEMPLATE = path.join(ROOT, 'scripts/native-ready/android/settings.gradle');

const CLEAN_GRADLE_PROPS = `# Project-wide Gradle settings — AGP 9.3.1 + Gradle 9.5 + Kotlin 2.3 (built-in)

org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8
org.gradle.java.installations.auto-download=true
org.gradle.parallel=true
org.gradle.caching=true

# يتجنّب فشل Kotlin compile daemon على ويندوز ومسارات فيها مسافات
kotlin.compiler.execution.strategy=in-process
kotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8

android.useAndroidX=true
android.uniquePackageNames=false
android.dependency.useConstraints=false
android.r8.strictFullModeForKeepRules=false
`;

/** أعلام مهملة / opt-out — تُزال دائماً (AGP 9 built-in Kotlin + new DSL) */
const DEPRECATED_GRADLE_PROP_KEYS = [
    'android.dependency.excludeLibraryComponentsFromConstraints',
    'android.defaults.buildfeatures.resvalues',
    'android.sdk.defaultTargetSdkToCompileSdkIfUnset',
    'android.enableAppCompileTimeRClass',
    'android.usesSdkInManifest.disallowed',
    'android.r8.optimizedResourceShrinking',
    'android.newDsl',
    'android.builtInKotlin',
    'android.builtinKotlin',
];

function stripDeprecatedGradleProps(src) {
    let next = src;
    for (const key of DEPRECATED_GRADLE_PROP_KEYS) {
        next = next.replace(new RegExp(`^${key.replace(/\./g, '\\.')}=.*\\n?`, 'gm'), '');
    }
    return next.replace(/\n{3,}/g, '\n\n');
}

function ensureGradleProp(src, key, value) {
    const line = `${key}=${value}`;
    if (src.includes(`${key}=`)) {
        return src.replace(new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm'), line);
    }
    return `${src.trimEnd()}\n${line}\n`;
}

function ensureKotlinCompileCompat(src) {
    let next = stripDeprecatedGradleProps(src);
    if (!next.includes('kotlin.compiler.execution.strategy')) {
        next = next.replace(
            /(org\.gradle\.java\.installations\.auto-download=true\n)/,
            `$1org.gradle.parallel=true\norg.gradle.caching=true\n\n# يتجنّب فشل Kotlin compile daemon\nkotlin.compiler.execution.strategy=in-process\nkotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8\n`,
        );
        if (!next.includes('kotlin.compiler.execution.strategy')) {
            next += `\n# يتجنّب فشل Kotlin compile daemon\nkotlin.compiler.execution.strategy=in-process\nkotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8\n`;
        }
    }
    next = ensureGradleProp(next, 'android.dependency.useConstraints', 'false');
    if (next.includes('org.gradle.jvmargs=-Xmx2048m')) {
        next = next.replace(
            'org.gradle.jvmargs=-Xmx2048m',
            'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8',
        );
    }
    return next;
}

function patchGradleProperties() {
    if (!fs.existsSync(GRADLE_PROPS)) return false;

    const template = fs.existsSync(GRADLE_TEMPLATE)
        ? fs.readFileSync(GRADLE_TEMPLATE, 'utf8').trimEnd()
        : CLEAN_GRADLE_PROPS.trimEnd();

    const src = fs.readFileSync(GRADLE_PROPS, 'utf8');
    let next = ensureKotlinCompileCompat(src);

    if (!next.includes('kotlin.compiler.execution.strategy=in-process')) {
        next = `${template}\n`;
    }

    if (next === src) return false;
    fs.writeFileSync(GRADLE_PROPS, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    console.log('[patch-android-gradle-hygiene] gradle.properties');
    return true;
}

function patchAgpInText(src) {
    let next = src;
    next = next.replace(
        /classpath 'com\.android\.tools\.build:gradle:[^']+'/g,
        `classpath 'com.android.tools.build:gradle:${TARGET_AGP}'`,
    );
    next = next.replace(
        /id 'com\.android\.application' version '[^']+'/g,
        `id 'com.android.application' version '${TARGET_AGP}'`,
    );
    return next;
}

function patchRootBuildGradleAgp() {
    if (!fs.existsSync(ROOT_BUILD_GRADLE)) return false;

    const template = fs.existsSync(ROOT_BUILD_TEMPLATE)
        ? fs.readFileSync(ROOT_BUILD_TEMPLATE, 'utf8')
        : null;
    const src = fs.readFileSync(ROOT_BUILD_GRADLE, 'utf8');
    let next = patchAgpInText(src);

    if (template && !next.includes('FlatDirectoryArtifactRepository')) {
        const flatDirBlock = template.match(
            /import org\.gradle\.api\.artifacts\.repositories\.FlatDirectoryArtifactRepository[\s\S]*?subproject\.afterEvaluate \{[\s\S]*?\}\s*\}/,
        );
        if (flatDirBlock && !src.includes('FlatDirectoryArtifactRepository')) {
            next = next.replace(
                /subprojects \{ subproject ->[\s\S]*?\n\}/,
                flatDirBlock[0],
            );
        }
    }

    if (next === src) return false;
    fs.writeFileSync(ROOT_BUILD_GRADLE, next, 'utf8');
    console.log(`[patch-android-gradle-hygiene] android/build.gradle (AGP ${TARGET_AGP})`);
    return true;
}

function patchSettingsGradleAgp() {
    if (!fs.existsSync(SETTINGS_GRADLE)) return false;
    const src = fs.readFileSync(SETTINGS_GRADLE, 'utf8');
    const next = patchAgpInText(src);
    if (next === src) return false;
    fs.writeFileSync(SETTINGS_GRADLE, next, 'utf8');
    console.log(`[patch-android-gradle-hygiene] android/settings.gradle (AGP ${TARGET_AGP})`);
    return true;
}

function stripFlatDirBlock(src) {
    return src.replace(/\n\s*flatDir\s*\{[^}]*\}/g, '');
}

function patchAppBuildGradleSyntax(src) {
    let next = src;
    next = next.replace(/^(\s*)namespace\s+"([^"]+)"/m, '$1namespace = "$2"');
    next = next.replace(/ignoreAssetsPattern\s+'([^']+)'/, "ignoreAssetsPattern = '$1'");
    next = next.replace(/^(\s*)compose\s+true\b/m, '$1compose = true');
    next = next.replace(/^(\s*)resValues\s+true\b/m, '$1resValues = true');
    next = next.replace(/^(\s*)minifyEnabled\s+false\b/m, '$1minifyEnabled = false');
    next = next.replace(
        /^(\s*)sourceCompatibility\s+JavaVersion\.VERSION_21\b/m,
        '$1sourceCompatibility = JavaVersion.VERSION_21',
    );
    next = next.replace(
        /^(\s*)targetCompatibility\s+JavaVersion\.VERSION_21\b/m,
        '$1targetCompatibility = JavaVersion.VERSION_21',
    );
    return next;
}

function patchBuildGradle(relPath, { syntaxOnly = false } = {}) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return false;

    let src = fs.readFileSync(abs, 'utf8');
    let next = syntaxOnly ? patchAppBuildGradleSyntax(src) : stripFlatDirBlock(patchAgpInText(src));

    if (!syntaxOnly) {
        next = next.replace(/\nrepositories \{\s*\}\s*/g, '\n');
    }

    if (next === src) return false;
    fs.writeFileSync(abs, next, 'utf8');
    console.log(`[patch-android-gradle-hygiene] ${relPath}`);
    return true;
}

let changed = 0;
if (patchGradleProperties()) changed += 1;
if (patchRootBuildGradleAgp()) changed += 1;
if (patchSettingsGradleAgp()) changed += 1;
if (patchBuildGradle('android/app/build.gradle', { syntaxOnly: true })) changed += 1;
if (patchBuildGradle('android/capacitor-cordova-android-plugins/build.gradle')) changed += 1;

if (changed === 0) {
    console.log(`[patch-android-gradle-hygiene] OK — AGP ${TARGET_AGP} already aligned`);
} else {
    console.log(`[patch-android-gradle-hygiene] OK — ${changed} file(s) patched (AGP ${TARGET_AGP})`);
}
