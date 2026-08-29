import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: Record<string, unknown>) => (
            <div {...props}>{children as React.ReactNode}</div>
        ),
    },
}));

import { UnifiedSummonsHub } from '../../Modal_Unified_Summons_Hub';
import { ExecutionDebtorNotificationMemoModalContainer } from '../../ExecutionDashboard/components/ExecutionDebtorNotificationMemoModalContainer';

function renderNashrHub(notificationCount: number) {
    const onDebtorNotification = vi.fn();
    const onRegister = vi.fn();
    render(
        <UnifiedSummonsHub
            isOpen
            onClose={vi.fn()}
            initialMainTab="nashr"
            onDebtorNotification={onDebtorNotification}
            notificationCount={notificationCount}
            publicationNoticeFeature={{
                state: null,
                onRegister,
                onTerminate: vi.fn(),
                onDebtorAttended: vi.fn(),
            }}
            executionSummonsArchived={false}
        />,
    );
    return { onDebtorNotification, onRegister };
}

function submitNashrForm() {
    fireEvent.change(screen.getByLabelText('تاريخ النشر في الجريدة'), {
        target: { value: '2020-01-05' },
    });
    fireEvent.change(screen.getByLabelText('اسم الجريدة الأولى'), {
        target: { value: 'الزوراء' },
    });
    fireEvent.change(screen.getByLabelText('اسم الجريدة الثانية'), {
        target: { value: 'الصباح' },
    });
    fireEvent.click(screen.getByRole('button', { name: /تسجيل التبليغ بالنشر/ }));
}

describe('UnifiedSummonsHub — التبليغ بالنشر', () => {
    it('يسجّل مرساة مذكرة الإخبار عند النشر لأول مرة (count === 0)', () => {
        const { onDebtorNotification, onRegister } = renderNashrHub(0);

        submitNashrForm();

        expect(onDebtorNotification).toHaveBeenCalledTimes(1);
        expect(onDebtorNotification).toHaveBeenCalledWith(
            '2020-01-05',
            'مذكرة الإخبار بالتنفيذ بالنشر',
            false,
            undefined,
            undefined,
            {},
        );
        expect(onRegister).toHaveBeenCalledWith({
            publicationDateYmd: '2020-01-05',
            newspaper1: 'الزوراء',
            newspaper2: 'الصباح',
        });
    });

    it('لا يعيد تسجيل مرساة المذكرة عند وجود مذكرة سارية (count === 1)', () => {
        const { onDebtorNotification, onRegister } = renderNashrHub(1);

        submitNashrForm();

        expect(onDebtorNotification).not.toHaveBeenCalled();
        expect(onRegister).toHaveBeenCalledTimes(1);
    });

    it('إنهاء التبليغ بالنشر يصمد أمام إعادة بناء كائن الحالة بنفس القيمة (identity churn)', () => {
        const activePub = {
            publicationDateYmd: '2026-07-08',
            newspaper1: 'الزوراء',
            newspaper2: 'الصباح',
        };
        const buildProps = (state: typeof activePub | null) => ({
            isOpen: true,
            onClose: vi.fn(),
            initialMainTab: 'nashr' as const,
            onDebtorNotification: vi.fn(),
            notificationCount: 1,
            executionSummonsArchived: true,
            publicationNoticeFeature: {
                // كائن جديد في كل render — يحاكي بناء scope للحالة من جديد
                state: state ? { ...state } : null,
                onRegister: vi.fn(),
                onTerminate: vi.fn(),
                onDebtorAttended: vi.fn(),
            },
        });

        const { rerender } = render(<UnifiedSummonsHub {...buildProps(activePub)} />);
        expect(screen.getByText(/تبليغ بالنشر سارٍ/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'إنهاء التبليغ بالنشر' }));

        // re-render بكائن حالة جديد بنفس المحتوى (الـ persist لم يصل بعد)
        rerender(<UnifiedSummonsHub {...buildProps(activePub)} />);
        expect(screen.queryByText(/تبليغ بالنشر سارٍ —/)).toBeNull();
    });
});

