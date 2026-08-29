import React from 'react';
import { Loader2 } from '@/app/components/ui/icons/Loader2';

export function NotificationLoadingState() {
    return (
        <div
            className="flex items-center justify-center py-6 text-white/35"
            data-testid="notification-panel-content-loading"
            aria-live="polite"
        >
            <Loader2 className="animate-spin text-white/40" size={20} aria-hidden />
            <span className="sr-only">جاري تحميل الإشعارات</span>
        </div>
    );
}
