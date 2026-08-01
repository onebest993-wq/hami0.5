import { describe, expect, it } from 'vitest';

import {
    isSensitiveStorageKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

/**
 * بلوب الإضبارة كان يُخزَّن نصاً صريحاً — أسماء ومعرّفات وطنية.
 * هذه الاختبارات تُثبت أن سياسة التشفير تغطيه الآن.
 */
describe('secureStorageKeys execution privacy', () => {
    it('classifies execution dossier blobs as sensitive', () => {
        expect(isSensitiveStorageKey('execution_exec_priv_1')).toBe(true);
        expect(isSensitiveStorageKey('execution_exec_priv_1_decisions')).toBe(true);
        expect(isSensitiveStorageKey('execution_form_exec_priv_1')).toBe(true);
    });

    it('classifies execution satellite keys as sensitive', () => {
        expect(isSensitiveStorageKey('hami_unified_funds_ledger_exec_priv_1')).toBe(true);
        expect(isSensitiveStorageKey('hami_garnishment_details_exec_priv_1')).toBe(true);
        expect(isSensitiveStorageKey('hami_party_badges_hidden_exec_priv_1')).toBe(true);
        expect(isSensitiveStorageKey('hami_eviction_grace_pinned_exec_priv_1')).toBe(true);
        expect(isSensitiveStorageKey('hami:employee_personal_unlock:exec_priv_1')).toBe(true);
    });

    it('does not encrypt the execution files index twice — already exact-key', () => {
        expect(isSensitiveStorageKey('executionFiles')).toBe(true);
    });

    it('will encrypt typical dossier payloads under size cap', () => {
        const payload = JSON.stringify({
            id: 'x',
            debtors: [{ name: 'مدين', nationalId: '123' }],
        });
        expect(shouldEncryptValue('execution_x', payload)).toBe(true);
    });

    it('leaves non-execution UI keys alone', () => {
        expect(isSensitiveStorageKey('lawyer_theme')).toBe(false);
        expect(isSensitiveStorageKey('hami:smartvault:docs:v1')).toBe(false);
    });
});
