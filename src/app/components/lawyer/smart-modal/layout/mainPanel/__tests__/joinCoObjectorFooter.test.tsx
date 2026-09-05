import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../../LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import { resolveSmartFileMainPanelFooterFlags } from '../resolveSmartFileMainPanelFooterFlags';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { computeLaneObjectionDeadline } from '@/app/domain/lawsuit/partyChallengeLanes';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: false },
    { id: 2, name: 'سامي', role: 'المعترض على الحكم الغيابي (المدعى عليه)', isClient: false },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: true },
];

describe('واجهة ضم المعترض اللاحق (أُلغيت)', () => {
    it('لا يظهر زر إضافة معترض آخر — المسار إضبارة مستقلة', () => {
        const today = getLocalTodayYmd();
        const deadline = computeLaneObjectionDeadline(today);
        const fi = {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'locked',
            isPleadingsClosed: true,
            judgmentForm: 'غيابي',
            parties: PARTIES,
            partyChallengeLanes: [
                {
                    partyId: '2',
                    disposition: 'غيابي',
                    laneState: 'objection',
                    servedAt: today,
                    objectionDeadline: deadline,
                },
                {
                    partyId: '3',
                    disposition: 'غيابي',
                    laneState: 'pending',
                    servedAt: today,
                    objectionDeadline: deadline,
                },
            ],
        } as CaseStage;
        const objection = {
            id: 's1',
            name: 'الاعتراض على الحكم الغيابي',
            stageName: 'الاعتراض على الحكم الغيابي',
            status: 'active',
            parties: PARTIES,
        } as CaseStage;

        const flags = resolveSmartFileMainPanelFooterFlags({
            status: 'نشطة',
            isViewingArchived: false,
            parentData: { representedParty: 'المدعي', parties: PARTIES } as SmartFileParentData,
            displayStage: objection,
            currentStage: objection,
            stages: [fi, objection],
            activeStageIndex: 1,
            viewingStageIndex: 1,
            isPaused: false,
            isInterrupted: false,
            displayStageLabel: objection.stageName,
            currentStageLabel: objection.stageName,
        });

        expect(flags.showJoinCoObjectorFooter).toBe(false);
        expect(flags.joinCoObjectorCandidates).toEqual([]);
    });
});
