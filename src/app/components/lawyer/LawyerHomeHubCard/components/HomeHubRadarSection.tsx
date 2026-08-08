import { useEffect, useState } from 'react';
import { BellRing, ChevronLeft } from '@/app/components/ui/lucideIcons';
import { HOME_HUB_RADAR_PREVIEW_LIMIT } from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { HomeHubRadarMoreOverlay } from './HomeHubRadarMoreOverlay';
import { HomeHubRadarRow, HomeHubRadarRowIcon } from './HomeHubRadarRow';
import '../homeHubCardFx.css';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubRadarSectionProps = {
    events: CalendarRadarEvent[];
    showDivider: boolean;
    emphasis?: 'default' | 'urgent';
    onNavigate: (routePath: string) => void;
    onDismiss?: (eventId: string) => void;
};

export function HomeHubRadarSection({
    events,
    showDivider,
    emphasis = 'default',
    onNavigate,
    onDismiss,
}: HomeHubRadarSectionProps) {
    const [overlayOpen, setOverlayOpen] = useState(false);

    const previewEvents = events.slice(0, HOME_HUB_RADAR_PREVIEW_LIMIT);
    const overflowEvents = events.slice(HOME_HUB_RADAR_PREVIEW_LIMIT);
    const overflowCount = overflowEvents.length;

    useEffect(() => {
        if (overflowCount === 0) setOverlayOpen(false);
    }, [overflowCount]);

    if (events.length === 0) return null;

    return (
        <>
            <div
                className={`hami-hub-radar ${showDivider ? '' : 'border-t-0 pt-0 mt-0'} ${
                    emphasis === 'urgent' ? 'hami-hub-radar--urgent' : ''
                }`}
                data-testid="home-hub-radar"
            >
                <div className="hami-hub-radar__head">
                    <div className="hami-hub-radar__head-main">
                        <HomeHubRadarRowIcon urgent={emphasis === 'urgent'} />
                        <span className="hami-hub-radar__title">
                            {emphasis === 'urgent' ? 'عاجل · رادار 48 ساعة' : 'رادار 48 ساعة'}
                        </span>
                    </div>
                    {overflowCount > 0 ? (
                        <button
                            type="button"
                            className={`hami-hub-radar__more-trigger ${HUB_CONTENT_BUTTON_A11Y}`}
                            data-testid="home-hub-radar-more-trigger"
                            aria-haspopup="dialog"
                            aria-label={`عرض ${overflowCount} تنبيهات إضافية في حاوية منفصلة`}
                            onClick={() => setOverlayOpen(true)}
                        >
                            <ChevronLeft size={16} strokeWidth={2.2} aria-hidden />
                        </button>
                    ) : null}
                </div>

                <ul className="hami-hub-radar__list">
                    {previewEvents.map((ev) => (
                        <HomeHubRadarRow key={ev.id} ev={ev} onNavigate={onNavigate} onDismiss={onDismiss} />
                    ))}
                </ul>
            </div>

            <HomeHubRadarMoreOverlay
                open={overlayOpen}
                events={overflowEvents}
                onClose={() => setOverlayOpen(false)}
                onNavigate={onNavigate}
                onDismiss={onDismiss}
            />
        </>
    );
}

export function HomeHubEmptyState({
    message,
    testId,
    compact = false,
}: {
    message: string;
    testId?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={compact ? 'hami-hub-empty hami-hub-empty--compact' : 'hami-hub-empty'}
            role="status"
            data-testid={testId}
        >
            <span className="hami-hub-empty__orb" aria-hidden>
                <BellRing size={18} strokeWidth={2.1} />
            </span>
            <p className="hami-hub-empty__text">{message}</p>
        </div>
    );
}
