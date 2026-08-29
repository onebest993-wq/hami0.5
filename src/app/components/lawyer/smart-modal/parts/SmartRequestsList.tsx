import React from 'react';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { PS_REQUESTS_ROW } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import {
    resolveRequestResultLabel,
    resolveRequestStatusChip,
    statusToneClasses,
} from '../smartFile/requestsHubEngine';
import type { AttachmentShieldSummary, FastTrackPetitionSummary } from '../smartFile/requestTypes';
import type { UnifiedRequestItem } from '../smartFile/requestsHubEngine';

export type SmartRequestsListProps = {
    visible: UnifiedRequestItem[];
    isPearlInline: boolean;
    isPearlStage: boolean;
    isPearlEmbed: boolean;
    readOnly: boolean;
    petitionById: Map<string, FastTrackPetitionSummary>;
    onEditPetition?: (petition: FastTrackPetitionSummary) => void;
    onEditAttachment?: (attachment: AttachmentShieldSummary) => void;
    onResolvePetition?: (petition: FastTrackPetitionSummary, status: 'accepted' | 'rejected') => void;
    handleOpen: (id: string, kind: 'fast_track' | 'attachment') => void;
};

export function SmartRequestsList({
    visible,
    isPearlInline,
    isPearlStage,
    isPearlEmbed,
    readOnly,
    petitionById,
    onEditPetition,
    onEditAttachment,
    onResolvePetition,
    handleOpen,
}: SmartRequestsListProps) {
    return (
        <div className={`${isPearlStage ? 'max-h-52' : isPearlEmbed ? 'max-h-32' : 'max-h-64'} overflow-y-auto scrollbar-hide ${isPearlInline ? 'space-y-2' : 'px-3 sm:px-4 py-2.5 space-y-2.5'}`}>
            {visible.length === 0 ? (
                isPearlInline ? null : (
                <div
                    className="rounded-lg border border-dashed border-[#E6C673]/18 bg-[#E6C673]/[0.02] backdrop-blur-sm px-3 py-3 text-center"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsEmpty}
                >
                    <p className="text-[10px] text-white/45">
                        لا توجد طلبات — اضغط «طلب جديد» أو وسّع القوالب
                    </p>
                </div>
                )
            ) : (
                visible.map((item) => {
                    const canOpen =
                        item.kind === 'fast_track'
                            ? Boolean(onEditPetition)
                            : Boolean(onEditAttachment);
                    const resultLabel = resolveRequestResultLabel(item);
                    const statusChip = resolveRequestStatusChip(item);
                    const isPending =
                        item.kind === 'fast_track'
                        && (item.statusTone === 'pending'
                            || item.statusTone === 'neutral'
                            || item.statusTone === 'grievance');
                    const petition = item.kind === 'fast_track' ? petitionById.get(item.id) : undefined;
                    const isDecided =
                        item.kind === 'fast_track'
                        && (item.statusTone === 'accepted' || item.statusTone === 'rejected');

                    return (
                        <div
                            key={`${item.kind}-${item.id}`}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}
                            className={`w-full text-right transition-colors group ${
                                isPearlStage
                                    ? `${PS_REQUESTS_ROW} border-r-2 border-r-[#C9B89A]/45`
                                    : isPearlEmbed
                                    ? 'border-white/[0.10] bg-white/[0.04] hover:border-white/[0.18] p-2 rounded-lg'
                                    : 'rounded-xl border-white/[0.08] bg-white/[0.03] backdrop-blur-sm hover:border-[#E6C673]/22 hover:bg-[#E6C673]/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => handleOpen(item.id, item.kind)}
                                disabled={!canOpen}
                                className="w-full text-right disabled:cursor-default"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-bold text-white/92 truncate">{item.title}</p>
                                        {item.detail ? (
                                            <p className="text-[10px] text-white/42 mt-1 line-clamp-2 leading-relaxed">
                                                {item.detail}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span
                                        className={`shrink-0 px-2 py-0.5 rounded-md border text-[9px] font-bold ${statusToneClasses(item.statusTone, isPearlInline ? 'pearl' : 'civil')}`}
                                    >
                                        {statusChip}
                                    </span>
                                </div>
                            </button>

                            {isPending && petition && !readOnly && onResolvePetition ? (
                                <div className="pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        data-testid={`${CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}-accept`}
                                        onClick={() => onResolvePetition(petition, 'accepted')}
                                        className="min-h-[44px] flex-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/15 transition-colors"
                                    >
                                        قبول
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={`${CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}-reject`}
                                        onClick={() => onResolvePetition(petition, 'rejected')}
                                        className="min-h-[44px] flex-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/15 transition-colors"
                                    >
                                        رفض
                                    </button>
                                </div>
                            ) : isDecided ? (
                                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-white/38">النتيجة</span>
                                    <span
                                        className={`text-[11px] font-bold ${
                                            resultLabel === 'قبول'
                                                ? 'text-emerald-300'
                                                : 'text-rose-300'
                                        }`}
                                    >
                                        {resultLabel}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    );
                })
            )}
        </div>
    );
}
