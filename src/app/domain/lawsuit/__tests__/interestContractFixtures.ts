/**
 * أطراف وتصرفات مشتركة لعقد المصلحة S1–S4 (محاكاة فقط).
 */
import type { CaseStage, Party } from '@/app/components/lawyer/LawyerShared';

export const IC_PLAINTIFF: Party = {
    id: 1,
    name: 'أحمد',
    role: 'المدعي',
    isClient: false,
    side: 'right',
};
export const IC_D1: Party = {
    id: 2,
    name: 'سامي',
    role: 'المدعى عليه',
    isClient: false,
    side: 'left',
};
export const IC_D2: Party = {
    id: 3,
    name: 'باسم',
    role: 'المدعى عليه',
    isClient: false,
    side: 'left',
};
export const IC_D3: Party = {
    id: 4,
    name: 'كريم',
    role: 'المدعى عليه',
    isClient: false,
    side: 'left',
};
/** بلا side — وإلا يُصنَّف في عمود الخصوم ويختفي من bucket الاختصام. */
export const IC_INTERPLEADER: Party = {
    id: 5,
    name: 'نادر',
    role: 'شخص ثالث (اختصامي)',
    isClient: false,
};

export const IC_PARTIES = [IC_PLAINTIFF, IC_D1, IC_D2, IC_D3, IC_INTERPLEADER];

/** S1/S2: (1)(2) حضوري، (3) غيابي — الاختصامي خارج المصفوفة */
export const IC_MIXED_D3_GHIABI = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'حضوري' as const },
    { partyId: '4', form: 'غيابي' as const },
];

/** S3: لا إلزام غيابي — الكل حضور-مثل (فوز المدعى عليهم) */
export const IC_ALL_PRESENT = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'حضوري' as const },
    { partyId: '4', form: 'حضوري' as const },
];

/** S4: إلزام الطرفين 3 و 4، رد بحق 2 (مبرَّأ) — حضور مختلط */
export const IC_S4_MIXED_PRESENCE = [
    { partyId: '2', form: 'حضوري' as const, operative: 'released' as const },
    { partyId: '3', form: 'حضوري' as const, operative: 'bound' as const },
    { partyId: '4', form: 'غيابي' as const, operative: 'bound' as const },
];

export function icFirstInstance(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: IC_PARTIES,
        judgmentForm: 'مختلط',
        disputeIntegrity: 'indivisible',
        partyJudgmentDispositions: IC_MIXED_D3_GHIABI,
        ...overrides,
    } as CaseStage;
}

export function icAppealRoll(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        caseNo: 'است/10',
        parties: [
            { ...IC_D1, role: 'المستأنف (المدعى عليه)', side: 'right' },
            { ...IC_D2, role: 'المستأنف (المدعى عليه)', side: 'right' },
            { ...IC_INTERPLEADER, role: 'المستأنف (شخص ثالث اختصامي)', side: 'right' },
            { ...IC_PLAINTIFF, role: 'المستأنف عليه (المدعي)', isClient: true, side: 'left' },
        ],
        ...overrides,
    } as CaseStage;
}

export function icObjectionPending(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's2',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: [
            { ...IC_PLAINTIFF, role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true },
            { ...IC_D3, role: 'المعترض على الحكم الغيابي (المدعى عليه)' },
        ],
        ...overrides,
    } as CaseStage;
}
