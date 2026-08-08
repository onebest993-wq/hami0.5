#!/usr/bin/env node
/**
 * assembleDebug مع JAVA_HOME و ANDROID_SDK — Windows-friendly.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(root, 'android');

function readJavaMajorVersion(javaHome) {
    const javaExe = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!fs.existsSync(javaExe)) return null;
    const result = spawnSync(javaExe, ['-version'], { encoding: 'utf8' });
    const text = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
    const quoted = text.match(/version\s+"(\d+)/);
    if (quoted) return Number(quoted[1]);
    const legacy = text.match(/version\s+"1\.(\d+)/);
    return legacy ? Number(legacy[1]) : null;
}

function findJavaHome() {
    if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'))) {
        return process.env.JAVA_HOME;
    }
    const candidates = [
        path.join(process.env['ProgramFiles'] ?? '', 'Android', 'Android Studio', 'jbr'),
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Android Studio', 'jbr'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'bin', 'java.exe'))) return candidate;
    }
    return null;
}

function findAndroidSdk() {
    if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
        return process.env.ANDROID_HOME;
    }
    const sdk = path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
    return fs.existsSync(sdk) ? sdk : null;
}

const javaHome = findJavaHome();
const androidSdk = findAndroidSdk();
const javaMajor = javaHome ? readJavaMajorVersion(javaHome) : null;

if (!javaHome) {
    console.error('JAVA_HOME not found — install Android Studio JBR or JDK 17+');
    process.exit(1);
}
if (javaMajor && javaMajor >= 25) {
    console.log(`[android-assemble] Java ${javaMajor} detected — requires Gradle 8.14.4+ (project wrapper upgraded)`);
}
if (!androidSdk) {
    console.error('Android SDK not found — install via Android Studio SDK Manager');
    process.exit(1);
}

const localProps = path.join(androidDir, 'local.properties');
if (!fs.existsSync(localProps)) {
    const escaped = androidSdk.replace(/\\/g, '/');
    fs.writeFileSync(localProps, `sdk.dir=${escaped.replace(/:/g, '\\:')}\n`, 'utf8');
}

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradle, ['assembleDebug'], {
    cwd: androidDir,
    stdio: 'inherit',
    env: {
        ...process.env,
        JAVA_HOME: javaHome,
        ANDROID_HOME: androidSdk,
    },
    shell: process.platform === 'win32',
});

if (result.status !== 0) process.exit(result.status ?? 1);

const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (fs.existsSync(apk)) {
    console.log(`\n✓ APK: ${apk}`);
    console.log('  Install: npm run cap:install:android (device via USB + USB debugging)\n');
}
