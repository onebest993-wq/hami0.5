import React, { Suspense } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Clock } from '@/app/components/ui/icons/Clock';
import type { TimelineEvent } from '../../../LawyerShared';
import { isSessionHubFocusEvent } from '../../smartFile/sessionRecordEngine';
import { LazyTimelineFeed } from '../../smartFileMainPanelLazyHubs';

export type SmartFileTimelineSectionProps = {
    isTimelineExpanded: boolean;
    setIsTimelineExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    timelineEventCount: number;
    displayTimeline: TimelineEvent[];
    interactionLocked: boolean;
    isCaseLinkViewOnly: boolean;
    handleDeleteEvent: (id: string) => void;
    handleEditEvent: (id: string) => void;
    setEditingEvent: (event: TimelineEvent | null) => void;
};

export function SmartFileTimelineSection({
    isTimelineExpanded,
    setIsTimelineExpanded,
    timelineEventCount,
    displayTimeline,
    interactionLocked,
    isCaseLinkViewOnly,
    handleDeleteEvent,
    handleEditEvent,
    setEditingEvent,
}: SmartFileTimelineSectionProps) {
    return (
        <div className="mb-4 print:block">
            <button
                type="button"
                onClick={() => {
                    void LazyTimelineFeed.preload();
                    setIsTimelineExpanded((v) => !v);
                }}
                onPointerEnter={() => {
                    void LazyTimelineFeed.preload();
                }}
                className="w-full flex items-center justify-between gap-2 pb-2 border-b text-right group/timeline-head print:pointer-events-none border-white/5"
                aria-expanded={isTimelineExpanded}
            >
                <span className="text-lg font-bold flex items-center gap-2 min-w-0 text-gray-300">
                    <Clock size={18} className="shrink-0 text-[#E6C673]" />
                    السجل الزمني
                    {timelineEventCount > 0 ? (
                        <span className="text-[10px] font-bold text-white/40 tabular-nums">
                            ({timelineEventCount})
                        </span>
                    ) : null}
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 print:hidden ${
                        isTimelineExpanded ? 'rotate-180' : ''
                    } text-[#E6C673]/70`}
                    aria-hidden
                />
            </button>

            {isTimelineExpanded ? (
                <div className="mt-3 print:block">
                    <Suspense fallback={null}>
                        <LazyTimelineFeed
                            events={displayTimeline}
                            visualVariant="civil"
                            onDelete={!interactionLocked ? handleDeleteEvent : undefined}
                            onEventClick={
                                !interactionLocked
                                    ? (event) => {
                                          if (isSessionHubFocusEvent(event)) {
                                              setEditingEvent(event);
                                          } else {
                                              handleEditEvent(String(event.id));
                                          }
                                      }
                                    : isCaseLinkViewOnly
                                      ? (event) => {
                                            if (isSessionHubFocusEvent(event)) {
                                                setEditingEvent(event);
                                            }
                                        }
                                      : undefined
                            }
                        />
                    </Suspense>
                </div>
            ) : null}
        </div>
    );
}
