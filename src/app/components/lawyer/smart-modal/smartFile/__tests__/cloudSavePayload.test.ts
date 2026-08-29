import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { buildCloudSavePayload } from '../cloudSavePayload';

describe('buildCloudSavePayload', () => {
    it('includes judge from active stage when parent judge is empty', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'الاستئناف',
                caseNo: '55/2026',
                court: 'استئناف بغداد',
                judge: 'القاضي أحمد',
                parties: [],
                timeline: [],
                status: 'active',
            },
        ] as unknown as CaseStage[];

        const payload = buildCloudSavePayload(
            stages,
            { id: 1, caseNo: '', court: '', judge: '' },
            0,
            'نشطة',
        );

        expect(payload.judge).toBe('القاضي أحمد');
        expect(payload.stages).toHaveLength(1);
        expect(payload.activeStageIndex).toBe(0);
        expect(payload.currentStage).toBe('الاستئناف');
    });

    it('prefers active stage caseNo/court/docType over stale parent values', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'البداءة',
                caseNo: '99/2026',
                court: 'محكمة جديدة',
                docType: 'تعويض',
                judge: 'قاضي جديد',
                parties: [],
                timeline: [],
                status: 'active',
            },
        ] as unknown as CaseStage[];

        const payload = buildCloudSavePayload(
            stages,
            {
                id: 1,
                caseNo: 'قديم',
                court: 'محكمة قديمة',
                docType: 'نوع قديم',
                judge: 'قاضي قديم',
            },
            0,
            'نشطة',
        );

        expect(payload.caseNo).toBe('99/2026');
        expect(payload.court).toBe('محكمة جديدة');
        expect(payload.docType).toBe('تعويض');
        expect(payload.judge).toBe('قاضي جديد');
    });

    it('coerces numeric dossier id to string for cloud handoff', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'البداءة',
                parties: [],
                timeline: [],
                status: 'active',
            },
        ] as unknown as CaseStage[];

        const payload = buildCloudSavePayload(stages, { id: 9001, caseNo: '1/2026' }, 0, 'نشطة');

        expect(payload.id).toBe('9001');
        expect(typeof payload.id).toBe('string');
    });
});
