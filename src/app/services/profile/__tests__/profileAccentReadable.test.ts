import { describe, expect, it } from 'vitest';
import {
    resolveProfileAccentHex,
    resolveProfileAccentInkHex,
    resolveProfileAccentOnSolidHex,
} from '@/app/services/profile/profilePageAppearance';

describe('profile accent readability', () => {
    it('كحلي يعطي حبراً فاتحاً مقروءاً على سطح داكن', () => {
        expect(resolveProfileAccentHex('navy')).toBe('#0A0F1C');
        expect(resolveProfileAccentInkHex('navy')).toBe('#A8C4D4');
        expect(resolveProfileAccentOnSolidHex('navy')).toBe('#F4F0E8');
    });

    it('ذهبي يبقى كما هو للنص فوق السطح الداكن', () => {
        expect(resolveProfileAccentInkHex('gold')).toBe('#E6C673');
        expect(resolveProfileAccentOnSolidHex('gold')).toBe('#0a0c12');
    });
});
