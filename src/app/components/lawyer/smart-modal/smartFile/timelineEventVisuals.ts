import { FileText } from '@/app/components/ui/icons/FileText';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { AlertOctagon } from '@/app/components/ui/icons/AlertOctagon';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Search as SearchIcon } from '@/app/components/ui/icons/Search';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import { HandCoins } from '@/app/components/ui/icons/HandCoins';
import { Clock } from '@/app/components/ui/icons/Clock';
import type { TimelineEvent } from '../../LawyerShared';
import { isSessionTimelineEvent } from './sessionRecordEngine';
import { isLegalDeadlineTimelineEvent } from './timelineLegalDeadline';
import {
    PAL,
    paletteVisual,
    setActiveTimelineTheme,
    type ExtendedTimelineEvent,
    type TimelineVisual,
    type TimelineVisualTheme,
} from './timelineEventVisualPalettes';
import {
    resolveByEventType,
    resolveByTags,
    resolveByTitle,
} from './timelineEventVisualResolvers';

export function resolveTimelineVisual(
    event: TimelineEvent,
    ext: ExtendedTimelineEvent = event as ExtendedTimelineEvent,
    theme: TimelineVisualTheme = 'civil',
): TimelineVisual {
    setActiveTimelineTheme(theme);
    const title = event.title || '';

    if (isSessionTimelineEvent(event)) {
        return paletteVisual(ScrollText, PAL.blue);
    }

    if (isLegalDeadlineTimelineEvent(event)) {
        if (String(event.id ?? '').startsWith('appt_judgment_')) {
            return paletteVisual(Gavel, PAL.gold);
        }
        return paletteVisual(Clock, PAL.amber);
    }

    if (ext.isPause || title.includes('استئخار')) {
        return paletteVisual(PauseCircle, PAL.amber);
    }
    if (ext.isInterruption || title.includes('انقطاع')) {
        return paletteVisual(AlertOctagon, PAL.rose);
    }
    if (ext.isAttachment) {
        return paletteVisual(Lock, PAL.red);
    }
    if (ext.isFastTrack) {
        return paletteVisual(ClipboardList, PAL.gold);
    }
    if (event.type === 'expert' || ext.color === 'teal' || event.color === 'teal') {
        return paletteVisual(SearchIcon, PAL.teal);
    }

    const tagged = resolveByTags(event, title);
    if (tagged) return tagged;

    if (event.type === 'alert') {
        return paletteVisual(ShieldAlert, PAL.red);
    }
    if (event.type === 'action') {
        return paletteVisual(HandCoins, PAL.orange);
    }

    const byTitle = resolveByTitle(title);
    if (byTitle) return byTitle;

    const byType = resolveByEventType(event);
    if (byType) return byType;

    return paletteVisual(FileText, PAL.slate);
}
