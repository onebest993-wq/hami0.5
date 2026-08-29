import { describe, expect, it } from 'vitest';
import {
    dispatchLawsCatalogChanged,
    subscribeLawsCatalogChanged,
} from '@/app/kernel/laws/lawCatalogSync';

describe('lawCatalogSync', () => {
    it('يبث اسم القانون للمشتركين ويتجاهل الفراغ', () => {
        const seen: string[] = [];
        const unsub = subscribeLawsCatalogChanged((lawName) => {
            seen.push(lawName);
        });
        dispatchLawsCatalogChanged('  قانون العقوبات  ');
        dispatchLawsCatalogChanged('   ');
        dispatchLawsCatalogChanged('');
        expect(seen).toEqual(['قانون العقوبات']);
        unsub();
        dispatchLawsCatalogChanged('قانون المرافعات المدنية');
        expect(seen).toEqual(['قانون العقوبات']);
    });
});
