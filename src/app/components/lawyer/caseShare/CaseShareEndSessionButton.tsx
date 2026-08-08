import React, { memo, useState } from 'react';
import { PhoneOff } from '@/app/components/ui/lucideIcons';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

type Props = {
    share: CaseShareRecord;
    userId: string;
    onEnded: () => void;
    className?: string;
    compact?: boolean;
};

export const CaseShareEndSessionButton = memo(function CaseShareEndSessionButton({
    share,
    userId,
    onEnded,
    className = '',
    compact = false,
}: Props) {
    const [busy, setBusy] = useState(false);

    const handleEnd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await SmartDialog.confirm('إنهاء جلسة الاستشارة الآن؟', {
            title: 'إنهاء الجلسة',
            confirmText: 'إنهاء',
            cancelText: 'إلغاء',
        });
        if (!ok) return;

        setBusy(true);
        try {
            const updated = await CaseShareApiService.endSession(share.id, userId);
            if (!updated) {
                SmartToast.error('تعذّر إنهاء الجلسة');
                return;
            }
            SmartToast.success('تم إنهاء الجلسة');
            onEnded();
        } catch {
            SmartToast.error('تعذّر إنهاء الجلسة');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            data-testid="case-share-end-session-btn"
            disabled={busy}
            onClick={(e) => void handleEnd(e)}
            className={
                className ||
                (compact
                    ? 'py-2 px-3 rounded-xl bg-red-500/10 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50'
                    : 'w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50')
            }
        >
            <PhoneOff size={14} />
            {busy ? 'جاري الإنهاء…' : 'إنهاء الجلسة'}
        </button>
    );
});
