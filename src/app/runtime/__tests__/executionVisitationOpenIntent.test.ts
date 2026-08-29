import { afterEach, describe, expect, it } from 'vitest';
import {
    consumeOpenExecutionVisitationWorkspaceRequest,
    EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY,
    requestOpenExecutionVisitationWorkspace,
} from '@/app/runtime/executionVisitationOpenIntent';

describe('executionVisitationOpenIntent', () => {
    afterEach(() => {
        sessionStorage.removeItem(EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY);
    });

    it('يخزّن النية ويستهلكها مرة واحدة لنفس الإضبارة', () => {
        requestOpenExecutionVisitationWorkspace('ex-1');
        expect(sessionStorage.getItem(EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY)).toBe('ex-1');
        expect(consumeOpenExecutionVisitationWorkspaceRequest('ex-other')).toBe(false);
        expect(consumeOpenExecutionVisitationWorkspaceRequest('ex-1')).toBe(true);
        expect(consumeOpenExecutionVisitationWorkspaceRequest('ex-1')).toBe(false);
    });
});
