import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { sanitizeSearchDisplayText } from '@/app/services/search/searchDisplayText';

const STAGES_HAYSTACK_MAX = 4_000;

/** نصوص المراحل للبحث داخل وثيقة الملف — بلا وثيقة Fuse لكل حدث. */
export function lawsuitStagesSearchHaystack(f: FileData): string {
    const parts: string[] = [];
    const stagesRaw = (f as unknown as Record<string, unknown>).stages;
    const stages = Array.isArray(stagesRaw) ? stagesRaw : [];

    for (const stageRaw of stages) {
        if (!stageRaw || typeof stageRaw !== 'object') continue;
        const stage = stageRaw as Record<string, unknown>;
        const stageName = String(stage.stageName ?? stage.name ?? '').trim();
        if (stageName) parts.push(stageName);

        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const evRaw of timeline) {
            if (!evRaw || typeof evRaw !== 'object') continue;
            const ev = evRaw as Record<string, unknown>;
            if (ev.isDeleted) continue;
            const title = sanitizeSearchDisplayText(String(ev.title ?? '').trim());
            const details = sanitizeSearchDisplayText(String(ev.details ?? '').trim());
            const tagsStr = Array.isArray(ev.tags) ? (ev.tags as unknown[]).join(' ') : '';
            parts.push(title, details, String(ev.type ?? ''), String(ev.subType ?? ''), tagsStr);
        }

        const stageTasks = Array.isArray(stage.tasks) ? stage.tasks : [];
        for (const tRaw of stageTasks) {
            if (!tRaw || typeof tRaw !== 'object') continue;
            const t = tRaw as Record<string, unknown>;
            parts.push(
                sanitizeSearchDisplayText(String(t.title ?? '').trim()),
                sanitizeSearchDisplayText(String(t.details ?? '').trim()),
            );
        }

        const incidentals = Array.isArray(stage.incidentalCases) ? stage.incidentalCases : [];
        for (const iRaw of incidentals) {
            if (!iRaw || typeof iRaw !== 'object') continue;
            const i = iRaw as Record<string, unknown>;
            parts.push(
                sanitizeSearchDisplayText(String(i.title ?? i.subject ?? '').trim()),
                sanitizeSearchDisplayText(String(i.details ?? '').trim()),
                String(i.type ?? ''),
            );
        }
    }

    const joined = parts.filter(Boolean).join(' ');
    return joined.length > STAGES_HAYSTACK_MAX ? joined.slice(0, STAGES_HAYSTACK_MAX) : joined;
}
