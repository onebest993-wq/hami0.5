import React, { useEffect, useState } from 'react';
import { IRAQI_LEGAL_LOCATIONS } from '@/app/utils/nlpParser';
import { TASKS_INPUT, TASKS_BTN_PRIMARY, TASKS_BTN_GHOST } from './tasksBoucleTheme';

export type TaskLocationPickerProps = {
    taskId: string;
    initialLocation: string | null;
    onSetLocation: (id: string, location: string | null) => void;
    onClose: () => void;
};

export function TaskLocationPicker({
    taskId,
    initialLocation,
    onSetLocation,
    onClose,
}: TaskLocationPickerProps) {
    const [locDraft, setLocDraft] = useState('');

    useEffect(() => {
        setLocDraft(initialLocation ?? '');
    }, [taskId, initialLocation]);

    return (
        <div className="rounded-xl border border-[#A67C52]/20 bg-slate-950/40 p-3 space-y-2">
            <input
                dir="rtl"
                type="text"
                value={locDraft}
                onChange={(e) => setLocDraft(e.target.value)}
                placeholder="اكتب موقع المحكمة أو الدائرة…"
                className={`w-full min-h-[44px] ${TASKS_INPUT}`}
            />
            <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-end">
                {IRAQI_LEGAL_LOCATIONS.map((loc) => (
                    <button
                        key={loc}
                        type="button"
                        onClick={() => setLocDraft(loc)}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-[10px] font-bold touch-manipulation ${
                            locDraft === loc
                                ? 'border-[#1A7059]/50 bg-[#1A7059]/20 text-[#E8F5F0]'
                                : 'border-[#A67C52]/22 bg-[#0c0c0e]/40 text-[#A67C52]/80 hover:border-[#A67C52]/38'
                        }`}
                    >
                        {loc}
                    </button>
                ))}
            </div>
            <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                <button
                    type="button"
                    onClick={() => {
                        onSetLocation(taskId, locDraft.trim() || null);
                        onClose();
                    }}
                    className={`min-h-[44px] ${TASKS_BTN_PRIMARY}`}
                >
                    تعيين الموقع
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onSetLocation(taskId, null);
                        onClose();
                    }}
                    className={`min-h-[44px] ${TASKS_BTN_GHOST}`}
                >
                    مسح
                </button>
            </div>
        </div>
    );
}
