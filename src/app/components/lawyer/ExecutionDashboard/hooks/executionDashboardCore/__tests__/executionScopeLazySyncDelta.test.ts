import { describe, expect, it } from 'vitest';
import {
    EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS,
    areScopeValuesEqual,
    fingerprintLazySyncPrimitiveBucket,
    hasSelectedScopeDeltaForLazySync,
} from '../executionScopeLazySyncDelta';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '../../executionHandlerClusterStubs';

describe('executionScopeLazySyncDelta draft churn', () => {
    it('ignores note/appointment draft field changes for shell overlay sync', () => {
        const base = {
            showNotesModal: true,
            noteTitle: '',
            noteBody: '',
            appointmentPurpose: '',
            setNoteTitle: () => undefined,
        };
        const typed = {
            ...base,
            noteTitle: 'مسودة',
            noteBody: '<p>نص</p>',
            appointmentPurpose: 'جلسة',
        };

        expect(hasSelectedScopeDeltaForLazySync(base, typed)).toBe(false);
        expect(EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS.has('noteTitle')).toBe(true);
    });

    it('still detects modal flag changes', () => {
        const closed = { showNotesModal: false, noteTitle: 'x' };
        const open = { showNotesModal: true, noteTitle: 'x' };
        expect(hasSelectedScopeDeltaForLazySync(closed, open)).toBe(true);
        expect(fingerprintLazySyncPrimitiveBucket(closed)).not.toBe(
            fingerprintLazySyncPrimitiveBucket(open),
        );
    });

    it('detects persistExecutionMerge identity change (critical handler)', () => {
        const a = () => undefined;
        const b = () => undefined;
        expect(
            hasSelectedScopeDeltaForLazySync(
                { persistExecutionMerge: a, showDecisionsModal: true },
                { persistExecutionMerge: b, showDecisionsModal: true },
            ),
        ).toBe(true);
    });

    it('detects runSpecialFollowupSubmit / requestFollowupSeizureDecision identity change', () => {
        const a = () => undefined;
        const b = () => undefined;
        expect(
            hasSelectedScopeDeltaForLazySync(
                { runSpecialFollowupSubmit: a },
                { runSpecialFollowupSubmit: b },
            ),
        ).toBe(true);
        expect(
            hasSelectedScopeDeltaForLazySync(
                { requestFollowupSeizureDecision: a },
                { requestFollowupSeizureDecision: b },
            ),
        ).toBe(true);
    });

    it('detects stub→real for non-critical handler leaves', () => {
        const stub = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as (...args: unknown[]) => unknown;
        const real = () => undefined;
        expect(
            hasSelectedScopeDeltaForLazySync(
                { someOtherHandler: stub },
                { someOtherHandler: real },
            ),
        ).toBe(true);
    });

    it('treats Lazy*/stable UI module keys as identity-only (no deep-walk)', () => {
        const IconA = () => null;
        const IconB = () => null;
        expect(
            hasSelectedScopeDeltaForLazySync({ Activity: IconA }, { Activity: IconB }),
        ).toBe(true);
        expect(
            hasSelectedScopeDeltaForLazySync({ LazyFoo: IconA }, { LazyFoo: IconA }),
        ).toBe(false);
        expect(
            hasSelectedScopeDeltaForLazySync({ LazyFoo: IconA }, { LazyFoo: IconB }),
        ).toBe(true);
    });

    it('Object.is fast-path: identical refs across large selection are no-delta', () => {
        const shared = { nested: { n: 1 } };
        const a = { flag: true, payload: shared, noop: () => undefined };
        const b = { flag: true, payload: shared, noop: a.noop };
        expect(hasSelectedScopeDeltaForLazySync(a, b)).toBe(false);
    });

    it('areScopeValuesEqual survives circular object graphs', () => {
        const a: Record<string, unknown> = { id: '1' };
        const b: Record<string, unknown> = { id: '1' };
        a.self = a;
        b.self = b;
        expect(() => areScopeValuesEqual(a, b)).not.toThrow();
        expect(areScopeValuesEqual(a, b)).toBe(true);
    });

    it('fingerprint timelineEvents — new reference same content is no-delta', () => {
        const events = [{ id: '1', type: 'other', title: 't', date: '2026-01-01' }];
        expect(
            hasSelectedScopeDeltaForLazySync(
                { timelineEvents: events },
                { timelineEvents: [...events] },
            ),
        ).toBe(false);
    });

    it('fingerprint savedNotesSplit — detects note count change', () => {
        const empty = { notes: [], doneTasks: [] };
        const withNote = {
            notes: [{ id: 'n1', title: 'ملاحظة', body: 'x', createdAt: '2026-01-01' }],
            doneTasks: [],
        };
        expect(hasSelectedScopeDeltaForLazySync({ savedNotesSplit: empty }, { savedNotesSplit: withNote })).toBe(
            true,
        );
    });

    it('detects seizedMovablesForSeizureLog content change', () => {
        const empty: { seizedMovablesForSeizureLog: unknown[] } = { seizedMovablesForSeizureLog: [] };
        const saved = {
            seizedMovablesForSeizureLog: [
                { id: 'sm_1', decisionRowId: 'dec-1', status: 'seized' },
            ],
        };
        expect(hasSelectedScopeDeltaForLazySync(empty, saved)).toBe(true);
    });
});
