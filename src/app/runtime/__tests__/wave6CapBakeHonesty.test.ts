import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave6 Cap bake honesty contract', () => {
    it('سكريبت bake موجود ويعتمد WebView CDP لا Pixel فقط', () => {
        const src = fs.readFileSync(path.join(root, 'scripts/wave6-cap-section-bake.mjs'), 'utf8');
        expect(src).toContain('webview_devtools_remote_');
        expect(src).toContain('sectionBakeCdp');
        expect(src).toContain('hub-archive-execution');
        expect(src).toContain('hub-archive-lawsuit');
        expect(src).toContain('BiometricAuthNative');
    });

    it('إغلاق Wave 6 يعلن sectionBakeCdp=true مع sealed=false', () => {
        const close = JSON.parse(
            fs.readFileSync(path.join(root, '.cursor/wave6-mobile-close.json'), 'utf8'),
        ) as {
            foundationWorldClassSealed: boolean;
            verified: { sectionBakeCdp: boolean };
            honesty: string;
        };
        expect(close.foundationWorldClassSealed).toBe(false);
        expect(close.verified.sectionBakeCdp).toBe(true);
        expect(close.honesty).toMatch(/NOT claimed|لا|authenticate/i);
    });

    it('تقرير bake الحي موجود ويؤكد الأسطح الثلاثة', () => {
        const bake = JSON.parse(
            fs.readFileSync(path.join(root, 'perf-reports/wave6-cap-section-bake.json'), 'utf8'),
        ) as {
            sectionBakeCdp: boolean;
            surfaces: Record<string, { chromeOk?: boolean; contentOk?: boolean }>;
            biometricProbe?: { hasBiometricPlugin?: boolean; hasPrivacyScreen?: boolean };
        };
        expect(bake.sectionBakeCdp).toBe(true);
        for (const id of ['home', 'execution', 'lawsuit']) {
            expect(bake.surfaces[id]?.chromeOk).toBe(true);
            expect(bake.surfaces[id]?.contentOk).toBe(true);
        }
        expect(bake.biometricProbe?.hasBiometricPlugin).toBe(true);
        expect(bake.biometricProbe?.hasPrivacyScreen).toBe(true);
    });
});
