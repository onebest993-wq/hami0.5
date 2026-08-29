import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { useExecutionDashboardPaymentHandlers } from '../useExecutionDashboardPaymentHandlers';

describe('useExecutionDashboardPaymentHandlers', () => {
    const baseExecutionData = {
        id: 'exec-1',
        creditors: [
            {
                id: 'c-1',
                type: 'creditor',
                name: 'الدائن الأول',
                phone: '',
                address: '',
                occupation: 'كاسب',
                isClient: false,
                nationality: 'عراقي',
                allocated_debt: 100000,
                paid_amount: 0,
            },
        ],
        totalAmount: 100000,
        paidDebt: 0,
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:00.000Z',
    } as ExecutionFile;

    function buildParams(overrides: Partial<Parameters<typeof useExecutionDashboardPaymentHandlers>[0]> = {}) {
        return {
            executionDataRef: { current: baseExecutionData },
            executionId: 'exec-1',
            executionData: baseExecutionData,
            paymentAmount: '25000',
            paymentDate: '2026-07-11',
            remaining: 100000,
            paidDebt: 0,
            totalOwed: 100000,
            totalWithExecutionFee: 100000,
            paidCourtFees: 0,
            paidDirectorateFees: 0,
            paidClientFees: 0,
            financialLedger: [],
            financialLedgerRef: { current: [] },
            paidDebtRef: { current: 0 },
            seizedAssetsSnapshotRef: { current: [] },
            nextTimelineId: (() => {
                let n = 0;
                return () => `tl-${++n}`;
            })(),
            pushTimelineEvent: vi.fn(),
            persistExecutionMerge: vi.fn(),
            showToast: vi.fn(),
            setPaidDebt: vi.fn(),
            setFinancialLedger: vi.fn(),
            setPaymentAmount: vi.fn(),
            setPaymentDate: vi.fn(),
            setShowPaymentModal: vi.fn(),
            ...overrides,
        };
    }

    it('warns when payment amount is invalid', () => {
        const showToast = vi.fn();
        const params = buildParams({ paymentAmount: '0', showToast });
        const { result } = renderHook(() => useExecutionDashboardPaymentHandlers(params));

        act(() => {
            result.current.handlePayment();
        });

        expect(showToast).toHaveBeenCalledWith('يرجى إدخال مبلغ صحيح', 'warning');
    });

    it('records payment and closes modal on success', () => {
        const pushTimelineEvent = vi.fn(() => true);
        const setPaidDebt = vi.fn();
        const setFinancialLedger = vi.fn();
        const setPaymentAmount = vi.fn();
        const setPaymentDate = vi.fn();
        const setShowPaymentModal = vi.fn();
        const showToast = vi.fn();
        const params = buildParams({
            pushTimelineEvent,
            setPaidDebt,
            setFinancialLedger,
            setPaymentAmount,
            setPaymentDate,
            setShowPaymentModal,
            showToast,
        });
        const { result } = renderHook(() => useExecutionDashboardPaymentHandlers(params));

        act(() => {
            result.current.handlePayment();
        });

        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '💰 تسديد للمديونية',
                type: 'payment',
            }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    paidDebt: 25000,
                    financialLedger: expect.any(Array),
                }),
            }),
        );
        expect(setPaidDebt).toHaveBeenCalledWith(25000);
        expect(setFinancialLedger).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    amount: 25000,
                    type: 'payment',
                }),
            ]),
        );
        expect(setPaymentAmount).toHaveBeenCalledWith('');
        expect(setPaymentDate).toHaveBeenCalled();
        expect(setShowPaymentModal).toHaveBeenCalledWith(false);
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('تم تسجيل التسديد'), 'success');
    });

    it('does not mutate local payment state when persist fails', () => {
        const pushTimelineEvent = vi.fn(() => false);
        const setPaidDebt = vi.fn();
        const setShowPaymentModal = vi.fn();
        const showToast = vi.fn();
        const params = buildParams({
            pushTimelineEvent,
            setPaidDebt,
            setShowPaymentModal,
            showToast,
        });
        const { result } = renderHook(() => useExecutionDashboardPaymentHandlers(params));

        act(() => {
            result.current.handlePayment();
        });

        expect(setPaidDebt).not.toHaveBeenCalled();
        expect(setShowPaymentModal).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('تعذّر الحفظ'), 'error');
    });
});
