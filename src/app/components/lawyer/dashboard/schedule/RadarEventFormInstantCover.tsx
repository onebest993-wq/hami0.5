import React from 'react';

type RadarEventFormInstantCoverProps = {
    onClose: () => void;
};

/**
 * غطاء Suspense لنموذج الموعد.
 * يعيش بجانب RadarOpenInstantAddHost حتى لا يكسر عزل جذع الجدول عن SmartLegalRadar.
 */
export function RadarEventFormInstantCover({ onClose }: RadarEventFormInstantCoverProps) {
    return (
        <div
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-[#0A0F1C]/72"
            data-testid="radar-event-form-pending"
            role="status"
            aria-busy="true"
            aria-label="نموذج الموعد"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-lg rounded-t-xl sm:rounded-xl bg-[#0A0F1C] p-4 space-y-3"
                aria-hidden
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="h-5 w-36 rounded-md border border-white/[0.09] bg-white/[0.035]" />
                    <div className="min-h-[44px] min-w-[44px] rounded-lg border border-white/[0.09] bg-white/[0.035]" />
                </div>
                <div className="min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
                <div className="min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
            </div>
        </div>
    );
}
