import { describe, expect, it } from 'vitest';
import {
    isAdminRequestsTabDecision,
    isOtherPartySpecialFollowupDecision,
} from '../isAdminRequestsTabDecision';
import { DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE } from '@/app/utils/otherPartyManualTrackDecisionSync';

describe('isAdminRequestsTabDecision — isolation from other-party tab', () => {
    it('excludes other-party pending row (title + debtor_side)', () => {
        const row = {
            requestKind: 'special_followup',
            title: 'تحرك الطرف الآخر — قيد البت',
            appealRequestOrigin: 'debtor_side',
            executorOutcome: 'pending',
        };
        expect(isOtherPartySpecialFollowupDecision(row)).toBe(true);
        expect(isAdminRequestsTabDecision(row)).toBe(false);
    });

    it('excludes creditor-mirror track rows via payload', () => {
        const row = {
            requestKind: 'special_followup',
            title: 'طلب إيقاف تنفيذ — قيد البت',
            appealRequestOrigin: 'debtor_side',
            payloadJson: JSON.stringify({
                otherPartyTrackOptionId: 'stop_exec',
                source: DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE,
            }),
        };
        expect(isAdminRequestsTabDecision(row)).toBe(false);
    });

    it('includes manual_followup admin requests', () => {
        const row = {
            requestKind: 'special_followup',
            title: 'طلب إداري مخصص',
            payloadJson: JSON.stringify({ kind: 'manual_followup' }),
        };
        expect(isAdminRequestsTabDecision(row)).toBe(true);
    });

    it('includes admin_template requests', () => {
        const row = {
            requestKind: 'special_followup',
            title: 'طلب تصحيح خطأ مادي',
            payloadJson: JSON.stringify({ kind: 'admin_template', templateId: 'material_error' }),
        };
        expect(isAdminRequestsTabDecision(row)).toBe(true);
    });

    it('includes legacy admin template titles without payload', () => {
        const row = {
            requestKind: 'special_followup',
            title: 'تحديد موعد المزايدة العلنية',
        };
        expect(isAdminRequestsTabDecision(row)).toBe(true);
    });

    it('excludes dossier-control-only titles without admin payload', () => {
        expect(
            isAdminRequestsTabDecision({
                requestKind: 'special_followup',
                title: 'طلب توحيد الأضابير',
            })
        ).toBe(false);
    });

    it('excludes communication / مخاطبة decisions (belong in correspondences tab)', () => {
        expect(
            isAdminRequestsTabDecision({
                requestKind: 'special_followup',
                title: 'إرسال كتاب / مخاطبة جهة — لؤابلا موافق — متابعة المسار',
            }),
        ).toBe(false);
        expect(
            isAdminRequestsTabDecision({
                requestKind: 'special_followup',
                title: 'مخاطبة جهة حكومية',
            }),
        ).toBe(false);
    });
});
