import { describe, expect, it } from 'vitest';
import {
    buildExecutionDashboardDirectFollowupScopeSnapshot,
    resolveDirectFollowupScopeSnapshotForPaint,
} from '../buildExecutionDashboardDirectFollowupScopeSnapshot';
import { isExecutionHandlerStubLeaf } from '../../executionHandlerClusterStubs';

describe('buildExecutionDashboardDirectFollowupScopeSnapshot', () => {
    it('prefers live runSpecialFollowupSubmit from rest over scope stub', () => {
        const live = () => undefined;
        const stub = (() => undefined) as unknown as typeof live;
        Object.assign(stub, { [Symbol.for('hami.executionHandlerStub')]: true });
        const snapshot = buildExecutionDashboardDirectFollowupScopeSnapshot({
            scopeSources: { runSpecialFollowupSubmit: stub },
            scopeLocalFlat: {},
            scopeRestFlat: { runSpecialFollowupSubmit: live },
            executionModalSetters: {},
        });
        expect(snapshot.runSpecialFollowupSubmit).toBe(live);
    });

    it('prefers live otherPartyTabSubmitHandler from scopeSources over rest stub', () => {
        const live = () => ({ ok: true });
        const stub = (() => undefined) as unknown as typeof live;
        Object.assign(stub, { [Symbol.for('hami.executionHandlerStub')]: true });
        const snapshot = buildExecutionDashboardDirectFollowupScopeSnapshot({
            scopeSources: { otherPartyTabSubmitHandler: live },
            scopeLocalFlat: {},
            scopeRestFlat: { otherPartyTabSubmitHandler: stub },
            executionModalSetters: {},
        });
        expect(snapshot.otherPartyTabSubmitHandler).toBe(live);
        expect(isExecutionHandlerStubLeaf(snapshot.otherPartyTabSubmitHandler)).toBe(false);
    });

    it('لا ينسخ scopeSources بينما المحضر مغلق', () => {
        const live = () => undefined;
        const closed = resolveDirectFollowupScopeSnapshotForPaint(false, {
            scopeSources: { runSpecialFollowupSubmit: live, noise: 'drop' },
            scopeLocalFlat: {},
            scopeRestFlat: {},
            executionModalSetters: {},
        });
        expect(closed.runSpecialFollowupSubmit).toBeUndefined();
        expect(closed.noise).toBeUndefined();
        expect(Object.keys(closed)).toHaveLength(0);
    });

    it('ينسخ المعالج الحي عند فتح المحضر', () => {
        const live = () => undefined;
        const open = resolveDirectFollowupScopeSnapshotForPaint(true, {
            scopeSources: { runSpecialFollowupSubmit: live, noise: 'drop' },
            scopeLocalFlat: {},
            scopeRestFlat: {},
            executionModalSetters: {},
        });
        expect(open.runSpecialFollowupSubmit).toBe(live);
        expect(Object.prototype.hasOwnProperty.call(open, 'noise')).toBe(false);
        expect((open as { noise?: unknown }).noise).toBe('drop');
    });
});
