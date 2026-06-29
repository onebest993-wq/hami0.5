import { describe, expect, it } from 'vitest';
import { deriveDecisionCardHubBodyText } from '../decisionCardPresentationDerived';
import type { Decision } from '../../types';

describe('deriveDecisionCardHubBodyText', () => {
    it('يخفي نص الطلب المكرر لطلبات المحضر بعد صدور قرار المنفذ', () => {
        const decision = {
            id: 'personal_coercive_x',
            title: 'طلب إحضار جبري للمدين',
            body: 'طلب إحضار بالقوة لمثول المدين أمام دائرة التنفيذ بعد انتهاء المهلة دون حضور طوعي',
            requestKind: 'personal_coercive',
            executorOutcome: 'approved',
            date: '2026-06-25',
        } as Decision;

        expect(deriveDecisionCardHubBodyText(decision, 'إحضار جبري للمدين')).toBe('');
    });

    it('يبقي ملخص وفاة طرف الدائن', () => {
        const decision = {
            id: 'death_1',
            title: 'طلب وفاة',
            body: '{"deceasedName":"أحمد"}',
            requestKind: 'creditor_party_death',
            executorOutcome: 'approved',
            date: '2026-06-25',
        } as Decision;

        expect(deriveDecisionCardHubBodyText(decision, 'وفاة')).toContain('أحمد');
    });
});
