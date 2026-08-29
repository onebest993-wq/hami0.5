import { describe, expect, it } from 'vitest';
import { EXECUTION_SHELL_OVERLAY_PROP_KEYS } from '../executionShellOverlayPropKeys';
import { EXECUTION_PHONE_BODY_PROP_KEYS } from '../executionPhoneBodyPropKeys';
import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../../followupSnapshotFieldKeys';
import { assignExecutionDashboardChunkScope } from './assignExecutionDashboardChunkScopeForTests';
import { pickExecutionShellOverlayProps } from '../pickExecutionShellOverlayProps';
import { pickExecutionPhoneBodyProps } from '../pickExecutionPhoneBodyProps';
import { EXECUTION_PHONE_BODY_SCOPE_READ_KEYS } from '../pickExecutionPhoneBodyScopeReadBag';
import { SCOPE_REST_ALL_KEYS } from '../executionDashboardCore/buildScopeBundleGroups';
import { buildFollowupModalSnapshotInput } from '../buildFollowupModalSnapshotInput';

/** Shell overlay handlers (wave 4–5) — must stay in overlay registry */
const CRITICAL_SHELL_HANDLERS = [
    'handlePartyDeathSave',
    'handlePayment',
    'handlePaymentFromCalculator',
    'handleSettlementFromCalculator',
    'handlePublicationNoticeRegister',
    'handlePublicationNoticeTerminate',
    'handlePublicationNoticeDebtorAttended',
    'handleRequestCreditorSubstitution',
    'handleRequestDebtorSubstitution',
    'handleSpecialCasesStay',
] as const;

/** Phone body handlers — lazy gate closed must still wire when phoneBody syncs */
const CRITICAL_PHONE_BODY_HANDLERS = [
    'handleCoerciveAction',
    'handleDossierAction',
    'handleFundsLedgerPayment',
    'handleLiftStayOfExecution',
    'handleResumeExecution',
    'handleDossierLifecyclePick',
    'handleDossierLifecycleConfirmDetails',
] as const;

/** Followup modal — always synced even before lazy chunks mount */
const CRITICAL_FOLLOWUP_HANDLERS = [
    'handleCoerciveAction',
    'saveCoerciveAction',
    'handleDossierAction',
    'handleSpecificDeliveryItemDeclaredDestroyed',
    'handleEmployeeAssignmentRequestForcedBring',
    'persistExecutionMerge',
    'showToast',
] as const;

/** Action grid modals — visibility must reach shell overlays (not just setters) */
const CRITICAL_SHELL_MODAL_FLAGS = [
    'showDocumentsModal',
    'showNotesModal',
    'showAppointmentModal',
    'showDecisionsModal',
    'showTimelineModal',
    'showCoerciveModal',
    'showPaymentModal',
    'showUnifiedSummonsModal',
] as const;

/** Edit/trash overlays — visibility flags must reach shell pickExecutionShellOverlayProps */
const CRITICAL_SHELL_EDIT_OVERLAY_KEYS = [
    'showExecutionTrashModal',
    'setShowExecutionTrashModal',
    'restoreTimelineEventFromTrash',
    'timelineEditDraft',
] as const;

/** Decisions modal — boot state must clear on close (HeavyModals onClose) */
const CRITICAL_SHELL_DECISIONS_KEYS = [
    'clearDecisionsModalBootState',
    'decisionsModalBootHubTab',
    'decisionsModalBootListTab',
    'decisionsModalScrollToDecisionId',
    'appealsModalScrollToDecisionId',
] as const;

/** Notes modal — composer must receive save handler and edit state */
const CRITICAL_SHELL_NOTES_KEYS = [
    'commitDossierNote',
    'voiceUserId',
    'editingNoteId',
    'setEditingNoteId',
    'setSavedNotesView',
    'showToast',
    'todayYmd',
    'decisionsStorageExecutionId',
] as const;

