import React, { memo, useCallback, useEffect, useState } from 'react';
import { Inbox, Lock, FileText, Check, X } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/AuthContext';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { SharedDossierViewer } from './SharedDossierViewer';

export const SharedCasesInbox = memo(function SharedCasesInbox() {
    const { user } = useAuthSafe();
    const userId = user?.id ?? null;
    const [shares, setShares] = useState<CaseShareRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewing, setViewing] = useState<CaseShareRecord | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) {
            setShares([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const incoming = await CaseShareApiService.listIncoming(userId);
            setShares(incoming);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const respond = async (share: CaseShareRecord, action: 'accept' | 'decline') => {
        if (!userId) return;
        try {
            await CaseShareApiService.respond(share.id, action, userId);
            SmartToast.success(action === 'accept' ? 'تم قبول الإضبارة المشتركة' : 'تم رفض الطلب');
            void refresh();
        } catch {
            SmartToast.error('تعذّر تحديث الطلب');
        }
    };

    const openShare = async (share: CaseShareRecord) => {
        if (!userId) return;
        try {
            const detail = await CaseShareApiService.getShareDetail(share.id, userId);
            if (detail) setViewing(detail);
            else SmartToast.error('تعذّر تحميل الإضبارة');
        } catch {
            SmartToast.error('تعذّر تحميل الإضبارة');
        }
    };

    if (loading) {
        return <p className="text-white/40 text-sm text-center py-16">جاري تحميل الأضابير المشتركة…</p>;
    }

    if (shares.length === 0) {
        return (
            <div className="py-16 text-center">
                <Inbox size={40} className="text-[#E6C673]/30 mx-auto mb-3" />
                <p className="text-white font-bold text-sm mb-1">لا أضابير مشتركة معك</p>
                <p className="text-white/45 text-xs">عندما يرسل زميل إضبارة للاستشارة ستظهر هنا</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3 p-4" dir="rtl">
                {shares.map((share) => (
                    <div
                        key={share.id}
                        className="rounded-2xl border border-white/10 bg-[#131620]/80 p-4 flex flex-col gap-3"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-white font-bold text-sm truncate">{share.maskedView.title}</p>
                                <p className="text-white/45 text-[11px] mt-0.5">من {share.ownerName}</p>
                            </div>
                            <span
                                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    share.status === 'pending'
                                        ? 'bg-amber-500/15 text-amber-300'
                                        : share.status === 'accepted'
                                          ? 'bg-emerald-500/15 text-emerald-300'
                                          : 'bg-red-500/15 text-red-300'
                                }`}
                            >
                                {share.status === 'pending' ? 'بانتظار القبول' : share.status === 'accepted' ? 'مقبولة' : 'مرفوضة'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/45">
                            <span className="inline-flex items-center gap-1">
                                <Lock size={12} /> قراءة فقط
                            </span>
                            {share.maskedView.documentsIncluded ? (
                                <span className="inline-flex items-center gap-1"><FileText size={12} /> مرفقات</span>
                            ) : (
                                <span className="text-amber-300/70">بدون مرفقات</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {share.status === 'pending' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => void respond(share, 'accept')}
                                        className="flex-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <Check size={14} /> قبول
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void respond(share, 'decline')}
                                        className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-300 text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <X size={14} /> رفض
                                    </button>
                                </>
                            ) : share.status === 'accepted' ? (
                                <button
                                    type="button"
                                    onClick={() => void openShare(share)}
                                    className="w-full py-2 rounded-lg bg-[#E6C673]/12 text-[#E6C673] text-xs font-bold"
                                >
                                    فتح الإضبارة (قراءة فقط)
                                </button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
            {viewing ? (
                <SharedDossierViewer
                    share={viewing}
                    viewerUserId={userId}
                    onClose={() => setViewing(null)}
                    onSessionEnded={() => void refresh()}
                />
            ) : null}
        </>
    );
});
