import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { buildCloudSavePayload } from '../cloudSavePayload';
import { buildInitialParentDataFromFile } from '../parentDataInit';
import { buildStepperStagesFromArray } from '../stepperStages';
import { resolveSwipeViewingIndex } from '../stageSwipe';
import { applyStageTransition } from '../stageTransition';
import {
    buildNotificationTogglePatch,
    cycleDefendantNotificationStatus,
    parseStepperStageIndex,
    patchActiveStage,
} from '../stageMutations';
import {
    filterTimelineEmptyTrash,
    mapTimelineSoftDelete,
} from '../timelineMutations';
import { buildCaseShareReportText } from '../shareCaseReport';
import { addCalendarDaysFrom, parseJudgmentBaseDate } from '../judgmentDates';

describe('smartFile core utilities', () => {
    it('buildInitialParentDataFromFile maps represented party aliases', () => {
        const parent = buildInitialParentDataFromFile({
            id: 1,
            representedParty: 'plaintiff',
            parties: [{ name: 'أ' }],
        });
        expect(parent.representedParty).toBe('المدعي');
        expect(parent.originalParties).toHaveLength(1);
    });

    it('buildCloudSavePayload mirrors active stage fields', () => {
        const stages = [
            {
                id: 's1',
                name: 'بداءة',
                stageName: 'بداءة',
                status: 'active',
                caseNo: '1/أ/2026',
                court: 'كرخ',
                parties: [],
                timeline: [{ id: 'e1' }],
                tasks: [],
            } as unknown as CaseStage,
        ];
        const parent = buildInitialParentDataFromFile({ id: 'x' });
        const payload = buildCloudSavePayload(stages, parent, 0, 'نشطة');
        expect(payload.caseNo).toBe('1/أ/2026');
        expect(payload.activeStageIndex).toBe(0);
    });

    it('buildStepperStagesFromArray marks active and locked steps', () => {
        const stages = [
            { id: 'a', name: 'أولى', stageName: 'أولى', status: 'completed' } as CaseStage,
            { id: 'b', name: 'ثانية', stageName: 'ثانية', status: 'active' } as CaseStage,
        ];
        const { stepperStages, currentStageId } = buildStepperStagesFromArray(stages, 1);
        expect(stepperStages[1]!.status).toBe('active');
        expect(stepperStages[0]!.status).toBe('locked');
        expect(currentStageId).toBe('stg_2');
    });

    it('resolveSwipeViewingIndex moves within bounds', () => {
        expect(resolveSwipeViewingIndex(0, 3, 200, 100)).toBe(1);
        expect(resolveSwipeViewingIndex(2, 3, 50, 150)).toBe(1);
        expect(resolveSwipeViewingIndex(1, 3, 100, 100)).toBeNull();
    });

    it('patchActiveStage and parseStepperStageIndex work', () => {
        const stages = [{ id: 's0', name: 'أ', stageName: 'أ', status: 'active' } as CaseStage];
        const patched = patchActiveStage(stages, 0, { caseNo: '1/2026' });
        expect((patched[0] as CaseStage & { caseNo?: string }).caseNo).toBe('1/2026');
        expect(parseStepperStageIndex('stg_1', 1)).toBe(0);
        expect(parseStepperStageIndex('stg_9', 1)).toBeNull();
    });

    it('notification cycle and timeline soft delete', () => {
        expect(cycleDefendantNotificationStatus('pending')).toBe('in_person');
        expect(cycleDefendantNotificationStatus('waiting')).toBe('in_person');
        const stage = {
            id: 's',
            name: 'x',
            status: 'active',
            parties: [{}, { notificationStatus: 'waiting' }],
        } as CaseStage;
        const patch = buildNotificationTogglePatch(stage, 'in_person');
        expect((patch.parties as { notificationStatus?: string }[])[1]?.notificationStatus).toBe(
            'in_person',
        );

        const timeline = [
            { id: 'a', title: 'x' },
            { id: 'b', title: 'y' },
        ] as Parameters<typeof mapTimelineSoftDelete>[0];
        const deleted = mapTimelineSoftDelete(timeline, 'a', true);
        expect(deleted.find((e) => e.id === 'a')?.isDeleted).toBe(true);
        expect(filterTimelineEmptyTrash(deleted)).toHaveLength(1);
    });

    it('judgmentDates adds calendar days from YMD input', () => {
        const base = parseJudgmentBaseDate('2026-05-01');
        expect(addCalendarDaysFrom(base, 10)).toBe('2026-05-11');
    });

    it('buildCaseShareReportText includes court and parties', () => {
        const text = buildCaseShareReportText({
            court: 'كرخ',
            caseNo: '1/2026',
            parties: [
                { role: 'المدعي', name: 'أحمد' },
                { role: 'المدعى عليه', name: 'علي' },
            ],
            timeline: [{ title: 'جلسة', date: '2026-05-01' }],
        });
        expect(text).toContain('كرخ');
        expect(text).toContain('أحمد');
        expect(text).toContain('جلسة');
    });

    it('applyStageTransition completes current and appends blank child', () => {
        const current = {
            id: 's0',
            name: 'بداءة',
            stageName: 'بداءة',
            status: 'active',
        } as CaseStage;
        const { updatedStages, newActiveIndex } = applyStageTransition([current], 0, current, {
            newStage: 'استئناف',
            result: 'رفض',
            date: '2026-05-01',
        });
        expect(updatedStages).toHaveLength(2);
        expect(updatedStages[0]!.status).toBe('completed');
        expect(updatedStages[1]!.stageName).toBe('استئناف');
        expect(newActiveIndex).toBe(1);
    });
});