describe('UnifiedSummonsHub — إنهاء التبليغ العادي', () => {
    it('إنهاء التبليغ يصفّر الواجهة فوراً ولا يعيد zombie من الأب قبل المزامنة', () => {
        const onTerminate = vi.fn();
        const activeTask = { noticeDateYmd: '2026-07-08', purpose: 'تبليغ لاحق' };
        const buildProps = () => ({
            isOpen: true,
            onClose: vi.fn(),
            initialMainTab: 'tabligh' as const,
            onDebtorNotification: vi.fn(),
            notificationCount: 1,
            executionSummonsArchived: true,
            tablighTask: { ...activeTask },
            onTerminateTablighTask: onTerminate,
        });

        const { rerender } = render(<UnifiedSummonsHub {...buildProps()} />);
        expect(screen.getByText('تبليغ مسجّل')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /إنهاء التبليغ/ }));
        expect(onTerminate).toHaveBeenCalledTimes(1);

        // الأب ما زال يمرّر المهمة القديمة (هوية جديدة) — التفاؤل null يجب أن يصمد
        rerender(<UnifiedSummonsHub {...buildProps()} />);
        expect(screen.queryByText('تبليغ مسجّل')).toBeNull();
        expect(screen.getByRole('button', { name: /تسجيل تبليغ عادي/ })).toBeTruthy();
    });
});

