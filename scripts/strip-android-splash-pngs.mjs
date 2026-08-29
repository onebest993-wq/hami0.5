#!/usr/bin/env node
/**
 * Capacitor copy يُعيد splash.png بجانب splash.xml فيفشل :app:packageDebugResources.
 * يُستدعى من capacitor:copy:after / capacitor:sync:after.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeCapacitorSplashPngs } from './lib/android-splash-png-hygiene.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const removed = removeCapacitorSplashPngs(path.join(ROOT, 'android/app/src/main/res'));
for (const png of removed) {
    console.log(`[strip-android-splash-pngs] removed ${path.relative(ROOT, png)}`);
}
