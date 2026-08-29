import React from 'react';
import { RequestStarToggle } from '../criminalDashboardLazyRequestUi';
import type { LawyerRequest } from '../criminalStore';

export type RequestsEntryModalHeaderProps = {
    requestModalLane: 'lawyer' | 'judicial' | string;
    isRequestModalViewOnly: boolean;
    modalLinkedRequest: LawyerRequest | null;
    editingRequestId: string | null;
    reqIsStarred: boolean;
    setReqIsStarred: React.Dispatch<React.SetStateAction<boolean>>;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    caseId: string;
    onClose: () => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
};

export function RequestsEntryModalHeader({
    requestModalLane,
    isRequestModalViewOnly,
    modalLinkedRequest,
    editingRequestId,
    reqIsStarred,
    setReqIsStarred,
    isTimelineArchiveReadOnly,
    isDashboardReadOnly,
    caseId,
    onClose,
    toggleRequestStar,
}: RequestsEntryModalHeaderProps) {
    return (
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className="text-white font-black text-sm whitespace-normal break-words">
                    {isRequestModalViewOnly
                        ? requestModalLane === 'lawyer'
                            ? 'عرض تفاصيل طلب المحامي'
                            : 'عرض تفاصيل قرار القاضي'
                        : requestModalLane === 'lawyer'
                          ? 'طلبات المحامي'
                          : 'تسجيل قرار قضائي'}
                </div>
                <RequestStarToggle
                    starred={
                        isRequestModalViewOnly
                            ? modalLinkedRequest?.isStarred === true
                            : reqIsStarred
                    }
                    disabled={
                        isRequestModalViewOnly
                            ? !editingRequestId ||
                              isTimelineArchiveReadOnly ||
                              isDashboardReadOnly
                            : false
                    }
                    onToggle={() => {
                        if (isRequestModalViewOnly && editingRequestId) {
                            toggleRequestStar(caseId, editingRequestId);
                        } else {
                            setReqIsStarred((v) => !v);
                        }
                    }}
                />
            </div>
            <button
                type="button"
                onClick={onClose}
                className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
            >
                إغلاق
            </button>
        </div>
    );
}
