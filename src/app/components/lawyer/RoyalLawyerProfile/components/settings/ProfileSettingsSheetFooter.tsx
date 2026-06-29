import React from 'react';
import { Check } from 'lucide-react';

type ProfileSettingsSheetFooterProps = {
    saving: boolean;
    onSave: () => void;
};

export function ProfileSettingsSheetFooter({ saving, onSave }: ProfileSettingsSheetFooterProps) {
    return (
        <div className="relative z-[1] p-4 border-t border-white/[0.06] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/20">
            <button
                type="button"
                disabled={saving}
                onClick={onSave}
                data-testid="profile-settings-save"
                className="profile-settings-save-btn w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 min-h-[50px] disabled:opacity-60"
            >
                {saving ? (
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                    <Check size={16} />
                )}
                حفظ الاستوديو
            </button>
        </div>
    );
}
