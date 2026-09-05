import { describe, expect, it } from 'vitest';
import { resolveExecutionStubHandlerPrefetchModes } from '../resolveExecutionStubHandlerPrefetchModes';

describe('resolveExecutionStubHandlerPrefetchModes', () => {
    it('يسخّن seizure-requests لمسارات الحجز', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('followupSeizureHandlers.handleSave')).toEqual([
            'seizure-requests',
        ]);
    });

    it('يسخّن seizure-requests لمسارات الحجز المتبقية', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('unifiedSeizureLog.open')).toContain(
            'seizure-requests',
        );
        expect(resolveExecutionStubHandlerPrefetchModes('seizureRelease.release')).toContain(
            'seizure-requests',
        );
    });

    it('يسخّن coercive لمسارات الإلزام', () => {
        const modes = resolveExecutionStubHandlerPrefetchModes('coerciveActionHandlers.submit');
        expect(modes).toContain('coercive');
        expect(modes).toContain('coercive-lifecycle');
    });

    it('يسخّن light عند ضرب معالجات الدفع/الملاحظات', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('notesTasksHandlers.handleSaveNote')).toEqual(
            ['light'],
        );
        expect(resolveExecutionStubHandlerPrefetchModes('paymentHandlers.save')).toEqual(['light']);
    });

    it('يسخّن جسور المتابعة عند ضرب stubs المحضر', () => {
        expect(
            resolveExecutionStubHandlerPrefetchModes(
                'dossierFollowupHandlers.runSpecialFollowupSubmit',
            ),
        ).toEqual(['followup-admin-special']);
        expect(
            resolveExecutionStubHandlerPrefetchModes('dossierFollowupHandlers.handleDossierAction'),
        ).toEqual(['followup-dossier-controls']);
        expect(
            resolveExecutionStubHandlerPrefetchModes(
                'dossierFollowupHandlers.otherPartyTabSubmitHandler',
            ),
        ).toEqual(['followup-other-party']);
    });

    it('يسخّن جسر الوفاة لا الإلزام الثقيل', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('partyDeathHandlers.handleDebtorDeathMenuAction')).toEqual(
            ['party-death'],
        );
    });

    it('لا يسخّن جسوراً لمسارات الحفظ المقيمة على Core', () => {
        expect(resolveExecutionStubHandlerPrefetchModes('propertyInlineSaveCtx.save')).toEqual([]);
        expect(resolveExecutionStubHandlerPrefetchModes('persistExecutionMerge')).toEqual([]);
    });
});
