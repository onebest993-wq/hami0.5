import React from 'react';
import { X } from 'lucide-react';

type ProfileSettingsSheetHeaderProps = {
    onClose: () => void;
};

export function ProfileSettingsSheetHeader({ onClose }: ProfileSettingsSheetHeaderProps) {
    return (
        <>
            <div className="profile-settings-handle mx-auto mt-3 mb-3" aria-hidden />

            <div className="px-5 pb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-base text-white">استوديو الصفحة</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="إغلاق"
                >
                    <X size={16} />
                </button>
            </div>
        </>
    );
}
