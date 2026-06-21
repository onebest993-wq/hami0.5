import React, { memo, useMemo, useState } from 'react';
import { Check, Clock, FileText, Lock, Send, Users, X } from 'lucide-react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import {
    caseShareStatusLabel,
    formatCaseShareSession,
    isCaseShareSessionActive,
} from '@/app/services/caseShare/caseShareSession';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SharedDossierViewer } from '@/app/components/lawyer/caseShare/SharedDossierViewer';
import { CaseShareEndSessionButton } from '@/app/components/lawyer/caseShare/CaseShareEndSessionButton';

type Props = {
    userId: string;
    shares: CaseShareRecord[];
    onChanged: () => void;
};

function statusBadgeClass(status: CaseShareRecord['status']): string {
    switch (status) {
        case 'pending':
            return 'bg-amber-500/15 text-amber-300';
        case 'accepted':
            return 'bg-emerald-500/15 text-emerald-300';
        case 'ended':
            return 'bg-white/10 text-white/50';
        default:
            return 'bg-red-500/15 text-red-300';
    }
}

function ShareCard({
    share,
    userId,
    roleLabel,
    busyId,
    onRespond,
    onOpen,
    onChanged,
}: {
    share: CaseShareRecord;
    userId: string;
    roleLabel: string;
    busyId: string | null;
    onRespond: (share: CaseShareRecord, action: 'accept' | 'decline') => void;
    onOpen: (share: CaseShareRecord) => void;
    onChanged: () => void;
}) {
    const active = isCaseShareSessionActive(share);

    return (
        <div
            className="rounded-2xl border border-[#E6C673]/20 bg-[#0A0F1C]/80 p-3.5"
            data-testid={`case-share-card-${share.id}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{share.maskedView.title}</p>
                    <p className="text-white/45 text-[11px] mt-0.5">{roleLabel}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(share.status)}`}>
                    {caseShareStatusLabel(share.status)}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/45 mb-2.5">
                <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {formatCaseShareSession(share.sessionDurationMinutes ?? share.maskedView.sessionDurationMinutes ?? 60)}
                </span>
                <span className="inline-flex items-center gap-1">
                    <Lock size={11} /> قراءة فقط
                </span>
                {share.maskedView.documentsIncluded ? (
                    <span className="inline-flex items-center gap-1">
                        <FileText size={11} /> مرفقات
                    </span>
                ) : null}
            </div>

            {share.status === 'pending' && share.recipientId === userId ? (
                <div className="flex gap-2">
                    <button
                        type="button"
                        data-testid="case-share-accept-btn"
                        disabled={busyId === share.id}
                        onClick={() => void onRespond(share, 'accept')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                    >
                        <Check size={14} /> موافقة
                    </button>
                    <button
                        type="button"
                        disabled={busyId === share.id}
                        onClick={() => void onRespond(share, 'decline')}
                        className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                    >
                        <X size={14} /> رفض
                    </button>
                </div>
            ) : null}

            {active ? (
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => onOpen(share)}
                        className="w-full py-2.5 rounded-xl bg-[#E6C673]/12 text-[#E6C673] text-xs font-bold"
                    >
                        فتح الإضبارة
                    </button>
                    <CaseShareEndSessionButton share={share} userId={userId} onEnded={onChanged} />
                </div>
            ) : null}

            {share.status === 'ended' ? (
                <button
                    type="button"
                    onClick={() => onOpen(share)}
                    className="w-full py-2 rounded-xl bg-white/5 text-white/45 text-xs font-bold"
                >
                    عرض ملخص الجلسة المنتهية
                </button>
            ) : null}
        </div>
    );
}

export const CaseShareIncomingSection = memo(function CaseShareIncomingSection({
    userId,
    shares,
    onChanged,
}: Props) {
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

    if (!pendingIncoming.length && !activeSessions.length && !recentEnded.length) return null;

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

    const roleLabel = (share: CaseShareRecord) =>
        share.ownerId === userId ? `إلى ${share.recipientName}` : `من ${share.ownerName}`;

    const openShare = async (share: CaseShareRecord) => {
        try {
            const detail = await CaseShareApiService.getShareDetail(share.id, userId);
            if (detail) setViewing(detail);
            else SmartToast.error('تعذّر تحميل الإضبارة');
        } catch {
            SmartToast.error('تعذّر تحميل الإضبارة');
        }
    };

    return (
        <>
            {pendingIncoming.length ? (
                <section className="mb-4 pb-4 border-b border-[#E6C673]/15" data-testid="case-share-incoming-section">
                    <h3 className="text-[11px] font-bold text-[#E6C673] uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
                        <Send size={12} />
                        طلبات واردة
                        <span className="text-white/40 font-normal">({pendingIncoming.length})</span>
                    </h3>
                    <div className="space-y-2">
                        {pendingIncoming.map((share) => (
                            <ShareCard
                                key={share.id}
                                share={share}
                                userId={userId}
                                roleLabel={roleLabel(share)}
                                busyId={busyId}
                                onRespond={respond}
                                onOpen={(share) => void openShare(share)}
                                onChanged={onChanged}
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            {activeSessions.length ? (
                <section className="mb-4 pb-4 border-b border-emerald-500/15" data-testid="case-share-active-section">
                    <h3 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
                        <Users size={12} />
                        جلسات نشطة
                        <span className="text-white/40 font-normal">({activeSessions.length})</span>
                    </h3>
                    <div className="space-y-2">
                        {activeSessions.map((share) => (
                            <ShareCard
                                key={share.id}
                                share={share}
                                userId={userId}
                                roleLabel={roleLabel(share)}
                                busyId={busyId}
                                onRespond={respond}
                                onOpen={(share) => void openShare(share)}
                                onChanged={onChanged}
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            {recentEnded.length ? (
                <section className="mb-4 pb-4 border-b border-white/10" data-testid="case-share-ended-section">
                    <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-2.5 px-1">
                        جلسات منتهية
                    </h3>
                    <div className="space-y-2">
                        {recentEnded.map((share) => (
                            <ShareCard
                                key={share.id}
                                share={share}
                                userId={userId}
                                roleLabel={roleLabel(share)}
                                busyId={busyId}
                                onRespond={respond}
                                onOpen={(share) => void openShare(share)}
                                onChanged={onChanged}
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            {viewing ? (
                <SharedDossierViewer
                    share={viewing}
                    viewerUserId={userId}
                    onClose={() => setViewing(null)}
                    onSessionEnded={() => {
                        onChanged();
                        setViewing(null);
                    }}
                />
            ) : null}
        </>
    );
});