describe('UnifiedSummonsHub — تأكيد التكليف بالحضور', () => {
    function renderTaklifHub(state: { phase: string } | null) {
        const onConfirm = vi.fn();
        const onClose = vi.fn();
        const feature = {
            enabled: true,
            state: state as never,
            onConfirm,
            onAttend: vi.fn(),
            onDeclareAbsent: vi.fn(),
            onTerminate: vi.fn(),
            onRequestInvestigation: vi.fn(),
            onRegisterArrestOrder: vi.fn(),
            onRequestForcedBring: vi.fn(),
            onWarrantDebtorBrought: vi.fn(),
            onWarrantTerminate: vi.fn(),
        };
        const view = render(
            <UnifiedSummonsHub
                isOpen
                onClose={onClose}
                initialMainTab="taklif"
                onDebtorNotification={vi.fn()}
                notificationCount={1}
                executionSummonsArchived
                employeeAssignmentFeature={feature}
            />,
        );
        return { onConfirm, onClose, feature, view };
    }

    it('بعد التأكيد يبقى المودال مفتوحاً على تبويب التكليف ويعرض حاوية «تكليف سارٍ» عند تحدّث الحالة', () => {
        const { onConfirm, onClose, feature, view } = renderTaklifHub(null);

        fireEvent.change(screen.getByLabelText('الغاية من التكليف'), {
            target: { value: 'الحضور أمام المنفذ العدل' },
        });
        fireEvent.change(screen.getByLabelText('تاريخ التبليغ بالتكليف'), {
            target: { value: '2020-01-05' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد التكليف بالحضور' }));

        expect(onConfirm).toHaveBeenCalledWith({
            purpose: 'الحضور أمام المنفذ العدل',
            notifyDate: '2020-01-05',
            durationDays: 1,
        });
        // لا يُغلق المودال بعد التأكيد — تُعرض الحاوية التالية بدلاً من الخروج
        expect(onClose).not.toHaveBeenCalled();

        view.rerender(
            <UnifiedSummonsHub
                isOpen
                onClose={onClose}
                initialMainTab="taklif"
                onDebtorNotification={vi.fn()}
                notificationCount={1}
                executionSummonsArchived
                employeeAssignmentFeature={{
                    ...feature,
                    state: {
                        phase: 'active',
                        purpose: 'الحضور أمام المنفذ العدل',
                        notifyDate: '2020-01-05',
                        durationDays: 1,
                    } as never,
                }}
            />,
        );

        expect(screen.getByText(/تكليف سارٍ/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'انتهاء مدة التكليف' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'إنهاء التكليف' })).toBeTruthy();
    });

    it('يعرض تبويب الوضع الحالي ويمنع اختيار النشر أثناء تكليف سارٍ', () => {
        const onClose = vi.fn();
        render(
            <UnifiedSummonsHub
                isOpen
                onClose={onClose}
                initialMainTab="taklif"
                onDebtorNotification={vi.fn()}
                notificationCount={1}
                executionSummonsArchived
                employeeAssignmentFeature={{
                    enabled: true,
                    state: {
                        phase: 'active',
                        purpose: 'حضور',
                        notifyDate: '2020-01-01',
                        durationDays: 1,
                        deadlineDate: '2020-01-02',
                    } as never,
                    onConfirm: vi.fn(),
                    onAttend: vi.fn(),
                    onDeclareAbsent: vi.fn(),
                    onTerminate: vi.fn(),
                    onRequestInvestigation: vi.fn(),
                    onRegisterArrestOrder: vi.fn(),
                    onRequestForcedBring: vi.fn(),
                    onWarrantDebtorBrought: vi.fn(),
                    onWarrantTerminate: vi.fn(),
                }}
                publicationNoticeFeature={{
                    state: null,
                    onRegister: vi.fn(),
                    onTerminate: vi.fn(),
                    onDebtorAttended: vi.fn(),
                }}
            />,
        );

        expect(screen.getByText(/تكليف سارٍ/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText('نوع التبليغ'), { target: { value: 'nashr' } });
        expect(screen.getByText(/لا يمكن فتح هذا المسار/)).toBeTruthy();
    });
});

describe('ExecutionDebtorNotificationMemoModalContainer — تاريخ التبليغ', () => {
    it('يرفض التاريخ المستقبلي ويثبّت تاريخ اليوم', () => {
        const handleNotifyDebtor = vi.fn();
        const setDebtorNotificationDate = vi.fn();
        const { baseElement } = render(
            <ExecutionDebtorNotificationMemoModalContainer
                showNotificationModal
                onCloseNotificationModal={vi.fn()}
                debtorNotificationDate={null}
                setDebtorNotificationDate={setDebtorNotificationDate}
                handleNotifyDebtor={handleNotifyDebtor}
                getLocalTodayYmd={() => '2026-07-17'}
                EXEC_MODAL_BACKDROP_STRONG="bg-black/80"
                notificationModalZIndex={100}
            />,
        );

        const dateInput = baseElement.querySelector('#hami-exec-memo-date') as HTMLInputElement;
        expect(dateInput).not.toBeNull();
        expect(dateInput.max).toBe('2026-07-17');

        fireEvent.change(dateInput, { target: { value: '2099-01-01' } });

        expect(setDebtorNotificationDate).toHaveBeenCalledWith('2026-07-17');
        expect(handleNotifyDebtor).toHaveBeenCalledWith('2026-07-17');
    });

    it('يمرّر التاريخ الماضي كما هو', () => {
        const handleNotifyDebtor = vi.fn();
        const { baseElement } = render(
            <ExecutionDebtorNotificationMemoModalContainer
                showNotificationModal
                onCloseNotificationModal={vi.fn()}
                debtorNotificationDate={null}
                setDebtorNotificationDate={vi.fn()}
                handleNotifyDebtor={handleNotifyDebtor}
                getLocalTodayYmd={() => '2026-07-17'}
                EXEC_MODAL_BACKDROP_STRONG="bg-black/80"
                notificationModalZIndex={100}
            />,
        );

        const dateInput = baseElement.querySelector('#hami-exec-memo-date') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

        expect(handleNotifyDebtor).toHaveBeenCalledWith('2026-07-10');
    });
});
