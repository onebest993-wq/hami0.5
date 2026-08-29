import { describe, expect, it, vi } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { allLawsuitFilesForArchive, buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { buildCloudSavePayload } from '../cloudSavePayload';
import { buildInitialParentDataFromFile } from '../parentDataInit';
import { buildInitialStagesFromFile, isViewingArchivedStage, resolveInitialStageIndex } from '../stageInit';
import SecureStoreService from '@/app/services/SecureStoreService';
import { patchActiveStage } from '../stageMutations';
import { printDossier } from '../printDossier';
import {
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    resolveAppealRouteContext,
    resolveCassationOnlyHint,
} from '../appealRouteEligibility';

describe('civil lawsuit flow (integration)', () => {
    it('new case → stages → cloud payload → archive pool', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            details: { number: '100/2026', court: 'بداءة الكرخ', type: 'مدنية' },
            parties1: [{ name: 'المدعي', isClient: true }],
            parties2: [{ name: 'المدعى عليه' }],
        });
        expect(file).not.toBeNull();
        expect(file!.type).toBe('lawsuit');

        const stages = buildInitialStagesFromFile(file as unknown as Record<string, unknown>);
        expect(stages.length).toBeGreaterThan(0);
        expect(stages[0]!.stageName).toBeTruthy();

        const parent = buildInitialParentDataFromFile(file as unknown as Record<string, unknown>);
        const payload = buildCloudSavePayload(stages, parent, 0, 'نشطة');
        expect(payload.caseNo).toBe('100/2026');

        const archivePool = allLawsuitFilesForArchive([
            file!,
            { type: 'execution', status: 'active' },
            { type: 'lawsuit', status: 'deleted' },
        ]);
        expect(archivePool).toHaveLength(2);
    });

    it('archived stage is read-only (viewing past stage)', () => {
        const completed: CaseStage = {
            id: 's0',
            name: 'أولى',
            status: 'completed',
        };
        const active: CaseStage = { id: 's1', name: 'ثانية', status: 'active' };
        expect(isViewingArchivedStage(completed)).toBe(true);
        expect(isViewingArchivedStage(active)).toBe(false);
    });

    it('storage round-trip preserves lawsuit files', () => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        const payload = [
            {
                id: 1,
                type: 'lawsuit',
                status: 'active',
                caseNo: '1/2026',
                parties: [],
                stages: [],
            },
        ];
        saveLawsuitFilesRaw(payload);
        const loaded = loadLawsuitFilesRaw();
        expect(loaded).toHaveLength(1);
        expect((loaded[0] as { caseNo?: string })?.caseNo).toBe('1/2026');
    });

    it('printDossier invokes browser print', () => {
        const print = vi.fn();
        vi.stubGlobal('window', { print });
        printDossier();
        expect(print).toHaveBeenCalledOnce();
        vi.unstubAllGlobals();
    });

    it('cloud save payload survives reload (F5 simulation)', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            details: { number: '200/2026', court: 'استئناف', type: 'مدنية' },
            parties1: [{ name: 'أ', isClient: true }],
            parties2: [{ name: 'ب' }],
        });
        expect(file).not.toBeNull();

        const stages = buildInitialStagesFromFile(file as unknown as Record<string, unknown>);
        const parent = buildInitialParentDataFromFile(file as unknown as Record<string, unknown>);
        const withTask: CaseStage[] = patchActiveStage(stages, 0, {
            tasks: [{ id: 't1', title: 'مهمة', isCompleted: false }],
            isPleadingsClosed: true,
        });
        const saved = buildCloudSavePayload(withTask, parent, 0, 'نشطة');

        const reloadedStages = buildInitialStagesFromFile(saved);
        expect(reloadedStages).toHaveLength(withTask.length);
        expect(reloadedStages[0]?.tasks?.[0]?.title).toBe('مهمة');
        expect(reloadedStages[0]?.isPleadingsClosed).toBe(true);
        expect(resolveInitialStageIndex(saved, reloadedStages.length)).toBe(0);
        expect(saved.caseNo).toBe('200/2026');
    });

    it('patchActiveStage updates active stage for save', () => {
        const stages: CaseStage[] = [
            { id: 'a', name: 'أ', stageName: 'أ', status: 'active', caseNo: '1' },
        ];
        const next = patchActiveStage(stages, 0, { court: 'استئناف' });
        expect((next[0] as CaseStage).court).toBe('استئناف');
    });

    it('undetermined civil file blocks appellate appeal route (تمييز only)', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            isUndeterminedValue: true,
            parties1: [{ name: 'موكل', status: 'المدعي', isClient: true }],
            parties2: [{ name: 'خصm', status: 'المدعى عليه' }],
            details: { court: 'بداءة الكرخ', type: 'تعويض', stage: 'بداءة بدرجة أخيرة' },
        });
        expect(file!.isUndeterminedValue).toBe(true);
        const ctx = resolveAppealRouteContext(file, null);
        expect(isAppellateAppealAllowed(ctx)).toBe(false);
        const appellate = '\u0627\u0633\u062a\u0626\u0646\u0627\u0641';
        expect(filterMethodsForAppealRoute([appellate, 'تمييز'], ctx)).toEqual(['تمييز']);
        expect(resolveCassationOnlyHint(ctx)).toContain('غير مقدرة');
    });
});
