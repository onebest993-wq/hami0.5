import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RequestConfirmStrip } from '@/app/components/lawyer/shared/RequestConfirmStrip';
import { CoercivePendingDecisionRail } from '@/app/components/lawyer/execution/personalCoercive/chrome/CoercivePendingDecisionRail';
import { SeizureExecutorDecisionShortcut } from '@/app/components/lawyer/ExecutionDashboard/components/SeizureExecutorDecisionShortcut';

describe('RequestConfirmStrip', () => {
    it('ستارة مضغوطة على البطاقة بدون تمدّد flex-1 وبدون اختصار قرارات', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        const { container } = render(
            <div className="relative h-11 w-80">
                <RequestConfirmStrip onConfirm={onConfirm} onCancel={onCancel} hint="إرسال لمنفذ العدل" />
            </div>,
        );
        const strip = container.querySelector('[data-request-confirm]');
        expect(strip?.className).toContain('absolute');
        expect(strip?.className).toContain('inset-0');
        const confirmBtn = screen.getByRole('button', { name: /تأكيد/ });
        expect(confirmBtn.className).not.toContain('flex-1');
        expect(screen.queryByText('قرار المنفذ')).toBeNull();
        fireEvent.click(confirmBtn);
        expect(onConfirm).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'تراجع' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

describe('SeizureExecutorDecisionShortcut', () => {
    it('يظهر فقط لقرار معلّق يطابق المسار ويفتح بالمعرّف', () => {
        const onOpen = vi.fn();
        const { rerender } = render(
            <SeizureExecutorDecisionShortcut
                decision={{ id: 'd1', executorOutcome: 'pending', seizureSubtype: 'movable' }}
                onOpen={onOpen}
                expectedSubtype={['movable', 'movable_auction']}
            />,
        );
        const btn = screen.getByTestId('seizure-executor-decision-shortcut');
        expect(btn.getAttribute('data-decision-id')).toBe('d1');
        expect(btn.querySelector('svg')).toBeNull();
        fireEvent.click(btn);
        expect(onOpen).toHaveBeenCalledWith('d1');

        rerender(
            <SeizureExecutorDecisionShortcut
                decision={{ id: 'd1', executorOutcome: 'pending', seizureSubtype: 'property' }}
                onOpen={onOpen}
                expectedSubtype={['movable', 'movable_auction']}
            />,
        );
        expect(screen.queryByTestId('seizure-executor-decision-shortcut')).toBeNull();

        rerender(
            <SeizureExecutorDecisionShortcut
                decision={{ id: 'd1', executorOutcome: 'approved', seizureSubtype: 'movable' }}
                onOpen={onOpen}
                expectedSubtype="movable"
            />,
        );
        expect(screen.queryByTestId('seizure-executor-decision-shortcut')).toBeNull();
    });
});

describe('CoercivePendingDecisionRail', () => {
    it('يعرض العنوان والبتّ دون اختصار قرارات مكرر', () => {
        render(
            <CoercivePendingDecisionRail title="قرار المنفذ — إحضار جبري">
                <button type="button">موافقة</button>
            </CoercivePendingDecisionRail>,
        );
        expect(screen.getByTestId('coercive-pending-decision-rail')).toBeInTheDocument();
        expect(screen.getByText('قرار المنفذ — إحضار جبري')).toBeInTheDocument();
        expect(screen.queryByTestId('coercive-executor-decision-shortcut')).toBeNull();
        expect(screen.queryByText('بانتظار الموافقة أو الرفض')).toBeNull();
        expect(screen.getByRole('button', { name: 'موافقة' })).toBeInTheDocument();
    });
});
