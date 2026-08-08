import React from 'react';
import { ClipboardList, Plus } from '@/app/components/ui/lucideIcons';
import { SmartRequestsPanel } from '@/app/components/lawyer/smart-modal/parts/SmartRequestsPanel';
import type { SessionAndRequestsHubProps } from '@/app/components/lawyer/smart-modal/parts/SessionAndRequestsHub';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { PS_REQUESTS_STAGE, PS_SECTION_LABEL_SAND } from './personalStatusPearlTheme';

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
                    <span className={PS_SECTION_LABEL_SAND}>الطلبات</span>
                    {requestCount > 0 ? (
                        <span className="tabular-nums text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#C9B89A]/15 border border-[#C9B89A]/25 text-[#E8DFD0]">
                            {requestCount}
                        </span>
                    ) : null}
                    {pendingCount > 0 ? (
                        <span className="text-[8px] font-bold text-[#FFD4DC]/85">
                            · {pendingCount} بانتظار القرار
                        </span>
                    ) : null}
                </div>
                {!readOnly ? (
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubAdd}
                        onClick={onAddRequest}
                        className="inline-flex items-center gap-1.5 min-h-[2rem] px-2.5 rounded-lg border border-[#C9B89A]/30 bg-[#C9B89A]/[0.12] text-[10px] font-bold text-[#FFFEF9] hover:bg-[#C9B89A]/[0.18] hover:border-[#C9B89A]/40 transition-colors touch-manipulation shrink-0"
                    >
                        <Plus size={12} aria-hidden />
                        إضافة طلب
                    </button>
                ) : null}
            </div>

            <div className={`${PS_REQUESTS_STAGE} mx-2 my-2 border-0 bg-transparent shadow-none`}>
                {requestCount > 0 ? (
                    <div className="max-h-[min(32vh,240px)] overflow-y-auto scrollbar-hide px-1 pb-1">
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
                    <div className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 text-center rounded-lg border border-dashed border-[#C9B89A]/20 bg-white/[0.02]">
                        <ClipboardList size={18} className="text-[#C9B89A]/50" aria-hidden />
                        <p className="text-[10px] font-bold text-[#9894A0]">لا طلبات مسجّلة</p>
                        {!readOnly ? (
                            <button
                                type="button"
                                onClick={onAddRequest}
                                className="text-[9px] font-bold text-[#C9B89A] hover:text-[#E8DFD0] transition-colors"
                            >
                                اضغط «إضافة طلب» أعلاه
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
