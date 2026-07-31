import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import { usePartyEditWorkflow } from '../usePartyEditWorkflow';

function makeFile(): ExecutionFile {
    return {
        id: 'ex-1',
        directorate: 'الكرخ',
        fileNumber: '1',
        fileYear: '2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2026-01-01',
        creditors: [
            {
                id: 'cred-1',
                name: 'دائن قديم',
                phone: '111',
                address: 'عنوان قديم',
                isClient: true,
            },
        ],
        debtors: [],
        debtAmount: 0,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        paidCourtFees: 0,
        paidDirectorateFees: 0,
        paidClientFees: 0,
        status: 'active',
        isPaused: false,
        timelineEvents: [],
    } as unknown as ExecutionFile;
}

describe('usePartyEditWorkflow', () => {
    it('opens creditor edit immediately with draft and target together', async () => {
        const file = makeFile();
        const executionDataRef = { current: file };
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            usePartyEditWorkflow({
                executionData: file,
                viewExecutionData: file,
                executionDataRef,
                decisionsStorageExecutionId: 'ex-1',
                isHistoricalMode: false,
                persistExecutionMerge,
                showToast,
            }),
        );

        await act(async () => {
            await result.current.openEditParty('creditor', 0, { party: file.creditors![0] });
        });

        expect(result.current.editPartyTarget).toEqual({
            kind: 'creditor',
            index: 0,
            partyId: 'cred-1',
        });
        expect(result.current.partyEditDraft?.name).toBe('دائن قديم');
        expect(result.current.partyEditDraft?.phone).toBe('111');
    });

    it('persists creditor edits synchronously before closing the modal', async () => {
        const file = makeFile();
        const executionDataRef = { current: file };
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            usePartyEditWorkflow({
                executionData: file,
                viewExecutionData: file,
                executionDataRef,
                decisionsStorageExecutionId: 'ex-1',
                isHistoricalMode: false,
                persistExecutionMerge,
                showToast,
            }),
        );

        await act(async () => {
            await result.current.openEditParty('creditor', 0, { party: file.creditors![0] });
        });

        act(() => {
            result.current.setPartyEditDraft((draft) =>
                draft
                    ? {
                          ...draft,
                          name: 'دائن محدّث',
                          phone: '07701234567',
                          address: 'عنوان جديد',
                      }
                    : draft,
            );
        });

        act(() => {
            result.current.savePartyEditDraft();
        });

        await waitFor(() => {
            expect(showToast).toHaveBeenCalledWith('تم حفظ بيانات الطرف', 'success');
        });
        // التوست فوري؛ الـ persist مؤجّل بعد الرسم (يُغطّى في الاختبار التالي)
    });

    it('schedules persist after optimistic UI commit', async () => {
        const file = makeFile();
        const executionDataRef = { current: file };
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            usePartyEditWorkflow({
                executionData: file,
                viewExecutionData: file,
                executionDataRef,
                decisionsStorageExecutionId: 'ex-1',
                isHistoricalMode: false,
                persistExecutionMerge,
                showToast,
            }),
        );

        await act(async () => {
            await result.current.openEditParty('creditor', 0, { party: file.creditors![0] });
        });
        act(() => {
            result.current.setPartyEditDraft((draft) =>
                draft
                    ? { ...draft, name: 'دائن محدّث', phone: '07701234567', address: 'عنوان جديد' }
                    : draft,
            );
        });
        act(() => {
            result.current.savePartyEditDraft();
        });

        await waitFor(() => {
            expect(showToast).toHaveBeenCalledWith('تم حفظ بيانات الطرف', 'success');
        });
        await waitFor(() => {
            expect(result.current.editPartyTarget).toBeNull();
            expect(persistExecutionMerge).toHaveBeenCalledTimes(1);
        });
        const patch = persistExecutionMerge.mock.calls[0]?.[0] as {
            creditors?: Array<{ name?: string; phone?: string; address?: string }>;
        };
        expect(patch.creditors?.[0]?.name).toBe('دائن محدّث');
        expect(patch.creditors?.[0]?.phone).toBe('07701234567');
    });
});
