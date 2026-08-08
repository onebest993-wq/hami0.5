import { describe, expect, it } from 'vitest';
import {
    inferSeizureSubtypeFromDecisionText,
    submitBasicSeizurePendingRequest,
} from '@/app/domain/seizure';

describe('seizureBasicRequestService', () => {
    it('infers subtype from Arabic decision text', () => {
        expect(inferSeizureSubtypeFromDecisionText('طلب حجز عقار')).toBe('property');
        expect(inferSeizureSubtypeFromDecisionText('إشارة تنفيذ')).toBe('notice');
        expect(inferSeizureSubtypeFromDecisionText('حجز لدى الغير')).toBe('third_party');
    });

    it('rejects invalid dossier id', () => {
        const result = submitBasicSeizurePendingRequest({
            dossierInput: { executionId: 'default' },
            title: 'طلب',
            body: 'body',
            subtype: 'salary',
        });
        expect(result.ok).toBe(false);
        expect(result.error).toBe('invalid_dossier');
    });
});
