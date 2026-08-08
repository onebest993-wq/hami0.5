import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { OtherPartyActionsLog } from '../OtherPartyActionsLog';

vi.mock('motion/react', () => ({
    motion: {
        span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
            <span {...props}>{children}</span>
        ),
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
            <div {...props}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => null,
}));

describe('OtherPartyActionsLog submit guard', () => {
    it('لا ينهار عندما يعيد onSubmitToDecisions undefined (stub)', () => {
        const onPersist = vi.fn();
        const onSubmit = vi.fn(() => undefined);

        render(
            <OtherPartyActionsLog
                entries={[]}
                onPersist={onPersist}
                onSubmitToDecisions={onSubmit}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('…'), {
            target: { value: 'طلب تجريبي' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ السجل' }));

        expect(onSubmit).toHaveBeenCalled();
        expect(onPersist).not.toHaveBeenCalled();
    });

    it('لا يكرّر onPersist عندما يكون logEntryId محفوظاً مسبقاً من المعالج', () => {
        const onPersist = vi.fn();
        const onSubmit = vi.fn(() => ({
            ok: true,
            decisionId: 'special_followup_1',
            logEntryId: 'opa-test-1',
        }));

        render(
            <OtherPartyActionsLog
                entries={[]}
                onPersist={onPersist}
                onSubmitToDecisions={onSubmit}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('…'), {
            target: { value: 'طلب تجريبي' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ السجل' }));

        expect(onPersist).not.toHaveBeenCalled();
    });
});
