import React, { memo } from 'react';
import { Calendar, FileText, Paperclip, Scale, type LucideIcon } from '@/app/components/ui/lucideIcons';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { MOROCCAN_ZELLIGE_BG } from '../smartFile/moroccanGlassShell';
import type { ViewOnlyQuickActionId } from '../smartFile/viewOnlyQuickActions';

type QuickActionItem = {
    id: string;
    icon: LucideIcon;
    label: string;
};

const APPOINTMENT_ACTION: QuickActionItem = {
    id: 'appointment',
    icon: Calendar,
    label: 'موعد جديد',
};

const NOTE_ACTION: QuickActionItem = {
    id: 'note',
    icon: FileText,
    label: 'ملاحظة',
};

const DOCUMENT_ACTION: QuickActionItem = {
    id: 'document',
    icon: Paperclip,
    label: 'مستند',
};

const VIEW_ONLY_LABELS: Record<ViewOnlyQuickActionId, string> = {
    appointment: 'مواعيد',
    note: 'ملاحظات',
    document: 'مستندات',
};

const LEGAL_ACTION: QuickActionItem = {
    id: 'legal',
    icon: Scale,
    label: 'إجراءات الدعوى',
};

const QUICK_ACTION_TEST_IDS: Record<string, string> = {
    appointment: CIVIL_LAWSUIT_TEST_IDS.quickActionAppointment,
    note: CIVIL_LAWSUIT_TEST_IDS.quickActionNote,
    document: CIVIL_LAWSUIT_TEST_IDS.quickActionDocument,
    legal: CIVIL_LAWSUIT_TEST_IDS.quickActionLegal,
};

const ALL_CONTENT_ACTIONS: QuickActionItem[] = [APPOINTMENT_ACTION, NOTE_ACTION, DOCUMENT_ACTION];

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
            data-testid={QUICK_ACTION_TEST_IDS[action.id]}
            className={`group relative isolate flex h-[4.75rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-[#E6C673]/28 px-2 py-2 text-center touch-manipulation transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${MOROCCAN_ZELLIGE_BG}`}
            style={{
                background: `
                    linear-gradient(155deg, rgba(230,198,115,0.22) 0%, rgba(11,16,33,0.88) 46%, rgba(201,162,39,0.14) 100%)
                `,
                boxShadow: `
                    inset 0 1px 0 rgba(255,249,230,0.22),
                    inset 0 -1px 0 rgba(0,0,0,0.35),
                    0 12px 28px rgba(0,0,0,0.32)
                `,
                backdropFilter: 'blur(14px) saturate(1.2)',
            }}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-l from-transparent via-[#E6C673]/55 to-transparent"
            />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6C673]/30 bg-[#0B1021]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-200 group-hover:scale-105">
                <Icon size={17} className="text-[#E6C673]" strokeWidth={2.1} aria-hidden />
            </span>
            <span className="relative min-w-0 truncate text-[12px] font-extrabold leading-tight text-[#F4E9CD] group-hover:text-[#FFF7E7]">
                {action.label}
            </span>
        </button>
    );
}

function gridColsClass(count: number): string {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-3';
}

export const QuickActions = memo(function QuickActions({
    onAction,
    onOpenLegalActions,
    variant = 'full',
    viewOnlyActionIds,
}: {
    onAction: (type: string) => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
    /** وضع الاطلاع — يُظهر فقط الأزرار التي بها محتوى؛ بلا إجراءات الدعوى */
    viewOnlyActionIds?: ViewOnlyQuickActionId[];
}) {
    const isViewOnlyBrowse = viewOnlyActionIds !== undefined;

    const actions = isViewOnlyBrowse
        ? viewOnlyActionIds
              .map((id) => {
                  const base = ALL_CONTENT_ACTIONS.find((a) => a.id === id);
                  if (!base) return null;
                  return { ...base, label: VIEW_ONLY_LABELS[id] };
              })
              .filter((a): a is QuickActionItem => Boolean(a))
        : variant === 'notes-only'
          ? [NOTE_ACTION, DOCUMENT_ACTION]
          : [APPOINTMENT_ACTION, NOTE_ACTION, DOCUMENT_ACTION];

    if (isViewOnlyBrowse && actions.length === 0) {
        return null;
    }

    const gridClass = isViewOnlyBrowse
        ? gridColsClass(actions.length)
        : variant === 'notes-only'
          ? 'grid-cols-2'
          : 'grid-cols-4';

    return (
        <div className={`mb-4 grid w-full gap-2.5 ${gridClass}`}>
            {actions.map((action) => (
                <QuickActionButton
                    key={action.id}
                    action={action}
                    onClick={() => onAction(action.id)}
                />
            ))}
            {variant === 'full' && !isViewOnlyBrowse ? (
                <QuickActionButton action={LEGAL_ACTION} onClick={onOpenLegalActions} />
            ) : null}
        </div>
    );
});
