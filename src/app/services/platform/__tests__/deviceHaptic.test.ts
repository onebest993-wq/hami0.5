import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    HAMI_NOTIFICATION_VIBRATE_PATTERN,
    playDeviceHaptic,
} from '@/app/services/platform/deviceHaptic';

describe('playDeviceHaptic', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('على الويب يستدعي navigator.vibrate بالنمط', () => {
        const vibrate = vi.fn();
        vi.stubGlobal('navigator', { vibrate });
        playDeviceHaptic();
        expect(vibrate).toHaveBeenCalledWith([...HAMI_NOTIFICATION_VIBRATE_PATTERN]);
    });

    it('بناء الويب يحوّل @capacitor/haptics إلى البديل', () => {
        const vite = readFileSync(resolve(process.cwd(), 'vite.config.mts'), 'utf8');
        expect(vite).toContain("@capacitor/haptics");
        const stub = readFileSync(
            resolve(process.cwd(), 'src/app/runtime/capacitorWebShims/pluginStub.ts'),
            'utf8',
        );
        expect(stub).toContain('export const Haptics');
        expect(stub).toContain('NotificationType');
    });
});
