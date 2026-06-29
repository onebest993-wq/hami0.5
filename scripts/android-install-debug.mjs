#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

if (!fs.existsSync(apk)) {
    console.error('APK missing — run: npm run cap:build:android');
    process.exit(1);
}

const sdk = process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');

if (!fs.existsSync(adb)) {
    console.error('adb not found in Android SDK platform-tools');
    process.exit(1);
}

const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
const lines = (devices.stdout ?? '').split('\n').filter((l) => l.includes('\tdevice'));
if (lines.length === 0) {
    console.error('No Android device/emulator connected. Enable USB debugging and reconnect.');
    process.exit(1);
}

console.log(`Installing ${apk} ...`);
const install = spawnSync(adb, ['install', '-r', apk], { stdio: 'inherit' });
process.exit(install.status ?? 1);
