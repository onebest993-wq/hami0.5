import React from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from '@/app/components/ui/icons/MoreVertical';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';
import { GuarantorAnchoredPopover } from './guarantorAnchoredPopover';

export type GuarantorMenuItem = {
    id: string;
    label: string;
    tone?: 'default' | 'amber' | 'rose';
    onClick: () => void;
};

type GuarantorOverflowMenuProps = {
    items: GuarantorMenuItem[];
    ariaLabel?: string;
    disabled?: boolean;
};

export const GuarantorOverflowMenu: React.FC<GuarantorOverflowMenuProps> = ({
    items,
    ariaLabel = 'قائمة الإجراءات',
    disabled,
}) => {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLButtonElement>(null);

    if (disabled || items.length === 0) return null;

    const menuHeight = 44 * items.length + 8;

    return (
        <div className="relative shrink-0">
            <button
                ref={anchorRef}
                type="button"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className={`rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 ${EXEC_MODAL_TOUCH_TARGET}`}
            >
                <MoreVertical size={16} />
            </button>
            <GuarantorAnchoredPopover
                open={open}
                onClose={() => setOpen(false)}
                anchorRef={anchorRef}
                estimatedHeight={menuHeight}
                minWidth={208}
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`w-full px-3 py-2.5 text-right text-[12px] font-bold hover:bg-white/5 ${EXEC_MODAL_TOUCH_TARGET} ${
                            item.tone === 'amber'
                                ? 'text-amber-100'
                                : item.tone === 'rose'
                                  ? 'text-rose-100'
                                  : 'text-white'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            item.onClick();
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </GuarantorAnchoredPopover>
        </div>
    );
};

export const GuarantorConfirmDialog: React.FC<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ open, title, message, confirmLabel, onCancel, onConfirm }) => {
    useExecutionOverlayDismiss(open, onCancel);
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4"
            role="presentation"
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-2xl border border-rose-500/25 bg-[#0A0F1C] p-4 text-right shadow-lg"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-sm font-black text-rose-100">{title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-200/90">{message}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        className={`rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-white hover:bg-slate-700 ${EXEC_MODAL_TOUCH_TARGET}`}
                        onClick={onCancel}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        className={`rounded-xl border border-rose-500/35 bg-rose-950/35 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/50 ${EXEC_MODAL_TOUCH_TARGET}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
