import { describe, expect, it } from 'vitest';
import {
    migrateCasePersistState,
    normalizeCasePersistSlice,
} from '@/app/infrastructure/persistence/caseStorePersist';
import {
    migrateExecutionDashboardPersistState,
    normalizeExecutionDashboardPersistSlice,
} from '@/app/infrastructure/persistence/executionDashboardStorePersist';
import {
    migrateWorkspacePersistState,
    normalizeWorkspacePersistSlice,
} from '@/app/infrastructure/persistence/workspaceStorePersist';
import { defaultPersistWipeGuard } from '@/app/services/securePersistStorage';

describe('foundation store persist — caseStore', () => {
    it('normalizes legacy payload without version wrapper', () => {
        const normalized = normalizeCasePersistSlice({
            cases: [
                {
                    id: 'c1',
                    caseNo: '1',
                    title: 'قضية',
                    type: 'lawsuit',
                    clientName: 'أ',
                    opponentName: 'ب',
                    linkedDocuments: [],
                    deadlines: [],
                    timeline: [],
                    createdAt: '2020-01-01',
                    updatedAt: '2020-01-01',
                    status: 'active',
                },
                { id: '', title: 'bad' },
            ],
            selectedCaseId: 'c1',
        });
        expect(normalized.cases).toHaveLength(1);
        expect(normalized.cases[0]?.id).toBe('c1');
        expect(normalized.selectedCaseId).toBe('c1');
    });

    it('migrate v0→v1 keeps valid cases', () => {
        const migrated = migrateCasePersistState(
            { state: { cases: [{ id: 'x', type: 'execution', status: 'active' }] } },
            0,
        );
        expect(migrated.cases).toHaveLength(1);
        expect(migrated.cases[0]?.type).toBe('execution');
    });
});

describe('foundation store persist — executionDashboardStore', () => {
    it('fills defaults for corrupt ui/noteForm', () => {
        const normalized = normalizeExecutionDashboardPersistSlice({
            ui: null,
            noteForm: 'bad',
            dossierLifecycleByFileId: { f1: { status: 'open' } },
            subFiles: [{ id: 's1' }],
            linkedDossiers: [],
            delegationParentFileId: ' parent ',
        });
        expect(normalized.ui.activeBottomTab).toBe('all');
        expect(normalized.noteForm.taskStatus).toBe('pending');
        expect(normalized.subFiles).toHaveLength(1);
        expect(normalized.delegationParentFileId).toBe('parent');
    });
});

describe('foundation store persist — workspaceStore', () => {
    it('drops invalid pin types', () => {
        const normalized = migrateWorkspacePersistState(
            {
                pinnedItems: [
                    {
                        id: '1',
                        type: 'not-a-real-pin-type',
                        title: 'x',
                        clientName: '',
                        caseNumber: '',
                        routePath: '/x',
                    },
                ],
            },
            0,
        );
        expect(normalized.pinnedItems).toHaveLength(0);
    });
});

describe('defaultPersistWipeGuard — foundation store keys', () => {
    const casePayload = (ids: string[]) =>
        JSON.stringify({ state: { cases: ids.map((id) => ({ id })) }, version: 1 });
    const execPayload = (sub: number, linked: number) =>
        JSON.stringify({
            state: { subFiles: Array.from({ length: sub }, (_, i) => ({ id: `s${i}` })), linkedDossiers: Array.from({ length: linked }, (_, i) => ({ id: `l${i}` })) },
            version: 1,
        });
    const emptyExec = JSON.stringify({ state: { subFiles: [], linkedDossiers: [] }, version: 1 });

    it('blocks wiping legal cases', () => {
        expect(defaultPersistWipeGuard(casePayload([]), casePayload(['c1']), 'legal-cases-storage')).toBe(
            true,
        );
    });

    it('blocks wiping execution dashboard subFiles/linkedDossiers', () => {
        expect(
            defaultPersistWipeGuard(emptyExec, execPayload(1, 0), 'execution-dashboard-storage'),
        ).toBe(true);
        expect(
            defaultPersistWipeGuard(emptyExec, execPayload(0, 2), 'execution-dashboard-storage'),
        ).toBe(true);
    });
});
