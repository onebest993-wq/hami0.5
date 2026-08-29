import React from 'react';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import {
    RADAR_ICON_GOLD,
    RADAR_BACK_BTN,
    RADAR_TITLE,
    RADAR_HEADER,
} from './radarTheme';

interface RadarHeaderProps {
    onBack: () => void;
    syncing?: boolean;
}

export const RadarHeader = React.memo(function RadarHeader({ onBack, syncing = false }: RadarHeaderProps) {
    return (
        <header className={RADAR_HEADER}>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onBack();
                }}
                data-testid="radar-back"
                className={RADAR_BACK_BTN}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
                <ArrowRight size={20} />
                <span className="font-semibold text-sm">رجوع</span>
            </button>
            <h1 className={RADAR_TITLE}>رادار المواعيد</h1>
            <div
                className="w-10 flex items-center justify-end"
                aria-live="polite"
                aria-busy={syncing}
            >
                {syncing ? (
                    <Loader2
                        size={16}
                        className={`${RADAR_ICON_GOLD} animate-spin opacity-70`}
                        aria-label="جاري تحديث المواعيد"
                    />
                ) : null}
            </div>
        </header>
    );
});
