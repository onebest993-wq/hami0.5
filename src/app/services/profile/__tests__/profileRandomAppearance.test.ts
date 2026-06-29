import { describe, expect, it } from 'vitest';

import {
    PROFILE_ACCENT_COLORS,
    PROFILE_MATERIALS,
    randomizeProfileAppearance,
} from '@/app/services/profile/profilePageCustomization';

describe('randomizeProfileAppearance', () => {
    it('returns valid accent and material ids', () => {
        const next = randomizeProfileAppearance({ accentColor: 'gold', material: 'glass' });
        expect(PROFILE_ACCENT_COLORS.some((c) => c.id === next.accentColor)).toBe(true);
        expect(PROFILE_MATERIALS.some((m) => m.id === next.material)).toBe(true);
    });

    it('prefers a different combo when possible', () => {
        const current = { accentColor: 'gold' as const, material: 'glass' as const };
        let sawDifferent = false;
        for (let i = 0; i < 12; i += 1) {
            const next = randomizeProfileAppearance(current);
            if (next.accentColor !== current.accentColor || next.material !== current.material) {
                sawDifferent = true;
                break;
            }
        }
        expect(sawDifferent).toBe(true);
    });
});
