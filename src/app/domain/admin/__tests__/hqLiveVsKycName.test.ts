import { describe, expect, it } from 'vitest';
import { foldHqLegalName, hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';

describe('hqLiveNameDivergesFromKyc', () => {
    it('يطوي الهمزات والمسافات الزائدة ولا ينبّه عند التطابق', () => {
        expect(foldHqLegalName('  علي  أحمد  حسن ')).toBe('علي احمد حسن');
        expect(hqLiveNameDivergesFromKyc('علي أحمد حسن', 'علي احمد حسن')).toBe(false);
        expect(hqLiveNameDivergesFromKyc('علي محمد حسن', 'علي حسن محمد')).toBe(true);
    });

    it('لا ينبّه إن نقص أحد الطرفين', () => {
        expect(hqLiveNameDivergesFromKyc('علي محمد حسن', '')).toBe(false);
        expect(hqLiveNameDivergesFromKyc('', 'علي محمد حسن')).toBe(false);
        expect(hqLiveNameDivergesFromKyc(null, 'علي محمد حسن')).toBe(false);
    });
});
