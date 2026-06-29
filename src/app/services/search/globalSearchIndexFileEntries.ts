import type { FileData, Task } from '@/app/components/lawyer/LawyerShared';
import { resolveFileSearchLifecycle, type SearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchCategory, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    blob,
    norm,
    noteTexts,
    partyNames,
    withLifecycle,
} from '@/app/services/search/globalSearchIndexPureHelpers';

function fileTasksToEntries(f: FileData, fileTitle: string, lifecycle: SearchLifecycle): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    for (const t of f.tasks ?? []) {
        const title = (t as Task).title?.trim() || (t as { text?: string }).text?.trim();
        if (!title) continue;
        out.push(
            withLifecycle(
                {
                    id: `ftask-${f.id}-${t.id}`,
                    category: 'task',
                    title,
                    subtitle: `مهمة ملف — ${fileTitle}`,
                    _searchStr: blob([title, (t as Task).details, fileTitle, f.caseNo]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }
    return out;
}

/** stages[].timeline → deep search entries (تنفيذ القانوني الأصيل لأي إضبارة مدنية). */
function lawsuitStagesToEntries(f: FileData, fileTitle: string, lifecycle: SearchLifecycle): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    const stagesRaw = (f as unknown as Record<string, unknown>).stages;
    const stages = Array.isArray(stagesRaw) ? stagesRaw : [];

    stages.forEach((stageRaw, stageIndex) => {
        if (!stageRaw || typeof stageRaw !== 'object') return;
        const stage = stageRaw as Record<string, unknown>;
        const stageId = String(stage.id ?? '');
        const stageName = String(stage.stageName ?? stage.name ?? '').trim();
        const stageLabel = stageName ? `${stageName} — ${fileTitle}` : fileTitle;

        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const evRaw of timeline) {
            if (!evRaw || typeof evRaw !== 'object') continue;
            const ev = evRaw as Record<string, unknown>;
            if (ev.isDeleted) continue;
            const title = String(ev.title ?? '').trim();
            const details = String(ev.details ?? '').trim();
            if (!title && !details) continue;
            const evType = String(ev.type ?? '').trim();
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
                        subtitle: `${stageLabel}${evType ? ` • ${evType}` : ''}`,
                        snippet: details || undefined,
                        _searchStr: blob([title, details, evType, subtype, docCat, tagsStr, stageLabel, f.caseNo]),
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
            const title = String(t.title ?? '').trim();
            if (!title) continue;
            const taskId = String(t.id ?? '');
            out.push(
                withLifecycle(
                    {
                        id: `stage-task-${f.id}-${stageId}-${taskId || title}`,
                        category: 'task',
                        title,
                        subtitle: `مهمة مرحلة — ${stageLabel}`,
                        snippet: typeof t.details === 'string' ? t.details : undefined,
                        _searchStr: blob([title, String(t.details ?? ''), stageLabel, f.caseNo]),
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
            const incTitle = String(i.title ?? i.subject ?? '').trim();
            if (!incTitle) continue;
            const incId = String(i.id ?? '');
            out.push(
                withLifecycle(
                    {
                        id: `incidental-${f.id}-${stageId}-${incId || incTitle}`,
                        category: 'case',
                        title: incTitle,
                        subtitle: `قضية حادثة — ${stageLabel}`,
                        snippet: typeof i.details === 'string' ? i.details : undefined,
                        _searchStr: blob([incTitle, String(i.details ?? ''), String(i.type ?? ''), stageLabel, f.caseNo]),
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

export function fileToEntry(f: FileData & { executionTrashDeletedAt?: string | null }): GlobalSearchEntry[] {
    const lifecycle = resolveFileSearchLifecycle(f);
    const cat: GlobalSearchCategory =
        f.type === 'execution' ? 'execution' : f.type === 'transaction' ? 'transaction' : 'lawsuit';
    const client = f.parties?.find((p) => p.isClient)?.name || f.parties?.[0]?.name || '';
    const searchBlob = [f.caseNo, f.court, f.docType, f.judge, client, partyNames(f.parties), noteTexts(f.notes)]
        .filter(Boolean)
        .join(' ');

    const main = withLifecycle(
        {
            id: `file-${f.id}`,
            category: cat,
            title:
                f.type === 'transaction'
                    ? client || f.caseNo || 'معاملة'
                    : f.parties?.find((p) => p.isClient)?.name || f.caseNo || 'ملف',
            subtitle: f.type === 'transaction' ? f.caseNo : `${f.court} • ${f.caseNo}`,
            _searchStr: norm(searchBlob),
            navigate: { type: 'file', fileId: f.id },
        },
        lifecycle,
    );

    const extras: GlobalSearchEntry[] = [main];

    for (const p of f.parties ?? []) {
        if (!p.name?.trim()) continue;
        extras.push(
            withLifecycle(
                {
                    id: `party-${f.id}-${p.id}`,
                    category: 'party',
                    title: p.name,
                    subtitle: `${p.role} — ${main.title}`,
                    _searchStr: blob([p.name, p.phone, p.role, searchBlob]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }

    for (const n of f.notes ?? []) {
        if (!n.text?.trim()) continue;
        extras.push(
            withLifecycle(
                {
                    id: `file-note-${f.id}-${n.id}`,
                    category: 'note',
                    title: n.text.slice(0, 80),
                    subtitle: `ملاحظة ملف — ${main.title}`,
                    snippet: n.text,
                    _searchStr: blob([n.text, searchBlob]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }

    extras.push(...fileTasksToEntries(f, main.title, lifecycle));
    if (f.type !== 'execution') {
        extras.push(...lawsuitStagesToEntries(f, main.title, lifecycle));
    }
    return extras;
}
