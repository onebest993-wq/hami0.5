import React from 'react';
import { Calendar, FileText, Paperclip, Scale } from 'lucide-react';
import { PS_QUICK_BTN } from './personalStatusDossierTheme';

const ACTIONS = [
    { id: 'appointment', icon: Calendar, label: 'موعد' },
    { id: 'note', icon: FileText, label: 'ملاحظة' },
    { id: 'document', icon: Paperclip, label: 'مستند' },
    { id: 'legal', icon: Scale, label: 'إجراءات' },
] as const;

export function PersonalStatusQuickActions({
    onAction,
    onOpenLegalActions,
    variant = 'full',
}: {
    onAction: (type: string) => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
}) {
    const items = variant === 'notes-only' ? ACTIONS.filter((a) => a.id === 'note' || a.id === 'document') : ACTIONS;

    return (
        <div className="print:hidden mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {items.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => (id === 'legal' ? onOpenLegalActions() : onAction(id))}
                    className={`${PS_QUICK_BTN} flex flex-col items-center justify-center gap-1`}
                >
                    <Icon size={15} strokeWidth={2} className="text-[#C4A574]/70" />
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}
