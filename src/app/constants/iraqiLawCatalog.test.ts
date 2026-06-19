import { describe, expect, it } from 'vitest';
import {
    ALLOWED_IRAQI_LAW_NAMES,
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
    LAW_NAME_TO_CODE_TYPE,
    resolveLawCodeTypeFromName,
} from '@/app/constants/iraqiLawCatalog';
import { CODE_TYPE_TO_LAW_NAME } from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesConstants';
import { LAW_STRUCTURE } from '@/app/components/admin/lawStructure';

describe('iraqiLawCatalog admin ↔ LegalCodesTab linkage', () => {
    it('allows the six V1 law catalogs', () => {
        expect(ALLOWED_IRAQI_LAW_NAMES).toHaveLength(6);
        expect(ALLOWED_IRAQI_LAW_NAMES).toContain(EXECUTION_LAW_CANONICAL_NAME);
        expect(ALLOWED_IRAQI_LAW_NAMES).toContain(IRAQI_LAW_CANONICAL_NAMES.penal);
    });

    it('maps penal law name to penal tab', () => {
        expect(resolveLawCodeTypeFromName(IRAQI_LAW_CANONICAL_NAMES.penal)).toBe('penal');
        expect(LAW_NAME_TO_CODE_TYPE[IRAQI_LAW_CANONICAL_NAMES.penal]).toBe('penal');
        expect(CODE_TYPE_TO_LAW_NAME.penal).toBe(IRAQI_LAW_CANONICAL_NAMES.penal);
    });

    it('keeps admin hierarchy and reader on the same penal law_name', () => {
        expect(LAW_STRUCTURE.penal.lawName).toBe(CODE_TYPE_TO_LAW_NAME.penal);
        expect(LAW_STRUCTURE.execution.lawName).toBe(EXECUTION_LAW_CANONICAL_NAME);
    });
});
