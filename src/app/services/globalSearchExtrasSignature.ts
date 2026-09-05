import type { GlobalSearchExtras } from '@/app/services/globalSearchExtrasCache';
import { djb2Hash } from '@/app/utils/djb2';

/** فاصل extras في مفتاح الفهرس — لا يعتمد على lastIndexOf('|') لأن profileLine قد يحتوي |. */
export const GLOBAL_SEARCH_INDEX_EXTRAS_MARK = '|gsx:';

function field(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value instanceof Date) return String(value.getTime());
    return '';
}

function urgentSearchBlob(rows: unknown[]): string {
    return rows
        .map((raw, idx) => {
            if (!raw || typeof raw !== 'object') return String(idx);
            const r = raw as Record<string, unknown>;
            return [
                field(r.id ?? idx),
                field(r.title),
                field(r.applicantName),
                field(r.clientName),
                field(r.notes),
                field(r.description),
                field(r.requestNumber),
                field(r.caseNo),
            ].join('\u001f');
        })
        .join('\n');
}

function extrasSearchBlob(extras: GlobalSearchExtras): string {
    const tasks = extras.quantumTasks
        .map((t) =>
            [
                t.id,
                t.title,
                t.rawText,
                t.location ?? '',
                t.status,
                t.subTasks.map((s) => s.title).join(','),
            ].join('\u001f'),
        )
        .join('\n');
    const calendar = extras.calendarEvents
        .map((e) =>
            [e.id, e.title, e.date, e.notes ?? '', e.clientName ?? '', e.caseNo ?? '', e.updatedAt].join(
                '\u001f',
            ),
        )
        .join('\n');
    const vault = extras.vaultDocs
        .map((d) => [d.id, d.title, d.lawyerNote ?? '', d.aiSummary ?? '', d.fileName].join('\u001f'))
        .join('\n');
    const repo = extras.repositoryDocs
        .map((d) => [d.id, d.title, d.description, d.fileName, (d.tags ?? []).join(',')].join('\u001f'))
        .join('\n');
    const threadingTx = extras.threadingTransactions
        .map((tx) => [tx.id, tx.title, tx.clientName, tx.status].join('\u001f'))
        .join('\n');
    const threadingTasks = extras.threadingTasks
        .map((t) => [t.id, t.title, t.notes ?? '', t.officialReference ?? ''].join('\u001f'))
        .join('\n');
    const posts = extras.communityPosts
        .map((p) => {
            const comments = (p.comments ?? []).map((c) => `${c.id}:${c.content}`).join(',');
            return [p.id, p.content, p.authorName, (p.tags ?? []).join(','), comments].join('\u001f');
        })
        .join('\n');
    return [
        tasks,
        calendar,
        urgentSearchBlob(extras.urgentCases),
        vault,
        repo,
        threadingTx,
        threadingTasks,
        posts,
    ].join('\n\n');
}

/** أطوال + هاش محتوى قابل للبحث — تعديل عنوان موعد دون تغيّر العدد يغيّر المفتاح. */
export function globalSearchExtrasSignature(extras: GlobalSearchExtras | null | undefined): string {
    if (!extras) return '0';
    return [
        extras.quantumTasks.length,
        extras.calendarEvents.length,
        extras.urgentCases.length,
        extras.vaultDocs.length,
        extras.repositoryDocs.length,
        extras.threadingTransactions.length,
        extras.threadingTasks.length,
        extras.communityPosts.length,
        djb2Hash(extrasSearchBlob(extras)),
    ].join('.');
}

export function composeGlobalSearchIndexCacheKey(core: string, extrasSig: string): string {
    return `${core}${GLOBAL_SEARCH_INDEX_EXTRAS_MARK}${extrasSig}`;
}

/** وصول extras فقط (المحتوى أو العدد) يغيّر المقطع بعد gsx. */
export function isSearchIndexKeyExtrasOnlyChange(appliedKey: string | null, cacheKey: string): boolean {
    if (!appliedKey || !cacheKey || appliedKey === cacheKey) return false;
    const mark = GLOBAL_SEARCH_INDEX_EXTRAS_MARK;
    const appliedCut = appliedKey.lastIndexOf(mark);
    const cacheCut = cacheKey.lastIndexOf(mark);
    if (appliedCut < 0 || cacheCut < 0) return false;
    return (
        appliedKey.slice(0, appliedCut) === cacheKey.slice(0, cacheCut) &&
        appliedKey.slice(appliedCut) !== cacheKey.slice(cacheCut)
    );
}
