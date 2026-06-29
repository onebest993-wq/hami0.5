import React from 'react';
import { Hourglass } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    TASKS_SECTION_TITLE,
    TASKS_GLASS_PANEL,
    TASKS_INPUT,
    TASKS_BTN_BRONZE,
    TASKS_BTN_GHOST,
} from './tasksBoucleTheme';

export type DistantTasksSectionProps = {
    distantTasks: LegalTask[];
    snoozePanelOpen: boolean;
    setSnoozePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    snoozeTitle: string;
    setSnoozeTitle: React.Dispatch<React.SetStateAction<string>>;
    snoozeCustomIso: string;
    setSnoozeCustomIso: React.Dispatch<React.SetStateAction<string>>;
    applySnoozeChoice: (afterDays: number | null, customIso?: string) => void;
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
};

export const DistantTasksSection = React.memo(function DistantTasksSection({
    distantTasks,
    snoozePanelOpen,
    setSnoozePanelOpen,
    snoozeTitle,
    setSnoozeTitle,
    snoozeCustomIso,
    setSnoozeCustomIso,
    applySnoozeChoice,
    renderTaskCard,
}: DistantTasksSectionProps) {
    return (
        <section className="mt-10 pt-6 border-t border-[#A67C52]/15">
            <h2 className={`${TASKS_SECTION_TITLE} mb-5`}>
                <Hourglass className="size-5 text-[#A67C52]/70 shrink-0" aria-hidden />
                المهام البعيدة وغير المجدولة
            </h2>
            <DistantTasksBody
                distantTasks={distantTasks}
                snoozePanelOpen={snoozePanelOpen}
                setSnoozePanelOpen={setSnoozePanelOpen}
                snoozeTitle={snoozeTitle}
                setSnoozeTitle={setSnoozeTitle}
                snoozeCustomIso={snoozeCustomIso}
                setSnoozeCustomIso={setSnoozeCustomIso}
                applySnoozeChoice={applySnoozeChoice}
                renderTaskCard={renderTaskCard}
            />
        </section>
    );
});

function DistantTasksBody(props: DistantTasksSectionProps) {
    const {
        distantTasks,
        snoozePanelOpen,
        setSnoozePanelOpen,
        snoozeTitle,
        setSnoozeTitle,
        snoozeCustomIso,
        setSnoozeCustomIso,
        applySnoozeChoice,
        renderTaskCard,
    } = props;

    return (
        <div className={`rounded-2xl border border-dashed border-[#A67C52]/25 ${TASKS_GLASS_PANEL} px-5 py-6 space-y-5`}>
            <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setSnoozePanelOpen((o) => !o)} className={TASKS_BTN_BRONZE}>
                    + إضافة مهمة مؤجلة
                </button>
            </div>

            {snoozePanelOpen ? (
                <div className={`${TASKS_GLASS_PANEL} p-4 space-y-4`}>
                    <input
                        dir="rtl"
                        type="text"
                        placeholder="عنوان المهمة المؤجلة…"
                        value={snoozeTitle}
                        onChange={(e) => setSnoozeTitle(e.target.value)}
                        className={TASKS_INPUT}
                    />
                    <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                        {[7, 14, 30].map((days) => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => applySnoozeChoice(days)}
                                className={TASKS_BTN_GHOST}
                            >
                                {days === 7 ? 'أسبوع' : days === 14 ? 'أسبوعين' : 'شهر'}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-row-reverse flex-wrap gap-2 items-center justify-end">
                        <input
                            type="date"
                            className={`rounded-lg ${TASKS_INPUT} !py-2 text-xs [color-scheme:dark]`}
                            value={snoozeCustomIso}
                            onChange={(e) => setSnoozeCustomIso(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => applySnoozeChoice(null, snoozeCustomIso)}
                            disabled={!snoozeTitle.trim() || !snoozeCustomIso}
                            className={`${TASKS_BTN_BRONZE} disabled:opacity-40`}
                        >
                            مخصص — حفظ
                        </button>
                    </div>
                </div>
            ) : null}

            {distantTasks.length === 0 ? (
                <p className="text-[#6BC4A8]/45 text-sm text-center font-medium py-8">لا مهام هامشية — أسبوعك نظيف.</p>
            ) : (
                <ul className="space-y-4">{distantTasks.map((t) => renderTaskCard(t, false))}</ul>
            )}
        </div>
    );
}
