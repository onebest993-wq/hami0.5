/**
 * اختبارات regression لـ AlertCardItem.
 *
 * يتحقّق من:
 *  h2) منع double-click: زرّا قبول/رفض يُعطَّلان أثناء async call
 *  h3) Escape يُغلق modal التفاصيل (a11y)
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { AlertCardItem } from '../AlertCardItem';
import type { SmartAlert } from '../types';
import { ShieldAlert } from '@/app/components/ui/lucideIcons';

const updateStatusMock = vi.fn();

vi.mock('@/app/services/ClientRequestService', () => ({
    ClientRequestService: {
        updateRequestStatus: (...args: unknown[]) => updateStatusMock(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/stores/workspaceStore', () => ({
    useWorkspaceStore: (sel: (s: unknown) => unknown) =>
        sel({
            togglePin: vi.fn(),
            isPinned: () => false,
            pinnedItems: [],
        }),
}));

vi.mock('@/app/workspace/buildPinFromSecretaryAlert', () => ({
    buildPinFromSecretaryAlert: () => null,
}));

const baseSmartAlert: SmartAlert = {
    id: 'alert-1',
    title: 'طلب موكل جديد',
    description: 'يرغب باستشارة عاجلة',
    icon: ShieldAlert,
    priority: 'high',
    actionLabel: 'فتح',
    sectionLabel: 'طلبات العملاء',
    sectionIcon: '📥',
    timeLabel: 'الآن',
};

function makeRequestSource(): SecretaryAlert {
    return {
        id: 'alert-1',
        type: 'REQUEST',
        title: 'طلب موكل',
        summary: 'محكمة بغداد',
        aiDeepDive: '',
        request: {
            id: 'req-1',
            lawyer_id: 'lawyer-1',
            client_id: 'client-1',
            client_name: 'أحمد',
            request_type: 'consultation',
            description: 'استشارة',
            status: 'pending' as never,
            created_at: new Date().toISOString(),
        } as never,
    } as SecretaryAlert;
}

describe('AlertCardItem (regression: h2 + h3)', () => {
    beforeEach(() => {
        updateStatusMock.mockReset();
    });

    it('h2) قبول طلب: زرّا قبول/رفض يُعطَّلان أثناء الـ async call (منع double-click)', async () => {
        let resolveCall: (v: boolean) => void = () => {};
        const slowPromise = new Promise<boolean>((r) => {
            resolveCall = r;
        });
        updateStatusMock.mockReturnValueOnce(slowPromise);

        const source = makeRequestSource();
        const onResolved = vi.fn();
        const onAccepted = vi.fn();

        render(
            <AlertCardItem
                alert={baseSmartAlert}
                source={source}
                onDismiss={vi.fn()}
                onNavigate={vi.fn()}
                onAcceptedConvertToCase={onAccepted}
                onResolved={onResolved}
            />,
        );

        const acceptBtn = screen.getByText('قبول');
        const rejectBtn = screen.getByText('رفض');

        // ضغط متعدد سريع
        fireEvent.click(acceptBtn);
        fireEvent.click(acceptBtn);
        fireEvent.click(rejectBtn);

        // الزرّان مُعطَّلان الآن
        await waitFor(() => {
            expect((acceptBtn as HTMLButtonElement).disabled).toBe(true);
            expect((rejectBtn as HTMLButtonElement).disabled).toBe(true);
        });

        // استدعاء واحد فقط
        expect(updateStatusMock).toHaveBeenCalledTimes(1);

        // نُكمل العملية
        resolveCall(true);
        await waitFor(() => {
            expect(onResolved).toHaveBeenCalledTimes(1);
        });
    });

    it('h3) Escape يُغلق modal التفاصيل', async () => {
        const sourceWithDive: SecretaryAlert = {
            id: 'a2',
            type: 'HEARING',
            title: 'جلسة محكمة',
            summary: 'مرافعة',
            aiDeepDive: 'تفاصيل عميقة كافية لإظهار زرّ التفاصيل في بطاقة التنبيه. هذا نص طويل بما يكفي.',
        } as SecretaryAlert;

        render(
            <AlertCardItem
                alert={{ ...baseSmartAlert, id: 'a2' }}
                source={sourceWithDive}
                onDismiss={vi.fn()}
                onNavigate={vi.fn()}
            />,
        );

        // فتح modal التفاصيل
        const detailBtn = screen.getByTitle('تفاصيل');
        fireEvent.click(detailBtn);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeTruthy();
        });

        // ضغط Escape
        fireEvent.keyDown(window, { key: 'Escape' });

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });
});
