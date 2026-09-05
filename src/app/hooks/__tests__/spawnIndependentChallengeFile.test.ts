import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaseStage, FileData, Party } from '@/app/components/lawyer/LawyerShared';
import { clearLawsuitPendingCreatesForTests } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: vi.fn(),
    reconcileBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/hooks/lawsuitPersistDeferred', () => ({
    saveCaseDeferred: vi.fn(),
    syncLawsuitFileToCalendarDeferred: vi.fn(),
}));

vi.mock('@/app/hooks/lawsuitCommitWarn', () => ({
    commitLawsuitPersistOrWarn: vi.fn(async () => true),
}));

vi.mock('@/app/runtime/lawsuitOpenContract', () => ({
    openLawsuitDossierWithContract: (open: () => void) => open(),
}));

vi.mock('@/app/domain/lawsuit/lawsuitFilesRepository', () => ({
    persistLawsuitFiles: (next: FileData[]) => next,
}));

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    { id: 4, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

function sourceFile(id: number | string = 11): FileData {
    const fi: CaseStage = {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: PARTIES,
    } as CaseStage;
    const appeal: CaseStage = {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        parties: PARTIES,
    } as CaseStage;
    const objection: CaseStage = {
        id: 's2',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: PARTIES,
        caseNo: '100/2026',
    } as CaseStage;
    return {
        id: id as number,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'بداءة الكرخ',
        parties: PARTIES,
        history: [],
        notes: [],
        images: [],
        date: '2026-09-02',
        stages: [fi, appeal, objection],
        activeStageIndex: 2,
        representedParty: 'المدعي',
    };
}

describe('persistIndependentChallengeSpawn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        try {
            clearLawsuitPendingCreatesForTests();
        } catch {
            /* ignore */
        }
    });

    it('ينشئ بطاقة مخزن جديدة من نسخة الإضبارة المفتوحة حتى لو كانت قائمة الملفات فارغة', async () => {
        const { persistIndependentChallengeSpawn } = await import('../spawnIndependentChallengeFile');
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        const open = sourceFile(9_900_011);
        const appealStage: CaseStage = {
            id: 's-ind',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            parties: [
                { ...PARTIES[0], role: 'المستأنف (المدعي)' },
                { ...PARTIES[1], role: 'المستأنف عليه (المدعى عليه)' },
            ],
            caseNo: 'است/77',
        } as CaseStage;

        let filesState: FileData[] = [];
        let active: FileData | null = null;
        await persistIndependentChallengeSpawn({
            input: {
                sourceFileId: Number(open.id),
                sourceStages: open.stages ?? [],
                sourceStageIndex: 2,
                appealStage,
                appealType: 'استئناف',
                filingDate: '2026-09-02',
                newCaseNumber: 'است/77',
                newCourt: 'استئناف بغداد',
                sourceFile: open,
            },
            files: [],
            activeFile: null,
            setFiles: (action) => {
                filesState = typeof action === 'function' ? action(filesState) : action;
            },
            setActiveFile: (action) => {
                active = typeof action === 'function' ? action(active) : action;
            },
            userId: null,
        });

        expect(vi.mocked(SmartToast.error).mock.calls).toEqual([]);
        expect(filesState).toHaveLength(2);
        const created = filesState.find((file) => Number(file.id) !== Number(open.id));
        expect(created?.caseNo).toBe('است/77');
        expect(created?.court).toBe('استئناف بغداد');
        expect(created?.independentChallengeLink?.sourceFileId).toBe(Number(open.id));
        expect(created?.parentId).toBe(Number(open.id));
        expect(active?.id).toBe(created?.id);
        expect(vi.mocked(SmartToast.success)).toHaveBeenCalled();
    });
});
