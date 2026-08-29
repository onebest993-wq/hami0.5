import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    armLocalOnlyIsolationAtBoot,
    resetLocalOnlyBootArmForTests,
} from '@/app/services/settings/localOnlyBootArm';
import { LOCAL_ONLY_PERSIST_KEY } from '@/app/services/settings/localOnlyUrlPolicy';
import { resetWifeFetchGuardForTests } from '@/app/security/wifeFetchGuard';

describe('localOnlyBootArm', () => {
    afterEach(() => {
        resetLocalOnlyBootArmForTests();
        resetWifeFetchGuardForTests();
        try {
            localStorage.removeItem(LOCAL_ONLY_PERSIST_KEY);
            localStorage.removeItem('lawyer_settings');
        } catch {
            /* ignore */
        }
    });

    it('لا يستورد لقطة الإعدادات ولا SecureAPIClient', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/settings/localOnlyBootArm.ts'),
            'utf8',
        );
        expect(src).not.toContain('settingsSnapshot');
        expect(src).not.toMatch(/from ['"][^'"]*SecureAPIClient['"]/);
        expect(src).not.toContain('localOnlyNetworkIsolation');
    });

    it('يسلّح من مفتاح القرص قبل أي شبكة', async () => {
        localStorage.setItem(LOCAL_ONLY_PERSIST_KEY, '1');
        armLocalOnlyIsolationAtBoot();
        expect(document.documentElement.dataset.hamiLocalOnly).toBe('1');
        await expect(fetch('https://project.supabase.co/rest/v1/cases')).rejects.toMatchObject({
            name: 'LocalOnlyNetworkError',
        });
    });

    it('يسلّح من lawyer_settings غير المشفّر ويكتب مفتاح القرص', async () => {
        localStorage.setItem(
            'lawyer_settings',
            JSON.stringify({ security: { localOnlyMode: true } }),
        );
        armLocalOnlyIsolationAtBoot();
        expect(localStorage.getItem(LOCAL_ONLY_PERSIST_KEY)).toBe('1');
        expect(document.documentElement.dataset.hamiLocalOnly).toBe('1');
        await expect(fetch('https://cdn.example/x.png')).rejects.toMatchObject({
            name: 'LocalOnlyNetworkError',
        });
    });

    it('لا يسلّح من كتلة مشفّرة بلا مفتاح قرص', () => {
        localStorage.setItem('lawyer_settings', 'hami_enc_v2:deadbeef');
        armLocalOnlyIsolationAtBoot();
        expect(document.documentElement.dataset.hamiLocalOnly).not.toBe('1');
    });
});
