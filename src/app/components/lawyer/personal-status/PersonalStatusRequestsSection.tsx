import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { SmartRequestsPanel } from '@/app/components/lawyer/smart-modal/parts/SmartRequestsPanel';
import type { SessionAndRequestsHubProps } from '@/app/components/lawyer/smart-modal/parts/SessionAndRequestsHub';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { PS_SECTION_LABEL } from './personalStatusPearlTheme';

type PersonalStatusRequestsSectionProps = Pick<
    SessionAndRequestsHubProps,
    | 'petitions'
    | 'attachments'
    | 'onAddFastTrack'
    | 'onEditPetition'
    | 'onEditAttachment'
    | 'onResolvePetition'
    | 'readOnly'
> & {
    requestCount: number;
    onAddRequest: () => void;
};

export function PersonalStatusRequestsSection({
    petitions = [],
    attachments = [],
    onAddFastTrack,
    onEditPetition,
    onEditAttachment,
    onResolvePetition,
    readOnly = false,
    requestCount,
    onAddRequest,
}: PersonalStatusRequestsSectionProps) {
    const pendingCount = petitions.filter(
        (p) => !p.status || p.status === 'pending' || p.status === 'قيد الانتظار',
    ).length;

    return (
        <div
            className="relative z-[1] border-b border-white/[0.06]"
            dir="rtl"
            data-testid="personal-status-requests-section"
        >
            <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-1.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={PS_SECTION_LABEL}>الطلبات</span>
                    {requestCount > 0 ? (
                        <span className="tabular-nums text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/70">
                            {requestCount}
                        </span>
                    ) : null}
                    {pendingCount > 0 ? (
                        <span className="text-[10px] font-bold text-white/50">
                            · {pendingCount} بانتظار القرار
                        </span>
                    ) : null}
                </div>
                {!readOnly ? (
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubAdd}
                        onClick={onAddRequest}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 rounded-md border border-white/[0.12] bg-white/[0.04] text-[10px] font-bold text-white/85 hover:bg-white/[0.07] transition-colors touch-manipulation shrink-0"
                    >
                        <Plus size={12} aria-hidden />
                        إضافة طلب
                    </button>
                ) : null}
            </div>

            <div className="px-2 pb-1.5">
                {requestCount > 0 ? (
                    <div className="max-h-[min(32vh,240px)] overflow-y-auto scrollbar-hide">
                        <SmartRequestsPanel
                            petitions={petitions}
                            attachments={attachments}
                            onAddFastTrack={onAddFastTrack}
                            onEditPetition={onEditPetition}
                            onEditAttachment={onEditAttachment}
                            onResolvePetition={onResolvePetition}
                            readOnly={readOnly}
                            visualVariant="personal"
                            embedMode="pearl-stage"
                        />
                    </div>
                ) : (
                    <p className="py-2 text-center text-[11px] text-white/40">لا توجد طلبات معلقة</p>
                )}
            </div>
        </div>
    );
}
