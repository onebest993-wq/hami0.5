import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
            <div {...props}>{children}</div>
        ),
    },
}));

import { ExecutionCoerciveActionsModalContainer } from '../ExecutionCoerciveActionsModalContainer';
import { ExecutionDebtorNotificationMemoModalContainer } from '../ExecutionDebtorNotificationMemoModalContainer';
import { ExecutionFullTimelineModalContainer } from '../ExecutionFullTimelineModalContainer';
import { ExecutionHeirsNotificationModalContainer } from '../ExecutionHeirsNotificationModalContainer';
import { ExecutionPaymentModalContainer } from '../ExecutionPaymentModalContainer';
import { ExecutionSeizedAssetsModalContainer } from '../ExecutionSeizedAssetsModalContainer';

describe('Execution modal container close contracts', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: vi.fn(),
        });
    });

    it('uses explicit close callback in debtor notification modal container', () => {
        const onCloseNotificationModal = vi.fn();

        render(
            <ExecutionDebtorNotificationMemoModalContainer
                showNotificationModal
                onCloseNotificationModal={onCloseNotificationModal}
                debtorNotificationDate="2026-07-10"
                setDebtorNotificationDate={vi.fn()}
                handleNotifyDebtor={vi.fn()}
                getLocalTodayYmd={() => '2026-07-10'}
                EXEC_MODAL_BACKDROP_STRONG="backdrop"
                notificationModalZIndex={50}
            />,
        );

        fireEvent.click(screen.getAllByRole('button')[0]);
        expect(onCloseNotificationModal).toHaveBeenCalledTimes(1);
    });

    it('uses explicit close callback in coercive actions modal container and closes after action', () => {
        const onCloseCoerciveModal = vi.fn();
        const handleCoerciveAction = vi.fn();

        render(
            <ExecutionCoerciveActionsModalContainer
                showCoerciveModal
                onCloseCoerciveModal={onCloseCoerciveModal}
                followupEmployeeFinancialSalaryOnlyCoercive
                followupMonetaryCoerciveLimitedOnly={false}
                activeDebtorIsEmployee
                executionCoerciveButtonDisabled={false}
                daysSinceNoticeCalculated={8}
                remaining={100}
                handleCoerciveAction={handleCoerciveAction}
                isDebtorGovernmentEmployee={false}
                isDebtorFreelancer={false}
                isNonFinancialClaim={false}
                showToast={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'طلب حجز راتب (١/٥) طلب لمنفذ العدل' }));

        expect(handleCoerciveAction).toHaveBeenCalledWith('salary');
        expect(onCloseCoerciveModal).toHaveBeenCalledTimes(1);
    });

    it('uses explicit close callback in heirs notification modal container', () => {
        const onCloseHeirsNotificationModal = vi.fn();

        render(
            <ExecutionHeirsNotificationModalContainer
                showHeirsNotificationModal
                onCloseHeirsNotificationModal={onCloseHeirsNotificationModal}
                EXEC_MODAL_BACKDROP_STRONG="backdrop"
                heirsNotificationModalZIndex={60}
                activeDebtorHeirsForNotification={['وارث أول']}
                normalizeHeirWorkflowKey={(name) => name}
                heirsWorkflowByHeir={{}}
                computeDaysRemaining={() => 7}
                computeDeadlineYmd={() => '2026-07-17'}
                heirSummonsDatePickerOpenByHeir={{}}
                setHeirSummonsDatePickerOpenByHeir={vi.fn()}
                heirNoticeDateDrafts={{}}
                setHeirNoticeDateDrafts={vi.fn()}
                issueHeirMemoNotice={vi.fn()}
                closeHeirMemoManually={vi.fn()}
                issueHeirSummons={vi.fn()}
                markHeirSummonsAttended={vi.fn()}
                markHeirSummonsPeriodEnded={vi.fn()}
            />,
        );

        fireEvent.click(screen.getAllByRole('button')[0]);
        expect(onCloseHeirsNotificationModal).toHaveBeenCalledTimes(1);
    });

    it('uses explicit close callback in full timeline modal container', () => {
        const onCloseTimelineModal = vi.fn();

        render(
            <ExecutionFullTimelineModalContainer
                showTimelineModal
                onCloseTimelineModal={onCloseTimelineModal}
                debtorBrowserTabsMode={false}
                activeTimelineEventsDebtorScoped={[]}
                activeTimelineEvents={[]}
                EXEC_OVERLAY_LAZY_FALLBACK={null}
                PremiumTimelineAuditLog={() => null}
                History={() => <div>history</div>}
                toggleTimelineEventPin={vi.fn()}
                moveTimelineEventToTrash={vi.fn()}
                onRequestEditTimelineEvent={vi.fn()}
                isHistoricalMode={false}
                activeTimelineFilter="الكل"
                setActiveTimelineFilter={vi.fn()}
                todayYmd="2026-07-10"
            />,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseTimelineModal).toHaveBeenCalledTimes(1);
    });

    it('uses explicit close callback in payment modal container', () => {
        const onClosePaymentModal = vi.fn();

        render(
            <ExecutionPaymentModalContainer
                showPaymentModal
                onClosePaymentModal={onClosePaymentModal}
                paymentAmount=""
                setPaymentAmount={vi.fn()}
                paymentDate="2026-07-10"
                setPaymentDate={vi.fn()}
                handlePayment={vi.fn()}
            />,
        );

        fireEvent.click(screen.getAllByRole('button')[0]);
        expect(onClosePaymentModal).toHaveBeenCalledTimes(1);
    });

    it('uses explicit close callback in seized assets modal container', () => {
        const onCloseSeizedAssetsModal = vi.fn();

        render(
            <ExecutionSeizedAssetsModalContainer
                showSeizedAssetsModal
                EXEC_OVERLAY_LAZY_FALLBACK={null}
                LazyModalSeizedAssetsManager={({ onClose }) => (
                    <button type="button" onClick={onClose}>
                        close seized assets manager
                    </button>
                )}
                onCloseSeizedAssetsModal={onCloseSeizedAssetsModal}
                seizedAssetsModalExecutionId="ex-1"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'close seized assets manager' }));
        expect(onCloseSeizedAssetsModal).toHaveBeenCalledTimes(1);
    });
});
