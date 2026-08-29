import { describe, expect, it } from 'vitest';
import {
    allLawsuitFilesForArchive,
    buildFileDataFromNewCaseSave,
} from '../lawsuitFileFactory';

describe('allLawsuitFilesForArchive', () => {
    it('keeps lawsuit files across lifecycle statuses', () => {
        const files = [
            { id: 1, type: 'lawsuit', status: 'active' },
            { id: 2, type: 'lawsuit', status: 'deleted' },
            { id: 3, type: 'execution', status: 'active' },
        ];
        expect(allLawsuitFilesForArchive(files).map((f) => f.id)).toEqual([1, 2]);
    });
});

describe('buildFileDataFromNewCaseSave', () => {
    it('builds from LawyerNewCase CaseFormData shape', () => {
        const file = buildFileDataFromNewCaseSave({
            title: 'lawsuit',
            type: 'civil',
            court: 'محكمة الكرخ',
            caseNumber: '100 / أ / 2026',
            subType: 'مطالبة مالية',
            parties: [
                { id: 'p1', name: 'موكل', role: 'مدعي', isClient: true },
                { id: 'p2', name: 'خصم', role: 'مدعى عليه', isClient: false },
            ],
        });
        expect(file).not.toBeNull();
        expect(file!.type).toBe('lawsuit');
        expect(file!.court).toBe('محكمة الكرخ');
        expect(file!.caseNo).toBe('100 / أ / 2026');
        expect(file!.docType).toBe('مطالبة مالية');
        expect(file!.parties).toHaveLength(2);
        expect(file!.parties[0]!.isClient).toBe(true);
    });

    it('respects isClient flags per side in structured payload', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            parties1: [{ id: 1, name: 'المدعي', status: 'مدعي', isClient: true }],
            parties2: [{ id: 2, name: 'المدعى', status: 'مدعى عليه', isClient: false }],
            details: { number: '50 / ب / 2025', court: 'بداءة' },
        });
        expect(file!.parties[0]!.isClient).toBe(true);
        expect(file!.parties[1]!.isClient).toBe(false);
        expect((file as { representedParty?: string }).representedParty).toBe('المدعي');
    });

    it('builds from structured dashboard payload with details and parties1/2', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            parties1: [{ id: 1, name: 'المدعي', status: 'مدعي', phone: '07' }],
            parties2: [{ id: 2, name: 'المدعى', status: 'مدعى عليه' }],
            details: {
                number: '50 / ب / 2025',
                court: 'بداءة',
                type: 'تعويض',
                totalAgreedFees: '1,000,000',
            },
        });
        expect(file!.caseNo).toBe('50 / ب / 2025');
        expect(file!.feesTotal).toBe('1000000');
        expect(file!.parties).toHaveLength(2);
    });

    it('persists lawsuitJurisdiction from selectedType on structured save', () => {
        const personal = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            parties1: [{ name: 'موكل', status: 'مدعي' }],
            parties2: [{ name: 'خصم', status: 'مدعى عليه' }],
            details: { number: '1 / أ / 2026', court: 'أحوال' },
        });
        expect(personal!.lawsuitJurisdiction).toBe('personal');

        const civil = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'مدعي' }],
            parties2: [{ name: 'خصم', status: 'مدعى عليه' }],
            details: { number: '2 / ب / 2026', court: 'بداءة' },
        });
        expect(civil!.lawsuitJurisdiction).toBe('civil');
    });

    it('persists applicableLaw for personal status cases', () => {
        const personal = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            applicableLaw: 'jaafari_code',
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المدعى عليه' }],
            details: {
                number: '3 / ج / 2026',
                court: 'محكمة الأحوال الشخصية',
                type: 'طلاق',
                stage: 'أحوال شخصية',
                applicableLaw: 'jaafari_code',
            },
        });
        expect(personal!.applicableLaw).toBe('jaafari_code');
    });

    it('persists isUndeterminedValue and isFixedFee flags', () => {
        const undetermined = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            isUndeterminedValue: true,
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المدعى عليه' }],
            details: { court: 'بداءة الكرخ', type: 'تعويض', stage: 'بداءة بدرجة أخيرة' },
        });
        expect(undetermined!.isUndeterminedValue).toBe(true);
        expect(undetermined!.isFixedFee).toBeUndefined();

        const fixed = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            isFixedFee: true,
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المدعى عليه' }],
            details: { court: 'بداءة الكرخ', type: 'نزاع مرور', stage: 'بداءة بدرجة أخيرة' },
        });
        expect(fixed!.isFixedFee).toBe(true);
    });

    it('maps interpleader and affiliative third parties', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'المدعي', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'المدعى', status: 'المدعى عليه' }],
            thirdParties: [
                {
                    id: 901,
                    name: 'اختصامي E2E',
                    entryMode: 'interpleader',
                    status: 'الشخص الثالث الاختصامي',
                    roleLabel: 'شخص ثالث (اختصامي)',
                },
                {
                    id: 902,
                    name: 'انضمامي E2E',
                    entryMode: 'affiliative',
                    affiliatedSide: 1,
                    status: 'مدخل انضمامي — المدعي',
                    roleLabel: 'شخص ثالث (انضمامي — جانب المدعي)',
                },
            ],
            details: { court: 'بداءة الكرخ', type: 'تعويض', stage: 'بداءة بدرجة أخيرة' },
        });
        expect(file!.parties).toHaveLength(4);
        expect(file!.thirdParties).toHaveLength(2);
        const interpleader = file!.parties.find((p) => p.name === 'اختصامي E2E');
        expect(interpleader?.role).toContain('اختصامي');
        expect(interpleader?.side).toBeUndefined();
        const affiliative = file!.parties.find((p) => p.name === 'انضمامي E2E');
        expect(affiliative?.side).toBe('right');
    });

    it('persists claimValue from structured details', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المدعى عليه' }],
            details: {
                court: 'بداءة الكرخ',
                type: 'تعويض',
                stage: 'بداءة بدرجة أولى',
                claimValue: '2,500,000',
            },
        });
        expect(file!.claimValue).toBe('2500000');
        expect(file!.currentStage).toBe('بداءة بدرجة أولى');
    });

    it('persists retrialTargetStage for إعادة المحاكمة', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'طالب إعادة المحاكمة', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المطلوب إعادة المحاكمة ضده' }],
            details: {
                court: 'بداءة الكرخ',
                type: 'تعويض',
                stage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            },
        });
        expect(file!.currentStage).toBe('إعادة المحاكمة');
        expect(file!.retrialTargetStage).toBe('بداءة بدرجة أخيرة');
        expect(file!.claimValue).toBeUndefined();
    });

    it('persists retrialTargetStage for اعتراض الغير', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'المعترض اعتراض الغير', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المعترض عليه اعتراض الغير' }],
            details: {
                court: 'بداءة الكرخ',
                type: 'تعويض',
                stage: 'اعتراض الغير',
                retrialTargetStage: 'بداءة بدرجة أولى',
            },
        });
        expect(file!.currentStage).toBe('اعتراض الغير');
        expect(file!.retrialTargetStage).toBe('بداءة بدرجة أولى');
    });

    it('persists firstHearingDate and mirrors it to nextDate for calendar/alerts', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'مدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'مدعى عليه' }],
            details: {
                court: 'بداءة الكرخ',
                type: 'تعويض',
                stage: 'بداءة بدرجة أولى',
                firstHearingDate: '2026-08-15',
            },
        });
        expect(file!.firstHearingDate).toBe('2026-08-15');
        expect(file!.nextDate).toBe('2026-08-15');
        expect(file!.history).toHaveLength(1);
        expect(file!.history![0]).toMatchObject({
            id: 'appt_first_hearing',
            type: 'appointment',
            date: '2026-08-15',
            title: 'أول مرافعة',
        });
    });

    it('seeds first hearing appointment for personal status new cases', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            applicableLaw: 'jaafari_code',
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصم', status: 'المدعى عليه' }],
            details: {
                court: 'محكمة الأحوال الشخصية',
                type: 'طلاق',
                stage: 'أحوال شخصية',
                firstHearingDate: '2026-09-01',
                applicableLaw: 'jaafari_code',
            },
        });
        expect(file!.firstHearingDate).toBe('2026-09-01');
        expect(file!.history?.[0]?.type).toBe('appointment');
        expect(file!.representedParty).toBe('المدعي');
    });
});
