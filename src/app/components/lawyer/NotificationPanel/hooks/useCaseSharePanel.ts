import { useMemo, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { partitionCaseShareForPanel } from '@/app/components/lawyer/NotificationPanel/utils/partitionCaseShareForPanel';

type Params = {
    userId: string;
    shares: CaseShareRecord[];
    onChanged: () => void;
};

export function useCaseSharePanel({ userId, shares, onChanged }: Params) {
    const [viewing, setViewing] = useState<CaseShareRecord | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const { pendingIncoming, activeSessions, recentEnded, hasContent } = useMemo(
        () => partitionCaseShareForPanel(shares, userId),
        [shares, userId],
    );

    const roleLabel = (share: CaseShareRecord) =>
        share.ownerId === userId ? `إلى ${share.recipientName}` : `من ${share.ownerName}`;

    const respond = async (share: CaseShareRecord, action: 'accept' | 'decline') => {
        if (share.recipientId !== userId) {
            SmartToast.error('تعذّر تحديث الطلب');
            return;
        }
        setBusyId(share.id);
        try {
            await CaseShareApiService.respond(share.id, action, userId);
            SmartToast.success(action === 'accept' ? 'تمت الموافقة — الجلسة نشطة' : 'تم رفض الطلب');
            onChanged();
        } catch {
            SmartToast.error('تعذّر تحديث الطلب');
        } finally {
            setBusyId(null);
        }
    };

    const openShare = async (share: CaseShareRecord) => {
        try {
            const detail = await CaseShareApiService.getShareDetail(share.id, userId);
            if (detail) setViewing(detail);
            else SmartToast.error('تعذّر تحميل الإضبارة');
        } catch {
            SmartToast.error('تعذّر تحميل الإضبارة');
        }
    };

    const closeViewer = () => setViewing(null);

    const handleSessionEnded = () => {
        onChanged();
        setViewing(null);
    };

    return {
        pendingIncoming,
        activeSessions,
        recentEnded,
        hasContent,
        viewing,
        busyId,
        roleLabel,
        respond,
        openShare,
        closeViewer,
        handleSessionEnded,
    };
}
