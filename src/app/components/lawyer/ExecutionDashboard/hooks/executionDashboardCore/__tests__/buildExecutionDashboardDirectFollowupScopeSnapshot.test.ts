import { describe, expect, it } from 'vitest';
import { buildExecutionDashboardDirectFollowupScopeSnapshot } from '../buildExecutionDashboardDirectFollowupScopeSnapshot';
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
});
