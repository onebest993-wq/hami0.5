import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutorWorkflowPortalModals } from '../ExecutorWorkflowPortalModals';

function createLazyComponent<TProps extends object>(
    buttonName: string,
    onActionProp: keyof TProps,
): React.LazyExoticComponent<React.ComponentType<TProps>> {
    return React.lazy(async () => ({
        default: (props: TProps) => (
            <button
                type="button"
                onClick={(props as Record<string, unknown>)[onActionProp as string] as (() => void) | undefined}
            >
                {buttonName}
            </button>
        ),
    }));
}

function createBaseProps(
    overrides: Partial<React.ComponentProps<typeof ExecutorWorkflowPortalModals>> = {},
): React.ComponentProps<typeof ExecutorWorkflowPortalModals> {
    return {
        EXEC_OVERLAY_LAZY_FALLBACK: <div>loading</div>,
        LazyExecutorApprovedDateTimeModal: createLazyComponent<
            NonNullable<React.ComponentProps<typeof ExecutorWorkflowPortalModals>['LazyExecutorApprovedDateTimeModal']> extends React.ComponentType<infer P> ? P : never
        >('schedule confirm', 'onConfirm'),
        PoliceAssistanceDetailsModal: ((props: {
            onConfirm?: () => void;
        }) => (
            <button type="button" onClick={props.onConfirm as (() => void) | undefined}>
                police confirm
            </button>
        )) as unknown as React.ComponentProps<typeof ExecutorWorkflowPortalModals>['PoliceAssistanceDetailsModal'],
        LazyExecutorBreakInventoryFurnitureModal: createLazyComponent<
            NonNullable<React.ComponentProps<typeof ExecutorWorkflowPortalModals>['LazyExecutorBreakInventoryFurnitureModal']> extends React.ComponentType<infer P> ? P : never
        >(
            'break confirm',
            'onConfirm',
        ),
        LazyExecutorJudicialCustodianModal: createLazyComponent<
            NonNullable<React.ComponentProps<typeof ExecutorWorkflowPortalModals>['LazyExecutorJudicialCustodianModal']> extends React.ComponentType<infer P> ? P : never
        >(
            'custodian confirm',
            'onConfirm',
        ),
        LazyExecutorWorkflowConfirmModal: ((props: { message?: string; onConfirm?: () => void }) => (
            <div>
                <div>{String(props.message ?? '')}</div>
                <button type="button" onClick={props.onConfirm as (() => void) | undefined}>
                    confirm workflow
                </button>
            </div>
        )) as unknown as React.ComponentProps<typeof ExecutorWorkflowPortalModals>['LazyExecutorWorkflowConfirmModal'],
        executorScheduleModalOpen: false,
        setExecutorScheduleModalOpen: vi.fn(),
        executorScheduleContext: null,
        setExecutorScheduleContext: vi.fn(),
        policeAssistanceModalOpen: false,
        setPoliceAssistanceModalOpen: vi.fn(),
        setPoliceAssistanceDecisionId: vi.fn(),
        setPoliceAssistanceRequestTitle: vi.fn(),
        setPoliceAssistanceAgencyDraft: vi.fn(),
        policeAssistanceRequestTitle: '',
        policeAssistanceAgencyDraft: '',
        savePoliceAssistanceFromModal: vi.fn(),
        breakInventoryFurnitureModalOpen: false,
        setBreakInventoryFurnitureModalOpen: vi.fn(),
        breakInventoryFurnitureModalCtx: null,
        setBreakInventoryFurnitureModalCtx: vi.fn(),
        judicialCustodianModalOpen: false,
        setJudicialCustodianModalOpen: vi.fn(),
        judicialCustodianModalCtx: null,
        setJudicialCustodianModalCtx: vi.fn(),
        executionReportPrompt: null,
        setExecutionReportPrompt: vi.fn(),
        onCloseDecisionsModal: vi.fn(),
        openExecutionSeizuresTab: vi.fn(),
        showToast: vi.fn(),
        ...overrides,
    };
}

describe('ExecutorWorkflowPortalModals', () => {
    it('does not render workflow confirm modal when prompt is absent', () => {
        render(<ExecutorWorkflowPortalModals {...createBaseProps()} />);

        expect(screen.queryByText('هل تريد الانتقال لفتح محضر الجرد/التخلية الآن؟')).toBeNull();
    });

    it('uses explicit decisions close callback during workflow confirmation', () => {
        const onCloseDecisionsModal = vi.fn();
        const openExecutionSeizuresTab = vi.fn();
        const showToast = vi.fn();
        const onConfirm = vi.fn();

        render(
            <ExecutorWorkflowPortalModals
                {...createBaseProps({
                    executionReportPrompt: { onConfirm },
                    onCloseDecisionsModal,
                    openExecutionSeizuresTab,
                    showToast,
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'confirm workflow' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCloseDecisionsModal).toHaveBeenCalledTimes(1);
        expect(openExecutionSeizuresTab).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith(
            'تم فتح «محضر المتابعة». أكمل الإجراءات من التبويب المناسب؛ للحجز المالي استخدم «الحجز المالي».',
            'info',
        );
    });
});
