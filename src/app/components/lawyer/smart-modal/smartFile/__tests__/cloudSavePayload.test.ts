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
});
