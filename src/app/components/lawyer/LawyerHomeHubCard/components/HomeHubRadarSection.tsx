import { CalendarClock, X } from 'lucide-react';
import {
    resolveHomeHubRadarDismissAriaLabel,
    resolveHomeHubRadarItemAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubRadarSectionProps = {
    events: CalendarRadarEvent[];
    showDivider: boolean;
    onNavigate: (routePath: string) => void;
    onDismiss?: (eventId: string) => void;
};

export function HomeHubRadarSection({
    events,
    showDivider,
    onNavigate,
    onDismiss,
}: HomeHubRadarSectionProps) {
    if (events.length === 0) return null;

    return (
        <div
            className={`${showDivider ? 'pt-3 mt-2 border-t border-white/[0.06]' : ''}`}
            data-testid="home-hub-radar"
        >
            <div className="flex items-center gap-1.5 mb-2">
                <CalendarClock size={12} className="text-[#E6C673]/60" aria-hidden />
                <span className="text-[10px] font-bold text-white/45 tracking-wide">رادار 48 ساعة</span>
            </div>
            <ul className="space-y-0.5">
                {events.slice(0, 4).map((ev) => {
                    const dismissLabel = resolveHomeHubRadarDismissAriaLabel(ev);
                    return (
                        <li
                            key={ev.id}
                            className="flex items-center gap-1 [content-visibility:auto] [contain-intrinsic-size:auto_44px]"
                        >
                            <button
                                type="button"
                                data-testid={`home-hub-radar-item-${ev.id}`}
                                onClick={() => onNavigate(ev.routePath)}
                                aria-label={resolveHomeHubRadarItemAriaLabel(ev)}
                                className={`min-w-0 flex-1 text-right truncate rounded-lg text-[10px] text-white/65 min-h-[44px] py-1 touch-manipulation transition-colors ${HUB_CONTENT_BUTTON_A11Y} hover:text-[#E6C673]/80`}
                            >
                                {ev.title}
                            </button>
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] leading-none">
                                <span className="text-[#E6C673]/65 tabular-nums">{ev.whenLabel}</span>
                                {onDismiss ? (
                                    <button
                                        type="button"
                                        data-testid={`home-hub-radar-dismiss-${ev.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDismiss(ev.id);
                                        }}
                                        title={dismissLabel}
                                        aria-label={dismissLabel}
                                        className={`relative inline-flex size-3.5 items-center justify-center rounded-sm touch-manipulation text-white/25 hover:text-white/55 before:absolute before:inset-[-15px] before:content-[''] before:rounded-md ${HUB_CONTENT_BUTTON_A11Y}`}
                                    >
                                        <X size={10} strokeWidth={1.75} aria-hidden className="relative z-[1]" />
                                    </button>
                                ) : null}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
