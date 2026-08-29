import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { isScheduleYmdReached } from '@/app/utils/maritalFurnitureDeliveryWorkflow';

export type MaritalFurnitureSchedulePanelProps = {
    scheduleYmd: string;
    showScheduleForm: boolean;
    scheduleYmdDraft: string;
    setScheduleYmdDraft: (value: string) => void;
    todayYmd: string;
    savingSchedule: boolean;
    handleSaveSchedule: () => void;
    setEditingSchedule: (value: boolean) => void;
    scheduleLabel: string;
    earlyDeliveryUnlocked: boolean;
    unlockEarlyDelivery: () => void;
};

export function MaritalFurnitureSchedulePanel({
    scheduleYmd,
    showScheduleForm,
    scheduleYmdDraft,
    setScheduleYmdDraft,
    todayYmd,
    savingSchedule,
    handleSaveSchedule,
    setEditingSchedule,
    scheduleLabel,
    earlyDeliveryUnlocked,
    unlockEarlyDelivery,
}: MaritalFurnitureSchedulePanelProps) {
    return (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 px-3 py-3 text-right space-y-2">
            <p className="text-[11px] font-bold text-sky-200">موعد التسليم الميداني</p>
            {showScheduleForm ? (
                <div className="flex flex-col gap-2">
                    <input
                        type="date"
                        value={scheduleYmdDraft || scheduleYmd}
                        min={todayYmd}
                        onChange={(e) => setScheduleYmdDraft(e.target.value)}
                        className="w-full bg-black/30 border border-white/12 text-white text-sm px-3 py-2.5 rounded-xl focus:border-sky-400/45 outline-none text-right min-h-[44px]"
                    />
                    <div className="flex flex-row-reverse gap-2">
                        <button
                            type="button"
                            data-testid="marital-furniture-save-schedule"
                            disabled={savingSchedule || !(scheduleYmdDraft || scheduleYmd).trim()}
                            onClick={handleSaveSchedule}
                            className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-45 touch-manipulation"
                        >
                            حفظ الموعد
                        </button>
                        {scheduleYmd ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingSchedule(false);
                                    setScheduleYmdDraft('');
                                }}
                                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 touch-manipulation"
                            >
                                إلغاء
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 flex-row-reverse justify-between">
                    <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                        <Calendar size={15} className="text-sky-300 shrink-0" />
                        <p className="text-xs text-sky-100/95 leading-snug">{scheduleLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setScheduleYmdDraft(scheduleYmd);
                            setEditingSchedule(true);
                        }}
                        className="shrink-0 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-200 hover:bg-sky-500/18 touch-manipulation"
                    >
                        <Pencil size={11} />
                        تعديل
                    </button>
                </div>
            )}
            {scheduleYmd &&
            !showScheduleForm &&
            !isScheduleYmdReached(scheduleYmd, todayYmd) &&
            !earlyDeliveryUnlocked ? (
                <button
                    type="button"
                    onClick={unlockEarlyDelivery}
                    className="w-full text-[10px] font-bold text-amber-300/90 underline underline-offset-2 text-right touch-manipulation min-h-[44px]"
                >
                    تفعيل التسليم قبل الموعد
                </button>
            ) : null}
        </div>
    );
}
