import { describe, expect, it } from 'vitest';
import { resolveExecutionStubHandlerPrefetchModes } from '../resolveExecutionStubHandlerPrefetchModes';

describe('resolveExecutionStubHandlerPrefetchModes', () => {
    it('يسخّن seizure-requests لمسارات الحجز', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('followupSeizureHandlers.handleSave')).toEqual([
            'seizure-requests',
        ]);
    });

    it('يسخّن seizure-log لسجل الحجز', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('unifiedSeizureLog.open')).toContain(
            'seizure-log',
        );
    });

    it('يسخّن coercive لمسارات الإلزام', () => {
        const modes = resolveExecutionStubHandlerPrefetchModes('coerciveActionHandlers.submit');
        expect(modes).toContain('coercive');
        expect(modes).toContain('coercive-lifecycle');
    });

    it('لا يسخّن light/dossier-support لمسارات المقيمة على Core', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('notesTasksHandlers.handleSaveNote')).toEqual(
            [],
        );
        expect(
            resolveExecutionStubHandlerPrefetchModes('dossierFollowupHandlers.otherPartyTabSubmit'),
        ).toEqual([]);
        expect(resolveExecutionStubHandlerPrefetchModes('propertyInlineSaveCtx.save')).toEqual([]);
    });
});
