import { describe, expect, it } from 'vitest';
import { homeHubKeyboardFeedStyle } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubKeyboardFeedStyle';

describe('homeHubKeyboardFeedStyle', () => {
    it('لا يضيف حشوة عند إغلاق اللوحة', () => {
        expect(homeHubKeyboardFeedStyle(0)).toBeUndefined();
        expect(homeHubKeyboardFeedStyle(-12)).toBeUndefined();
    });

    it('يحترم ارتفاع اللوحة وsafe-area', () => {
        expect(homeHubKeyboardFeedStyle(280)).toEqual({
            paddingBottom: 'max(280px, env(safe-area-inset-bottom, 0px))',
        });
    });
});
