import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchCategory, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import { blob, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';
import {
    formatSearchLocationPath,
    sanitizeSearchDisplayText,
    searchEventTypeLabel,
} from '@/app/services/search/searchDisplayText';

/** stages[].timeline → deep search entries (تنفيذ القانوني الأصيل لأي إضبارة مدنية). */
export function lawsuitStagesToEntries(
    f: FileData,
    fileTitle: string,
    lifecycle: SearchLifecycle,
): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    const stagesRaw = (f as unknown as Record<string, unknown>).stages;
    const stages = Array.isArray(stagesRaw) ? stagesRaw : [];

    stages.forEach((stageRaw, stageIndex) => {
        if (!stageRaw || typeof stageRaw !== 'object') return;
        const stage = stageRaw as Record<string, unknown>;
        const stageId = String(stage.id ?? '');
        const stageName = String(stage.stageName ?? stage.name ?? '').trim();

        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const evRaw of timeline) {
            if (!evRaw || typeof evRaw !== 'object') continue;
            const ev = evRaw as Record<string, unknown>;
            if (ev.isDeleted) continue;
            const title = sanitizeSearchDisplayText(String(ev.title ?? '').trim());
            const details = sanitizeSearchDisplayText(String(ev.details ?? '').trim());
            if (!title && !details) continue;
            const evType = String(ev.type ?? '').trim();
            const typeLabel = searchEventTypeLabel(evType);
            const tagsStr = Array.isArray(ev.tags) ? (ev.tags as unknown[]).join(' ') : '';
            const subtype = String(ev.subType ?? '').trim();
            const docCat = String(ev.docCategory ?? '').trim();
            const eventId = String(ev.id ?? '');

            const category: GlobalSearchCategory =
                evType === 'decision'
                    ? 'lawsuit'
                    : evType === 'document'
                      ? 'vault'
                      : evType === 'note'
                        ? 'note'
                        : 'lawsuit';

            out.push(
                withLifecycle(
                    {
                        id: `lawsuit-tl-${f.id}-${stageId}-${eventId || title}`,
                        category,
                        title: title || details.slice(0, 80),
                        subtitle: formatSearchLocationPath([
                            f.caseNo,
                            stageName || 'مرحلة',
                            typeLabel,
                            fileTitle,
                        ]),
                        snippet: details || undefined,
                        _searchStr: blob([
                            title,
                            details,
                            evType,
                            typeLabel,
                            subtype,
                            docCat,
                            tagsStr,
                            stageName,
                            fileTitle,
                            f.caseNo,
                        ]),
                        navigate: {
                            type: 'file',
                            fileId: f.id,
                            stageIndex,
                            eventId: eventId || undefined,
                        },
                    },
                    lifecycle,
                ),
            );
        }

        const stageTasks = Array.isArray(stage.tasks) ? stage.tasks : [];
        for (const tRaw of stageTasks) {
            if (!tRaw || typeof tRaw !== 'object') continue;
            const t = tRaw as Record<string, unknown>;
            const title = sanitizeSearchDisplayText(String(t.title ?? '').trim());
            if (!title) continue;
            const taskId = String(t.id ?? '');
            out.push(
                withLifecycle(
                    {
                        id: `stage-task-${f.id}-${stageId}-${taskId || title}`,
                        category: 'task',
                        title,
                        subtitle: formatSearchLocationPath([f.caseNo, stageName || 'مرحلة', 'مهمة', fileTitle]),
                        snippet:
                            typeof t.details === 'string'
                                ? sanitizeSearchDisplayText(t.details)
                                : undefined,
                        _searchStr: blob([title, String(t.details ?? ''), stageName, fileTitle, f.caseNo]),
                        navigate: {
                            type: 'file',
                            fileId: f.id,
                            stageIndex,
                            eventId: taskId || undefined,
                        },
                    },
                    lifecycle,
                ),
            );
        }

        const incidentals = Array.isArray(stage.incidentalCases) ? stage.incidentalCases : [];
        for (const iRaw of incidentals) {
            if (!iRaw || typeof iRaw !== 'object') continue;
            const i = iRaw as Record<string, unknown>;
            const incTitle = sanitizeSearchDisplayText(String(i.title ?? i.subject ?? '').trim());
            if (!incTitle) continue;
            const incId = String(i.id ?? '');
            out.push(
                withLifecycle(
                    {
                        id: `incidental-${f.id}-${stageId}-${incId || incTitle}`,
                        category: 'case',
                        title: incTitle,
                        subtitle: formatSearchLocationPath([
                            f.caseNo,
                            stageName || 'مرحلة',
                            'قضية حادثة',
                            fileTitle,
                        ]),
                        snippet:
                            typeof i.details === 'string'
                                ? sanitizeSearchDisplayText(i.details)
                                : undefined,
                        _searchStr: blob([
                            incTitle,
                            String(i.details ?? ''),
                            String(i.type ?? ''),
                            stageName,
                            fileTitle,
                            f.caseNo,
                        ]),
                        navigate: {
                            type: 'file',
                            fileId: f.id,
                            stageIndex,
                            eventId: incId || undefined,
                        },
                    },
                    lifecycle,
                ),
            );
        }
    });

    return out;
}
