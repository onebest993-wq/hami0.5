import React from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import { ActionIcon } from './ActionIcon';
import { contactValuePlaceholder } from '@/app/services/profile/profileContactNavigation';

export function ProfileContactEditRow({
    action,
    locatingActionId,
    updateActionLabel,
    updateActionValue,
    removeAction,
    locateAction,
}: {
    action: ProfileAction;
    locatingActionId: string | null;
    updateActionLabel: (id: string, label: string) => void;
    updateActionValue: (id: string, value: string) => void;
    removeAction: (id: string) => void;
    locateAction: (id: string) => void;
}): React.ReactElement {
    return (
        <div className="hami-profile-edit-channel-row">
            <ActionIcon type={action.type} />
            <input
                value={action.label}
                onChange={(e) => updateActionLabel(action.id, e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none min-w-0"
                placeholder="التسمية"
            />
            <input
                value={action.value}
                onChange={(e) => updateActionValue(action.id, e.target.value)}
                className="flex-[2] bg-white/5 rounded-xl px-2 py-1.5 text-xs outline-none min-w-0"
                placeholder={contactValuePlaceholder(action.type)}
                data-testid="profile-contact-edit-value"
            />
            {action.type === 'location' ? (
                <button
                    type="button"
                    title="تحديد الموقع عبر GPS"
                    aria-label="تحديد الموقع عبر GPS"
                    disabled={locatingActionId === action.id}
                    onClick={() => locateAction(action.id)}
                    className="shrink-0 px-2 py-1.5 min-h-[44px] rounded-lg text-[10px] font-bold hami-profile-accent-btn border whitespace-nowrap disabled:opacity-40"
                >
                    {locatingActionId === action.id ? 'جاري…' : 'تحديد المكان'}
                </button>
            ) : null}
            <button
                type="button"
                onClick={() => removeAction(action.id)}
                aria-label="حذف القناة"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl touch-manipulation"
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                }}
            >
                <Trash2 size={14} aria-hidden />
            </button>
        </div>
    );
}
