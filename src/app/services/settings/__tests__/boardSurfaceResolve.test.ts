import { describe, expect, it } from 'vitest';
import {
    resolveLawyerBoardChromeBg,
    resolveLawyerDashboardCanvasBg,
} from '../boardSurfaceResolve';

describe('boardSurfaceResolve', () => {
    it('يطبّق لون الواجهة على الهيدر واللوحة دائماً', () => {
        const appearance = {
            theme: 'emerald' as const,
            themeMode: 'dark' as const,
            themeApplyTarget: 'blocks' as const,
        };
        expect(resolveLawyerBoardChromeBg(appearance, false)).toBe('#0A1512');
        expect(resolveLawyerDashboardCanvasBg(appearance, false)).toBe('#0A1512');
    });

    it('يجعل خلفية اللوحة صلبة مع صورة خلفية — الصورة على غطاء الرئيسية فقط', () => {
        const appearance = {
            theme: 'gold' as const,
            themeMode: 'dark' as const,
            themeApplyTarget: 'both' as const,
        };
        expect(resolveLawyerDashboardCanvasBg(appearance, true)).toBe('#0B1021');
        expect(resolveLawyerBoardChromeBg(appearance, true)).toBe('#0B1021');
    });
});
