import { describe, expect, it } from 'vitest';
import { computeLawsuitSmartStatus } from '../lawsuitArchiveSmartStatus';

describe('computeLawsuitSmartStatus', () => {
    it('marks voided dossiers as مبطلة not مستمرة', () => {
        const status = computeLawsuitSmartStatus({
            status: 'مبطلة',
            stages: [
                {
                    stageName: 'البداءة',
                    isVoided: true,
                    finalDecision: 'مبطلة — ترك للمراجعة للمرة الثانية',
                    status: 'voided',
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('مبطلة');
        expect(status.type).toBe('annulled');
    });

    it('detects paused and interrupted statuses', () => {
        expect(computeLawsuitSmartStatus({ status: 'مستأخرة', stages: [] }).label).toBe('مستأخرة');
        expect(computeLawsuitSmartStatus({ status: 'منقطعة', stages: [] }).label).toBe('منقطعة');
    });

    it('marks finalized dossiers as انتهت with full legal title', () => {
        const status = computeLawsuitSmartStatus({
            status: 'نشطة',
            stages: [
                {
                    stageName: 'تصحيح قرار',
                    finalDecision: 'مكتسبة الدرجة القطعية',
                    status: 'completed',
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('انتهت');
        expect(status.title).toBe('مكتسبة الدرجة القطعية');
        expect(status.type).toBe('final');
    });

    it('does not trust a stale parent review status without active-stage evidence', () => {
        const status = computeLawsuitSmartStatus({
            status: 'متروكة للمراجعة',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'active',
                    abandonmentDate: undefined,
                    finalDecision: null,
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('مستمرة');
        expect(status.type).toBe('active');
    });

    it('keeps an explicitly selected completed-stage review decision', () => {
        const status = computeLawsuitSmartStatus({
            status: 'نشطة',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'completed',
                    finalDecision: 'متروكة للمراجعة',
                    legalTimers: { reviewDeadline: '2099-01-01' },
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('متروكة للمراجعة');
        expect(status.type).toBe('review');
    });

    it('shows انتهت when finalization conflicts with stale review metadata', () => {
        const status = computeLawsuitSmartStatus({
            status: 'منتهية',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'completed',
                    finalDecision: 'مكتسبة الدرجة القطعية',
                    abandonmentDate: '2026-01-01',
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('انتهت');
        expect(status.type).toBe('final');
    });

    it('derives the card from the active stage, not a finalized historical stage', () => {
        const status = computeLawsuitSmartStatus({
            status: 'مرحلة الاستئناف',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'completed',
                    finalDecision: 'مكتسبة الدرجة القطعية',
                },
                {
                    stageName: 'الاستئناف',
                    status: 'active',
                    finalDecision: null,
                },
            ],
            activeStageIndex: 1,
        });
        expect(status.label).toBe('مستمرة');
        expect(status.type).toBe('active');
    });

    it('لا يعتبر الغائب قطعيّاً إذا شمله استئناف الشريك لوحدة النزاع', () => {
        const status = computeLawsuitSmartStatus({
            status: 'مكتسبة الدرجة القطعية',
            disputeIntegrity: 'indivisible',
            parties: [
                { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
                { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
                { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
            ],
            stages: [
                {
                    stageName: 'بداءة بدرجة أولى',
                    status: 'locked',
                    judgmentForm: 'مختلط',
                    disputeIntegrity: 'indivisible',
                    partyJudgmentDispositions: [
                        { partyId: '2', form: 'حضوري' },
                        { partyId: '3', form: 'غيابي' },
                    ],
                    parties: [
                        { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
                        { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
                        { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
                    ],
                    finalDecision: 'إجابة الدعوى بالكامل',
                },
                {
                    stageName: 'الاستئناف',
                    status: 'active',
                    appealMetadata: {
                        appellantPartyIds: ['2'],
                        appelleePartyIds: ['1', '3'],
                    },
                },
            ],
            activeStageIndex: 1,
        } as never);
        expect(status.type).not.toBe('final');
        expect(status.title).not.toBe('مكتسبة الدرجة القطعية');
    });

    it('لا يعتبر الحكم المختلط غير القابل للتجزئة قطعيّاً قبل انقضاء الاعتراض', () => {
        const status = computeLawsuitSmartStatus({
            status: 'مكتسبة الدرجة القطعية',
            disputeIntegrity: 'indivisible',
            stages: [
                {
                    stageName: 'بداءة بدرجة أولى',
                    status: 'active',
                    judgmentForm: 'مختلط',
                    disputeIntegrity: 'indivisible',
                    partyJudgmentDispositions: [
                        { partyId: '2', form: 'حضوري' },
                        { partyId: '3', form: 'غيابي' },
                    ],
                    finalDecision: 'إجابة الدعوى بالكامل',
                },
            ],
            activeStageIndex: 0,
        } as never);
        expect(status.type).not.toBe('final');
    });
});
