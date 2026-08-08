import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { SparkNudge } from '@/app/spark/types';
import { extractDateHintsFromVaultText } from '@/app/spark/engine/vaultAttachmentSparkScan';

export type BoundDossierRef = {
    kind: 'lawsuit' | 'execution';
    label: string;
    registeredDates: Set<string>;
};

function normalizeDateToken(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

function collectLawsuitRegisteredDates(file: FileData): Set<string> {
    const dates = new Set<string>();
    const push = (value?: string | null) => {
        const trimmed = String(value ?? '').trim();
        if (trimmed) dates.add(normalizeDateToken(trimmed));
    };
    push(file.date);
    push(file.nextDate);
    push(file.firstHearingDate);
    push(file.stayDate);
    push(file.stayReviewDate);
    for (const entry of file.history ?? []) {
        if (entry && typeof entry === 'object' && 'date' in entry) {
            push(String((entry as { date?: string }).date ?? ''));
        }
    }
    for (const note of file.notes ?? []) {
        push(note.date);
        push(note.apptDate);
    }
    return dates;
}

function collectExecutionRegisteredDates(file: ExecutionFile): Set<string> {
    const dates = new Set<string>();
    const push = (value?: string | null) => {
        const trimmed = String(value ?? '').trim();
        if (trimmed) dates.add(normalizeDateToken(trimmed));
    };
    const data = file as Record<string, unknown>;
    push(typeof data.judgmentDate === 'string' ? data.judgmentDate : null);
    push(typeof data.notificationDate === 'string' ? data.notificationDate : null);
    const timeline = Array.isArray(data.timelineEvents) ? data.timelineEvents : [];
    for (const event of timeline) {
        if (!event || typeof event !== 'object') continue;
        const row = event as Record<string, unknown>;
        push(typeof row.date === 'string' ? row.date : null);
        push(typeof row.deadlineDate === 'string' ? row.deadlineDate : null);
        push(typeof row.eventDate === 'string' ? row.eventDate : null);
    }
    return dates;
}

function lawsuitLabel(file: FileData): string {
    return String(file.caseNo ?? file.id ?? 'دعوى').trim() || 'دعوى';
}

function executionLabel(file: ExecutionFile): string {
    const data = file as Record<string, unknown>;
    const fileNumber = String(data.fileNumber ?? data.caseNo ?? file.id ?? 'تنفيذ').trim();
    return fileNumber || 'تنفيذ';
}

export function resolveBoundDossierRef(
    boundDossierId: string,
    lawsuitFiles: FileData[],
    executionFiles: ExecutionFile[],
): BoundDossierRef | null {
    const id = String(boundDossierId ?? '').trim();
    if (!id) return null;

    const lawsuit = lawsuitFiles.find(
        (file) =>
            String(file.id) === id ||
            String(file.caseNo ?? '').trim() === id ||
            `lawsuit:${file.id}` === id ||
            `lawsuit:${file.caseNo}` === id,
    );
    if (lawsuit) {
        return {
            kind: 'lawsuit',
            label: lawsuitLabel(lawsuit),
            registeredDates: collectLawsuitRegisteredDates(lawsuit),
        };
    }

    const execution = executionFiles.find((file) => {
        const data = file as Record<string, unknown>;
        const fileNumber = String(data.fileNumber ?? data.caseNo ?? '').trim();
        return (
            String(file.id) === id ||
            fileNumber === id ||
            `execution:${file.id}` === id ||
            (fileNumber ? `execution:${fileNumber}` === id : false)
        );
    });
    if (execution) {
        return {
            kind: 'execution',
            label: executionLabel(execution),
            registeredDates: collectExecutionRegisteredDates(execution),
        };
    }

    return null;
}

export function findUnregisteredVaultDateHints(
    dateHints: string[],
    registeredDates: Set<string>,
): string[] {
    return dateHints.filter((hint) => !registeredDates.has(normalizeDateToken(hint)));
}

export function scanBoundVaultDocDateGap(input: {
    doc: SmartVaultDoc;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
}): SparkNudge | null {
    const boundId = String(input.doc.boundDossierId ?? '').trim();
    if (!boundId) return null;

    const text = String(input.doc.extractedText ?? input.doc.aiSummary ?? '').trim();
    const dateHints = text.length >= 8 ? extractDateHintsFromVaultText(text) : [];
    if (dateHints.length === 0) return null;

    const dossier = resolveBoundDossierRef(boundId, input.lawsuitFiles, input.executionFiles);
    if (!dossier) return null;

    const missing = findUnregisteredVaultDateHints(dateHints, dossier.registeredDates);
    if (missing.length === 0) return null;

    const title = input.doc.title || input.doc.fileName || 'مرفق';
    const sectionLabel = dossier.kind === 'lawsuit' ? 'دعوى' : 'تنفيذ';

    return {
        id: `repository:bound-date-gap:${input.doc.id}`,
        kind: 'repository.vault_bound_date_unregistered',
        surface: 'repository',
        priority: 9,
        message: `المرفق «${title}» مربوط بإضبارة ${sectionLabel} ${dossier.label} ويذكر تواريخ (${missing.slice(0, 2).join(' · ')}) غير مسجّلة في السجل — هل تود إضافتها؟`,
        presence: {
            present: missing.slice(0, 3),
            missing: ['تسجيل في السجل الزمني'],
        },
        source: 'repositoryBoundDossierSparkScan',
        dossierKey: 'repository:session',
        targetFileId: input.doc.id,
        action: { label: 'مراجعة المرفق', actionId: 'open_vault_doc' },
    };
}

export function scanBoundVaultDocsForSpark(input: {
    vaultDocs: SmartVaultDoc[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
}): SparkNudge | null {
    for (const doc of input.vaultDocs) {
        const nudge = scanBoundVaultDocDateGap({
            doc,
            lawsuitFiles: input.lawsuitFiles,
            executionFiles: input.executionFiles,
        });
        if (nudge) return nudge;
    }
    return null;
}

/** للاختبارات — استخراج التواريخ من نص المرفق */
export { extractDateHintsFromVaultText };
