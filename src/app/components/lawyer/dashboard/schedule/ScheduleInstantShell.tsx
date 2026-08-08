import React, { useEffect } from 'react';
import { HomeArrowRightIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { RadarShell } from '@/app/components/lawyer/SmartLegalRadar/RadarShell';
import { RadarAddEventDockPlaceholder } from '@/app/components/lawyer/SmartLegalRadar/RadarAddEventDock';
import { RADAR_HEADER, RADAR_SCROLL, RADAR_BACK_BTN, RADAR_TITLE, RADAR_SKELETON, RADAR_GLASS_PANEL } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

type ScheduleInstantShellProps = {
    onBack?: () => void;
};

/**
 * قشرة طارئة فقط إن تأخّر chunk التقويم عند الفتح — هيكل ثابت بلا أحداث حقيقية.
 * لا نعرض كاش الأحداث هنا لتجنّب وميض «مواعيد غامضة» قبل اكتمال الرادار.
 */
export function ScheduleInstantShell({ onBack }: ScheduleInstantShellProps): React.ReactElement {
    useEffect(() => {
        if (!onBack) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [onBack]);

    return (
        <RadarShell>
            <header className={RADAR_HEADER}>
                <button
                    type="button"
                    onClick={(event) => {
                        if (!onBack) return;
                        event.stopPropagation();
                        onBack();
                    }}
                    data-testid="radar-back"
                    className={RADAR_BACK_BTN}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                    <HomeArrowRightIcon size={20} />
                    <span className="font-bold text-sm">رجوع</span>
                </button>
                <h1 className={RADAR_TITLE}>
                    <span>رادار المواعيد</span>
                </h1>
                <div className="w-10" aria-hidden />
            </header>

            <div className={RADAR_SCROLL} data-testid="schedule-tab-loading" aria-busy="true">
                <div className={`${RADAR_GLASS_PANEL} mb-4 px-3 py-3 rounded-2xl`}>
                    <div className="flex items-center justify-between gap-3" aria-hidden>
                        <div className={`h-8 w-28 rounded-lg ${RADAR_SKELETON}`} />
                        <div className={`h-8 w-24 rounded-lg ${RADAR_SKELETON}`} />
                    </div>
                </div>

                <div className="space-y-3" aria-hidden>
                    <div className={`h-5 w-48 rounded ${RADAR_SKELETON}`} />
                    <div className={`h-24 rounded-2xl ${RADAR_SKELETON}`} />
                    <div className={`h-24 rounded-2xl ${RADAR_SKELETON}`} />
                </div>
            </div>

            <RadarAddEventDockPlaceholder />
        </RadarShell>
    );
}
