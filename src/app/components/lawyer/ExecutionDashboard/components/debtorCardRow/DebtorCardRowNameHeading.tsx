import React from 'react';
import type { Debtor, Party } from '@/app/types/execution';
import { HeirsQuickViewTrigger } from '../HeirsQuickViewTrigger';

export type DebtorCardRowNameHeadingProps = {
    debtorDisp: {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
    };
    debtorHeirsWord: string | null;
    debtorHasHeirs: boolean;
    rowIsLegalEntity: boolean;
    d: Debtor;
    heirsDetailsIncludeClient: (details: Party['heirs_details']) => boolean;
    openHeirsQuickView: (party: Party, role: 'debtor' | 'creditor', title: string) => void;
    /** أحجام نص الاسم — أساسي أصغر قليلاً من الثانوي */
    nameClassName?: string;
};

/** اسم المدين + ورثة + شارة موكلي — مشترك بين الصف الأساسي والثانوي */
export function DebtorCardRowNameHeading({
    debtorDisp,
    debtorHeirsWord,
    debtorHasHeirs,
    rowIsLegalEntity,
    d,
    heirsDetailsIncludeClient,
    openHeirsQuickView,
    nameClassName = 'text-[1.04rem] sm:text-[1.08rem]',
}: DebtorCardRowNameHeadingProps) {
    const showClientChip =
        (debtorHasHeirs ? heirsDetailsIncludeClient(d.heirs_details) : d.isClient) &&
        !rowIsLegalEntity &&
        !debtorDisp.showDeceasedGlyph;

    return (
        <div
            className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1.5 overflow-hidden px-1"
            dir="rtl"
        >
            {debtorHeirsWord ? (
                <HeirsQuickViewTrigger
                    label={debtorHeirsWord}
                    onOpen={() => openHeirsQuickView(d as Party, 'debtor', 'ورثة المدين')}
                />
            ) : null}
            <span
                className={`block min-w-0 max-w-full truncate text-center font-bold leading-tight text-white ${nameClassName}`}
            >
                {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                {showClientChip ? (
                    <span
                        className="ms-1 inline-block rounded border border-[#E6C673]/30 bg-[#E6C673]/10 px-1 py-px text-[9px] font-bold leading-none text-[#E6C673] select-none"
                        title="موكلي"
                        aria-label="موكلي"
                    >
                        موكلي
                    </span>
                ) : null}
            </span>
        </div>
    );
}
