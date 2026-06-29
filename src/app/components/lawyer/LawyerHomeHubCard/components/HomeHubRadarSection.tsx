import { CalendarClock } from 'lucide-react';
import type { CalendarRadarEvent } from '@/app/workspace/types';

export type HomeHubRadarSectionProps = {
    events: CalendarRadarEvent[];
    showDivider: boolean;
    onNavigate: (routePath: string) => void;
};

export function HomeHubRadarSection({ events, showDivider, onNavigate }: HomeHubRadarSectionProps) {
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
                {events.slice(0, 4).map((ev) => (
                    <li
                        key={ev.id}
                        className="[content-visibility:auto] [contain-intrinsic-size:auto_44px]"
                    >
                        <button
                            type="button"
                            data-testid={`home-hub-radar-item-${ev.id}`}
                            onClick={() => onNavigate(ev.routePath)}
                            className="w-full text-right flex justify-between gap-2 text-[10px] min-h-[44px] py-1 touch-manipulation hover:text-[#E6C673]/80 transition-colors"
                        >
                            <span className="truncate text-white/65">{ev.title}</span>
                            <span className="shrink-0 text-[#E6C673]/65">{ev.whenLabel}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
