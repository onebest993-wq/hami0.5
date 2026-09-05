import React, { useState } from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import type { InlineActionGateKey } from '../types';
import {
    RequestConfirmStrip,
    REQUEST_CONFIRM_HINT_CLASS,
} from '@/app/components/lawyer/shared/RequestConfirmStrip';

export type InlineActionGateMode = 'initial' | 'resubmit_warning';

export interface InlineActionGateProps {
    gateKey: InlineActionGateKey;
    activeKey: InlineActionGateKey | null;
    onConfirm: () => void;
    onCancel: () => void;
    mode?: InlineActionGateMode;
    warningMessage?: string;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    /** للتوافق — كل الأنماط تُعرض كستارة خفيفة على البطاقة */
    variant?: 'overlay' | 'inline';
    children?: React.ReactNode;
}

export const InlineActionGate = React.memo(function InlineActionGate({
    gateKey,
    activeKey,
    onConfirm,
    onCancel,
    mode = 'initial',
    warningMessage,
    confirmLabel,
    confirmDisabled = false,
    children,
}: InlineActionGateProps) {
    const [busy, setBusy] = useState(false);
    const isVisible = activeKey === gateKey;
    const isResubmit = mode === 'resubmit_warning';

    if (!isVisible) return null;

    const handleConfirm = () => {
        if (busy || confirmDisabled) return;
        setBusy(true);
        try {
            onConfirm();
        } finally {
            setBusy(false);
            onCancel();
        }
    };

    if (isResubmit) {
        return (
            <RequestConfirmStrip
                onConfirm={handleConfirm}
                onCancel={onCancel}
                confirmLabel={confirmLabel || 'تقديم طلب جديد'}
                cancelLabel="تراجع"
                disabled={confirmDisabled}
                busy={busy}
                hint={null}
            >
                <div className="flex flex-row-reverse items-start justify-center gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300/90" aria-hidden />
                    <p className={`${REQUEST_CONFIRM_HINT_CLASS} max-w-none whitespace-normal text-amber-100/90`}>
                        {warningMessage || 'سبق واتخاذ هذا الإجراء سابقاً. هل تريد تقديم طلب جديد؟'}
                    </p>
                </div>
                {children ? <div className="w-full">{children}</div> : null}
            </RequestConfirmStrip>
        );
    }

    if (children) {
        return (
            <RequestConfirmStrip
                onConfirm={handleConfirm}
                onCancel={onCancel}
                confirmLabel={confirmLabel || 'تأكيد وإرسال'}
                cancelLabel="تراجع"
                disabled={confirmDisabled}
                busy={busy}
            >
                {children}
            </RequestConfirmStrip>
        );
    }

    return (
        <RequestConfirmStrip
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmLabel={confirmLabel || 'تأكيد'}
            cancelLabel="تراجع"
            disabled={confirmDisabled}
            busy={busy}
            hint="إرسال لمنفذ العدل"
        />
    );
});
