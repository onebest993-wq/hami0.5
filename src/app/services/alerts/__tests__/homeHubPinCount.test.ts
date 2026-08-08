import { describe, expect, it } from 'vitest';
import { countHomeHubDossierPins } from '@/app/services/alerts/homeHubCardLogic';

describe('countHomeHubDossierPins', () => {
    it('يحسب دبابيس الإضبارات فقط بلا hub', () => {
        expect(
            countHomeHubDossierPins([
                { id: '1', type: 'lawsuit' } as never,
                { id: '2', type: 'hub' } as never,
                { id: '3', type: 'execution' } as never,
            ]),
        ).toBe(2);
    });

    it('يرجع صفر عند عدم وجود تثبيت', () => {
        expect(countHomeHubDossierPins([])).toBe(0);
    });
});
