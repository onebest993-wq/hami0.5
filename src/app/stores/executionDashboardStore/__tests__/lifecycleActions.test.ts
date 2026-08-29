import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    createLifecycleActions,
    dossierLifecycleSliceFromFile,
} from '../lifecycleActions';
import type { ExecutionDashboardState } from '../types';

function harness(seed?: Partial<ExecutionDashboardState>) {
    let state = {
        dossierLifecycleByFileId: {},
        subFiles: [],
        linkedDossiers: [],
        currentFile: null,
        activeSubFileId: null,
        delegationParentFileId: null,
        ...seed,
    } as ExecutionDashboardState;
    const get = () => state;
    const set: Parameters<typeof createLifecycleActions>[0] = (partial) => {
        const next = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...next };
    };
    return { getState: get, actions: createLifecycleActions(set, get) };
}

describe('execution dashboard lifecycle actions', () => {
    it('maps file fields into the store slice', () => {
        const slice = dossierLifecycleSliceFromFile({
            dossier_lifecycle_status: 'paused',
            dossier_last_action_date: '2026-08-01',
            dossier_status_reason: 'وفاة',
            dossier_status_date: '2026-07-20',
        } as ExecutionFile);
        expect(slice.dossierStatus).toBe('paused');
        expect(slice.lastActionDate).toBe('2026-08-01');
        expect(slice.dossierStatusReason).toBe('وفاة');
        expect(slice.dossierStatusDate).toBe('2026-07-20');
    });

    it('reconcile and setters populate dossierLifecycleByFileId', () => {
        const { getState, actions } = harness();
        actions.reconcileDossierLifecycle('ex-1', {
            dossier_lifecycle_status: 'suspended',
            lastActionDate: '2026-06-15',
        } as ExecutionFile);
        expect(getState().dossierLifecycleByFileId['ex-1']).toEqual({
            dossierStatus: 'suspended',
            lastActionDate: '2026-06-15',
            dossierStatusReason: '',
            dossierStatusDate: '',
        });

        actions.setDossierStatus('ex-1', 'finished');
        expect(actions.getDossierLifecycleOrDefault('ex-1').dossierStatus).toBe('finished');

        actions.setDossierLastActionDate('ex-1', '2026-08-21');
        expect(actions.getDossierLifecycleOrDefault('ex-1').lastActionDate).toBe('2026-08-21');
    });

    it('purge removes lifecycle for the dossier id', () => {
        const { getState, actions } = harness();
        actions.setDossierStatus('gone', 'paused');
        actions.purgeDossierScopedState('gone');
        expect(getState().dossierLifecycleByFileId['gone']).toBeUndefined();
    });
});
