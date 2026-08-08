import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import SecureStoreService from '@/app/services/SecureStoreService';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { clearDecisionsNamespaceForTests } from '@/app/utils/executionDecisionsNamespace';
import { clearDomainReconcileMarker } from '@/app/utils/executionDomainReconcile';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

describe('ExecutorDecisionFollowupMirror approve flow', () => {
    let execId: string;

    beforeEach(() => {
        setLiveAuthUserId(null);
        execId = `exec-mirror-${Date.now()}`;
        clearDecisionsNamespaceForTests(execId);
        clearDomainReconcileMarker(execId);
    });

    it('موافقة المنفذ تحدّث الواجهة وتخزن القرار', async () => {
        const row = {
            id: 'dec-mirror-1',
            requestKind: 'seizure',
            seizureSubtype: 'movable_expert',
            title: 'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
            body: 'وصف المال: سيارة',
            executorOutcome: 'pending',
            seizurePayloadJson: JSON.stringify({ seizedMovableId: 'mov-1' }),
        };
        SecureStoreService.setItemSync(
            `execution_${execId}_decisions`,
            JSON.stringify([row]),
        );

        render(
            <ExecutorDecisionFollowupMirror
                executionId={execId}
                row={row}
                requestKind="seizure"
                compact
            />,
        );

        const approve = screen.getByRole('button', { name: 'موافقة' });
        fireEvent.click(approve);

        await waitFor(() => {
            const stored = readExecutorDecisionsArray(execId) as Array<Record<string, unknown>>;
            const hit = stored.find((r) => String(r.id) === 'dec-mirror-1');
            expect(String(hit?.executorOutcome)).toBe('approved');
        });

        expect(screen.queryByRole('button', { name: 'موافقة' })).toBeNull();
    });
});
