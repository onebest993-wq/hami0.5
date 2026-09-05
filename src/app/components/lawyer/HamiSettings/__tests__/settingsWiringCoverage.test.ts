import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsDir = join(process.cwd(), 'src/app/components/lawyer/HamiSettings');

function read(rel: string): string {
    return readFileSync(join(settingsDir, rel), 'utf8');
}

/** خيارات معروضة فعلياً — تُثبَّت بوجود علامة في الواجهة لا بقاموس تلميحات ميت */
const WIRED_UI_MARKERS: ReadonlyArray<{ file: string; marker: string }> = [
    { file: 'appearance/AppearanceThemeAndSurfaceCard.tsx', marker: 'settings-toggle-appearance-reduceMotion' },
    { file: 'appearance/AppearanceWallpaperCard.tsx', marker: 'settings-wallpaper-upload' },
    { file: 'security/SecuritySection.tsx', marker: 'settings-toggle-security-localOnlyMode' },
    { file: 'security/SecuritySection.tsx', marker: 'settings-toggle-security-biometricLock' },
    { file: 'security/SecuritySection.tsx', marker: 'settings-auto-lock-' },
    { file: 'security/SecuritySection.tsx', marker: 'settings-toggle-security-screenshotDeterrent' },
    { file: 'data/DataSyncCard.tsx', marker: 'حفظ تلقائي' },
    { file: 'data/DataSyncCard.tsx', marker: 'settings-toggle-data-cloudSync' },
    { file: 'data/BusinessBackupSection.tsx', marker: 'settings-backup-setup' },
    { file: 'data/DataDangerZone.tsx', marker: 'settings-wipe-start' },
    { file: 'data/DataDangerZone.tsx', marker: 'settings-reset-start' },
];

describe('settings wiring coverage', () => {
    it('كل خيار معروض له علامة حيّة في واجهة القسم', () => {
        for (const { file, marker } of WIRED_UI_MARKERS) {
            expect(read(file), `${file} missing ${marker}`).toContain(marker);
        }
    });

    it('صفوف الحجم والتباين والأداء الخفيف والضبابية ليست في الواجهة', () => {
        expect(existsSync(join(settingsDir, 'appearance/AppearanceReadabilityRows.tsx'))).toBe(false);
        const theme = read('appearance/AppearanceThemeAndSurfaceCard.tsx');
        expect(theme).not.toContain('حجم النص');
        expect(theme).not.toContain('تباين أوضح');
        expect(theme).not.toContain('أداء خفيف');
        expect(theme).not.toContain('settings-font-preset-');
        expect(theme).not.toContain('settings-toggle-appearance-highContrast');
        expect(theme).not.toContain('settings-lite-');
        const sec = read('security/SecuritySection.tsx');
        expect(sec).not.toContain('settings-toggle-security-privacyBlur');
        expect(sec).not.toContain('ضبابية الخصوصية');
        expect(sec).not.toContain('togglePrivacyBlur');
    });
});
