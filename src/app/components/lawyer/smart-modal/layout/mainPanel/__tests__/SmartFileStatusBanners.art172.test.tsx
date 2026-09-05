import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CaseStage } from '../../../../LawyerShared';
import {
    ART172_STAY_BADGE,
    ART172_SUSPENSION_REASON,
} from '../../../smartFile/art172AppealStay';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';
import { SmartFileStatusBanners } from '../SmartFileStatusBanners';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
];

const firstInstance = {
    id: 's0',
    name: 'بداءة بدرجة أولى',
    stageName: 'بداءة بدرجة أولى',
    status: 'locked',
    judgmentForm: 'مختلط',
    disputeIntegrity: 'indivisible',
    partyJudgmentDispositions: [
        { partyId: '2', form: 'حضوري' },
        { partyId: '3', form: 'غيابي' },
    ],
    parties: PARTIES,
} as CaseStage;

const appeal = {
    id: 's1',
    name: 'الاستئناف',
    stageName: 'الاستئناف',
    status: 'active',
    parties: PARTIES,
    appealMetadata: {
        appellantPartyIds: ['2'],
        appelleePartyIds: ['1', '3'],
        priorStageOutcome: 'LOSS',
        priorJudgmentForm: 'MIXED',
    },
} as CaseStage;

describe('SmartFileStatusBanners — م/172', () => {
    it('يعرض شارة الاستئخار الصفراء عند وقف الاستئناف', () => {
        render(
            <SmartFileStatusBanners
                displayStage={{
                    ...appeal,
                    isSuspended: true,
                    suspensionReason: ART172_SUSPENSION_REASON,
                }}
                status="نشطة"
                stages={[firstInstance, appeal]}
            />,
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayBadge).textContent).toBe(
            ART172_STAY_BADGE,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art191ExecutionStay)).toBeNull();
    });

    it('لا يعرض بانرات توجيه الطعن أو تغطية تعليمية بعد زوال سبب الاستئخار', () => {
        const judgedObjection = {
            id: 's-obj',
            name: 'الاعتراض على الحكم الغيابي',
            stageName: 'الاعتراض على الحكم الغيابي',
            status: 'active',
            finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
            parties: [
                { id: 1, name: 'أحمد', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true },
                { id: 3, name: 'كريم', role: 'المعترض على الحكم الغيابي (المدعى عليه)', isClient: false },
            ],
        } as CaseStage;
        render(
            <SmartFileStatusBanners
                displayStage={{
                    ...appeal,
                    isSuspended: true,
                    suspensionReason: ART172_SUSPENSION_REASON,
                }}
                status="نشطة"
                stages={[firstInstance, appeal, judgedObjection]}
            />,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayBadge)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.objectionAppealGuidance)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art172Coverage)).toBeNull();
        expect(screen.queryByText(/زال سبب الاستئخار/)).toBeNull();
        expect(screen.queryByText(/لا تكتفِ بفك الاستئخار/)).toBeNull();
        expect(screen.queryByText(/امتد أثر إبطال الحكم الغيابي/)).toBeNull();
    });

    it('لا يعرض بطاقات الطعن الفردية — الصفة تُقرأ من السجل الزمني', () => {
        render(
            <SmartFileStatusBanners
                displayStage={appeal}
                status="نشطة"
                stages={[
                    {
                        ...firstInstance,
                        partyChallengeLanes: [
                            {
                                partyId: '2',
                                disposition: 'حضوري',
                                laneState: 'appeal',
                                appealDeadline: '2026-08-20',
                            },
                            {
                                partyId: '3',
                                disposition: 'غيابي',
                                laneState: 'pending',
                            },
                        ],
                    },
                    appeal,
                ]}
            />,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.partyChallengeLanes)).toBeNull();
        expect(screen.queryByText('بطاقات الطعن الفردية')).toBeNull();
    });

    it('يعرض إفادة الشركاء من النقض عملاً بالمادة 210', () => {
        render(
            <SmartFileStatusBanners
                displayStage={appeal}
                status="نشطة"
                stages={[
                    {
                        ...firstInstance,
                        partyChallengeLanes: [
                            {
                                partyId: '2',
                                disposition: 'حضوري',
                                laneState: 'cassation',
                            },
                            {
                                partyId: '3',
                                disposition: 'غيابي',
                                laneState: 'REVIVED_BY_CASSATION_EXTENSION',
                            },
                        ],
                    },
                    appeal,
                ]}
            />,
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art210Extension).textContent).toContain('210');
    });
});
