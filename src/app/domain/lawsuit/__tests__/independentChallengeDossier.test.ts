import { describe, expect, it } from 'vitest';
import type { CaseStage, FileData, Party } from '@/app/components/lawyer/LawyerShared';
import {
    allocateLawsuitFileId,
    applyIndependentChallengeSpawn,
    findExtractedAppealStageIndex,
    hasIndependentChallengeCenterInversion,
    shouldSpawnIndependentChallengeDossier,
} from '../independentChallengeDossier';

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

function firstInstance(): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: PARTIES,
        caseNo: '100/2026',
        clientStageOutcome: 'WIN',
    } as CaseStage;
}

function appeal(): CaseStage {
    return {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        caseNo: 'است/10',
        parties: [
            { ...PARTIES[1], role: 'المستأنف (المدعى عليه)' },
            { ...PARTIES[0], role: 'المستأنف عليه (المدعي)' },
        ],
    } as CaseStage;
}

function objection(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's2',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: PARTIES,
        clientStageOutcome: 'LOSS',
        caseNo: '100/2026',
        ...overrides,
    } as CaseStage;
}

describe('independentChallengeDossier', () => {
    it('لا يستقل أول استئناف من البداءة بلا رول مستخرج', () => {
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance()],
                sourceStage: firstInstance(),
                appealType: 'استئناف',
            }),
        ).toBe(false);
    });

    it('يستقل الاستئناف اللاحق من البداءة عند وجود رول استئناف مفتوح (طرف لاحق)', () => {
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance(), appeal()],
                sourceStage: firstInstance(),
                appealType: 'استئناف',
            }),
        ).toBe(true);
    });

    it('يستقل الاستئناف من الاعتراض عند إبطال الحكم الغيابي (انقلاب مراكز)', () => {
        const voidObjection = objection({
            finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
        });
        const stages = [firstInstance(), appeal(), voidObjection];
        expect(findExtractedAppealStageIndex(stages)).toBe(1);
        expect(hasIndependentChallengeCenterInversion({ sourceStage: voidObjection })).toBe(true);
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: voidObjection,
                appealType: 'استئناف',
            }),
        ).toBe(true);
    });

    it('يستقل الاستئناف بعد تأييد الاعتراض إن وُجد رول استئناف قائم (طرف لاحق)', () => {
        const uphold = objection({
            finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
        });
        expect(hasIndependentChallengeCenterInversion({ sourceStage: uphold })).toBe(false);
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance(), appeal(), uphold],
                sourceStage: uphold,
                appealType: 'استئناف',
            }),
        ).toBe(true);
    });

    it('أول اعتراض غيابي يبقى hop داخل الملف', () => {
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance(), appeal()],
                sourceStage: firstInstance(),
                appealType: 'اعتراض على الحكم الغيابي',
            }),
        ).toBe(false);
    });

    it('اعتراض غيابي لاحق يستقل عند وجود اعتراض مفتوح', () => {
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance(), objection()],
                sourceStage: firstInstance(),
                appealType: 'اعتراض على الحكم الغيابي',
            }),
        ).toBe(true);
    });

    it('التمييز من مرحلة الاستئناف يبقى hop متعاقباً', () => {
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages: [firstInstance(), appeal()],
                sourceStage: appeal(),
                appealType: 'تمييز',
            }),
        ).toBe(false);
    });

    it('ينشئ إضبارة جديدة ويقفل المصدر دون لمس مرحلة الاستئناف المستخرجة', () => {
        const sourceFile = {
            id: 11,
            type: 'lawsuit',
            status: 'active',
            caseNo: '100/2026',
            court: 'بداءة الرصافة',
            parties: PARTIES,
            history: [],
            notes: [],
            images: [],
            date: '2026-01-01',
            stages: [
                firstInstance(),
                appeal(),
                objection({ finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن' }),
            ],
            activeStageIndex: 2,
        } as FileData;
        const appealStage = {
            id: 'new_appeal',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            caseNo: 'است/88',
            parties: [
                { ...PARTIES[0], role: 'المستأنف (المدعي)' },
                { ...PARTIES[1], role: 'المستأنف عليه (المدعى عليه)' },
            ],
        } as CaseStage;

        const { sourceFile: patched, createdFile } = applyIndependentChallengeSpawn({
            sourceFile,
            sourceStageIndex: 2,
            createdId: 99,
            appealStage,
            appealType: 'استئناف',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            newCourt: 'استئناف بغداد',
        });

        expect(patched.stages?.[1]?.caseNo).toBe('است/10');
        expect(patched.stages?.[1]?.parties?.[0]?.role).toContain('المستأنف (المدعى عليه)');
        expect(patched.stages?.[2]?.status).toBe('locked');
        expect(createdFile.id).toBe(99);
        expect(createdFile.parentId).toBe(11);
        expect(createdFile.caseNo).toBe('است/88');
        expect(createdFile.court).toBe('استئناف بغداد');
        expect(createdFile.stages?.[0]?.court).toBe('استئناف بغداد');
        expect(createdFile.independentChallengeLink?.sourceFileId).toBe(11);
        expect(createdFile.representedParty).toBeUndefined();
        expect(createdFile.stages).toHaveLength(1);
        expect(allocateLawsuitFileId([sourceFile, createdFile], 11)).toBeGreaterThan(11);
    });

    it('لا يرث محكمة البداءة على الإضبارة المستقلة عندما لا يُدخل رقم/محكمة', () => {
        const sourceFile = {
            id: 11,
            type: 'lawsuit',
            status: 'active',
            caseNo: '100/2026',
            court: 'بداءة الرصافة',
            parties: PARTIES,
            history: [],
            notes: [],
            images: [],
            date: '2026-01-01',
            stages: [
                firstInstance(),
                appeal(),
                objection({ finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن' }),
            ],
            activeStageIndex: 2,
        } as FileData;
        const appealStage = {
            id: 'new_appeal',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            court: 'بداءة الرصافة',
            parties: [
                { ...PARTIES[0], role: 'المستأنف (المدعي)' },
                { ...PARTIES[2], role: 'المستأنف عليه (المدعى عليه)' },
            ],
        } as CaseStage;

        const { createdFile } = applyIndependentChallengeSpawn({
            sourceFile,
            sourceStageIndex: 2,
            createdId: 100,
            appealStage,
            appealType: 'استئناف',
            filingDate: '2026-09-02',
            newCaseNumber: '',
            newCourt: '',
        });

        expect(createdFile.caseNo).toBe('');
        expect(createdFile.court).toBe('');
        expect(createdFile.stages?.[0]?.caseNo).toBe('');
        expect(createdFile.stages?.[0]?.court).toBe('');
        expect(createdFile.caseNo).not.toBe('جديد');
    });

    it('يحفظ رقم الدعوى والمحكمة كما أُدخلا دون اختراع «جديد»', () => {
        const sourceFile = {
            id: 11,
            type: 'lawsuit',
            status: 'active',
            caseNo: '100/2026',
            court: 'بداءة الرصافة',
            parties: PARTIES,
            stages: [firstInstance(), appeal(), objection()],
            activeStageIndex: 2,
        } as FileData;
        const appealStage = {
            id: 'new_appeal',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            parties: [
                { ...PARTIES[0], role: 'المستأنف (المدعي)' },
                { ...PARTIES[2], role: 'المستأنف عليه (المدعى عليه)' },
            ],
        } as CaseStage;

        const { createdFile } = applyIndependentChallengeSpawn({
            sourceFile,
            sourceStageIndex: 2,
            createdId: 101,
            appealStage,
            appealType: 'استئناف',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            newCourt: 'استئناف بغداد',
        });

        expect(createdFile.caseNo).toBe('است/88');
        expect(createdFile.court).toBe('استئناف بغداد');
        expect(createdFile.stages?.[0]?.caseNo).toBe('است/88');
        expect(createdFile.stages?.[0]?.court).toBe('استئناف بغداد');
    });
});
