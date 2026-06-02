import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { LawyerRequest } from '../criminalStore';
import { formatLawyerRequestStatusLabel } from '../criminalStageUtils';
import { isLawyerRequestPending } from '../lawyerRequestStatusMachine';

export type LawyerRequestStatusBadgeProps = {
    request: LawyerRequest;
    onSelectFinalStatus: (status: 'approved' | 'rejected') => void;
};

export const LawyerRequestStatusBadge = ({ request, onSelectFinalStatus }: LawyerRequestStatusBadgeProps) => {
    const badgeClass =
        'border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50';

    if (!isLawyerRequestPending(request)) {
        const status = request.status;
        const staticBadge =
            status === 'approved'
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                : status === 'rejected'
                  ? 'border-red-500/35 bg-red-500/10 text-red-200'
                  : badgeClass;
        return (
            <div
                className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${staticBadge}`}
            >
                {formatLawyerRequestStatusLabel(status)}
            </div>
        );
    }

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words transition ${badgeClass}`}
                    title="تغيير حالة الطلب (موافقة / رفض)"
                    aria-label="تغيير حالة الطلب"
                >
                    {formatLawyerRequestStatusLabel('pending')}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="z-[230] min-w-[12rem] rounded-xl border border-slate-700 bg-slate-900 p-1 text-white"
            >
                <DropdownMenuItem
                    className="rounded-lg text-emerald-200 font-black text-xs cursor-pointer focus:bg-emerald-500/15 focus:text-emerald-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectFinalStatus('approved');
                    }}
                >
                    تم القبول (موافقة)
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="rounded-lg text-red-200 font-black text-xs cursor-pointer focus:bg-red-500/15 focus:text-red-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectFinalStatus('rejected');
                    }}
                >
                    تم الرفض
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
