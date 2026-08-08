import { describe, expect, it } from 'vitest';
import {
    clampProfileBackgroundEditState,
    computeProfileBackgroundCropRect,
    defaultProfileBackgroundEditState,
    PROFILE_CANVAS_BACKGROUND_ASPECT,
} from '@/app/services/profile/profileImageEditor';

describe('profileImageEditor', () => {
    it('يحسب مستطيل اقتصاص بنسبة 16:9 عند scale=1', () => {
        const rect = computeProfileBackgroundCropRect(
            4000,
            3000,
            defaultProfileBackgroundEditState(),
            PROFILE_CANVAS_BACKGROUND_ASPECT,
        );
        expect(rect.sw).toBeCloseTo(4000, 0);
        expect(rect.sh).toBeCloseTo(2250, 0);
        expect(rect.sw / rect.sh).toBeCloseTo(PROFILE_CANVAS_BACKGROUND_ASPECT, 2);
        expect(rect.sx).toBeGreaterThanOrEqual(0);
        expect(rect.sy).toBeCloseTo(375, 0);
    });

    it('التكبير يصغّر نافذة الاقتصاص', () => {
        const zoomed = computeProfileBackgroundCropRect(4000, 3000, {
            scale: 2,
            panX: 0,
            panY: 0,
        });
        const base = computeProfileBackgroundCropRect(4000, 3000, defaultProfileBackgroundEditState());
        expect(zoomed.sw).toBeLessThan(base.sw);
        expect(zoomed.sh).toBeLessThan(base.sh);
    });

    it('clamp يحدّ scale والإزاحة', () => {
        expect(
            clampProfileBackgroundEditState({ scale: 9, panX: 2, panY: -3 }),
        ).toEqual({ scale: 4, panX: 1, panY: -1 });
    });
});
