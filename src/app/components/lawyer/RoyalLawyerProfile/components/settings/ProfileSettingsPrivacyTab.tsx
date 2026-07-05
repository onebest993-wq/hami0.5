import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { ActionIcon } from '../ActionIcon';
import { LuxuryToggleRow } from './LuxuryToggleRow';

type ProfileSettingsPrivacyTabProps = {
    draft: ProfilePageCustomization;
    actions: ProfileAction[];
    onDraftChange: (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => void;
    onToggleContactVisibility: (actionId: string, hidden: boolean) => void;
};

export function ProfileSettingsPrivacyTab({
    draft,
    actions,
    onDraftChange,
    onToggleContactVisibility,
}: ProfileSettingsPrivacyTabProps) {
    return (
        <div className="space-y-3 pb-2" data-testid="profile-settings-privacy-tab">
            <div className="profile-settings-luxury-card px-4 py-1 divide-y divide-white/[0.06]">
                <LuxuryToggleRow
                    testId="profile-privacy-toggle-contact-channels"
                    label="قنوات التواصل"
                    checked={draft.privacy.showContactChannels}
                    onChange={(v) =>
                        onDraftChange((p) => ({
                            ...p,
                            privacy: { ...p.privacy, showContactChannels: v },
                        }))
                    }
                />
                <LuxuryToggleRow
                    testId="profile-privacy-toggle-gallery"
                    label="معرض الشهادات"
                    checked={draft.privacy.showGallery}
                    onChange={(v) =>
                        onDraftChange((p) => ({
                            ...p,
                            privacy: { ...p.privacy, showGallery: v },
                        }))
                    }
                />
                <LuxuryToggleRow
                    testId="profile-privacy-toggle-custom-blocks"
                    label="الحاويات المخصصة"
                    checked={draft.privacy.showCustomBlocks}
                    onChange={(v) =>
                        onDraftChange((p) => ({
                            ...p,
                            privacy: { ...p.privacy, showCustomBlocks: v },
                        }))
                    }
                />
            </div>

            {actions.length > 0 ? (
                <div className="profile-settings-luxury-card p-4">
                    <p className="text-xs font-bold text-white/80 mb-3">قنوات مخفية عن الزوار</p>
                    <div className="space-y-2">
                        {actions.map((action) => {
                            const hidden = draft.privacy.hiddenContactIds.includes(action.id);
                            return (
                                <div
                                    key={action.id}
                                    className="profile-settings-contact-row flex items-center gap-2 p-2.5"
                                >
                                    <ActionIcon type={action.type} />
                                    <div className="flex-1 min-w-0 text-right">
                                        <p className="text-xs font-bold truncate">{action.label}</p>
                                        <p className="text-[10px] text-white/40 truncate">
                                            {action.value || '—'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        data-testid={`profile-privacy-contact-visibility-${action.id}`}
                                        onClick={() => onToggleContactVisibility(action.id, hidden)}
                                        className={`p-2 rounded-lg border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                            hidden
                                                ? 'border-red-500/30 text-red-400 bg-red-500/10'
                                                : 'border-emerald-500/25 text-emerald-400 bg-emerald-500/10'
                                        }`}
                                        aria-label={hidden ? 'إظهار للزوار' : 'إخفاء عن الزوار'}
                                    >
                                        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
