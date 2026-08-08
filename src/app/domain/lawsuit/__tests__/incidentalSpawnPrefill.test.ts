import { describe, expect, it } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    buildIncidentalSpawnParentSnapshot,
    buildIncidentalSpawnPrefill,
    enrichIncidentalSpawnContext,
    isCounterClaimAllowedStage,
    validateIncidentalSpawnSave,
} from '../incidentalSpawnPrefill';

const parentFile = {
    id: 1,
    type: 'lawsuit',
    status: 'active',
    caseNo: '100/2026',
    court: 'محكمة بداءة الرصافة',
    judge: 'القاضي أحمد',
    docType: 'تعويض',
    currentStage: 'بداءة بدرجة أولى',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
    stages: [
        {
            stageName: 'بداءة بدرجة أولى',
            court: 'محكمة بداءة الرصافة',
            judge: 'القاضي أحمد',
            docType: 'تعويض',
            parties: [
                { id: 1, name: 'علي', role: 'المدعي', isClient: true },
                { id: 2, name: 'حسن', role: 'المدعي', isClient: false },
                { id: 3, name: 'محمد', role: 'المدعى عليه', isClient: false },
            ],
            status: 'active',
        },
    ],
    activeStageIndex: 0,
} as unknown as FileData;

describe('incidentalSpawnPrefill', () => {
    it('detects counter-allowed stages', () => {
        expect(isCounterClaimAllowedStage('بداءة بدرجة أولى')).toBe(true);
        expect(isCounterClaimAllowedStage('اعتراض على الحكم الغيابي')).toBe(true);
        expect(isCounterClaimAllowedStage('استئناف')).toBe(false);
        expect(isCounterClaimAllowedStage('إعادة المحاكمة')).toBe(false);
        expect(isCounterClaimAllowedStage('إعادة للمحاكمة')).toBe(false);
    });

    it('builds parent snapshot from active stage', () => {
        const snap = buildIncidentalSpawnParentSnapshot(parentFile);
        expect(snap.court).toBe('محكمة بداءة الرصافة');
        expect(snap.judge).toBe('القاضي أحمد');
        expect(snap.stage).toBe('بداءة بدرجة أولى');
        expect(snap.plaintiffs).toHaveLength(2);
        expect(snap.defendants).toHaveLength(1);
    });

    it('joined prefill keeps plaintiff/defendant sides', () => {
        const ctx = enrichIncidentalSpawnContext(parentFile, {
            parentFileId: 1,
            parentCaseNo: '100/2026',
            incidentalId: 'inc_1',
            type: 'joined',
        });
        const prefill = buildIncidentalSpawnPrefill(ctx);
        expect(prefill.parties1).toHaveLength(2);
        expect(prefill.parties2).toHaveLength(1);
        expect(prefill.caseDetails.court).toBe('محكمة بداءة الرصافة');
        expect(prefill.requiresFilingPartyPick).toBe(true);
    });

    it('counter prefill swaps sides', () => {
        const ctx = enrichIncidentalSpawnContext(parentFile, {
            parentFileId: 1,
            parentCaseNo: '100/2026',
            incidentalId: 'inc_2',
            type: 'counter',
        });
        const prefill = buildIncidentalSpawnPrefill(ctx);
        expect(prefill.parties1[0].name).toBe('محمد');
        expect(prefill.parties2).toHaveLength(2);
        expect(prefill.headerBadge.label).toBe('دعوى متقابلة');
    });

    it('requires filing party when multiple candidates', () => {
        const ctx = enrichIncidentalSpawnContext(parentFile, {
            parentFileId: 1,
            parentCaseNo: '100/2026',
            incidentalId: 'inc_1',
            type: 'joined',
        });
        const prefill = buildIncidentalSpawnPrefill(ctx);
        expect(validateIncidentalSpawnSave(ctx, {})).toContain('مقدّم');
        expect(
            validateIncidentalSpawnSave(ctx, {
                filingPartyId: prefill.filingPartyCandidates[0].id,
                opposingPartyId: prefill.opposingPartyCandidates[0].id,
            }),
        ).toBeNull();
    });

    it('joined with multiple defendants requires opposing pick', () => {
        const multiDefParent = {
            ...parentFile,
            stages: [
                {
                    ...parentFile.stages![0],
                    parties: [
                        { id: 1, name: 'علي', role: 'المدعي', isClient: true },
                        { id: 3, name: 'محمد', role: 'المدعى عليه', isClient: false },
                        { id: 4, name: 'كريم', role: 'المدعى عليه', isClient: false },
                    ],
                },
            ],
        } as unknown as FileData;
        const ctx = enrichIncidentalSpawnContext(multiDefParent, {
            parentFileId: 1,
            parentCaseNo: '100/2026',
            incidentalId: 'inc_4',
            type: 'joined',
        });
        const prefillAll = buildIncidentalSpawnPrefill(ctx);
        expect(prefillAll.requiresOpposingPartyPick).toBe(true);
        expect(
            validateIncidentalSpawnSave(ctx, { filingPartyId: prefillAll.filingPartyCandidates[0].id }),
        ).toContain('المدعى عليه');
        const narrowed = buildIncidentalSpawnPrefill(ctx, {
            filingPartyId: prefillAll.filingPartyCandidates[0].id,
            opposingPartyId: prefillAll.opposingPartyCandidates[1].id,
        });
        expect(narrowed.parties1).toHaveLength(1);
        expect(narrowed.parties2).toHaveLength(1);
        expect(narrowed.parties2[0].name).toBe('كريم');
    });

    it('uses stage override when enriching spawn context', () => {
        const ctx = enrichIncidentalSpawnContext(parentFile, {
            parentFileId: 1,
            parentCaseNo: '100/2026',
            incidentalId: 'inc_3',
            type: 'counter',
            stageOverride: {
                stageIndex: 0,
                stageName: 'بداءة بدرجة أولى',
                court: 'محكمة من المرحلة المعروضة',
                judge: 'قاضي المعروض',
                docType: 'تعويض',
                parties: [
                    { id: 1, name: 'علي', role: 'المدعي', isClient: true },
                    { id: 3, name: 'محمد', role: 'المدعى عليه', isClient: false },
                ],
            },
        });
        const prefill = buildIncidentalSpawnPrefill(ctx);
        expect(prefill.caseDetails.court).toBe('محكمة من المرحلة المعروضة');
        expect(prefill.parties1[0].name).toBe('محمد');
    });
});
