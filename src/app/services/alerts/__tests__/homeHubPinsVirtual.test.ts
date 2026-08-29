import { describe, expect, it } from 'vitest';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubPinsVirtual';

describe('homeHubPinsVirtual', () => {
    it('يفعّل الافتراضية عند 7 عناصر فأكثر', () => {
        expect(shouldVirtualizeHomeHubPins(6)).toBe(false);
        expect(shouldVirtualizeHomeHubPins(7)).toBe(true);
    });
});
