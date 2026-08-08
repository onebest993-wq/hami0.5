import { describe, it, expect } from 'vitest';
import { migrateCriminalPersistState } from '@/app/components/lawyer/criminal-system/criminalStorePersistMigrate';

type MigrateResult = {
    draft?: Record<string, any>;
    casesById?: Record<string, any>;
    pendingSeveranceContext?: unknown;
};

function emptyDraft() {
    return { basics: { stage: '' }, complainants: [], defendants: [] };
}

describe('migrateCriminalPersistState', () => {
    it('يُرجع null/undefined كما هي', () => {
        expect(migrateCriminalPersistState(null)).toBe(null);
        expect(migrateCriminalPersistState(undefined)).toBe(undefined);
    });

    it('يُرجع primitives دون تغيير', () => {
        expect(migrateCriminalPersistState('x')).toBe('x');
        expect(migrateCriminalPersistState(42)).toBe(42);
    });

    it('يُ normalizes draft فارغ مع casesById فارغ', () => {
        const input = {
            draft: emptyDraft(),
            casesById: {},
            pendingSeveranceContext: null,
        };
        const out = migrateCriminalPersistState(input) as typeof input;
        expect(out).toBeTruthy();
        expect(out.casesById).toEqual({});
    });

    // الأشكال التالية كانت تُسقط الترحيل بـ ReferenceError فتختفي كل الأضابير صامتةً.
    it('يُبقي متّهم المسوّدة بعد الترحيل', () => {
        const out = migrateCriminalPersistState({
            draft: {
                basics: { stage: 'مرحلة التحقيق' },
                complainants: [],
                defendants: [{ id: 'd1', fullName: 'متهم تجريبي' }],
            },
            casesById: {},
            pendingSeveranceContext: null,
        }) as MigrateResult;

        expect(out.draft?.defendants).toHaveLength(1);
        expect(out.draft?.defendants?.[0]?.fullName).toBe('متهم تجريبي');
    });

    it('يُبقي القضية المحفوظة ومتّهميها بعد الترحيل', () => {
        const out = migrateCriminalPersistState({
            draft: emptyDraft(),
            casesById: {
                c1: {
                    id: 'c1',
                    caseNumber: '2024/1',
                    defendants: [{ id: 'd1', fullName: 'متهم تجريبي' }],
                },
            },
            pendingSeveranceContext: null,
        }) as MigrateResult;

        expect(Object.keys(out.casesById ?? {})).toEqual(['c1']);
        expect(out.casesById?.c1?.defendants).toHaveLength(1);
        expect(out.casesById?.c1?.defendants?.[0]?.fullName).toBe('متهم تجريبي');
    });

    it('يُبقي أحداث الخط الزمني السليمة ويستبعد التالفة', () => {
        const out = migrateCriminalPersistState({
            draft: emptyDraft(),
            casesById: {
                c1: {
                    id: 'c1',
                    caseNumber: '2024/1',
                    defendants: [],
                    timelineEvents: [
                        {
                            id: 'e1',
                            date: '2024-01-01',
                            category: 'تدوين إفادة',
                            title: 'إفادة الشاكي',
                            description: 'نص الإفادة',
                        },
                        { id: 'e2', date: '', category: '', title: '', description: '' },
                    ],
                },
            },
            pendingSeveranceContext: null,
        }) as MigrateResult;

        const events = out.casesById?.c1?.timelineEvents ?? [];
        expect(events).toHaveLength(1);
        expect(events[0]?.id).toBe('e1');
    });

    it('لا يفقد أي قضية عند ترحيل حالة واقعية مركّبة', () => {
        const out = migrateCriminalPersistState({
            draft: emptyDraft(),
            casesById: {
                c1: { id: 'c1', caseNumber: '2024/1', defendants: [{ id: 'd1', fullName: 'أ' }] },
                c2: {
                    id: 'c2',
                    caseNumber: '2024/2',
                    defendants: [{ id: 'd2', fullName: 'ب' }],
                    timelineEvents: [{ id: 'e1', date: '2024-02-01', category: 'جلسة', title: 'جلسة' }],
                },
                c3: { id: 'c3', caseNumber: '2024/3', defendants: [] },
            },
            pendingSeveranceContext: null,
        }) as MigrateResult;

        expect(Object.keys(out.casesById ?? {}).sort()).toEqual(['c1', 'c2', 'c3']);
    });
});
