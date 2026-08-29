import React from 'react';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { Send } from '@/app/components/ui/icons/Send';
import type { HamiIcon } from '@/app/components/ui/icons/hamiIcon';

type IconComponent = HamiIcon;

const CATALOG_BUTTON_CLASS =
    'flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[10px] font-bold text-slate-300 transition-all hover:border-emerald-500/35 hover:bg-emerald-950/25 hover:text-emerald-100';

const BACK_BUTTON_CLASS =
    'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-bold text-slate-300 transition-all hover:border-emerald-400/25 hover:text-emerald-100';

const SUBMIT_BUTTON_CLASS =
    'flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-700/70 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40';

const DETAIL_PANEL_CLASS = 'rounded-xl border border-white/10 bg-black/20 p-3 space-y-3';

const DECISIONS_FOLLOWUP_BUTTON_CLASS =
    'w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15';

export function HiddenFollowupDetailPanel({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    return <div className={DETAIL_PANEL_CLASS}>{children}</div>;
}

export function HiddenFollowupStatusLabel({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    return <p className="text-[9px] text-slate-400 text-right">{children}</p>;
}

export function HiddenFollowupCatalogPickerButton({
    label,
    Icon,
    onClick,
    statusDot,
}: {
    label: string;
    Icon: IconComponent;
    onClick: () => void;
    statusDot?: 'pending' | 'approved' | null;
}): React.ReactElement {
    return (
        <button type="button" onClick={onClick} className={CATALOG_BUTTON_CLASS}>
            <Icon size={16} className="shrink-0 opacity-75" />
            <span className="flex-1 text-right leading-tight">{label}</span>
            {statusDot === 'pending' ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            ) : null}
            {statusDot === 'approved' ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            ) : null}
        </button>
    );
}

export function HiddenFollowupCatalogGrid({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function HiddenFollowupBackButton({
    onClick,
    label = 'رجوع',
    withChevron = false,
}: {
    onClick: () => void;
    label?: string;
    withChevron?: boolean;
}): React.ReactElement {
    return (
        <button type="button" onClick={onClick} className={BACK_BUTTON_CLASS}>
            {withChevron ? <ChevronRight size={14} className="opacity-70" /> : null}
            {label}
        </button>
    );
}

export function HiddenFollowupSubmitButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}): React.ReactElement {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className={SUBMIT_BUTTON_CLASS}>
            <Send size={13} />
            {label}
        </button>
    );
}

export function HiddenFollowupDecisionsFollowupButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}): React.ReactElement {
    return (
        <button type="button" onClick={onClick} className={DECISIONS_FOLLOWUP_BUTTON_CLASS}>
            {label}
        </button>
    );
}

export function HiddenFollowupEmptyState({
    message,
}: {
    message: string;
}): React.ReactElement {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center">
            <p className="text-[10px] leading-relaxed text-slate-400">{message}</p>
        </div>
    );
}
