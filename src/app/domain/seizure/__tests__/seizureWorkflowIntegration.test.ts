import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import SecureStoreService from '@/app/services/SecureStoreService';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { clearDecisionsNamespaceForTests } from '@/app/utils/executionDecisionsNamespace';
import { clearDomainReconcileMarker } from '@/app/utils/executionDomainReconcile';
import {
    appendPendingExecutorSeizureDecision,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { syncExecutorDecisionResolution } from '@/app/utils/syncExecutorDecisionResolution';
import { submitBasicSeizurePendingRequest } from '../seizureBasicRequestService';
import { createSeizureWorkflowEngine } from '../seizureWorkflowEngine';
import { useSeizureAssetWorkflowPanelCore } from '../useSeizureAssetWorkflowPanelCore';

describe('seizure workflow integration', () => {
    let execId: string;

    beforeEach(() => {
        setLiveAuthUserId(null);
        execId = `exec-seizure-${Date.now()}`;
        clearDecisionsNamespaceForTests(execId);
        clearDomainReconcileMarker(execId);
    });

    it('submitBasic → storage → approve → decisions reload path', () => {
        const submit = submitBasicSeizurePendingRequest({
            dossierInput: { executionId: execId },
            title: 'طلب حجز راتب',
            body: 'طلب تجريبي',
            subtype: 'salary',
            decisions: [],
        });
        expect(submit.ok).toBe(true);
        expect(submit.decisionId).toBeTruthy();

        const rows = readExecutorDecisionsArray(execId) as Array<Record<string, unknown>>;
        const pending = rows.find((r) => String(r.id) === submit.decisionId);
        expect(pending).toBeTruthy();
        expect(String(pending?.seizureSubtype)).toBe('salary');
        expect(String(pending?.executorOutcome ?? 'pending')).toBe('pending');

        const sync = syncExecutorDecisionResolution({
            executionId: execId,
            decisionId: String(submit.decisionId),
            resolution: 'approved',
            row: pending,
            suppressNavigatorToast: true,
        });
        expect(sync.ok).toBe(true);

        const after = readExecutorDecisionsArray(execId) as Array<Record<string, unknown>>;
        const approved = after.find((r) => String(r.id) === submit.decisionId);
        expect(String(approved?.executorOutcome)).toBe('approved');
    });

    it('movable expert submit via engine clears optimistic on outcome event', () => {
        const showToast = vi.fn();
        const movable = {
            id: 'mov-1',
            status: 'seized',
            seizureMarkLetterNumber: 'K-1',
            movableDescription: 'سيارة',
            movableLocation: 'بغداد',
        };
        const engine = createSeizureWorkflowEngine({
            assetKind: 'movable',
            dossierInput: { executionId: execId },
        });

        const { result } = renderHook(() =>
            useSeizureAssetWorkflowPanelCore({
                assetKind: 'movable',
                entity: movable,
                entityId: 'mov-1',
                decisions: [],
                dossierInput: { executionId: execId },
                showToast,
            }),
        );

        act(() => {
            result.current.submitSubtype(
                'طلب انتداب خبراء',
                'طلب انتداب خبراء — مال منقول',
                'movable_expert',
            );
        });

        expect(result.current.hasPendingSubtype('movable_expert')).toBe(true);

        const stored = readExecutorDecisionsArray(execId) as Array<Record<string, unknown>>;
        const decisionId = String(stored[0]?.id || '');
        expect(decisionId).toBeTruthy();

        act(() => {
            patchExecutorDecisionRow(execId, decisionId, { executorOutcome: 'approved' });
            window.dispatchEvent(
                new CustomEvent('hami-execution-decision-outcome', {
                    detail: {
                        executionId: execId,
                        decisionId,
                        outcome: 'approved',
                        requestKind: 'seizure',
                    },
                }),
            );
        });

        expect(result.current.hasPendingSubtype('movable_expert')).toBe(false);
        expect(result.current.inlineFocusKey).toBeNull();
    });

    it('engine submit rejects duplicate pending subtype', () => {
        appendPendingExecutorSeizureDecision({
            executionId: execId,
            requestTitle: 'طلب انتداب خبراء — قيد البت',
            requestBody: 'body',
            seizureSubtype: 'movable_expert',
            seizurePayloadJson: JSON.stringify({ seizedMovableId: 'mov-2' }),
        });
        const decisions = readExecutorDecisionsArray(execId) as Array<Record<string, unknown>>;
        const engine = createSeizureWorkflowEngine({
            assetKind: 'movable',
            dossierInput: { executionId: execId },
        });
        const conflict = engine.submitPendingRequest({
            entityId: 'mov-2',
            subtype: 'movable_expert',
            requestTitle: 'طلب ثانٍ',
            requestBody: 'body',
            decisions,
        });
        expect(conflict.ok).toBe(false);
        expect(conflict.error).toBe('duplicate');
    });

    it('allows parallel property_expert requests for different properties', () => {
        const first = appendPendingExecutorSeizureDecision({
            executionId: execId,
            requestTitle: 'طلب خبراء عقار 1',
            requestBody: 'body',
            seizureSubtype: 'property_expert',
            seizurePayloadJson: JSON.stringify({ seizedPropertyId: 'prop-a' }),
        });
        const second = appendPendingExecutorSeizureDecision({
            executionId: execId,
            requestTitle: 'طلب خبراء عقار 2',
            requestBody: 'body',
            seizureSubtype: 'property_expert',
            seizurePayloadJson: JSON.stringify({ seizedPropertyId: 'prop-b' }),
        });
        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
        expect(first).not.toBe(second);
    });
});
