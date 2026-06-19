import React from 'react';
import { Loader2 } from 'lucide-react';

export function NotificationLoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[240px] py-12 text-white/35">
            <Loader2 className="text-[#E6C673] animate-spin mb-4" size={28} aria-hidden />
            <p className="text-sm font-medium">جاري تحميل الإشعارات...</p>
        </div>
    );
}
