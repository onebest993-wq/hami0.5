import { formatMaritalFurnitureIqd } from '@/app/utils/maritalFurniture';

export type MaritalFurnitureTotalsFooterProps = {
    deliveryRecorded: boolean;
    remainingListTotal: number;
    deliveredTotal: number;
    undeliveredTotal: number;
    total: number;
};

export function MaritalFurnitureTotalsFooter({
    deliveryRecorded,
    remainingListTotal,
    deliveredTotal,
    undeliveredTotal,
    total,
}: MaritalFurnitureTotalsFooterProps) {
    return (
        <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-3 text-right space-y-1">
            {deliveryRecorded ? (
                <>
                    <p className="text-[10px] text-slate-400">المتبقي للقائمة</p>
                    <p className="text-xl font-black text-[#E6C673] font-mono">
                        {formatMaritalFurnitureIqd(remainingListTotal)}{' '}
                        <span className="text-xs">د.ع</span>
                    </p>
                    <p className="text-[11px] text-emerald-300/90 pt-1 border-t border-white/5">
                        مُسلَّم:{' '}
                        <span className="font-bold font-mono">
                            {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                        </span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span className="text-slate-400">
                            المجموع الكلي {formatMaritalFurnitureIqd(total)} د.ع
                        </span>
                    </p>
                    {undeliveredTotal > 0 ? (
                        <p className="text-[11px] text-rose-300/90">
                            في المركز المالي (تعذّر):{' '}
                            <span className="font-bold font-mono">
                                {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                            </span>
                        </p>
                    ) : null}
                </>
            ) : (
                <>
                    <p className="text-[10px] text-slate-400">المجموع الكلي للقائمة</p>
                    <p className="text-xl font-black text-[#E6C673] font-mono">
                        {formatMaritalFurnitureIqd(total)} <span className="text-xs">د.ع</span>
                    </p>
                </>
            )}
        </div>
    );
}
