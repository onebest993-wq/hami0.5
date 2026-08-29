import { afterEach, describe, expect, it } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { applyPerformanceFastPath } from '../settingsPerformanceFastPath';

describe('applyPerformanceFastPath', () => {
    afterEach(() => {
        delete document.documentElement.dataset.hamiLite;
    });

    it('يطبق وضع الأداء الخفيف على html فوراً', () => {
        const ok = applyPerformanceFastPath({ litePerformance: 'on' }, LAWYER_SETTINGS_V2_DEFAULTS);
        expect(ok).toBe(true);
        expect(document.documentElement.dataset.hamiLite).toBe('1');
    });

    it('لا يُعدّ مساراً سريعاً إن اختلط أكثر من مفتاح', () => {
        const ok = applyPerformanceFastPath(
            { litePerformance: 'off', enableAnimations: false },
            LAWYER_SETTINGS_V2_DEFAULTS,
        );
        expect(ok).toBe(false);
    });
});