/** Phone body — سبارك تنفيذ (overlay + أزرار المتابعة) */
const CRITICAL_SPARK_EXECUTION_PHONE_BODY_KEYS = [
    'investigationMemoIssued',
    'primaryDebtorTaklifActive',
    'openFollowupModalPersisted',
    'summoningRound',
    'debtorAttendedVoluntarily',
    'debtorArrested',
    'voluntaryAttendanceCount',
    'forcedPathAttendanceSecured',
    'setTimelineAccordionExpanded',
] as const;

function stubHandlers(keys: readonly string[], sources: Record<string, unknown>): void {
    for (const key of keys) {
        sources[key] = () => {};
    }
}

describe('execution dashboard scope wiring regression', () => {
    it('lists critical shell handlers in overlay prop registry', () => {
        const keys = EXECUTION_SHELL_OVERLAY_PROP_KEYS as readonly string[];
        for (const key of CRITICAL_SHELL_HANDLERS) {
            expect(keys, `missing shell key: ${key}`).toContain(key);
        }
    });

    it('lists critical phone-body handlers in phone body prop registry', () => {
        const keys = EXECUTION_PHONE_BODY_PROP_KEYS as readonly string[];
        for (const key of CRITICAL_PHONE_BODY_HANDLERS) {
            expect(keys, `missing phone body key: ${key}`).toContain(key);
        }
    });

    it('lists edit overlay keys in overlay prop registry', () => {
        const keys = EXECUTION_SHELL_OVERLAY_PROP_KEYS as readonly string[];
        for (const key of CRITICAL_SHELL_EDIT_OVERLAY_KEYS) {
            expect(keys, `missing shell edit overlay key: ${key}`).toContain(key);
        }
    });

    it('assigns edit overlay keys when shell overlay gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of CRITICAL_SHELL_EDIT_OVERLAY_KEYS) {
            sources[key] =
                key.startsWith('set') || key.startsWith('restore')
                    ? () => {}
                    : key === 'showExecutionTrashModal'
                      ? false
                      : null;
        }

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: true,
        });
        const picked = pickExecutionShellOverlayProps(target);
        expect(picked.showExecutionTrashModal).toBe(false);
        expect(typeof picked.setShowExecutionTrashModal).toBe('function');
        expect(typeof picked.restoreTimelineEventFromTrash).toBe('function');
    });

    it('lists decisions modal keys in overlay prop registry', () => {
        const keys = EXECUTION_SHELL_OVERLAY_PROP_KEYS as readonly string[];
        for (const key of CRITICAL_SHELL_DECISIONS_KEYS) {
            expect(keys, `missing shell decisions key: ${key}`).toContain(key);
        }
    });

    it('assigns decisions modal keys when shell overlay gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of CRITICAL_SHELL_DECISIONS_KEYS) {
            sources[key] = key.startsWith('clear') || key.startsWith('set')
                ? () => {}
                : null;
        }

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: true,
        });
        const picked = pickExecutionShellOverlayProps(target);
        for (const key of CRITICAL_SHELL_DECISIONS_KEYS) {
            expect(typeof picked[key as keyof typeof picked], `missing decisions key: ${key}`).toBe(
                key.startsWith('clear') ? 'function' : 'object',
            );
        }
    });

    it('lists notes modal keys in overlay prop registry', () => {
        const keys = EXECUTION_SHELL_OVERLAY_PROP_KEYS as readonly string[];
        for (const key of CRITICAL_SHELL_NOTES_KEYS) {
            expect(keys, `missing shell notes key: ${key}`).toContain(key);
        }
    });

    it('assigns critical shell handlers when shell overlay gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        stubHandlers(CRITICAL_SHELL_HANDLERS, sources);

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: true,
        });
        const picked = pickExecutionShellOverlayProps(target);
        for (const key of CRITICAL_SHELL_HANDLERS) {
            expect(typeof picked[key as keyof typeof picked]).toBe('function');
        }
    });

    it('assigns critical phone-body handlers when phone body gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        stubHandlers(CRITICAL_PHONE_BODY_HANDLERS, sources);

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: true,
            shellOverlays: false,
        });
        const picked = pickExecutionPhoneBodyProps(target);
        for (const key of CRITICAL_PHONE_BODY_HANDLERS) {
            expect(typeof picked[key]).toBe('function');
        }
    });

    it('assigns notes modal keys when shell overlay gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of CRITICAL_SHELL_NOTES_KEYS) {
            sources[key] = key.startsWith('set') || key === 'showToast' || key === 'commitDossierNote'
                ? () => {}
                : key === 'todayYmd'
                  ? '2026-01-01'
                  : key === 'decisionsStorageExecutionId'
                    ? 'exec-1'
                    : null;
        }

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: true,
        });
        const picked = pickExecutionShellOverlayProps(target);
        for (const key of CRITICAL_SHELL_NOTES_KEYS) {
            expect(picked[key as keyof typeof picked], `missing notes key: ${key}`).toBeDefined();
        }
    });

    it('assigns shell modal visibility flags when shell overlay gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of CRITICAL_SHELL_MODAL_FLAGS) {
            sources[key] = key === 'showDocumentsModal';
        }
        sources.setShowDocumentsModal = () => {};

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: true,
        });
        const picked = pickExecutionShellOverlayProps(target);
        expect(picked.showDocumentsModal).toBe(true);
        expect(picked.showNotesModal).toBe(false);
        expect(typeof picked.setShowDocumentsModal).toBe('function');
    });

    it('assigns critical followup handlers when lazy gates are closed', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
            if (key.startsWith('handle') || key.startsWith('save') || key.startsWith('open')) {
                sources[key] = () => {};
            }
        }
        stubHandlers(CRITICAL_FOLLOWUP_HANDLERS, sources);
        sources.hideExecutiveDetentionJudgeCard = false;
        sources.earnerFinancialPersonalCoerciveActive = false;

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: false,
        });
        const snapshot = buildFollowupModalSnapshotInput(target);
        for (const key of CRITICAL_FOLLOWUP_HANDLERS) {
            expect(typeof (snapshot as Record<string, unknown>)[key]).toBe('function');
        }
    });

    it('lists spark execution keys in phone body prop + read registries', () => {
        const propKeys = EXECUTION_PHONE_BODY_PROP_KEYS as readonly string[];
        const readKeys = EXECUTION_PHONE_BODY_SCOPE_READ_KEYS as readonly string[];
        for (const key of CRITICAL_SPARK_EXECUTION_PHONE_BODY_KEYS) {
            expect(propKeys, `missing phone body prop: ${key}`).toContain(key);
            expect(readKeys, `missing phone body read: ${key}`).toContain(key);
        }
    });

    it('includes spark summons keys in scope rest flat registry', () => {
        const restKeys = SCOPE_REST_ALL_KEYS as readonly string[];
        for (const key of [
            'investigationMemoIssued',
            'primaryDebtorTaklifActive',
            'openFollowupModalPersisted',
            'summoningRound',
        ] as const) {
            expect(restKeys, `missing scope rest key: ${key}`).toContain(key);
        }
    });

    it('assigns spark execution keys when phone body gate is open', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {
            investigationMemoIssued: true,
            primaryDebtorTaklifActive: true,
            summoningRound: 2,
            debtorAttendedVoluntarily: true,
            debtorArrested: false,
            voluntaryAttendanceCount: 1,
            forcedPathAttendanceSecured: false,
            openFollowupModalPersisted: () => {},
            setTimelineAccordionExpanded: () => {},
        };

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: true,
            shellOverlays: false,
        });
        const picked = pickExecutionPhoneBodyProps(target);
        expect(picked.investigationMemoIssued).toBe(true);
        expect(picked.primaryDebtorTaklifActive).toBe(true);
        expect(picked.summoningRound).toBe(2);
        expect(typeof picked.openFollowupModalPersisted).toBe('function');
    });
});
