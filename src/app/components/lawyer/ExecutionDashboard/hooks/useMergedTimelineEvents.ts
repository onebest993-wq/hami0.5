import { useMemo } from 'react';
import { parseTimelineDeadlineDate } from '@/app/utils/timelineSmartDisplay';

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
) {
    const mergedTimelineEvents = useMemo(() => {
        const sortKeyMs = (e: any): number => {
            const raw = e?.timestamp || e?.date || e?.createdAt;
            const d = parseTimelineDeadlineDate(raw ? String(raw) : undefined);
            return d ? d.getTime() : 0;
        };
        const hasSubFiles = subFiles.length > 0;
        if (!hasSubFiles) {
            return activeTimelineEvents.map((e) => ({
                ...e,
                _dossierSource: 'main' as const,
                _dossierLabel: 'الإضبارة الأم',
                title: e.title,
            }));
        }
        if (showOnlyActiveFileTimeline) {
            if (activeSubFileId) {
                const sf = subFiles.find((f) => f.id === activeSubFileId);
                return activeTimelineEvents.map((e) => ({
                    ...e,
                    _dossierSource: 'sub' as const,
                    _dossierLabel: sf?.fileNumber || 'إضبارة الإنابة',
                    title: `[${sf?.fileNumber || 'إضبارة الإنابة'}] ${e.title || ''}`,
                }));
            }
            return activeTimelineEvents.map((e) => ({
                ...e,
                _dossierSource: 'main' as const,
                _dossierLabel: 'الإضبارة الأم',
                title: `[الإضبارة الأم] ${e.title || ''}`,
            }));
        }
        const mainEvents = activeTimelineEvents.map((e) => ({
            ...e,
            _dossierSource: 'main' as const,
            _dossierLabel: 'الإضبارة الأم',
            title: `[الإضبارة الأم] ${e.title || ''}`,
        }));
        const subEvents = subFiles.flatMap((sf) =>
            (sf.timelineEvents || [])
                .filter((e: any) => !e.trashedAt)
                .map((e: any) => ({
                    ...e,
                    _dossierSource: 'sub' as const,
                    _dossierLabel: sf.fileNumber || 'إضبارة الإنابة',
                    title: `[${sf.fileNumber || 'إضبارة الإنابة'}] ${e.title || ''}`,
                }))
        );
        return [...mainEvents, ...subEvents].sort((a, b) => sortKeyMs(b) - sortKeyMs(a));
    }, [activeTimelineEvents, subFiles, showOnlyActiveFileTimeline, activeSubFileId]);

    return mergedTimelineEvents;
}
