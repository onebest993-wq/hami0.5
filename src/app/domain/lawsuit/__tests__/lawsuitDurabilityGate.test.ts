import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { FileData } from '../lawsuitFileTypes';
import { persistLawsuitActiveBundle } from '@/app/domain/lawsuit/lawsuitDurabilityGate';
import { stagePendingLawsuitCreate, clearLawsuitPendingCreatesForTests } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { persistLawsuitActiveSegment } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { LAWSUIT_WRITE_JOURNAL_KEY } from '@/app/domain/lawsuit/lawsuitWriteJournal';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { emptyLawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `2026/${id}`,
        court: 'بداءة',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitDurabilityGate', () => {
    beforeEach(() => {
        clearLawsuitPendingCreatesForTests();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_WRITE_JOURNAL_KEY);
        } catch {
            /* ignore */
        }
        localStorage.removeItem(LAWSUIT_WRITE_JOURNAL_KEY);
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            /* ignore */
        }
    });
    it('persistLawsuitActiveBundle is the single write funnel for active+index+mirror', () => {
        const gate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityGate.ts'),
            'utf8',
        );
        expect(gate).toContain('persistLawsuitActiveBundle');
        expect(gate).toContain('persistLawsuitActiveSegment');
        expect(gate).toContain('persistLawsuitLifecycleIndex');
        expect(gate).toContain('mirrorLawsuitSegmentsSafe');
        expect(gate).toContain('stageLawsuitJournalRecords');
        expect(gate).not.toContain('pruneVerifiedLawsuitJournalEntries');
        expect(gate).toContain('lawsuitSegmentPersist');
        expect(gate).not.toContain("from '@/app/domain/lawsuit/lawsuitSegmentStorage'");
        expect(typeof persistLawsuitActiveBundle).toBe('function');
    });

    it('repository and hooks route autosave through the gate', () => {
        const repo = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFilesRepository.ts'),
            'utf8',
        );
        const hooks = fs.readFileSync(
            path.join(process.cwd(), 'src/app/hooks/useLawsuitFilesState.ts'),
            'utf8',
        );
        const mutations = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFilesSegmentMutations.ts'),
            'utf8',
        );
        expect(repo).toContain('persistLawsuitActiveBundle');
        expect(hooks).toContain('persistLawsuitActiveBundle');
        expect(mutations).toContain('persistLawsuitActiveBundle');
    });

    it('allowShrink still merges pending personal create into the written active list', () => {
        persistLawsuitActiveSegment([file(1)]);
        stagePendingLawsuitCreate({
            ...file(77),
            lawsuitJurisdiction: 'personal',
        } as FileData);

        persistLawsuitActiveBundle({
            active: [file(1)],
            index: emptyLawsuitLifecycleIndex(),
            options: { allowShrink: true },
        });

        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        const parsed = JSON.parse(String(raw)) as Array<{ id: number }>;
        const ids = parsed.map((r) => r.id).sort((a, b) => a - b);
        expect(ids).toEqual([1, 77]);
    });

    it('poorer bundle does not shrink a richer active segment', () => {
        persistLawsuitActiveSegment([file(1), file(2)]);
        persistLawsuitActiveBundle({
            active: [file(1)],
            index: emptyLawsuitLifecycleIndex(),
        });
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        const parsed = JSON.parse(String(raw)) as Array<{ id: number }>;
        expect(parsed.map((r) => r.id).sort((a, b) => a - b)).toEqual([1, 2]);
    });
});
