import React, { useRef, useState } from 'react';
import { Plus, Trash2 } from '@/app/components/ui/lucideIcons';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import { ActionIcon } from './ActionIcon';
import { ProfileContactChannel } from './ProfileContactChannel';
import { contactValuePlaceholder } from '@/app/services/profile/profileContactNavigation';
import {
    clampProfileContactLabelLive,
    clampProfileContactValueLive,
} from '@/app/services/profile/profileContactInputSecurity';
import { pickCurrentLocationForProfile } from '@/app/services/profile/profileGeolocation';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';

const CONTACT_CHANNEL_OPTIONS: { type: ProfileAction['type']; label: string }[] = [
    { type: 'whatsapp', label: 'واتساب' },
    { type: 'call', label: 'هاتف' },
    { type: 'email', label: 'بريد' },
    { type: 'location', label: 'الموقع' },
];

export type ProfileContactSectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    actions: ProfileAction[];
    visibleActions: ProfileAction[];
    ornatePattern: boolean;
    addContactChannel: (type: ProfileAction['type']) => void;
};

export function ProfileContactSection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    actions,
    visibleActions,
    ornatePattern,
    addContactChannel,
}: ProfileContactSectionProps) {
    const editingActions = isEditing ? actions : visibleActions;
    const hasRenderedActions = editingActions.length > 0;
    const geoGenRef = useRef(0);
    const draftRef = useRef(draft);
    draftRef.current = draft;
    const [locatingActionId, setLocatingActionId] = useState<string | null>(null);
    return (
        <div>
            <MoroccanGlassFrame
                profilePanel
                ornatePattern={ornatePattern}
                className="hami-profile-section-panel"
                patternOpacity={0.07}
            >
                <div className="hami-profile-section-head">
                    <h2 className="hami-profile-section-title hami-profile-section-title--display">
                        قنوات التواصل
                    </h2>
                </div>

                {isEditing ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {CONTACT_CHANNEL_OPTIONS.map((opt) => (
                            <button
                                key={opt.type}
                                type="button"
                                onClick={() => addContactChannel(opt.type)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-bold hami-profile-accent-btn border transition-colors"
                            >
                                <Plus size={12} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                {!hasRenderedActions && isEditing ? (
                    <p className="text-xs text-white/35 text-center py-4">
                        اختر نوع القناة أعلاه لإضافتها.
                    </p>
                ) : !hasRenderedActions ? (
                    <p className="text-xs text-white/35 text-center py-4">
                        أضف واتساب، هاتف، بريد، أو الموقع من «تعديل».
                    </p>
                ) : (
                    <div className="hami-profile-contact-stack">
                        {editingActions.map((action) =>
                            isEditing && draft ? (
                                <div key={action.id} className="hami-profile-edit-channel-row">
                                    <ActionIcon type={action.type} />
                                    <input
                                        value={action.label}
                                        onChange={(e) => {
                                            const label = clampProfileContactLabelLive(e.target.value);
                                            setDraft((prev) => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    actions: prev.actions.map((a) =>
                                                        a.id === action.id ? { ...a, label } : a,
                                                    ),
                                                };
                                            });
                                        }}
                                        className="flex-1 bg-transparent text-xs outline-none min-w-0"
                                        placeholder="التسمية"
                                    />
                                    <input
                                        value={action.value}
                                        onChange={(e) => {
                                            const value = clampProfileContactValueLive(e.target.value);
                                            setDraft((prev) => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    actions: prev.actions.map((a) =>
                                                        a.id === action.id
                                                            ? {
                                                                  ...a,
                                                                  value,
                                                                  ...(a.type === 'location'
                                                                      ? { locationMode: 'manual' as const }
                                                                      : {}),
                                                              }
                                                            : a,
                                                    ),
                                                };
                                            });
                                        }}
                                        className="flex-[2] bg-white/5 rounded-xl px-2 py-1.5 text-xs outline-none min-w-0"
                                        placeholder={contactValuePlaceholder(action.type)}
                                    />
                                    {action.type === 'location' ? (
                                        <button
                                            type="button"
                                            title="تحديد الموقع عبر GPS"
                                            aria-label="تحديد الموقع عبر GPS"
                                            disabled={locatingActionId === action.id}
                                            onClick={() => {
                                                const requestGen = ++geoGenRef.current;
                                                const actionId = action.id;
                                                setLocatingActionId(actionId);
                                                void pickCurrentLocationForProfile()
                                                    .then((coords) => {
                                                        if (!coords) return;
                                                        if (requestGen !== geoGenRef.current) return;
                                                        const current = draftRef.current;
                                                        if (!current?.actions.some((a) => a.id === actionId)) {
                                                            return;
                                                        }
                                                        setDraft((prev) => {
                                                            if (!prev) return prev;
                                                            if (!prev.actions.some((a) => a.id === actionId)) {
                                                                return prev;
                                                            }
                                                            return {
                                                                ...prev,
                                                                actions: prev.actions.map((a) =>
                                                                    a.id === actionId
                                                                        ? {
                                                                              ...a,
                                                                              value: coords,
                                                                              locationMode: 'gps',
                                                                          }
                                                                        : a,
                                                                ),
                                                            };
                                                        });
                                                        SmartToast.success('تم تحديد موقعك الحالي');
                                                    })
                                                    .finally(() => {
                                                        if (requestGen === geoGenRef.current) {
                                                            setLocatingActionId(null);
                                                        }
                                                    });
                                            }}
                                            className="shrink-0 px-2 py-1.5 min-h-[44px] rounded-lg text-[10px] font-bold hami-profile-accent-btn border whitespace-nowrap disabled:opacity-40"
                                        >
                                            {locatingActionId === action.id ? 'جاري…' : 'تحديد المكان'}
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDraft((prev) => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    actions: prev.actions.filter((a) => a.id !== action.id),
                                                };
                                            })
                                        }
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
                            ) : (
                                <ProfileContactChannel key={action.id} action={action} />
                            ),
                        )}
                    </div>
                )}
            </MoroccanGlassFrame>
        </div>
    );
}
