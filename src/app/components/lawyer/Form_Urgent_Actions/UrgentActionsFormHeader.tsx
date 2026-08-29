import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { UNIFIED_URGENT_FORM_HEADER } from './constants';

export function UrgentActionsFormHeader({ safeClose }: { safeClose: () => void }) {
    return (
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1021]">
            <div className="max-w-5xl mx-auto px-3 hami-overlay-header-safe-pad pb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm truncate">
                        {UNIFIED_URGENT_FORM_HEADER.title}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={safeClose}
                        className="min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white inline-flex items-center gap-1.5 touch-manipulation"
                        aria-label="إلغاء / رجوع"
                    >
                        <X size={16} />
                        <span className="text-xs font-bold">إلغاء</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
