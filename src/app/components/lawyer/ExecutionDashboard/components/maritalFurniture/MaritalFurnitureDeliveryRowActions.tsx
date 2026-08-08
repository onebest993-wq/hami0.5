import type { MaritalFurnitureDeliveryOutcome, MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { isScheduleYmdReached } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { resolveMaritalFurnitureDeliveryOutcome } from '@/app/utils/maritalFurniture';
import { MARITAL_FURNITURE_DELIVERY_BTN } from './maritalFurnitureModuleConstants';
import { MaritalFurnitureDeliveryStatusCell } from './MaritalFurnitureDeliveryStatusCell';

export type MaritalFurnitureDeliveryRowActionsProps = {
    row: MaritalFurnitureItem;
    scheduleYmd: string;
    todayYmd: string;
    earlyDeliveryUnlocked: boolean;
    busy: boolean;
    locked: boolean;
    isPendingConfirm: boolean;
    onConfirmPending: () => void;
    onCancelPending: () => void;
    onRequestOutcome: (itemId: string, outcome: MaritalFurnitureDeliveryOutcome) => void;
};

export function MaritalFurnitureDeliveryRowActions({
    row,
    scheduleYmd,
    todayYmd,
    earlyDeliveryUnlocked,
    busy,
    locked,
    isPendingConfirm,
    onConfirmPending,
    onCancelPending,
    onRequestOutcome,
}: MaritalFurnitureDeliveryRowActionsProps) {
    const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
    if (outcome !== 'pending') {
        return (
            <div className="flex min-w-0 w-full items-center justify-center">
                <MaritalFurnitureDeliveryStatusCell row={row} />
            </div>
        );
    }
    if (locked) {
        return (
            <div className="min-w-0 w-full text-center">
                <span className="text-[9px] font-bold text-slate-500 leading-tight">مقفل</span>
            </div>
        );
    }

    if (isPendingConfirm) {
        return (
            <div
                className="flex min-w-0 w-full flex-col gap-1"
                data-testid="marital-furniture-pending-outcome"
            >
                <div className="flex gap-1">
                    <button
                        type="button"
                        data-testid="marital-furniture-confirm-outcome"
                        onClick={onConfirmPending}
                        className={`${MARITAL_FURNITURE_DELIVERY_BTN} flex-1 border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`}
                    >
                        نعم
                    </button>
                    <button
                        type="button"
                        data-testid="marital-furniture-cancel-outcome"
                        onClick={onCancelPending}
                        className={`${MARITAL_FURNITURE_DELIVERY_BTN} flex-1 border-white/12 bg-white/5 text-slate-300 hover:bg-white/10`}
                    >
                        لا
                    </button>
                </div>
            </div>
        );
    }

    const scheduleReached = scheduleYmd
        ? isScheduleYmdReached(scheduleYmd, todayYmd) || earlyDeliveryUnlocked
        : false;
    const beforeSchedule = !scheduleYmd || !scheduleReached;

    if (beforeSchedule) {
        return (
            <div className="min-w-0 w-full">
                <button
                    type="button"
                    disabled={busy}
                    data-testid={`marital-furniture-external-${row.id}`}
                    onClick={() => onRequestOutcome(row.id, 'external_delivered')}
                    className={`${MARITAL_FURNITURE_DELIVERY_BTN} border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20`}
                >
                    تسليم خارجي
                </button>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 w-full flex-col gap-1">
            <button
                type="button"
                disabled={busy}
                data-testid={`marital-furniture-deliver-${row.id}`}
                onClick={() => onRequestOutcome(row.id, 'delivered')}
                className={`${MARITAL_FURNITURE_DELIVERY_BTN} border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
            >
                تسليم
            </button>
            <button
                type="button"
                disabled={busy}
                data-testid={`marital-furniture-fail-${row.id}`}
                onClick={() => onRequestOutcome(row.id, 'failed')}
                className={`${MARITAL_FURNITURE_DELIVERY_BTN} border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}
            >
                تعذّر
            </button>
        </div>
    );
}
