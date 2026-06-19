import React from 'react';
import { Calendar, FileText, Paperclip, Scale, type LucideIcon } from 'lucide-react';

type QuickActionItem = {
    id: string;
    icon: LucideIcon;
    label: string;
    button: string;
    iconWrap: string;
    iconClass: string;
    labelClass: string;
};

const QUICK_ACTION_BASE =
    'flex flex-col items-center justify-center gap-1.5 h-14 rounded-xl backdrop-blur-xl transition-all group hover:scale-[1.02] border';

const APPOINTMENT_ACTION: QuickActionItem = {
    id: 'appointment',
    icon: Calendar,
    label: 'موعد جديد',
    button: `${QUICK_ACTION_BASE} border-sky-400/28 bg-gradient-to-br from-sky-500/14 via-sky-500/6 to-[#0A0F1C]/20 shadow-[0_4px_16px_rgba(14,165,233,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-sky-300/50 hover:from-sky-500/22 hover:shadow-[0_8px_28px_rgba(14,165,233,0.28)]`,
    iconWrap: 'flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/18 border border-sky-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    iconClass: 'text-sky-200',
    labelClass: 'text-[10px] font-bold text-sky-100/90 whitespace-nowrap group-hover:text-sky-50 transition-colors',
};

const NOTE_ACTION: QuickActionItem = {
    id: 'note',
    icon: FileText,
    label: 'ملاحظة',
    button: `${QUICK_ACTION_BASE} border-amber-400/28 bg-gradient-to-br from-amber-500/14 via-[#E6C673]/8 to-[#0A0F1C]/20 shadow-[0_4px_16px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#E6C673]/45 hover:from-amber-500/20 hover:shadow-[0_8px_28px_rgba(230,198,115,0.22)]`,
    iconWrap: 'flex items-center justify-center w-7 h-7 rounded-lg bg-[#E6C673]/14 border border-[#E6C673]/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    iconClass: 'text-[#E6C673]',
    labelClass: 'text-[10px] font-bold text-amber-100/90 whitespace-nowrap group-hover:text-[#E6C673] transition-colors',
};

const DOCUMENT_ACTION: QuickActionItem = {
    id: 'document',
    icon: Paperclip,
    label: 'مستند',
    button: `${QUICK_ACTION_BASE} border-emerald-400/28 bg-gradient-to-br from-emerald-500/14 via-emerald-500/6 to-[#0A0F1C]/20 shadow-[0_4px_16px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-300/50 hover:from-emerald-500/22 hover:shadow-[0_8px_28px_rgba(16,185,129,0.24)]`,
    iconWrap: 'flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/16 border border-emerald-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    iconClass: 'text-emerald-200',
    labelClass: 'text-[10px] font-bold text-emerald-100/90 whitespace-nowrap group-hover:text-emerald-50 transition-colors',
};

const LEGAL_ACTION: QuickActionItem = {
    id: 'legal',
    icon: Scale,
    label: 'إجراءات الدعوى',
    button: `${QUICK_ACTION_BASE} border-violet-400/30 bg-gradient-to-br from-violet-500/16 via-indigo-500/8 to-[#0A0F1C]/20 shadow-[0_4px_16px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-violet-300/50 hover:from-violet-500/24 hover:shadow-[0_8px_28px_rgba(139,92,246,0.28)]`,
    iconWrap: 'flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/18 border border-violet-400/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    iconClass: 'text-violet-200',
    labelClass: 'text-[10px] font-bold text-violet-100/90 whitespace-nowrap group-hover:text-violet-50 transition-colors',
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
        <button type="button" onClick={onClick} className={action.button}>
            <span className={`${action.iconWrap} group-hover:scale-110 transition-transform`}>
                <Icon size={14} className={action.iconClass} strokeWidth={2.25} />
            </span>
            <span className={action.labelClass}>{action.label}</span>
        </button>
    );
}

export const QuickActions = ({
    onAction,
    onPause,
    onOpenLegalActions,
    variant = 'full',
}: {
    onAction: (type: string) => void;
    onPause: () => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
}) => {
    void onPause;

    const actions =
        variant === 'notes-only'
            ? [NOTE_ACTION, DOCUMENT_ACTION]
            : [APPOINTMENT_ACTION, NOTE_ACTION, DOCUMENT_ACTION];

    return (
        <div
            className={`grid gap-2 mb-6 ${variant === 'notes-only' ? 'grid-cols-2 max-w-xs mr-auto' : 'grid-cols-4'}`}
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
};
