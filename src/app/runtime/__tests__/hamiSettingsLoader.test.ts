import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    getCachedHamiSettingsComponent,
    getHamiSettingsModuleIfResolved,
    isHamiSettingsModuleResolved,
    loadHamiSettingsModule,
    resetHamiSettingsModuleCacheForTests,
} from '@/app/runtime/hamiSettingsLoader';

describe('hamiSettingsLoader', () => {
    beforeEach(() => {
        resetHamiSettingsModuleCacheForTests();
    });

    it('loadHamiSettingsModule يعتمد HamiSettings ويخزّنه للقراءة المتزامنة', async () => {
        const mod = await loadHamiSettingsModule();
        expect(typeof mod.HamiSettings).toBe('function');
        expect(isHamiSettingsModuleResolved()).toBe(true);
        expect(getCachedHamiSettingsComponent()).toBe(mod.HamiSettings);
        expect(getHamiSettingsModuleIfResolved()?.HamiSettings).toBe(mod.HamiSettings);
    }, 60_000);

    it('يعيد نفس الوعد أثناء التحميل ولا يترك رفضاً مخزّناً في المصدر', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/app/runtime/hamiSettingsLoader.ts'),
            'utf8',
        );
        expect(src).toContain('settingsModulePromise = null');
        expect(src).toContain("typeof mod?.HamiSettings !== 'function'");
        expect(src).toContain('SETTINGS_SHELL_HYDRATED_EVENT');
        expect(src).toContain('getCachedHamiSettingsComponent');
    });
});
