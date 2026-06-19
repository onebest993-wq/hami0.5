import type { LegalCase } from '@/app/stores/caseStore';
import type { CalendarEvent, CommunityPost, SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { GlobalSearchExtras } from '@/app/services/globalSearchLoad';
import type { LegalTask } from '@/app/types/TaskEngine';
import { TransactionStatus, type Transaction, type TransactionTask, type FinanceRecord } from '@/app/modules/transactionsThreading/types';
import type { FileData, Party, Task } from '@/app/components/lawyer/LawyerShared';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import {
    resolveCaseSearchLifecycle,
    resolveFileSearchLifecycle,
    type SearchLifecycle,
} from '@/app/services/searchLifecycle';
import { buildExecutionDeepSearchEntries } from '@/app/services/executionSearchIndex';

const LIFECYCLE_ACTIVE: SearchLifecycle = 'active';

export type GlobalSearchCategory =
    | 'lawsuit'
    | 'transaction'
    | 'execution'
    | 'criminal'
    | 'note'
    | 'voice'
    | 'vault'
    | 'repository'
    | 'case'
    | 'party'
    | 'profile'
    | 'task'
    | 'calendar'
    | 'urgent'
    | 'threading'
    | 'finance'
    | 'community'
    | 'notification';

export type GlobalSearchNavigate =
    | {
          type: 'file';
          fileId: string | number;
          /** فتح الإضبارة على مرحلة محددة (للنتائج العميقة من stages[].timeline) */
          stageIndex?: number;
          /** معرّف الحدث داخل المرحلة للقفز إليه (scroll-to) — اختياري */
          eventId?: string;
      }
    | { type: 'criminal'; criminalId: string }
    | { type: 'note'; noteId?: string }
    | { type: 'voice'; noteId?: string }
    | { type: 'vault' }
    | { type: 'repository' }
    | { type: 'case'; caseId: string }
    | { type: 'profile' }
    | { type: 'tasks_manager'; taskId?: string }
    | { type: 'calendar'; eventId?: string; date?: string }
    | { type: 'urgent'; urgentId?: string }
    | { type: 'transactions'; transactionId?: string }
    | { type: 'community'; postId?: string }
    | { type: 'notifications' };

export type GlobalSearchEntry = {
    id: string;
    category: GlobalSearchCategory;
    title: string;
    subtitle: string;
    snippet?: string;
    lifecycle: SearchLifecycle;
    _searchStr: string;
    navigate: GlobalSearchNavigate;
};

function withLifecycle(entry: Omit<GlobalSearchEntry, 'lifecycle'>, lifecycle: SearchLifecycle): GlobalSearchEntry {
    return { ...entry, lifecycle };
}

type GlobalNoteRow = { id: number | string; title?: string; body?: string; type?: string };

export type PreparedVaultNote = { id: string; content: string; type?: 'text' | 'voice' };
export type PreparedDocsVaultDoc = { id: string; name: string; caseId?: string; tags?: string[] };

const ALL_CATEGORIES: GlobalSearchCategory[] = [
    'lawsuit',
    'transaction',
    'execution',
    'criminal',
    'note',
    'voice',
    'vault',
    'repository',
    'case',
    'party',
    'profile',
    'task',
    'calendar',
    'urgent',
    'threading',
    'finance',
    'community',
    'notification',
];

function norm(text: string): string {
    return normalizeArabic(text).toLowerCase();
}

function blob(parts: (string | undefined | null)[]): string {
    return norm(parts.filter(Boolean).join(' '));
}

function partyNames(parties: Party[] | undefined): string {
    return (parties ?? []).map((p) => `${p.name || ''} ${p.phone || ''} ${p.role || ''}`).join(' ');
}

function noteTexts(notes: FileData['notes'] | undefined): string {
    return (notes ?? []).map((n) => n.text || '').join(' ');
}

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

/** stages[].timeline → deep search entries (تنفيذ القانوني الأصيل لأي إضبارة مدنية).
 *  هذا ما كان مفقوداً قبل الإصلاح: محتوى الجلسات والمرافعات والقرارات والأدلة.
 *  كل entry يحمل stageIndex + eventId/taskId/incidentalId لـ deep-link دقيق. */
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

        // timeline events: جلسات، قرارات، مستندات، خبراء، إنذارات
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

            // التصنيف الأنسب حسب نوع الحدث
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

        // stages[].tasks: مهام تابعة لمرحلة معيّنة (أكثر شيوعاً من f.tasks)
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

        // incidentalCases على مستوى المرحلة (قضايا حادثة منضمّة)
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

function fileToEntry(f: FileData & { executionTrashDeletedAt?: string | null }): GlobalSearchEntry[] {
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
    // فهرسة محتوى المراحل (timeline + tasks + incidentalCases) للإضابير المدنية
    if (f.type !== 'execution') {
        extras.push(...lawsuitStagesToEntries(f, main.title, lifecycle));
    }
    return extras;
}

function caseToEntry(c: LegalCase): GlobalSearchEntry[] {
    const lifecycle = resolveCaseSearchLifecycle(c.status);
    const searchBlob = `${c.title} ${c.caseNo} ${c.court || ''} ${c.clientName} ${c.opponentName}`;
    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `case-${c.id}`,
                category: 'case',
                title: c.title,
                subtitle: `${c.caseNo} • ${c.court || ''}`,
                _searchStr: norm(searchBlob),
                navigate: { type: 'case', caseId: c.id },
            },
            lifecycle,
        ),
    ];
    if (c.clientName) {
        entries.push(
            withLifecycle(
                {
                    id: `case-client-${c.id}`,
                    category: 'party',
                    title: c.clientName,
                    subtitle: `موكل — ${c.title}`,
                    _searchStr: blob([c.clientName, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    if (c.opponentName) {
        entries.push(
            withLifecycle(
                {
                    id: `case-opponent-${c.id}`,
                    category: 'party',
                    title: c.opponentName,
                    subtitle: `خصم — ${c.title}`,
                    _searchStr: blob([c.opponentName, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    for (const n of c.notes ?? []) {
        if (n.isDeleted || !n.content?.trim()) continue;
        entries.push(
            withLifecycle(
                {
                    id: `case-note-${c.id}-${n.id}`,
                    category: 'note',
                    title: n.content.slice(0, 80),
                    subtitle: `ملاحظة — ${c.title}`,
                    snippet: n.content,
                    _searchStr: blob([n.content, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    return entries;
}

function vaultToEntry(d: SmartVaultDoc): GlobalSearchEntry {
    const text = `${d.title} ${d.fileName} ${d.tags.join(' ')} ${d.aiSummary || ''}`;
    return withLifecycle(
        {
            id: `vault-${d.id}`,
            category: 'vault',
            title: d.title || d.fileName,
            subtitle: d.tags.length ? d.tags.join(' • ') : 'مخزن الملفات الذكي',
            snippet: d.aiSummary || undefined,
            _searchStr: norm(text),
            navigate: { type: 'vault' },
        },
        LIFECYCLE_ACTIVE,
    );
}

function repositoryToEntry(d: RepositoryDocument): GlobalSearchEntry {
    const text = `${d.title} ${d.description} ${d.type} ${d.fileName} ${d.authorName}`;
    return withLifecycle(
        {
            id: `repo-${d.id}`,
            category: 'repository',
            title: d.title,
            subtitle: `${d.type} • ${d.authorName}`,
            snippet: d.description || undefined,
            _searchStr: norm(text),
            navigate: { type: 'repository' },
        },
        LIFECYCLE_ACTIVE,
    );
}

function docsVaultEntriesFromPrepared(
    docs: PreparedDocsVaultDoc[],
    fileLifecycleById: Map<string, SearchLifecycle>,
): GlobalSearchEntry[] {
    return docs.map((d) => {
        const linkedLifecycle = d.caseId ? fileLifecycleById.get(String(d.caseId)) : undefined;
        return withLifecycle(
            {
                id: `docs-vault-${d.id}`,
                category: 'vault' as const,
                title: d.name,
                subtitle: d.caseId ? `مستند إضبارة #${d.caseId}` : 'مستندات الإضبارة',
                _searchStr: blob([d.name, d.tags?.join(' '), d.caseId]),
                navigate: d.caseId ? { type: 'file', fileId: d.caseId } : { type: 'vault' },
            },
            linkedLifecycle ?? LIFECYCLE_ACTIVE,
        );
    });
}

function noteRowToEntry(n: GlobalNoteRow, source: string): GlobalSearchEntry {
    const title = n.title?.trim() || 'ملاحظة';
    const body = n.body?.trim() || '';
    const isVoice = n.type === 'voice' || body.startsWith('data:audio');
    return withLifecycle(
        {
            id: `gnote-${n.id}-${source}`,
            category: isVoice ? 'voice' : 'note',
            title: isVoice ? 'تسجيل صوتي' : title,
            subtitle: isVoice ? title : source,
            snippet: isVoice ? undefined : body,
            _searchStr: blob([title, body, isVoice ? 'صوت تسجيل' : '']),
            navigate: isVoice
                ? { type: 'voice', noteId: String(n.id) }
                : { type: 'note', noteId: String(n.id) },
        },
        LIFECYCLE_ACTIVE,
    );
}

function quantumTaskToEntry(t: LegalTask, fileLifecycleById: Map<string, SearchLifecycle>): GlobalSearchEntry {
    const sub = t.subTasks.map((s) => s.title).join(' ');
    const docs = t.documentRequirements.map((d) => d.text).join(' ');
    const text = `${t.title} ${t.rawText} ${t.location || ''} ${sub} ${docs}`;
    const linkedLifecycle = t.linkedCaseId ? fileLifecycleById.get(String(t.linkedCaseId)) : undefined;
    return withLifecycle(
        {
            id: `qtask-${t.id}`,
            category: 'task',
            title: t.title,
            subtitle: t.location ? `مهمة ميدانية — ${t.location}` : 'مهام المحامي الكمية',
            snippet: t.rawText || undefined,
            _searchStr: norm(text),
            navigate: { type: 'tasks_manager', taskId: t.id },
        },
        linkedLifecycle ?? LIFECYCLE_ACTIVE,
    );
}

function calendarToEntry(e: CalendarEvent, fileLifecycleById: Map<string, SearchLifecycle>): GlobalSearchEntry {
    const text = `${e.title} ${e.notes || ''} ${e.clientName || ''} ${e.location || ''} ${e.caseNo || ''} ${e.court || ''}`;
    const linkedLifecycle = e.caseId ? fileLifecycleById.get(String(e.caseId)) : undefined;
    return withLifecycle(
        {
            id: `cal-${e.id}`,
            category: 'calendar',
            title: e.title,
            subtitle: `${e.date}${e.time ? ` ${e.time}` : ''}${e.clientName ? ` • ${e.clientName}` : ''}`,
            snippet: e.notes,
            _searchStr: norm(text),
            navigate: e.caseId
                ? { type: 'file', fileId: e.caseId }
                : { type: 'calendar', eventId: e.id, date: e.date },
        },
        linkedLifecycle ?? LIFECYCLE_ACTIVE,
    );
}

function criminalToEntry(raw: unknown): GlobalSearchEntry[] {
    if (!raw || typeof raw !== 'object') return [];
    const c = raw as Record<string, unknown>;
    const id = String(c.id ?? '');
    if (!id) return [];

    const location =
        c.location && typeof c.location === 'object' ? (c.location as Record<string, unknown>) : {};
    const caseNo =
        String(c.courtCaseNumber ?? location.caseNumber ?? location.investigationDossierNumber ?? '').trim();
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    const d0 =
        defendants[0] && typeof defendants[0] === 'object' ? (defendants[0] as Record<string, unknown>) : null;
    const complainants = Array.isArray(c.complainants) ? c.complainants : [];
    const comp0 =
        complainants[0] && typeof complainants[0] === 'object'
            ? (complainants[0] as Record<string, unknown>)
            : null;
    const clientName = String(d0?.fullName ?? comp0?.fullName ?? '').trim();
    const basics = c.basics && typeof c.basics === 'object' ? (c.basics as Record<string, unknown>) : {};
    const stage = String(basics.stage ?? '').trim();
    const title = clientName || (stage ? `جزائي — ${stage}` : 'إضبارة جزائية');
    const lifecycle: SearchLifecycle = c.isArchived === true ? 'archived' : LIFECYCLE_ACTIVE;
    const text = [title, caseNo, stage, c.notes].filter(Boolean).join(' ');

    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `criminal-${id}`,
                category: 'criminal',
                title,
                subtitle: caseNo ? `جزائي • ${caseNo}` : 'قضايا جزائية',
                _searchStr: norm(text),
                navigate: { type: 'criminal', criminalId: id },
            },
            lifecycle,
        ),
    ];

    // كل المتهمين والشاكين كـ party entries مستقلّة (قبل الإصلاح فقط [0] كان يُستخدم في الـ title)
    const indexParty = (
        person: Record<string, unknown>,
        idx: number,
        role: 'متهم' | 'شاكٍ',
        partyType: 'defendant' | 'complainant',
    ) => {
        const name = String(person.fullName ?? '').trim();
        if (!name) return;
        const nat = String(person.nationality ?? '').trim();
        const occ = String(person.occupation ?? '').trim();
        const addr = String(person.address ?? '').trim();
        entries.push(
            withLifecycle(
                {
                    id: `criminal-${partyType}-${id}-${idx}`,
                    category: 'party',
                    title: name,
                    subtitle: `${role} — ${title}${caseNo ? ` • ${caseNo}` : ''}`,
                    _searchStr: blob([name, nat, occ, addr, role, title, caseNo]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    };

    defendants.forEach((p, i) => {
        if (p && typeof p === 'object') indexParty(p as Record<string, unknown>, i, 'متهم', 'defendant');
    });
    complainants.forEach((p, i) => {
        if (p && typeof p === 'object') indexParty(p as Record<string, unknown>, i, 'شاكٍ', 'complainant');
    });

    // ملاحظات الإضبارة الجزائية كـ note entries مستقلّة
    const notesRaw = Array.isArray(c.notes) ? c.notes : [];
    for (const nRaw of notesRaw) {
        if (!nRaw || typeof nRaw !== 'object') continue;
        const n = nRaw as Record<string, unknown>;
        if (n.isDeleted) continue;
        const noteText = String(n.text ?? n.content ?? '').trim();
        if (!noteText) continue;
        entries.push(
            withLifecycle(
                {
                    id: `criminal-note-${id}-${String(n.id ?? noteText.slice(0, 20))}`,
                    category: 'note',
                    title: noteText.slice(0, 80),
                    subtitle: `ملاحظة جزائية — ${title}`,
                    snippet: noteText,
                    _searchStr: blob([noteText, title, caseNo]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    }

    // procedural timeline (الأحداث الإجرائية للإضبارة الجزائية)
    const proceduralTimeline = Array.isArray(c.proceduralTimeline) ? c.proceduralTimeline : [];
    for (const evRaw of proceduralTimeline) {
        if (!evRaw || typeof evRaw !== 'object') continue;
        const ev = evRaw as Record<string, unknown>;
        const evTitle = String(ev.title ?? ev.name ?? '').trim();
        const evDetails = String(ev.details ?? ev.description ?? '').trim();
        if (!evTitle && !evDetails) continue;
        entries.push(
            withLifecycle(
                {
                    id: `criminal-event-${id}-${String(ev.id ?? evTitle)}`,
                    category: 'criminal',
                    title: evTitle || evDetails.slice(0, 80),
                    subtitle: `إجراء — ${title}`,
                    snippet: evDetails || undefined,
                    _searchStr: blob([evTitle, evDetails, title, caseNo]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    }

    return entries;
}

function urgentToEntry(raw: unknown, idx: number): GlobalSearchEntry[] {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const name = String(r.applicantName ?? r.title ?? r.clientName ?? `طلب ${idx + 1}`);
    const court = String(r.court ?? r.courtName ?? '');
    const caseNo = String(r.requestNumber ?? r.caseNo ?? r.caseNumber ?? '').trim();
    const text = Object.values(r)
        .filter((v) => typeof v === 'string')
        .join(' ');
    const lifecycle: SearchLifecycle = r.archived === true ? 'archived' : LIFECYCLE_ACTIVE;
    return [
        withLifecycle(
            {
                id: `urgent-${r.id ?? idx}`,
                category: 'urgent',
                title: name,
                subtitle: court ? `${court}${caseNo ? ` • ${caseNo}` : ''}` : 'طلبات مستعجلة',
                _searchStr: norm(`${name} ${court} ${caseNo} ${text}`),
                navigate: { type: 'urgent', urgentId: String(r.id ?? idx) },
            },
            lifecycle,
        ),
    ];
}

function threadingTxToEntry(tx: Transaction): GlobalSearchEntry {
    const text = `${tx.title} ${tx.clientName} ${tx.targetDepartment} ${tx.status}`;
    const lifecycle: SearchLifecycle =
        tx.status === TransactionStatus.Completed ? 'archived' : LIFECYCLE_ACTIVE;
    return withLifecycle(
        {
            id: `tx-${tx.id}`,
            category: 'threading',
            title: tx.clientName || tx.title,
            subtitle: `معاملة إدارية — ${tx.targetDepartment}`,
            _searchStr: norm(text),
            navigate: { type: 'transactions', transactionId: tx.id },
        },
        lifecycle,
    );
}

function threadingTaskToEntry(t: TransactionTask, txTitle: string, transactionId: string): GlobalSearchEntry {
    const text = `${t.title} ${t.notes || ''} ${t.officialReference || ''} ${txTitle}`;
    return withLifecycle(
        {
            id: `txtask-${t.id}`,
            category: 'task',
            title: t.title,
            subtitle: `مهمة معاملة — ${txTitle}`,
            snippet: t.notes || undefined,
            _searchStr: norm(text),
            navigate: { type: 'transactions', transactionId },
        },
        LIFECYCLE_ACTIVE,
    );
}

function notificationToEntry(n: {
    id: string;
    title: string;
    message: string;
    type: string;
}): GlobalSearchEntry {
    return withLifecycle(
        {
            id: `notif-${n.id}`,
            category: 'notification',
            title: n.title,
            subtitle: n.message.slice(0, 80) || 'إشعار',
            snippet: n.message.length > 80 ? n.message : undefined,
            _searchStr: norm(`${n.title} ${n.message} ${n.type}`),
            navigate: { type: 'notifications' },
        },
        LIFECYCLE_ACTIVE,
    );
}

function communityPostToEntries(p: CommunityPost): GlobalSearchEntry[] {
    const tagText = p.tags.join(' ');
    const attach = p.attachment?.name || '';
    const postText = `${p.content} ${tagText} ${attach} ${p.authorName}`;
    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `forum-${p.id}`,
                category: 'community',
                title: p.content.slice(0, 80) || 'منشور مجتمع المحامين',
                subtitle: `${p.authorName}${p.tags.length ? ` • ${p.tags.join(', ')}` : ''}`,
                snippet: p.content.length > 80 ? p.content : undefined,
                _searchStr: norm(postText),
                navigate: { type: 'community', postId: p.id },
            },
            LIFECYCLE_ACTIVE,
        ),
    ];
    for (const c of p.comments ?? []) {
        if (!c.content?.trim()) continue;
        entries.push(
            withLifecycle(
                {
                    id: `forum-c-${p.id}-${c.id}`,
                    category: 'community',
                    title: c.content.slice(0, 80),
                    subtitle: `تعليق — ${p.authorName}`,
                    snippet: c.content,
                    _searchStr: blob([c.content, c.authorName, postText]),
                    navigate: { type: 'community', postId: p.id },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }
    return entries;
}

function financeToEntry(f: FinanceRecord, txTitle: string, transactionId: string): GlobalSearchEntry {
    const text = `${f.description} ${f.amount} ${f.type} ${txTitle}`;
    return withLifecycle(
        {
            id: `fin-${f.id}`,
            category: 'finance',
            title: f.description || `${f.amount}`,
            subtitle: `مالية — ${txTitle}`,
            _searchStr: norm(text),
            navigate: { type: 'transactions', transactionId },
        },
        LIFECYCLE_ACTIVE,
    );
}

export type BuildGlobalSearchIndexInput = {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: GlobalNoteRow[];
    cases: LegalCase[];
    criminalCases?: unknown[];
    profileLine?: string;
    userId: string | null;
    notifications?: { id: string; title: string; message: string; type: string }[];
    extras?: GlobalSearchExtras;
    /** ملاحظات المفكرة المحلية — تُجمَّع على الخيط الرئيسي قبل الفهرسة */
    preparedVaultNotes?: PreparedVaultNote[];
    /** مستندات إضبارة خفيفة (بدون dataUrl) */
    preparedDocsVault?: PreparedDocsVaultDoc[];
    /** ملاحظات مخزنة في localStorage */
    preparedStoredNotes?: GlobalNoteRow[];
    /** نسخة الكاش — يزيدها LawyerDashboard عند تغيّر الملاحظات */
    cacheGeneration?: number;
};

/** فهرس موحّد — كل أقسام التطبيق المحلية */
export function buildGlobalSearchIndex(input: BuildGlobalSearchIndexInput): GlobalSearchEntry[] {
    const seen = new Set<string>();
    const list: GlobalSearchEntry[] = [];
    const fileLifecycleById = new Map<string, SearchLifecycle>();

    const push = (e: GlobalSearchEntry) => {
        if (seen.has(e.id)) return;
        seen.add(e.id);
        list.push(e);
    };

    const indexFile = (f: FileData & { executionTrashDeletedAt?: string | null }) => {
        for (const entry of fileToEntry(f)) {
            fileLifecycleById.set(String(f.id), entry.lifecycle);
            push(entry);
        }
    };

    for (const f of input.files) {
        indexFile(f);
    }

    for (const f of input.executionFiles ?? []) {
        indexFile({ ...f, type: 'execution' });
    }

    if (input.executionFiles?.length) {
        for (const entry of buildExecutionDeepSearchEntries(input.executionFiles, withLifecycle)) {
            push(entry);
        }
    }

    const fileIds = new Set<string>();
    for (const f of input.files) fileIds.add(String(f.id));
    for (const f of input.executionFiles ?? []) fileIds.add(String(f.id));

    for (const c of input.cases) {
        if (!fileIds.has(c.id)) caseToEntry(c).forEach(push);
    }

    for (const c of input.criminalCases ?? []) {
        criminalToEntry(c).forEach(push);
    }

    const seenNoteIds = new Set<string>();
    const preparedVaultNotes = input.preparedVaultNotes ?? [];
    const preparedStoredNotes = input.preparedStoredNotes ?? [];
    const preparedDocsVault = input.preparedDocsVault ?? [];

    for (const n of preparedVaultNotes) {
        seenNoteIds.add(String(n.id));
        const isVoice = n.type === 'voice';
        push(
            withLifecycle(
                {
                    id: `nv-${n.id}`,
                    category: isVoice ? 'voice' : 'note',
                    title: isVoice ? 'تسجيل صوتي' : n.content.slice(0, 80) || 'ملاحظة',
                    subtitle: isVoice ? 'مفكرة — صوت' : 'مفكرة الملاحظات',
                    snippet: isVoice ? undefined : n.content,
                    _searchStr: blob([n.content, isVoice ? 'صوت' : '']),
                    navigate: isVoice
                        ? { type: 'voice', noteId: String(n.id) }
                        : { type: 'note', noteId: String(n.id) },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }

    for (const n of input.globalNotes) {
        if (seenNoteIds.has(String(n.id))) continue;
        seenNoteIds.add(String(n.id));
        push(noteRowToEntry(n, 'المفكرة العامة'));
    }

    for (const n of preparedStoredNotes) {
        if (seenNoteIds.has(String(n.id))) continue;
        seenNoteIds.add(String(n.id));
        push(noteRowToEntry(n, 'ملاحظات المحامي'));
    }

    docsVaultEntriesFromPrepared(preparedDocsVault, fileLifecycleById).forEach(push);

    for (const n of input.notifications ?? []) {
        if (n.title?.trim() || n.message?.trim()) push(notificationToEntry(n));
    }

    const extras = input.extras;
    if (extras) {
        extras.vaultDocs.forEach((d) => push(vaultToEntry(d)));
        extras.repositoryDocs.forEach((d) => push(repositoryToEntry(d)));
        extras.quantumTasks.forEach((t) => push(quantumTaskToEntry(t, fileLifecycleById)));
        extras.calendarEvents.forEach((e) => push(calendarToEntry(e, fileLifecycleById)));
        extras.urgentCases.forEach((c, i) => urgentToEntry(c, i).forEach(push));

        const txById = new Map(extras.threadingTransactions.map((t) => [t.id, t]));
        extras.threadingTransactions.forEach((tx) => push(threadingTxToEntry(tx)));
        for (const t of extras.threadingTasks) {
            const tx = txById.get(t.transactionId);
            push(threadingTaskToEntry(t, tx?.clientName || tx?.title || 'معاملة', t.transactionId));
        }
        for (const f of extras.threadingFinance) {
            const tx = txById.get(f.transactionId);
            push(financeToEntry(f, tx?.clientName || tx?.title || 'معاملة', f.transactionId));
        }
        extras.communityPosts.forEach((p) => communityPostToEntries(p).forEach(push));
    }

    if (input.profileLine?.trim()) {
        push(
            withLifecycle(
                {
                    id: 'profile-self',
                    category: 'profile',
                    title: 'الملف الشخصي',
                    subtitle: input.profileLine.trim(),
                    _searchStr: norm(input.profileLine),
                    navigate: { type: 'profile' },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }

    return list;
}

export type GroupedSearchResults = Record<GlobalSearchCategory, GlobalSearchEntry[]> & {
    total: number;
    hasResults: boolean;
};

export function groupSearchResults(entries: GlobalSearchEntry[]): GroupedSearchResults {
    const g = {
        total: entries.length,
        hasResults: entries.length > 0,
    } as GroupedSearchResults;
    for (const c of ALL_CATEGORIES) {
        g[c] = [];
    }
    for (const e of entries) {
        g[e.category].push(e);
    }
    return g;
}

export const SEARCH_CATEGORY_LABELS: Record<GlobalSearchCategory, string> = {
    lawsuit: 'دعاوى قضائية',
    transaction: 'معاملات الملفات',
    execution: 'إضابير تنفيذ',
    criminal: 'قضايا جزائية',
    note: 'ملاحظات',
    voice: 'تسجيلات صوتية',
    vault: 'مخزن الملفات',
    repository: 'المكتبة القانونية',
    case: 'سجل القضايا',
    party: 'موكلون وخصوم',
    profile: 'الملف الشخصي',
    task: 'مهام',
    calendar: 'التقويم',
    urgent: 'طلبات مستعجلة',
    threading: 'نظام المعاملات',
    finance: 'سجلات مالية',
    community: 'مجتمع المحامين',
    notification: 'الإشعارات',
};
