import { useMemo, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { SmartToast } from '@/app/components/ui/SmartToast';

type Params = {
    userId: string;
    shares: CaseShareRecord[];
    onChanged: () => void;
};

export function useCaseShareIncoming({ userId, shares, onChanged }: Params) {
    const [viewing, setViewing] = useState<CaseShareRecord | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const { pendingIncoming, activeSessions, recentEnded } = useMemo(() => {
        const pendingIncoming = shares.filter((s) => s.recipientId === userId && s.status === 'pending');
        const activeSessions = shares.filter(
            (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
        );
        const recentEnded = shares
            .filter((s) => s.status === 'ended' && (s.ownerId === userId || s.recipientId === userId))
            .slice(0, 5);
        return { pendingIncoming, activeSessions, recentEnded };
    }, [shares, userId]);

    const hasContent =
        pendingIncoming.length > 0 || activeSessions.length > 0 || recentEnded.length > 0;

    const roleLabel = (share: CaseShareRecord) =>
        share.ownerId === userId ? `إلى ${share.recipientName}` : `من ${share.ownerName}`;

    const respond = async (share: CaseShareRecord, action: 'accept' | 'decline') => {
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
