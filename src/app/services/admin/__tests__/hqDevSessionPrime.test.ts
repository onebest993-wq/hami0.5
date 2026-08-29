import { describe, expect, it } from 'vitest';
import {
    CHECKING_HQ_STATUS,
    markHqStatusFetched,
    parseHeadquartersLiveStatus,
} from '@/app/components/admin/hqLiveOverview';
import {
    clearPrimedHeadquartersStatus,
    peekPrimedHeadquartersCourts,
    peekPrimedHeadquartersStatus,
    primeHeadquartersCourts,
    primeHeadquartersLiveStatus,
} from '../hqDevSessionPrime';

describe('hqDevSessionPrime', () => {
    it('يحفظ نبضاً متصلاً ويتجاهل جلسة ناقصة', () => {
        clearPrimedHeadquartersStatus();
        expect(peekPrimedHeadquartersStatus()).toBeNull();

        primeHeadquartersLiveStatus(CHECKING_HQ_STATUS);
        expect(peekPrimedHeadquartersStatus()).toBeNull();

        primeHeadquartersLiveStatus({ ...CHECKING_HQ_STATUS, sessionRequired: true, system: 'down' });
        expect(peekPrimedHeadquartersStatus()).toBeNull();

        const live = markHqStatusFetched(
            parseHeadquartersLiveStatus({ ok: true, system: 'connected', db: true, kvOk: true }),
            '2026-01-01T00:00:00.000Z',
        );
        primeHeadquartersLiveStatus(live);
        expect(peekPrimedHeadquartersStatus()?.system).toBe('connected');
        expect(peekPrimedHeadquartersStatus()?.sessionRequired).toBe(false);

        clearPrimedHeadquartersStatus();
        expect(peekPrimedHeadquartersStatus()).toBeNull();
        expect(peekPrimedHeadquartersCourts()).toBeNull();
    });

    it('يحفظ صفوف المحاكم ويُفرّغها مع النبض', () => {
        clearPrimedHeadquartersStatus();
        primeHeadquartersCourts([{ court: 'الكرخ', lawsuits: 1, transactions: 0 }]);
        expect(peekPrimedHeadquartersCourts()?.[0]?.court).toBe('الكرخ');
        clearPrimedHeadquartersStatus();
        expect(peekPrimedHeadquartersCourts()).toBeNull();
    });
});
