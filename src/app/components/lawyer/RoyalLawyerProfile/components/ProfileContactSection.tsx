import React from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ActionIcon } from './ActionIcon';
import { ProfileContactChannel } from './ProfileContactChannel';
import { contactValuePlaceholder } from '@/app/services/profile/profileContactNavigation';
import { clampProfileContactLabel, clampProfileContactValue } from '@/app/services/profile/profileContactInputSecurity';
import { pickCurrentLocationForProfile } from '@/app/services/profile/profileGeolocation';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
};

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
    const reduceMotion = useReduceMotion();
    const editingActions = isEditing ? actions : visibleActions;
    const hasRenderedActions = editingActions.length > 0;
    return (
        <motion.div
            initial={reduceMotion ? false : fadeUp.initial}
            animate={fadeUp.animate}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.08 }}
        >
            <MoroccanGlassFrame
                profilePanel
                ornatePattern={ornatePattern}
                className="hami-profile-section-panel"
                patternOpacity={0.07}
            >
                <div className="hami-profile-section-head">
                    <div>
                        <p className="hami-profile-section-kicker">Connect</p>
                        <h2 className="hami-profile-section-title">قنوات التواصل</h2>
                    </div>
                    {isEditing && !readOnly ? (
                        <button
                            type="button"
                            data-testid="lawyer-profile-add-contact"
                            onClick={() => addContactChannel('whatsapp')}
                            className={`hami-profile-section-action ${PROFILE_THEME.accentBtn}`}
                        >
                            <Plus size={14} />
                            إضافة
                        </button>
                    ) : null}
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
                        اضغط «إضافة» أو اختر نوع القناة أعلاه.
                    </p>
                ) : !hasRenderedActions ? (
                    <p className="text-xs text-white/35 text-center py-4">
                        أضف واتساب، هاتف، بريد، أو موقعك من «تعديل».
                    </p>
                ) : (
                    <div className="hami-profile-contact-stack">
                        {editingActions.map((action) =>
                            isEditing && draft ? (
                                <div key={action.id} className="hami-profile-edit-channel-row">
                                    <ActionIcon type={action.type} />
                                    <input
                                        value={action.label}
                                        onChange={(e) =>
                                            setDraft({
                                                ...draft,
                                                actions: draft.actions.map((a) =>
                                                    a.id === action.id
                                                        ? { ...a, label: clampProfileContactLabel(e.target.value) }
                                                        : a,
                                                ),
                                            })
                                        }
                                        className="flex-1 bg-transparent text-xs outline-none min-w-0"
                                        placeholder="التسمية"
                                    />
                                    <input
                                        value={action.value}
                                        onChange={(e) =>
                                            setDraft({
                                                ...draft,
                                                actions: draft.actions.map((a) =>
                                                    a.id === action.id
                                                        ? {
                                                              ...a,
                                                              value: clampProfileContactValue(e.target.value),
                                                              ...(a.type === 'location'
                                                                  ? { locationMode: 'manual' as const }
                                                                  : {}),
                                                          }
                                                        : a,
                                                ),
                                            })
                                        }
                                        className="flex-[2] bg-white/5 rounded-xl px-2 py-1.5 text-xs outline-none min-w-0"
                                        placeholder={contactValuePlaceholder(action.type)}
                                    />
                                    {action.type === 'location' ? (
                                        <button
                                            type="button"
                                            title="تحديد الموقع عبر GPS"
                                            onClick={() => {
                                                void pickCurrentLocationForProfile().then((coords) => {
                                                    if (!coords) return;
                                                    setDraft((prev) => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            actions: prev.actions.map((a) =>
                                                                a.id === action.id
                                                                    ? {
                                                                          ...a,
                                                                          value: coords,
                                                                          locationMode: 'gps',
                                                                      }
                                                                    : a,
                                                            ),
                                                        };
                                                    });
                                                });
                                            }}
                                            className="shrink-0 px-2 py-1.5 min-h-[44px] rounded-lg text-[10px] font-bold hami-profile-accent-btn border whitespace-nowrap"
                                        >
                                            تحديد المكان
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDraft({
                                                ...draft,
                                                actions: draft.actions.filter((a) => a.id !== action.id),
                                            })
                                        }
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <ProfileContactChannel key={action.id} action={action} />
                            ),
                        )}
                    </div>
                )}
            </MoroccanGlassFrame>
        </motion.div>
    );
}
