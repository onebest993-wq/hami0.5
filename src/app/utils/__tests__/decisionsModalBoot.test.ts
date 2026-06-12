import { describe, expect, it } from 'vitest';
import {
    EMPTY_DECISIONS_MODAL_BOOT_STATE,
    resolveDecisionsModalBootState,
} from '@/app/utils/decisionsModalBoot';

describe('resolveDecisionsModalBootState', () => {
    it('routes appeals tab with scroll appeal id', () => {
        expect(
            resolveDecisionsModalBootState({ tab: 'appeals', decisionId: 'dec-1' })
        ).toEqual({
            hubTab: 'appeals',
            listTab: 'appeals',
            scrollDecisionId: null,
            scrollAppealId: 'dec-1',
        });
    });

    it('routes current tab with decision scroll id', () => {
        expect(
            resolveDecisionsModalBootState({ tab: 'current', decisionId: 'dec-2' })
        ).toEqual({
            hubTab: null,
            listTab: 'current',
            scrollDecisionId: 'dec-2',
            scrollAppealId: null,
        });
    });

    it('clears boot tabs when only decision id is provided', () => {
        expect(resolveDecisionsModalBootState({ decisionId: 'dec-3' })).toEqual({
            hubTab: null,
            listTab: null,
            scrollDecisionId: 'dec-3',
            scrollAppealId: null,
        });
    });

    it('returns empty boot when no options', () => {
        expect(resolveDecisionsModalBootState()).toEqual(EMPTY_DECISIONS_MODAL_BOOT_STATE);
    });
});
