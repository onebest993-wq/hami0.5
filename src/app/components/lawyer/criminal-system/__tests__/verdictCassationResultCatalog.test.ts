import { describe, expect, it } from 'vitest';
import {
    coerceLegacyVerdictCassationResult,
    verdictCassationResultLabel,
} from '../verdictCassationResultCatalog';

describe('verdictCassationResultCatalog', () => {
    it('coerces legacy Arabic keys', () => {
        expect(coerceLegacyVerdictCassationResult('نقض وإعادة')).toBe('verdict_quash_remand_retrial');
        expect(coerceLegacyVerdictCassationResult('')).toBe('');
    });

    it('labels known results', () => {
        expect(verdictCassationResultLabel('verdict_formal_dismissal')).toBe('رد الطعن شكلاً');
        expect(verdictCassationResultLabel('unknown_key')).toBe('unknown_key');
    });
});
