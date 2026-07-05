import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { djb2Hash as hashText } from '@/app/utils/djb2';

export type RepositoryFeedBuildInput = {
    globalNotes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    vaultDocs: SmartVaultDoc[];
};

/** توقيع بطاقة عامة — يلتقط كل ما يؤثّر في البناء/الترتيب/العرض/التصفية */
function globalNoteSig(n: RepositoryFeedBuildInput['globalNotes'][number]): string {
    return [
        n.id,
        n.createdAtIso ?? n.date ?? '',
        n.repositoryInboxHidden ? 1 : 0,
        n.isPinned ? 1 : 0,
        n.type ?? '',
        n.attachmentDocId ?? '',
        n.linkedFileId ?? '',
        hashText(n.title ?? ''),
        hashText(n.body ?? ''),
        (n.tags ?? []).join(','),
    ].join(':');
}

/** توقيع محتوى ملف دعوى — ملاحظات + أحداث note داخل مراحل الخط الزمني */
function lawsuitFileSig(file: RepositoryFeedBuildInput['lawsuitFiles'][number]): string {
    const notes = Array.isArray(file.notes) ? file.notes : [];
    const noteParts = notes.map(
        (n) =>
            `${n.id}|${hashText(String(n.text ?? ''))}|${hashText(String(n.meta ?? n.stageCtx ?? ''))}|${n.isPinned ? 1 : 0}|${n.date ?? ''}`,
    );
    const stages = Array.isArray(file.stages) ? file.stages : [];
    const timelineParts: string[] = [];
    for (const stage of stages) {
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const event of timeline) {
            if (event.type !== 'note') continue;
            timelineParts.push(
                `${event.id}|${hashText(String(event.title ?? ''))}|${hashText(String(event.details ?? ''))}|${event.date ?? ''}|${
                    (event as { isDeleted?: boolean }).isDeleted ? 1 : 0
                }`,
            );
        }
    }
    return `${file.id}#${noteParts.join(',')}#${timelineParts.join(',')}`;
}

/** توقيع محتوى ملف تنفيذ — سجلّ ملاحظات القضية */
function executionFileSig(file: RepositoryFeedBuildInput['executionFiles'][number]): string {
    const notes = Array.isArray(file.caseNotesLog)
        ? (file.caseNotesLog as Array<Record<string, unknown>>)
        : [];
    const noteParts = notes.map(
        (n) =>
            `${String(n.id ?? '')}|${hashText(String(n.title ?? ''))}|${hashText(String(n.body ?? ''))}|${n.pinned ? 1 : 0}|${n.trashedAt ? 1 : 0}|${String(n.createdAt ?? '')}`,
    );
    return `${file.id}#${noteParts.join(',')}`;
}

/** مفتاح جلسة لـ buildRepositoryFeed — يتخطى إعادة البناء عند نفس المدخلات */
export function buildRepositoryFeedCacheKey(input: RepositoryFeedBuildInput): string {
    const notesSig = input.globalNotes.map(globalNoteSig).join('|');
    const lawsuitSig = `${input.lawsuitFiles.length}:${input.lawsuitFiles.map(lawsuitFileSig).join('|')}`;
    const execSig = `${input.executionFiles.length}:${input.executionFiles.map(executionFileSig).join('|')}`;
    const vaultSig = `${input.vaultDocs.length}:${input.vaultDocs
        .map((d) => `${d.id}:${d.updatedAt ?? ''}:${d.boundDossierId ?? ''}`)
        .join(',')}`;
    return `${notesSig}::${lawsuitSig}::${execSig}::${vaultSig}`;
}

let lastKey = '';
let lastItems: RepositoryFeedItem[] = [];

export function peekRepositoryFeedCache(key: string): RepositoryFeedItem[] | undefined {
    return key === lastKey ? lastItems : undefined;
}

export function setRepositoryFeedCache(key: string, items: RepositoryFeedItem[]): void {
    lastKey = key;
    lastItems = items;
}

export function invalidateRepositoryFeedCache(): void {
    lastKey = '';
    lastItems = [];
}

/** للاختبارات */
export function resetRepositoryFeedCacheForTests(): void {
    invalidateRepositoryFeedCache();
}
