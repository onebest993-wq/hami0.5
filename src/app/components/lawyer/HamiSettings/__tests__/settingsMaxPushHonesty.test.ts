import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const settingsDir = join(root, 'src/app/components/lawyer/HamiSettings');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function collectProductionSource(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === '__tests__' || name === 'node_modules') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) collectProductionSource(full, acc);
        else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
    }
    return acc;
}

const BARREL_IMPORT = /from ['"][^'"]*settingsStemIcons['"]/;

describe('settings max push honesty', () => {
    it('أيقونات الجذع مقسومة: كروم/أمن/كسول بلا برميل في مسار الفتح', () => {
        expect(existsSync(join(settingsDir, 'settingsStemIconsCore.tsx'))).toBe(true);
        expect(existsSync(join(settingsDir, 'settingsStemIconsChrome.tsx'))).toBe(true);
        expect(existsSync(join(settingsDir, 'settingsStemIconsSecurity.tsx'))).toBe(true);
        expect(existsSync(join(settingsDir, 'settingsStemIconsLazy.tsx'))).toBe(true);

        const header = read('src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx');
        expect(header).toContain("from './settingsStemIconsChrome'");
        expect(header).not.toContain('settingsStemIconsLazy');
        expect(header).not.toMatch(BARREL_IMPORT);

        const security = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(security).toContain("from '../settingsStemIconsSecurity'");
        expect(security).not.toContain('settingsStemIconsLazy');
        expect(security).not.toMatch(BARREL_IMPORT);

        const barrel = read('src/app/components/lawyer/HamiSettings/settingsStemIcons.tsx');
        expect(barrel).not.toContain('<path');
        expect(barrel).not.toContain('SettingsStemSvg');
        expect(barrel.split('\n').length).toBeLessThan(40);

        const files = collectProductionSource(settingsDir);
        for (const file of files) {
            if (file.endsWith('settingsStemIcons.tsx')) continue;
            const src = readFileSync(file, 'utf8');
            expect(src, `${file} imports unsuffixed stem barrel`).not.toMatch(BARREL_IMPORT);
        }
    });

    it('لمس الترس وخمول المنزل لا يسخّنان المنظر/البيانات/الحساب/الحوارات', () => {
        const intent = read('src/app/hooks/lawyerDashboard/settingsIntentWarm.ts');
        expect(intent).toContain('prefetchSettingsShellChain');
        expect(intent).not.toContain('prefetchSecondarySettingsSections');
        expect(intent).not.toContain('prefetchSettingsDialogs');
        expect(intent).not.toContain('settingsSectionLoad');

        const load = read('src/app/components/lawyer/HamiSettings/settingsSectionLoad.ts');
        expect(load).toContain("import('./appearance/AppearanceSection')");
        expect(load).toContain('prefetchSettingsOpenTabChunks');
        expect(load).not.toContain('prefetchSecondarySettingsSections');
        expect(load).not.toMatch(/prefetchSettingsSection\('data'\)/);
        expect(load).not.toMatch(/prefetchSettingsSection\('account'\)/);
        expect(load).toContain('prefetchSettingsDialogs');

        const hostLife = read(
            'src/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle.ts',
        );
        const warmChunks = hostLife.slice(
            hostLife.indexOf('function warmSettingsChunks'),
            hostLife.indexOf('export function primeSettingsHostMount'),
        );
        expect(warmChunks).toContain('prefetchSettingsShellChunks');
        expect(warmChunks).not.toContain('prefetchSecondarySettingsSections');
        expect(warmChunks).not.toContain('settingsSectionLoad');
        expect(hostLife).not.toContain('prefetchSecondarySettingsSections');
        expect(hostLife).not.toContain('settingsSectionLoad');
        expect(hostLife).not.toContain('prefetchSettingsChunks');
        expect(hostLife).toContain('isLitePerformanceActive');
    });

    it('مسبار البصمة بعد الخمول؛ المصالحة فورية على تركيب الأمن', () => {
        const hook = read('src/app/components/lawyer/HamiSettings/security/useSecuritySection.ts');
        expect(hook).toContain('scheduleIdleWork');
        expect(hook).toContain('probeBiometricSession');
        expect(hook).toContain('reconcileBiometricSessionLockEnabled');
        const idleStart = hook.indexOf('const cancelIdle = scheduleIdleWork');
        const reconcileAt = hook.indexOf('const reconcile = reconcileBiometricSessionLockEnabled');
        expect(reconcileAt).toBeGreaterThan(-1);
        expect(idleStart).toBeGreaterThan(reconcileAt);
        const idleBody = hook.slice(idleStart);
        expect(idleBody).toContain('probeBiometricSession');
        expect(idleBody).not.toContain('reconcileBiometricSessionLockEnabled');
    });

    it('صف البصمة يحجز سطر التلميح قبل وصول المسبار', () => {
        const security = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(security).toContain('reserveSubLabel');
        const row = read('src/app/components/lawyer/HamiSettings/settings-ui/SettingRow.tsx');
        expect(row).toContain('min-h-[2.25rem]');
        expect(row).toContain('max-h-[2.25rem]');
        expect(row).toContain('line-clamp-2');
        expect(row).toContain('reserveSubLabel');
    });
});
