import { useMemo } from 'react';
import { parseTimelineDeadlineDate } from '@/app/utils/timelineSmartDisplay';
import {
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    isInabaSubFileId,
} from '@/app/stores/executionDashboardStore';

interface SubFile {
    id: string;
    fileNumber?: string;
    timelineEvents?: any[];
    [key: string]: unknown;
}

export function useMergedTimelineEvents(
    activeTimelineEvents: any[],
    subFiles: SubFile[],
    showOnlyActiveFileTimeline: boolean,
    activeSubFileId: string | null,
    parentDossierId?: string | null,
) {
    const mergedTimelineEvents = useMemo(() => {
        const events = Array.isArray(activeTimelineEvents) ? activeTimelineEvents : [];
        const files = Array.isArray(subFiles) ? subFiles : [];
        const sortKeyMs = (e: any): number => {
            const raw = e?.timestamp || e?.date || e?.createdAt;
            const d = parseTimelineDeadlineDate(raw ? String(raw) : undefined);
            return d ? d.getTime() : 0;
        };
        const parentId = String(parentDossierId || '').trim();
        const hasSubFiles = files.length > 0;

        if (showOnlyActiveFileTimeline && activeSubFileId && isInabaSubFileId(activeSubFileId)) {
            const sf = files.find((f) => f.id === activeSubFileId);
            const fromSub = filterTimelineEventsForInabaDossier(sf?.timelineEvents || [], activeSubFileId);
            const fromActive = filterTimelineEventsForInabaDossier(events, activeSubFileId);
            const byId = new Map<string, any>();
            for (const e of [...fromSub, ...fromActive]) {
                if (e?.id) byId.set(String(e.id), e);
            }
            return [...byId.values()].map((e) => ({
                ...e,
                _dossierSource: 'sub' as const,
                _dossierLabel: 'الإضبارة الفرعية',
                title: e.title,
            }));
        }

        if (!hasSubFiles) {
            const mainOnly = parentId
                ? filterTimelineEventsForParentDossier(events, parentId)
                : events;
            return mainOnly.map((e) => ({
                ...e,
                _dossierSource: 'main' as const,
                _dossierLabel: 'الإضبارة الأم',
                title: e.title,
            }));
        }

        if (showOnlyActiveFileTimeline) {
            const mainOnly = parentId
                ? filterTimelineEventsForParentDossier(events, parentId)
                : events;
            return mainOnly.map((e) => ({
                ...e,
                _dossierSource: 'main' as const,
                _dossierLabel: 'الإضبارة الأم',
                title: e.title,
            }));
        }

        const mainEvents = (parentId
            ? filterTimelineEventsForParentDossier(events, parentId)
            : events
        ).map((e) => ({
            ...e,
            _dossierSource: 'main' as const,
            _dossierLabel: 'الإضبارة الأم',
            title: `[الإضبارة الأم] ${e.title || ''}`,
        }));
        const subEvents = files.flatMap((sf) =>
            filterTimelineEventsForInabaDossier(sf.timelineEvents || [], sf.id)
                .filter((e: any) => !e.trashedAt)
                .map((e: any) => ({
                    ...e,
                    _dossierSource: 'sub' as const,
                    _dossierLabel: 'الإضبارة الفرعية',
                    title: `[الإضبارة الفرعية] ${e.title || ''}`,
                }))
        );
        return [...mainEvents, ...subEvents].sort((a, b) => sortKeyMs(b) - sortKeyMs(a));
    }, [activeTimelineEvents, subFiles, showOnlyActiveFileTimeline, activeSubFileId, parentDossierId]);

    return mergedTimelineEvents;
}
