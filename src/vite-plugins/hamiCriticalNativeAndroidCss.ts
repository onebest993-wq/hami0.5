import path from 'node:path';
import type { Plugin } from 'vite';

const HAMI_CRITICAL_NATIVE_ANDROID_ID = 'virtual:hami-critical-native-android';

/**
 * Android FX (~28KB) — متزامن في dev + بناء Capacitor.
 * بناء الويب الإنتاجي: وحدة فارغة حتى لا يُفسَّر على كل شاشة ويب.
 */
export function hamiCriticalNativeAndroidCss(
    command: 'build' | 'serve',
    env: Record<string, string>,
    projectRoot: string,
): Plugin {
    const include =
        command === 'serve' || String(env.VITE_BUILD_NATIVE ?? '').trim() === 'true';
    const cssAbs = path.resolve(projectRoot, 'src/styles/critical-native-android.css');

    return {
        name: 'hami-critical-native-android-css',
        resolveId(id) {
            if (id === HAMI_CRITICAL_NATIVE_ANDROID_ID) {
                return `\0${HAMI_CRITICAL_NATIVE_ANDROID_ID}`;
            }
            return undefined;
        },
        load(id) {
            if (id !== `\0${HAMI_CRITICAL_NATIVE_ANDROID_ID}`) return undefined;
            if (!include) {
                return '/* web production: android home FX omitted from critical CSS */\nexport {}\n';
            }
            return `import ${JSON.stringify(cssAbs)};\n`;
        },
    };
}
