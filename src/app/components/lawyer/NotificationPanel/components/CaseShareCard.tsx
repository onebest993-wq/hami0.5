import React from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import { Clock } from '@/app/components/ui/icons/Clock';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Lock } from '@/app/components/ui/icons/Lock';
import { X } from '@/app/components/ui/icons/X';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import {
    caseShareStatusLabel,
    formatCaseShareSession,
    isCaseShareSessionActive,
} from '@/app/services/caseShare/caseShareSession';
import { CaseShareEndSessionButton } from '@/app/components/lawyer/caseShare/CaseShareEndSessionButton';

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

type CaseShareCardProps = {
    share: CaseShareRecord;
    userId: string;
    roleLabel: string;
    busyId: string | null;
    onRespond: (share: CaseShareRecord, action: 'accept' | 'decline') => void;
    onOpen: (share: CaseShareRecord) => void;
    onChanged: () => void;
};

export function CaseShareCard({
    share,
    userId,
    roleLabel,
    busyId,
    onRespond,
    onOpen,
    onChanged,
}: CaseShareCardProps) {
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
                        data-testid="case-share-decline-btn"
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
                        className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#E6C673]/12 text-[#E6C673] text-xs font-bold touch-manipulation"
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
                    className="w-full min-h-[44px] py-2 rounded-xl bg-white/5 text-white/45 text-xs font-bold touch-manipulation"
                >
                    عرض ملخص الجلسة المنتهية
                </button>
            ) : null}
        </div>
    );
}
