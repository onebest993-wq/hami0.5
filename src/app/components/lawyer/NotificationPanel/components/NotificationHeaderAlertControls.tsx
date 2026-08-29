import React from 'react';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { X } from '@/app/components/ui/icons/X';

type Props = {
    isAlertsMuted?: boolean;
    onClose: () => void;
    onBackToInbox?: () => void;
};

export function NotificationHeaderAlertControls({
    isAlertsMuted = false,
    onClose,
    onBackToInbox,
}: Props) {
    return (
        <div className="hami-notif-header relative shrink-0 border-b border-white/[0.06] px-4 pb-2.5 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                        type="button"
                        data-testid="notification-alert-controls-back"
                        onClick={onBackToInbox}
                        aria-label="العودة إلى الإشعارات"
                        className="hami-notif-icon-btn min-h-[44px] min-w-[44px] shrink-0"
                    >
                        <ChevronRight size={20} aria-hidden />
                    </button>
                    <div className="min-w-0">
                        <h2 id="notification-alert-controls-title" className="hami-notif-title truncate">
                            تحكم التنبيهات والصوت
                        </h2>
                        {isAlertsMuted ? (
                            <p className="truncate text-[11px] text-white/40">التنبيهات مكتومة مؤقتاً</p>
                        ) : null}
                    </div>
                </div>

                <button
                    type="button"
                    data-testid="notification-alert-controls-close"
                    onClick={onClose}
                    className="hami-notif-icon-btn min-h-[44px] min-w-[44px] shrink-0"
                    aria-label="إغلاق الإشعارات"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
