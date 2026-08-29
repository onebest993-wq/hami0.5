import React, { memo } from 'react';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type { ViewOnlyQuickActionId } from '../smartFile/viewOnlyQuickActions';
import { LV_INSET, LV_INSET_HOVER, LV_RADIUS } from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

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
            className={`flex min-h-[3.5rem] w-full min-w-0 flex-col items-center justify-center gap-1 ${LV_RADIUS} ${LV_INSET} ${LV_INSET_HOVER} px-2 py-2 text-center touch-manipulation active:scale-[0.98]`}
        >
            <Icon size={16} className="text-[#E6C673]" strokeWidth={1.9} aria-hidden />
            <span className="min-w-0 truncate text-[11px] font-bold leading-tight text-white/80">
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
        <div className={`mb-3 grid w-full gap-2 ${gridClass}`}>
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
