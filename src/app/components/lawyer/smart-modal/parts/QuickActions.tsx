import React, { memo } from 'react';
import { Calendar, FileText, Paperclip, Scale, type LucideIcon } from 'lucide-react';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { GLASS_ACTION_BTN } from '../smartFile/moroccanGlassShell';

type QuickActionItem = {
    id: string;
    icon: LucideIcon;
    label: string;
    iconClass: string;
};

const APPOINTMENT_ACTION: QuickActionItem = {
    id: 'appointment',
    icon: Calendar,
    label: 'موعد جديد',
    iconClass: 'text-[#E6C673]',
};

const NOTE_ACTION: QuickActionItem = {
    id: 'note',
    icon: FileText,
    label: 'ملاحظة',
    iconClass: 'text-[#E6C673]',
};

const DOCUMENT_ACTION: QuickActionItem = {
    id: 'document',
    icon: Paperclip,
    label: 'مستند',
    iconClass: 'text-[#E6C673]',
};

const LEGAL_ACTION: QuickActionItem = {
    id: 'legal',
    icon: Scale,
    label: 'إجراءات الدعوى',
    iconClass: 'text-[#E6C673]',
};

const QUICK_ACTION_TEST_IDS: Record<string, string> = {
    appointment: CIVIL_LAWSUIT_TEST_IDS.quickActionAppointment,
    note: CIVIL_LAWSUIT_TEST_IDS.quickActionNote,
    document: CIVIL_LAWSUIT_TEST_IDS.quickActionDocument,
    legal: CIVIL_LAWSUIT_TEST_IDS.quickActionLegal,
};

function QuickActionButton({
    action,
    onClick,
}: {
    action: QuickActionItem;
    onClick: () => void;
}) {
    const Icon = action.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${GLASS_ACTION_BTN} h-24 sm:h-28 w-full min-w-0 items-center justify-center gap-3 px-4 py-3 text-center`}
            data-testid={QUICK_ACTION_TEST_IDS[action.id]}
        >
            <span className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 flex-1 flex-col items-center gap-1 leading-tight">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/28">
                        إجراء سريع
                    </span>
                    <span className="min-w-0 truncate text-[14px] sm:text-[15px] font-black text-[#F4E9CD] group-hover:text-[#FFF7E7] transition-colors">
                        {action.label}
                    </span>
                </span>
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[#E6C673]/18 bg-[#E6C673]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] group-hover:scale-105 transition-transform shrink-0">
                    <Icon size={18} className={action.iconClass} strokeWidth={2.2} />
                </span>
            </span>
        </button>
    );
}

export const QuickActions = memo(function QuickActions({
    onAction,
    onPause,
    onOpenLegalActions,
    variant = 'full',
}: {
    onAction: (type: string) => void;
    onPause: () => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
}) {
    void onPause;

    const actions =
        variant === 'notes-only'
            ? [NOTE_ACTION, DOCUMENT_ACTION]
            : [APPOINTMENT_ACTION, NOTE_ACTION, DOCUMENT_ACTION];

    return (
        <div
            className={`mb-4 grid w-full gap-2 ${
                variant === 'notes-only' ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-3'
            }`}
        >
            {actions.map((action) => (
                <QuickActionButton
                    key={action.id}
                    action={action}
                    onClick={() => onAction(action.id)}
                />
            ))}
            {variant === 'full' ? (
                <QuickActionButton action={LEGAL_ACTION} onClick={onOpenLegalActions} />
            ) : null}
        </div>
    );
});
