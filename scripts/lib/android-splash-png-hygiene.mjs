/**
 * قالب Capacitor يضع splash.png في drawable/ ومجلدات الكثافة.
 * المشروع يعرّف @drawable/splash عبر splash.xml — PNG بنفس الاسم في drawable/
 * يفشل :app:packageDebugResources، وPNG الكثافة يتجاوز XML على الجهاز.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} resDir android/app/src/main/res
 * @returns {string[]}
 */
export function listCapacitorSplashPngs(resDir) {
    if (!resDir || !fs.existsSync(resDir)) return [];
    const hits = [];
    for (const name of fs.readdirSync(resDir)) {
        if (!name.startsWith('drawable')) continue;
        const png = path.join(resDir, name, 'splash.png');
        if (fs.existsSync(png)) hits.push(png);
    }
    return hits.sort();
}

/**
 * @param {string} resDir android/app/src/main/res
 * @returns {string[]} مسارات PNG المحذوفة
 */
export function removeCapacitorSplashPngs(resDir) {
    const hits = listCapacitorSplashPngs(resDir);
    const removed = [];
    for (const png of hits) {
        fs.unlinkSync(png);
        removed.push(png);
        const dir = path.dirname(png);
        if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
            fs.rmdirSync(dir);
        }
    }
    return removed;
}
