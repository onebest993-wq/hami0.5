import React from 'react';
import { Loader2 } from '@/app/components/ui/lucideIcons';

export function NotificationLoadingState() {
    return (
        <div
            className="flex flex-col items-center justify-center min-h-[240px] py-12 text-white/35"
            data-testid="notification-panel-content-loading"
            aria-live="polite"
        >
            <div className="relative mb-5">
                <div className="w-14 h-14 rounded-2xl bg-[#E6C673]/10 border border-[#E6C673]/20 flex items-center justify-center">
                    <Loader2 className="text-[#E6C673] animate-spin" size={26} aria-hidden />
                </div>
            </div>
            <span className="sr-only">جاري تحميل الإشعارات</span>
        </div>
    );
}
